"""The real-time risk score — XGBoost (scikit-learn) tool card. Loads a
trained gradient-boosted regressor and scores 0-100, plus plain-English
reasons derived from XGBoost's own per-feature SHAP contributions
(`pred_contribs=True` — no extra `shap` dependency needed).

Train/retrain with `python data/train_risk_model.py` (see that file for how
the bootstrap training set is built, since there's no real historical claims
data to train on yet).
"""

import logging

import numpy as np
import pandas as pd
import xgboost as xgb

from .config import RISK_MODEL_PATH

logger = logging.getLogger("spotshield.risk_model")

FEATURE_ORDER = [
    "declared_credit_score",
    "has_credit_data",
    "adverse_history",
    "claim_history",
    "good_history",
    "missing_doc_count",
    "image_match",
    "has_image_match",
    "vehicle_value_log",
    "similar_cases_avg_risk",
    "similar_cases_reject_rate",
]

FEATURE_LABELS = {
    "declared_credit_score": "declared credit score",
    "has_credit_data": "credit score being on file",
    "adverse_history": "adverse prior insurance history (lapsed/denied/fraud)",
    "claim_history": "a prior claim on record",
    "good_history": "a clean prior insurance history",
    "missing_doc_count": "missing required documents",
    "image_match": "the vehicle-photo match confidence",
    "has_image_match": "having a vehicle photo to analyze",
    "vehicle_value_log": "the declared vehicle value",
    "similar_cases_avg_risk": "the risk level of similar past cases",
    "similar_cases_reject_rate": "the reject rate among similar past cases",
}

_model: xgb.XGBRegressor | None = None


def _load_model() -> xgb.XGBRegressor:
    global _model
    if _model is None:
        if not RISK_MODEL_PATH.exists():
            raise FileNotFoundError(
                f"No trained risk model at {RISK_MODEL_PATH}. Run "
                "`python data/train_risk_model.py` from ai-service/ first."
            )
        model = xgb.XGBRegressor()
        model.load_model(str(RISK_MODEL_PATH))
        _model = model
    return _model


def build_features(
    *,
    declared_credit_score: int | None,
    prior_insurance_history: str | None,
    missing_doc_count: int,
    image_match: int | None,
    vehicle_value: float,
    similar_cases: list[dict],
) -> dict:
    text = (prior_insurance_history or "").lower()
    adverse = any(k in text for k in ("lapsed", "denied", "fraud"))
    claim = "claim" in text and not adverse
    good = bool(text) and not adverse and not claim

    reject_like = [c for c in similar_cases if c.get("decision") == "rejected"]
    band_score = {"low": 90, "medium": 65, "high": 35}
    similar_scores = [band_score.get(c.get("risk_band"), 65) for c in similar_cases]

    return {
        "declared_credit_score": float(declared_credit_score or 650),
        "has_credit_data": 1.0 if declared_credit_score is not None else 0.0,
        "adverse_history": 1.0 if adverse else 0.0,
        "claim_history": 1.0 if claim else 0.0,
        "good_history": 1.0 if good else 0.0,
        "missing_doc_count": float(missing_doc_count),
        "image_match": float(image_match if image_match is not None else 70),
        "has_image_match": 1.0 if image_match is not None else 0.0,
        "vehicle_value_log": float(np.log1p(max(vehicle_value, 0))),
        "similar_cases_avg_risk": float(np.mean(similar_scores)) if similar_scores else 65.0,
        "similar_cases_reject_rate": len(reject_like) / len(similar_cases) if similar_cases else 0.0,
    }


def predict(features: dict) -> tuple[float, list[dict]]:
    """Returns (risk_score 0-100, top feature contributions for the reason string)."""
    model = _load_model()
    row = pd.DataFrame([[features[f] for f in FEATURE_ORDER]], columns=FEATURE_ORDER)

    booster = model.get_booster()
    dmatrix = xgb.DMatrix(row, feature_names=FEATURE_ORDER)
    score = float(model.predict(row)[0])
    score = max(0.0, min(100.0, score))

    contribs = booster.predict(dmatrix, pred_contribs=True)[0]  # last entry is bias term
    contrib_pairs = list(zip(FEATURE_ORDER, contribs[: len(FEATURE_ORDER)]))
    contrib_pairs.sort(key=lambda p: abs(p[1]), reverse=True)

    top_contribs = [
        {
            "feature": name,
            "label": FEATURE_LABELS.get(name, name),
            "contribution": round(float(value), 2),
            "direction": "increased" if value >= 0 else "decreased",
        }
        for name, value in contrib_pairs[:3]
        if abs(value) >= 0.5
    ]
    return round(score), top_contribs
