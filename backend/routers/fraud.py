"""
backend/routers/fraud.py
═════════════════════════
Phase 7 — Fraud / anomaly detection endpoints.

Endpoints
─────────
GET  /api/fraud/status          — check if model artifacts are ready (public)
POST /api/fraud/scan            — score a list of raw transaction dicts
GET  /api/fraud/scan-expenses   — auto-pull user's expenses & scan them
GET  /api/fraud/model-info      — return model metadata + metrics (auth)
"""

from typing  import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth    import get_current_user
from db      import get_db
from models  import Transaction, User
from schemas import (
    FraudStatusResponse, FraudScanResponse,
    FraudModelInfoResponse, FraudAlertItem,
)
from fraud   import detector

router = APIRouter(prefix="/fraud", tags=["fraud"])


# ── GET /api/fraud/status ─────────────────────────────────────────────────────
@router.get("/status", response_model=FraudStatusResponse)
def fraud_status():
    """Public — returns whether the Isolation Forest model is trained."""
    ready = detector.is_ready()
    return FraudStatusResponse(
        ready=ready,
        message=(
            "Isolation Forest model ready for anomaly detection."
            if ready else
            "Model not trained. Run `python -m backend.fraud.train` first."
        ),
    )


# ── GET /api/fraud/scan-expenses ──────────────────────────────────────────────
@router.get("/scan-expenses", response_model=FraudScanResponse)
def scan_user_expenses(
    limit:    int            = Query(100, ge=1, le=500),
    category: Optional[str] = Query(None),
    db:       Session        = Depends(get_db),
    user:     User           = Depends(get_current_user),
):
    """
    Pull the authenticated user's expense transactions from the DB and
    run the anomaly detector on all of them (or a filtered subset).
    Results are sorted by anomaly_score descending.
    """
    if not detector.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Fraud model not trained. Run `python -m backend.fraud.train` first.",
        )

    q = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id, Transaction.amount < 0)
        .order_by(Transaction.date.desc())
    )
    if category:
        q = q.filter(Transaction.category == category)
    expenses = q.limit(limit).all()

    if not expenses:
        return FraudScanResponse(scanned=0, anomalies=0, alerts=[], summary={})

    tx_dicts = [
        {
            "id":          e.id,
            "amount":      float(e.amount),
            "category":    e.category,
            "date":        e.date.isoformat(),
            "description": e.description,
            "created_at":  e.created_at.isoformat() if e.created_at else None,
        }
        for e in expenses
    ]

    results = detector.score_transactions(tx_dicts)
    alerts  = [r for r in results if r["is_anomaly"]]

    cat_counts: dict[str, int] = {}
    for a in alerts:
        cat_counts[a["category"]] = cat_counts.get(a["category"], 0) + 1

    sev_counts: dict[str, int] = {}
    for a in alerts:
        sev_counts[a["severity"]] = sev_counts.get(a["severity"], 0) + 1

    return FraudScanResponse(
        scanned   = len(results),
        anomalies = len(alerts),
        alerts    = [FraudAlertItem(**a) for a in alerts],
        summary   = {
            "anomaly_rate_pct":  round(len(alerts) / max(len(results), 1) * 100, 2),
            "by_category":       cat_counts,
            "by_severity":       sev_counts,
            "top_anomaly_score": round(max((r["anomaly_score"] for r in results), default=0), 4),
        },
    )


# ── POST /api/fraud/scan ──────────────────────────────────────────────────────
@router.post("/scan", response_model=FraudScanResponse)
def scan_transactions(
    payload: list[dict],
    user:    User = Depends(get_current_user),
):
    """Score a raw list of transaction dicts supplied by the client."""
    if not detector.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Fraud model not trained.",
        )
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Transaction list is empty.",
        )

    results = detector.score_transactions(payload)
    alerts  = [r for r in results if r["is_anomaly"]]

    return FraudScanResponse(
        scanned   = len(results),
        anomalies = len(alerts),
        alerts    = [FraudAlertItem(**a) for a in alerts],
        summary   = {
            "anomaly_rate_pct": round(len(alerts) / max(len(results), 1) * 100, 2),
        },
    )


# ── GET /api/fraud/model-info ─────────────────────────────────────────────────
@router.get("/model-info", response_model=FraudModelInfoResponse)
def fraud_model_info(user: User = Depends(get_current_user)):
    if not detector.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Fraud model not trained.",
        )
    meta = detector.get_metadata()
    return FraudModelInfoResponse(
        features      = meta["features"],
        n_estimators  = meta["n_estimators"],
        contamination = meta["contamination"],
        metrics       = meta["metrics"],
        categories    = meta["categories"],
    )