import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import KanbanColumn from "../components/KanbanColumn.jsx";
import KanbanCard from "../components/KanbanCard.jsx";
import StatCard from "../components/StatCard.jsx";
import "../landing.css";

// ---------- existing illustrative previews (unchanged, still used by the tab showcase) ----------

function IntakePreview() {
  return (
    <div className="card card-pad">
      <div className="section-header">
        <div>
          <h2>Required Documents</h2>
          <div className="section-subtitle">Upload the documents needed to complete underwriting.</div>
        </div>
      </div>
      <div className="doc-progress">
        <span>3 of 4 documents uploaded</span>
        <div className="doc-progress-track">
          <div className="doc-progress-fill" style={{ width: "75%" }} />
        </div>
      </div>
      <div className="doc-grid">
        <div className="doc-card is-done">
          <div>
            <div className="doc-card-top">
              <div className="doc-card-icon">✓</div>
              <div className="doc-card-type">Identity</div>
            </div>
            <div className="doc-card-body">
              <span className="doc-card-filename">applicant-id.pdf</span>
              <span className="doc-card-status">Uploaded</span>
            </div>
          </div>
          <div className="doc-card-action"><label>Replace</label></div>
        </div>
        <div className="doc-card is-done">
          <div>
            <div className="doc-card-top">
              <div className="doc-card-icon">✓</div>
              <div className="doc-card-type">Credit History</div>
            </div>
            <div className="doc-card-body">
              <span className="doc-card-filename">credit-report.pdf</span>
              <span className="doc-card-status">Uploaded</span>
            </div>
          </div>
          <div className="doc-card-action"><label>Replace</label></div>
        </div>
        <div className="doc-card is-done">
          <div>
            <div className="doc-card-top">
              <div className="doc-card-icon">✓</div>
              <div className="doc-card-type">Vehicle Registration</div>
            </div>
            <div className="doc-card-body">
              <span className="doc-card-filename">rc-book.pdf</span>
              <span className="doc-card-status">Uploaded</span>
            </div>
          </div>
          <div className="doc-card-action"><label>Replace</label></div>
        </div>
        <div className="doc-card is-empty">
          <div>
            <div className="doc-card-top">
              <div className="doc-card-icon">+</div>
              <div className="doc-card-type">Vehicle Photo</div>
            </div>
            <div className="doc-card-body">
              <span className="doc-card-hint">JPG, PNG or WEBP</span>
            </div>
          </div>
          <div className="doc-card-action"><label>Upload</label></div>
        </div>
      </div>
    </div>
  );
}

const QUEUE_SAMPLE = [
  { id: "8f2Ld91Qa", name: "Rahul Sharma", vehicle: "Hyundai Creta", value: "$18,000", score: 82, band: "low", decision: "approved", date: "Sep 01" },
  { id: "3nRt55VxC", name: "Priya Menon", vehicle: "Honda City", value: "$14,200", score: 58, band: "medium", decision: "review", date: "Sep 01" },
  { id: "q0Wz18KpJ", name: "Arun Das", vehicle: "Tata Nexon", value: "$11,500", score: 31, band: "high", decision: "rejected", date: "Aug 31" },
  { id: "m7Yh02FeD", name: "Sana Iqbal", vehicle: "Maruti Baleno", value: "$9,800", score: null, band: null, decision: null, date: "Sep 01" },
];

function QueuePreview() {
  const columns = [
    { key: "progress", label: "In Progress", accent: "neutral", match: (c) => !c.decision },
    { key: "review", label: "Needs Review", accent: "review", match: (c) => c.decision === "review" },
    { key: "approved", label: "Approved", accent: "approved", match: (c) => c.decision === "approved" },
    { key: "rejected", label: "Rejected", accent: "rejected", match: (c) => c.decision === "rejected" },
  ];
  return (
    <div className="stack">
      <div className="stat-grid">
        <StatCard label="Total Cases" value={128} icon="layers" glass />
        <StatCard label="Needs Review" value={14} accent="review" icon="alert" glass />
        <StatCard label="Approved" value={96} accent="approved" icon="check" glass />
        <StatCard label="Rejected" value={18} accent="rejected" icon="cross" glass />
      </div>
      <div className="kanban-board">
        {columns.map((col) => {
          const cases = QUEUE_SAMPLE.filter(col.match);
          return (
            <KanbanColumn key={col.key} label={col.label} accent={col.accent} count={cases.length}>
              {cases.map((c) => (
                <KanbanCard
                  key={c.id}
                  id={c.id}
                  applicant={c.name}
                  vehicle={c.vehicle}
                  value={c.value}
                  riskScore={c.score}
                  riskBand={c.band}
                  dateLabel={c.date}
                />
              ))}
            </KanbanColumn>
          );
        })}
      </div>
    </div>
  );
}

function SummaryPreview() {
  return (
    <div className="stack">
      <div className="card risk-panel">
        <div className="risk-score-block">
          <div className="risk-score-value">82<span className="of100">/100</span></div>
          <span className="risk-badge low">Low Risk</span>
        </div>
        <div className="risk-panel-body">
          <div className="eyebrow">AI-Assisted Underwriting Assessment</div>
          <div className="risk-panel-decision">
            <span className="status-badge approved"><span className="dot" />Approved</span>
            <span className="page-subtitle" style={{ margin: 0 }}>88% vehicle-photo match</span>
          </div>
          <p className="risk-panel-reason">
            XGBoost risk score 82/100 (low risk) and 88% vehicle-photo match — approved on the spot.
          </p>
        </div>
      </div>
      <div className="card card-pad">
        <div className="section-header"><h2>Key Risk Factors</h2></div>
        <div className="factor-row">
          <span className="factor-icon positive">✓</span>
          <div className="factor-body">
            <div className="factor-label">Declared Credit Score</div>
            <div className="factor-impact">Medium impact · lowered risk</div>
          </div>
        </div>
        <div className="factor-row">
          <span className="factor-icon positive">✓</span>
          <div className="factor-body">
            <div className="factor-label">A Clean Prior Insurance History</div>
            <div className="factor-impact">Medium impact · lowered risk</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: "intake", label: "Agent Intake", path: "/", Preview: IntakePreview },
  { key: "queue", label: "Verification Queue", path: "/queue", Preview: QueuePreview },
  { key: "summary", label: "Case Summary", path: "/cases/8f2Ld91Qa", Preview: SummaryPreview },
];

// ---------- new: how-it-works flow (glass, animated) ----------

const FLOW_STEPS = [
  { n: "01", name: "Check", short: "Nothing missing before anything runs.", desc: "The case is held until all four items are in: the ID, the credit history, the vehicle document and the vehicle photo." },
  { n: "02", name: "Read", short: "Documents read, photo looked at.", desc: "Uploaded documents are turned into clean text, the vehicle photo is examined against what the lead declared, and a short case summary is written." },
  { n: "03", name: "Compare", short: "Against past cases and policy.", desc: "Similar past cases and the vendor-policy clauses that apply are pulled in, so the score reflects how this lead sits against the ones before it." },
  { n: "04", name: "Score", short: "A 0-100 risk score with reasons.", desc: "The case gets a risk score and, alongside it, the factors that pushed it up or down — no unexplained number." },
  { n: "05", name: "Decide", short: "Approve, reject or review.", desc: "Thresholds turn the score into a decision, with a plain-English reason the agent can read out to the lead." },
  { n: "06", name: "Offer", short: "Cross-sell the clean leads.", desc: "Strong, clean leads are flagged for a cross-sell offer, and the whole case is filed to the verification queue." },
];

function FlowSection() {
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      if (pausedRef.current) return;
      setActive((a) => (a + 1) % FLOW_STEPS.length);
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const cur = FLOW_STEPS[active];

  return (
    <section className="flow-section" id="how-it-works">
      <div className="flow-intro">
        <div className="eyebrow">How it works</div>
        <h2>Upload to decision, while the lead is still in the room.</h2>
        <p className="landing-sub" style={{ margin: "14px 0 0" }}>
          Every case takes the same six checks, in the same order, every time.
        </p>
      </div>

      <div className="flow-glass-panel">
        <div className="flow-tabs">
          {FLOW_STEPS.map((s, i) => (
            <button
              key={s.n}
              type="button"
              className={`flow-tab ${i === active ? "active" : ""}`}
              onClick={() => { pausedRef.current = true; setActive(i); }}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="flow-body">
          <div className="flow-nodes">
            {FLOW_STEPS.map((s, i) => (
              <div className="flow-node-wrap" key={s.n}>
                <div className={`flow-node ${i === active ? "active" : ""}`}>
                  <span className="flow-badge">{s.n}</span>
                  <span className="flow-node-text">
                    <span className="flow-node-name">{s.name}</span>
                    <span className="flow-node-short">{s.short}</span>
                  </span>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="flow-connector">
                    <span className={`flow-pulse ${i === active ? "run" : ""}`} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flow-detail">
            <div className="eyebrow">Step {cur.n}</div>
            <h3>{cur.name}</h3>
            <p>{cur.desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- new: modules grid ----------

const MODULES = [
  { tag: "Intake", title: "Open a case in the field", desc: "Applicant, vehicle and any declared credit score go in on one screen, then the agent starts the chat." },
  { tag: "Upload", title: "Chat-style document upload", desc: "ID, credit history, vehicle document and vehicle photo go up as tiles in a conversation, not a form." },
  { tag: "Verify", title: "Photo checked against the claim", desc: "The vehicle photo is read and compared with the vehicle the lead declared, so mismatches surface before approval." },
  { tag: "Score", title: "Risk score you can explain", desc: "Every case gets a 0-100 score with the top factors that produced it, in plain English." },
  { tag: "Decide", title: "Approve, reject or review", desc: "A decision and a written reason land on the case summary while the lead is still there." },
  { tag: "Grow", title: "Cross-sell on clean leads", desc: "Strong applications are flagged for the bundled add-on offer." },
];

function ModulesSection() {
  return (
    <section className="modules-section" id="what-it-does">
      <div className="flow-intro">
        <div className="eyebrow">What the product does</div>
        <h2>Six things a verification officer used to do by hand.</h2>
      </div>
      <div className="modules-grid">
        {MODULES.map((m) => (
          <div className="module-card" key={m.title}>
            <div className="module-top">
              <span className="module-dot" />
              <span className="module-tag">{m.tag}</span>
            </div>
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Landing() {
  const [active, setActive] = useState(TABS[0].key);
  const activeTab = TABS.find((t) => t.key === active);
  const Preview = activeTab.Preview;

  return (
    <div className="landing-page landing-page-glass">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/welcome" className="landing-logo">
            <span className="mark">S</span>
            SPOTSHIELD
          </Link>
          <nav className="landing-nav">
            <a href="#what-it-does">What it does</a>
            <a href="#how-it-works">How it works</a>
            <a href="#showcase">Screens</a>
          </nav>
          <div className="landing-header-actions">
            <Link to="/queue" className="btn btn-ghost">View Queue</Link>
            <Link to="/" className="btn btn-primary">Launch Workbench</Link>
          </div>
        </div>
      </header>

      <section className="landing-hero" id="overview">
        <div className="landing-hero-inner landing-hero-grid">
          <div>
            <span className="landing-pill">
              <span className="pill-dot" /> Local-first AI · runs on your laptop
            </span>
            <h1>An instant decision on every lead, before the agent leaves the room.</h1>
            <p className="landing-sub" style={{ margin: "20px 0 0", textAlign: "left" }}>
              One field agent opens a case, uploads a lead's documents and a vehicle photo through a
              live-chat style screen, and gets an approve/reject decision plus a cross-sell offer for
              good leads.
            </p>
            <div className="landing-cta-row" style={{ justifyContent: "flex-start" }}>
              <Link to="/" className="btn btn-primary">Launch Workbench →</Link>
              <a href="#how-it-works" className="btn btn-secondary">See how it works</a>
            </div>
          </div>

          <div className="hero-case-card">
            <div className="hero-case-top">
              <div>
                <div className="eyebrow">Case #4417</div>
                <div className="hero-case-vehicle">Vehicle · 2019 hatchback</div>
              </div>
              <span className="status-badge approved"><span className="dot" />Approved</span>
            </div>

            <div className="hero-photo-frame">
              {/* Drop a real vehicle photo in as /assets/hero-vehicle.jpg and swap the src below */}
              <img src="/assets/hero-vehicle.jpg" alt="Vehicle under review" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              <span className="hero-photo-placeholder">vehicle photo</span>
              <span className="hero-scanline" />
              <span className="hero-tag">Matches declared model</span>
            </div>

            <div className="hero-score-row">
              <div className="hero-score-value">18</div>
              <div className="hero-score-label">risk score<br />low band</div>
            </div>
            <div className="hero-score-track"><div className="hero-score-fill" style={{ width: "18%" }} /></div>
          </div>
        </div>
      </section>

      <ModulesSection />
      <FlowSection />

      <section className="landing-showcase" id="showcase">
        <div className="landing-showcase-inner">
          <div className="landing-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active === t.key}
                className={`landing-tab ${active === t.key ? "active" : ""}`}
                onClick={() => setActive(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="window-frame">
            <div className="window-chrome">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="window-url">spotshield.app{activeTab.path}</span>
            </div>
            <div className="window-body">
              <Preview />
            </div>
          </div>
          <p className="preview-caption">Illustrative preview — sample data shown for demonstration only.</p>
        </div>
      </section>

      <footer className="landing-footer">
        SpotShield AI — a field-to-decision underwriting workbench. Open a case, collect documents,
        and get an AI-assisted decision in the same visit.
      </footer>
    </div>
  );
}