"""Bootstraps the XGBoost risk model.

There's no real historical claims dataset yet, so this generates a synthetic
training set from the same underwriting logic the original rule-based
`riskEngine.js` MVP used (credit score, prior-history keywords, document
completeness, image-match confidence) plus the two retrieval-derived
features (similar-case average risk / reject rate), with noise added so the
model learns a smooth function instead of memorizing exact rule boundaries.

This is a legitimate way to bootstrap a first model: it encodes the same
underwriting judgment the business already trusted, but as a model that can
now be retrained on *real* outcomes (approved/rejected/claims) once they
accumulate in `cases` — replace `synthesize_dataset()` with a query against
real case history to do that.

Run: `python data/train_risk_model.py` from the `ai-service/` directory.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.risk_model import FEATURE_ORDER  # noqa: E402
from app.config import RISK_MODEL_PATH  # noqa: E402

RNG = np.random.default_rng(42)
N = 6000


def synthesize_dataset(n: int) -> pd.DataFrame:
    declared_credit_score = RNG.integers(300, 851, n).astype(float)
    has_credit_data = RNG.random(n) > 0.05
    declared_credit_score = np.where(has_credit_data, declared_credit_score, 650)

    history_roll = RNG.random(n)
    adverse_history = history_roll < 0.12
    claim_history = (history_roll >= 0.12) & (history_roll < 0.28)
    good_history = (history_roll >= 0.28) & (history_roll < 0.75)

    missing_doc_count = RNG.choice([0, 0, 0, 0, 1, 1, 2], n)

    has_image_match = RNG.random(n) > 0.05
    image_match = np.clip(RNG.normal(75, 18, n), 5, 100)
    image_match = np.where(has_image_match, image_match, 70)

    vehicle_value = RNG.uniform(3000, 60000, n)

    similar_cases_avg_risk = np.clip(RNG.normal(65, 20, n), 0, 100)
    similar_cases_reject_rate = np.clip(RNG.normal(0.2, 0.2, n), 0, 1)

    df = pd.DataFrame(
        {
            "declared_credit_score": declared_credit_score,
            "has_credit_data": has_credit_data.astype(float),
            "adverse_history": adverse_history.astype(float),
            "claim_history": claim_history.astype(float),
            "good_history": good_history.astype(float),
            "missing_doc_count": missing_doc_count.astype(float),
            "image_match": image_match,
            "has_image_match": has_image_match.astype(float),
            "vehicle_value_log": np.log1p(vehicle_value),
            "similar_cases_avg_risk": similar_cases_avg_risk,
            "similar_cases_reject_rate": similar_cases_reject_rate,
        }
    )

    score = 50.0
    score += (df["declared_credit_score"] - 575) / 275 * 20 * df["has_credit_data"]
    score -= 22 * df["adverse_history"]
    score -= 6 * df["claim_history"]
    score += 10 * df["good_history"]
    score += 15 * (df["missing_doc_count"] == 0)
    score -= 10 * df["missing_doc_count"]
    score += (df["image_match"] - 70) / 30 * 12 * df["has_image_match"]
    score += (df["similar_cases_avg_risk"] - 65) / 35 * 8
    score -= df["similar_cases_reject_rate"] * 15
    score += RNG.normal(0, 4, n)  # noise so it's a smooth function, not a lookup table

    df["risk_score"] = np.clip(score, 0, 100)
    return df


def main() -> None:
    df = synthesize_dataset(N)
    X = df[FEATURE_ORDER]
    y = df["risk_score"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        random_state=42,
    )
    model.fit(X_train, y_train)

    mae = float(np.mean(np.abs(model.predict(X_test) - y_test)))
    print(f"Validation MAE: {mae:.2f} risk-score points (n={len(X_test)})")

    RISK_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    model.save_model(str(RISK_MODEL_PATH))
    print(f"Saved model to {RISK_MODEL_PATH}")


if __name__ == "__main__":
    main()
