"""
backend/fraud/detector.py
══════════════════════════
Loads the trained Isolation Forest artifacts once at startup and
exposes a `score_transactions()` function used by the FastAPI router.

Anomaly scoring
───────────────
IsolationForest.score_samples() returns negative values where more
negative = more anomalous. We negate these so that higher score means
more suspicious.

A threshold-based flag is applied:
  anomaly_score > ALERT_THRESHOLD  →  flagged as anomalous

The ALERT_THRESHOLD is derived from the training contamination rate
so that approximately that fraction of incoming transactions get flagged.
"""

from __future__ import annotations

import json
import numpy as np
import joblib

from datetime import date, datetime
from pathlib  import Path
from typing   import Optional

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"

# ── Lazy singletons ────────────────────────────────────────────────────────────
_model:    Optional[object] = None
_scaler:   Optional[object] = None
_metadata: Optional[dict]   = None

ALERT_THRESHOLD = 0.0   # negated score_samples: >0 = predicted anomaly


def _load() -> None:
    global _model, _scaler, _metadata

    required = ["fraud_model.joblib", "fraud_scaler.joblib", "fraud_metadata.json"]
    missing  = [f for f in required if not (ARTIFACTS_DIR / f).exists()]
    if missing:
        raise FileNotFoundError(
            f"Fraud detection artifacts missing: {missing}. "
            "Run `python -m backend.fraud.train` first."
        )

    _model  = joblib.load(ARTIFACTS_DIR / "fraud_model.joblib")
    _scaler = joblib.load(ARTIFACTS_DIR / "fraud_scaler.joblib")
    with open(ARTIFACTS_DIR / "fraud_metadata.json") as f:
        _metadata = json.load(f)


def is_ready() -> bool:
    return all(
        (ARTIFACTS_DIR / f).exists()
        for f in ["fraud_model.joblib", "fraud_scaler.joblib", "fraud_metadata.json"]
    )


def get_metadata() -> dict:
    if _metadata is None:
        _load()
    return _metadata  # type: ignore[return-value]


# ── Feature engineering ────────────────────────────────────────────────────────
def _build_feature_row(
    amount:    float,
    category:  str,
    tx_date:   date,
    hour:      int,
    cat_stats: dict,
    cat_index: dict,
) -> list[float]:
    """Convert a single transaction into a model feature vector."""
    dow        = tx_date.weekday()                   # 0=Mon
    dom        = tx_date.day
    is_weekend = int(dow >= 5)

    cs       = cat_stats.get(category, {"mean": amount, "std": 1.0})
    cat_mean = cs["mean"]
    cat_std  = max(cs["std"], 1.0)
    zscore   = (amount - cat_mean) / cat_std

    cat_enc = cat_index.get(category, len(cat_index))

    return [abs(amount), dow, dom, hour, zscore, cat_enc, is_weekend]


def _severity(score: float) -> str:
    """Map a raw anomaly score to a human-readable severity level."""
    if score < 0.05: return "normal"
    if score < 0.15: return "low"
    if score < 0.30: return "medium"
    if score < 0.50: return "high"
    return "critical"


def _reason(
    amount:    float,
    category:  str,
    hour:      int,
    dow:       int,
    zscore:    float,
    cat_stats: dict,
) -> str:
    """Generate a human-readable reason string for the anomaly."""
    reasons  = []
    cs       = cat_stats.get(category, {})
    cat_mean = cs.get("mean", 0)
    cat_max  = cat_mean * 3

    if abs(amount) > cat_max * 3:
        reasons.append(
            f"Amount ₹{abs(amount):,.0f} is "
            f"{abs(amount) / max(cat_mean, 1):.1f}× above average for {category}"
        )
    if zscore > 3.0:
        reasons.append(f"Z-score {zscore:.2f} — extremely unusual for this category")
    if hour is not None and (hour < 5 or hour > 23):
        reasons.append(f"Unusually late transaction at {hour:02d}:00")
    if abs(amount) >= 500_000:
        reasons.append(f"Very large transaction: ₹{abs(amount):,.0f}")
    if dow >= 5 and abs(amount) > cat_max:
        reasons.append("High-value weekend transaction")

    return "; ".join(reasons) if reasons else "Pattern deviates from historical norms"


# ── Public API ─────────────────────────────────────────────────────────────────
def score_transactions(transactions: list[dict]) -> list[dict]:
    """
    Score a list of transaction dicts.

    Each dict must contain:
        id         : int
        amount     : float   (negative = expense)
        category   : str
        date       : str     (ISO format: YYYY-MM-DD)
        description: str | None
        created_at : str | None  (ISO datetime; used for hour extraction)

    Returns a list of result dicts, one per input transaction, sorted by
    anomaly_score descending (most suspicious first).
    """
    if _model is None:
        _load()

    meta      = get_metadata()
    cat_stats = meta["cat_stats"]
    cat_index = meta["cat_index"]

    if not transactions:
        return []

    feature_rows = []
    for tx in transactions:
        amount = float(tx["amount"])
        if amount >= 0:
            feature_rows.append(None)   # income — skip
            continue

        tx_date = (
            date.fromisoformat(tx["date"])
            if isinstance(tx["date"], str)
            else tx["date"]
        )

        hour = 12  # default
        if tx.get("created_at"):
            try:
                hour = datetime.fromisoformat(str(tx["created_at"])).hour
            except (ValueError, TypeError):
                pass

        row = _build_feature_row(
            amount    = abs(amount),
            category  = tx["category"],
            tx_date   = tx_date,
            hour      = hour,
            cat_stats = cat_stats,
            cat_index = cat_index,
        )
        feature_rows.append(row)

    expense_indices = [i for i, r in enumerate(feature_rows) if r is not None]
    if not expense_indices:
        return []

    X_raw    = np.array([feature_rows[i] for i in expense_indices], dtype=float)
    X_scaled = _scaler.transform(X_raw)                    # type: ignore
    scores   = -_model.score_samples(X_scaled).tolist()    # type: ignore
    flags    = (_model.predict(X_scaled) == -1).tolist()   # type: ignore

    results = []
    for i, score, flagged in zip(expense_indices, scores, flags):
        tx     = transactions[i]
        amount = float(tx["amount"])
        dow    = (
            date.fromisoformat(tx["date"]).weekday()
            if isinstance(tx["date"], str)
            else tx["date"].weekday()
        )
        hour = 12
        if tx.get("created_at"):
            try:
                hour = datetime.fromisoformat(str(tx["created_at"])).hour
            except (ValueError, TypeError):
                pass

        cat_mean = cat_stats.get(tx["category"], {}).get("mean", abs(amount))
        cat_std  = max(cat_stats.get(tx["category"], {}).get("std", 1.0), 1.0)
        zscore   = (abs(amount) - cat_mean) / cat_std

        results.append({
            "transaction_id": tx["id"],
            "amount":         amount,
            "category":       tx["category"],
            "description":    tx.get("description"),
            "date":           tx["date"] if isinstance(tx["date"], str) else tx["date"].isoformat(),
            "anomaly_score":  round(score, 6),
            "is_anomaly":     bool(flagged),
            "severity":       _severity(score) if flagged else "normal",
            "reason":         _reason(abs(amount), tx["category"], hour, dow, zscore, cat_stats) if flagged else None,
            "zscore":         round(zscore, 3),
            "amount_vs_avg":  round(abs(amount) / max(cat_mean, 1), 2),
        })

    results.sort(key=lambda r: r["anomaly_score"], reverse=True)
    return results


def score_single(
    amount:      float,
    category:    str,
    tx_date:     date,
    hour:        int = 12,
    tx_id:       int = 0,
    description: str | None = None,
) -> dict:
    """Convenience wrapper to score a single transaction."""
    return score_transactions([{
        "id":          tx_id,
        "amount":      amount,
        "category":    category,
        "date":        tx_date.isoformat(),
        "description": description,
        "created_at":  None,
    }])