"""
backend/ml/predictor.py
════════════════════════
Loads the trained artifacts once at startup and exposes a single
`predict()` function used by the FastAPI router.
"""

from __future__ import annotations

import json
import numpy as np
import joblib

from pathlib import Path
from typing  import Optional

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"

# ── Lazy-load singletons (loaded once on first call) ──────────────────────────
_scaler:    Optional[object] = None
_model_6m:  Optional[object] = None
_model_12m: Optional[object] = None
_metadata:  Optional[dict]   = None


def _load() -> None:
    """Load all artifacts into module-level singletons."""
    global _scaler, _model_6m, _model_12m, _metadata

    required = ["scaler.joblib", "model_6m.joblib", "model_12m.joblib", "metadata.json"]
    missing  = [f for f in required if not (ARTIFACTS_DIR / f).exists()]
    if missing:
        raise FileNotFoundError(
            f"ML artifacts not found: {missing}. "
            f"Run `python -m backend.ml.train` first."
        )

    _scaler    = joblib.load(ARTIFACTS_DIR / "scaler.joblib")
    _model_6m  = joblib.load(ARTIFACTS_DIR / "model_6m.joblib")
    _model_12m = joblib.load(ARTIFACTS_DIR / "model_12m.joblib")
    with open(ARTIFACTS_DIR / "metadata.json") as f:
        _metadata = json.load(f)


def is_ready() -> bool:
    """Return True if all artifact files exist on disk."""
    return all(
        (ARTIFACTS_DIR / f).exists()
        for f in ["scaler.joblib", "model_6m.joblib", "model_12m.joblib"]
    )


def get_metadata() -> dict:
    if _metadata is None:
        _load()
    return _metadata  # type: ignore[return-value]


def predict(
    monthly_income:    float,
    monthly_savings:   float,
    current_portfolio: float,
) -> dict:
    """
    Run both regression models and return a structured prediction dict.

    Parameters
    ──────────
    monthly_income    : gross monthly income in ₹
    monthly_savings   : amount saved per month in ₹
    current_portfolio : current total portfolio value in ₹

    Returns
    ───────
    {
        "forecast_6m":        float,   # predicted portfolio value in 6 months
        "forecast_12m":       float,   # predicted portfolio value in 12 months
        "gain_6m":            float,   # absolute gain over current portfolio
        "gain_12m":           float,
        "gain_pct_6m":        float,   # percentage gain
        "gain_pct_12m":       float,
        "monthly_breakdown":  list,    # 12-item list for chart rendering
        "model_metrics":      dict,    # R², MAE, RMSE for both models
        "inputs_used":        dict,    # echo inputs + derived features
    }
    """
    if _scaler is None:
        _load()

    # ── Build feature vector ───────────────────────────────────────────────────
    savings_rate        = monthly_savings / (monthly_income + 1e-9)
    income_to_portfolio = monthly_income  / (current_portfolio + 1e-9)

    X_raw = np.array([[
        monthly_income,
        monthly_savings,
        current_portfolio,
        savings_rate,
        income_to_portfolio,
    ]])
    X_scaled = _scaler.transform(X_raw)  # type: ignore[union-attr]

    # ── Run models ─────────────────────────────────────────────────────────────
    forecast_6m  = float(_model_6m.predict(X_scaled)[0])   # type: ignore[union-attr]
    forecast_12m = float(_model_12m.predict(X_scaled)[0])  # type: ignore[union-attr]

    # Clamp to ≥ 0 (portfolio can't be negative in our model)
    forecast_6m  = max(forecast_6m,  0.0)
    forecast_12m = max(forecast_12m, 0.0)

    gain_6m  = forecast_6m  - current_portfolio
    gain_12m = forecast_12m - current_portfolio
    gain_pct_6m  = (gain_6m  / current_portfolio * 100) if current_portfolio else 0.0
    gain_pct_12m = (gain_12m / current_portfolio * 100) if current_portfolio else 0.0

    # ── Monthly interpolated breakdown (for chart) ─────────────────────────────
    # Linear interpolation between current → 6m → 12m for each of 12 points.
    monthly_breakdown = []
    for m in range(1, 13):
        if m <= 6:
            # interpolate current → forecast_6m
            t = m / 6.0
            value = current_portfolio + t * gain_6m
        else:
            # interpolate forecast_6m → forecast_12m
            t = (m - 6) / 6.0
            value = forecast_6m + t * (forecast_12m - forecast_6m)
        monthly_breakdown.append({
            "month":          m,
            "label":          f"M{m}",
            "forecast_value": round(value, 2),
        })

    # ── Metadata passthrough ───────────────────────────────────────────────────
    meta = get_metadata()
    model_metrics = {
        "6m":  meta.get("model_6m",  {}),
        "12m": meta.get("model_12m", {}),
    }

    return {
        "forecast_6m":       round(forecast_6m,  2),
        "forecast_12m":      round(forecast_12m, 2),
        "gain_6m":           round(gain_6m,  2),
        "gain_12m":          round(gain_12m, 2),
        "gain_pct_6m":       round(gain_pct_6m,  2),
        "gain_pct_12m":      round(gain_pct_12m, 2),
        "monthly_breakdown": monthly_breakdown,
        "model_metrics":     model_metrics,
        "inputs_used": {
            "monthly_income":      monthly_income,
            "monthly_savings":     monthly_savings,
            "current_portfolio":   current_portfolio,
            "savings_rate":        round(savings_rate * 100, 2),      # as %
            "income_to_portfolio": round(income_to_portfolio, 6),
        },
    }