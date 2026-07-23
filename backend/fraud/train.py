"""
backend/fraud/train.py
═══════════════════════
Phase 7 — Isolation Forest training script.

Run from the project root:
    python -m backend.fraud.train

What it does
────────────
1. Generates 3,000 synthetic expense records (normal + anomalous).
2. Trains an IsolationForest model on the expense feature space.
3. Evaluates detection quality on a labelled hold-out set.
4. Saves the trained model + scaler to backend/fraud/artifacts/.

Feature space (per transaction)
────────────────────────────────
  abs_amount       — absolute expense amount (₹)
  day_of_week      — 0=Mon … 6=Sun
  day_of_month     — 1–31
  hour_of_day      — 0–23  (from created_at; 12 if unknown)
  amount_zscore    — z-score of amount within its category
  cat_encoded      — ordinal-encoded category (0–9)
  is_weekend       — 1 if Sat/Sun else 0
"""

import json
import numpy as np
import joblib

from pathlib               import Path
from sklearn.ensemble      import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics       import (
    precision_score, recall_score, f1_score, roc_auc_score,
)

# ── paths ──────────────────────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

SEED          = 42
N_NORMAL      = 2_700
N_ANOMALY     = 300     # 10% anomaly rate in synthetic data
CONTAMINATION = 0.08    # expected fraction in production data
N_ESTIMATORS  = 200
MAX_SAMPLES   = "auto"

CATEGORIES = [
    "Food & Dining", "Transport",    "Housing",    "Healthcare",
    "Shopping",      "Entertainment","Education",  "Investment",
    "Income",        "Other",
]
CAT_INDEX = {c: i for i, c in enumerate(CATEGORIES)}

# Typical monthly spend range per category (₹ min, max)
CAT_RANGES = {
    "Food & Dining":  (200,     8_000),
    "Transport":      (50,      5_000),
    "Housing":        (5_000,  30_000),
    "Healthcare":     (100,    10_000),
    "Shopping":       (200,    20_000),
    "Entertainment":  (100,     5_000),
    "Education":      (500,    15_000),
    "Investment":     (1_000,  50_000),
    "Income":         (10_000,300_000),
    "Other":          (100,     5_000),
}

np.random.seed(SEED)


# ── 1. Synthetic data generation ───────────────────────────────────────────────
def _sample_category() -> str:
    return np.random.choice(CATEGORIES)


def _normal_record() -> dict:
    cat    = _sample_category()
    lo, hi = CAT_RANGES[cat]
    amount = np.random.uniform(lo, hi)
    dow    = np.random.randint(0, 7)
    dom    = np.random.randint(1, 29)
    hour   = int(np.random.normal(14, 4))    # normal hours: ~2 PM
    hour   = max(6, min(23, hour))
    return {"amount": amount, "category": cat, "dow": dow, "dom": dom, "hour": hour, "label": 0}


def _anomalous_record() -> dict:
    """
    Anomaly types:
    A — extreme amount (5–20× category max)
    B — midnight / very-late-night transaction
    C — impossible amount (≥ ₹10 L)
    D — unusual day + high amount
    """
    cat    = _sample_category()
    lo, hi = CAT_RANGES[cat]
    t      = np.random.choice(["A", "B", "C", "D"])

    if t == "A":
        amount = hi * np.random.uniform(5, 20)
        dow    = np.random.randint(0, 7)
        hour   = np.random.randint(8, 20)
    elif t == "B":
        amount = np.random.uniform(lo, hi * 2)
        dow    = np.random.randint(0, 7)
        hour   = np.random.randint(0, 4)       # 12am – 4am
    elif t == "C":
        amount = np.random.uniform(1_000_000, 5_000_000)
        dow    = np.random.randint(0, 7)
        hour   = np.random.randint(8, 20)
    else:   # D — weekend high-amount
        amount = hi * np.random.uniform(3, 10)
        dow    = np.random.choice([5, 6])      # Sat/Sun
        hour   = np.random.randint(0, 6)

    dom = np.random.randint(1, 29)
    return {"amount": amount, "category": cat, "dow": dow, "dom": dom, "hour": hour, "label": 1}


def generate_dataset():
    records = [_normal_record()    for _ in range(N_NORMAL)] + \
              [_anomalous_record() for _ in range(N_ANOMALY)]
    np.random.shuffle(records)

    amounts_by_cat: dict[str, list[float]] = {c: [] for c in CATEGORIES}
    for r in records:
        amounts_by_cat[r["category"]].append(r["amount"])

    cat_stats = {
        cat: {
            "mean": float(np.mean(vals)) if vals else 0.0,
            "std":  float(np.std(vals))  if len(vals) > 1 else 1.0,
        }
        for cat, vals in amounts_by_cat.items()
    }

    rows, labels = [], []
    for r in records:
        cs     = cat_stats[r["category"]]
        zscore = (r["amount"] - cs["mean"]) / max(cs["std"], 1.0)
        rows.append([
            r["amount"],
            r["dow"],
            r["dom"],
            r["hour"],
            zscore,
            CAT_INDEX[r["category"]],
            int(r["dow"] >= 5),
        ])
        labels.append(r["label"])

    return np.array(rows, dtype=float), np.array(labels, dtype=int), cat_stats


# ── 2. Train ───────────────────────────────────────────────────────────────────
def train_and_evaluate(X_train, X_test, y_test, scaler):
    model = IsolationForest(
        n_estimators  = N_ESTIMATORS,
        max_samples   = MAX_SAMPLES,
        contamination = CONTAMINATION,
        random_state  = SEED,
        n_jobs        = -1,
    )
    model.fit(X_train)

    # IsolationForest: -1 = anomaly, 1 = normal → map to 1/0
    raw_preds = model.predict(scaler.transform(X_test))
    preds     = (raw_preds == -1).astype(int)
    scores    = -model.score_samples(scaler.transform(X_test))  # higher = more anomalous

    precision = precision_score(y_test, preds, zero_division=0)
    recall    = recall_score(y_test,    preds, zero_division=0)
    f1        = f1_score(y_test,        preds, zero_division=0)
    try:
        auc = roc_auc_score(y_test, scores)
    except ValueError:
        auc = 0.0

    metrics = {
        "precision":     round(precision, 4),
        "recall":        round(recall,    4),
        "f1":            round(f1,        4),
        "roc_auc":       round(auc,       4),
        "n_train":       len(X_train),
        "n_test":        len(X_test),
        "contamination": CONTAMINATION,
    }

    print("\n── Isolation Forest Results ──────────────────")
    print(f"   Precision : {precision:.4f}")
    print(f"   Recall    : {recall:.4f}")
    print(f"   F1        : {f1:.4f}")
    print(f"   ROC-AUC   : {auc:.4f}")
    return model, metrics


# ── 3. Main ────────────────────────────────────────────────────────────────────
def main():
    print("=" * 52)
    print("  Phase 7 — Isolation Forest Training Script")
    print("=" * 52)

    print(f"\n[1/4] Generating {N_NORMAL + N_ANOMALY:,} synthetic expense records "
          f"({N_ANOMALY} anomalies) …")
    X, y, cat_stats = generate_dataset()

    split            = int(len(X) * 0.8)
    X_train, X_test  = X[:split], X[split:]
    y_test           = y[split:]

    print("[2/4] Fitting StandardScaler on training features …")
    scaler    = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)

    print("[3/4] Training IsolationForest …")
    model, metrics = train_and_evaluate(X_train_s, X_test, y_test, scaler)

    print("[4/4] Saving artifacts …")
    joblib.dump(model,  ARTIFACTS_DIR / "fraud_model.joblib")
    joblib.dump(scaler, ARTIFACTS_DIR / "fraud_scaler.joblib")

    metadata = {
        "features": [
            "abs_amount", "day_of_week", "day_of_month",
            "hour_of_day", "amount_zscore", "cat_encoded", "is_weekend",
        ],
        "categories":    CATEGORIES,
        "cat_index":     CAT_INDEX,
        "cat_stats":     cat_stats,
        "n_estimators":  N_ESTIMATORS,
        "contamination": CONTAMINATION,
        "metrics":       metrics,
        "anomaly_score_threshold_note":
            "Scores > 0 are anomalous (from -score_samples). Higher = more suspicious.",
    }
    with open(ARTIFACTS_DIR / "fraud_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n✓ Artifacts saved to: {ARTIFACTS_DIR.resolve()}")
    print("    fraud_model.joblib")
    print("    fraud_scaler.joblib")
    print("    fraud_metadata.json")
    print("\nDone. Start the FastAPI server to use the detection API.\n")


if __name__ == "__main__":
    main()