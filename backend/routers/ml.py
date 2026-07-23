"""
backend/routers/ml.py
══════════════════════
Phase 6 — ML prediction endpoints.

Endpoints
─────────
POST /api/ml/predict      — run forecast for given inputs
GET  /api/ml/status       — check if model artifacts are loaded
GET  /api/ml/model-info   — return model metrics and feature metadata
"""

from fastapi import APIRouter, Depends, HTTPException, status

from auth    import get_current_user
from models  import User
from schemas import (
    MLPredictRequest, MLPredictResponse,
    MLStatusResponse, MLModelInfoResponse,
)
from ml      import predictor

router = APIRouter(prefix="/ml", tags=["ml"])


# ── GET /api/ml/status ────────────────────────────────────────────────────────
@router.get("/status", response_model=MLStatusResponse)
def ml_status():
    """Public endpoint — check whether model artifacts are available."""
    ready = predictor.is_ready()
    return MLStatusResponse(
        ready=ready,
        message=(
            "Models loaded and ready for predictions."
            if ready else
            "Models not found. Run `python -m backend.ml.train` first."
        ),
    )


# ── GET /api/ml/model-info ────────────────────────────────────────────────────
@router.get("/model-info", response_model=MLModelInfoResponse)
def model_info(user: User = Depends(get_current_user)):
    """Return model metrics and feature list (requires auth)."""
    if not predictor.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML models not trained yet. Run the training script first.",
        )
    meta = predictor.get_metadata()
    return MLModelInfoResponse(
        features     = meta["features"],
        n_samples    = meta["n_samples"],
        metrics_6m   = meta["model_6m"],
        metrics_12m  = meta["model_12m"],
        coefficients = meta["coefficients"],
    )


# ── POST /api/ml/predict ──────────────────────────────────────────────────────
@router.post("/predict", response_model=MLPredictResponse)
def predict(
    body: MLPredictRequest,
    user: User = Depends(get_current_user),
):
    """
    Run the linear regression models and return 6-month and 12-month
    portfolio value forecasts along with a monthly breakdown for charting.
    """
    if not predictor.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML models not trained yet. Run `python -m backend.ml.train` first.",
        )

    try:
        result = predictor.predict(
            monthly_income    = body.monthly_income,
            monthly_savings   = body.monthly_savings,
            current_portfolio = body.current_portfolio,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {exc}",
        )

    return MLPredictResponse(**result)