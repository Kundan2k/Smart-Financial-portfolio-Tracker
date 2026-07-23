"""
backend/ml/train.py
═══════════════════
Phase 6 — Linear Regression training script.

Run from the project root:
    python -m backend.ml.train

What it does
────────────
1. Generates a realistic synthetic dataset of 2 000 financial profiles.
2. Builds two LinearRegression models:
      • model_6m  → predicts portfolio value 6 months from now
      • model_12m → predicts portfolio value 12 months from now
3. Evaluates each model (R², MAE, RMSE) on a 20 % hold-out test set.
4. Saves the trained models + the fitted StandardScaler to
   backend/ml/artifacts/  as .joblib files.

Features (inputs)
──────────────────
  monthly_income      — gross monthly income (₹)
  monthly_savings     — amount saved each month (₹)
  current_portfolio   — current total portfolio value (₹)
  savings_rate        — monthly_savings / monthly_income  (derived)
  income_to_portfolio — monthly_income / current_portfolio (derived)
"""

import os
import json
import numpy  as np
import joblib

from pathlib             import Path
from sklearn.linear_model   import LinearRegression
from sklearn.preprocessing  import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics         import (
    r2_score, mean_absolute_error, mean_squared_error,
)

# ── paths ─────────────────────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

SEED = 42
np.random.seed(SEED)

N = 2_000   # number of synthetic training samples


# ── 1. Synthetic data generation ──────────────────────────────────────────────
def generate_dataset(n: int) -> tuple:
    """
    Generate realistic financial profiles and forward-simulate
    portfolio growth using a monthly compounding model with noise.

    Growth model per month:
        portfolio_{t+1} = portfolio_t * (1 + r) + savings_t
    where r ~ Normal(0.008, 0.003) — approx 9.6 % annual return.
    """
    monthly_income    = np.random.uniform(20_000,  300_000, n)    # ₹20k – ₹3L
    savings_rate      = np.random.uniform(0.05,    0.45,    n)    # 5 % – 45 %
    monthly_savings   = monthly_income * savings_rate
    current_portfolio = np.random.uniform(50_000, 5_000_000, n)  # ₹50k – ₹50L

    # Simulate future portfolio values
    def simulate(months: int) -> np.ndarray:
        pf = current_portfolio.copy().astype(float)
        for _ in range(months):
            monthly_return = np.random.normal(0.008, 0.003, n)
            pf = pf * (1 + monthly_return) + monthly_savings
        # Add small noise to prevent perfect linear fit
        noise = np.random.normal(1.0, 0.01, n)
        return pf * noise

    target_6m  = simulate(6)
    target_12m = simulate(12)

    # Feature matrix — raw + derived
    income_to_portfolio = monthly_income / (current_portfolio + 1)  # avoid /0
    X = np.column_stack([
        monthly_income,
        monthly_savings,
        current_portfolio,
        savings_rate,
        income_to_portfolio,
    ])

    return X, target_6m, target_12m


# ── 2. Train & evaluate ────────────────────────────────────────────────────────
def train_and_evaluate(
    X_train, X_test, y_train, y_test, label: str
) -> tuple[LinearRegression, dict]:
    model = LinearRegression()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    r2     = r2_score(y_test, y_pred)
    mae    = mean_absolute_error(y_test, y_pred)
    rmse   = float(np.sqrt(mean_squared_error(y_test, y_pred)))

    metrics = {"r2": round(r2, 4), "mae": round(mae, 2), "rmse": round(rmse, 2)}
    print(f"\n── {label} ──────────────────────────────")
    print(f"   R²   : {r2:.4f}")
    print(f"   MAE  : ₹{mae:,.2f}")
    print(f"   RMSE : ₹{rmse:,.2f}")
    return model, metrics


# ── 3. Main ───────────────────────────────────────────────────────────────────
def main():
    print("=" * 52)
    print("  Phase 6 — Linear Regression Training Script")
    print("=" * 52)

    print(f"\n[1/4] Generating {N:,} synthetic financial profiles …")
    X, y_6m, y_12m = generate_dataset(N)

    print("[2/4] Splitting into train / test (80 / 20) …")
    (X_train, X_test,
     y6_train, y6_test,
     y12_train, y12_test) = train_test_split(
        X, y_6m, y_12m, test_size=0.2, random_state=SEED
    )

    print("[3/4] Fitting StandardScaler on training features …")
    scaler    = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    print("[4/4] Training models …")
    model_6m,  metrics_6m  = train_and_evaluate(
        X_train_s, X_test_s, y6_train,  y6_test,  "6-month model"
    )
    model_12m, metrics_12m = train_and_evaluate(
        X_train_s, X_test_s, y12_train, y12_test, "12-month model"
    )

    # ── Save artifacts ─────────────────────────────────────────────────────────
    joblib.dump(scaler,    ARTIFACTS_DIR / "scaler.joblib")
    joblib.dump(model_6m,  ARTIFACTS_DIR / "model_6m.joblib")
    joblib.dump(model_12m, ARTIFACTS_DIR / "model_12m.joblib")

    # Save metadata (feature names, metrics, training info)
    metadata = {
        "features": [
            "monthly_income",
            "monthly_savings",
            "current_portfolio",
            "savings_rate",
            "income_to_portfolio",
        ],
        "n_samples":    N,
        "test_size":    0.2,
        "random_seed":  SEED,
        "model_6m":     metrics_6m,
        "model_12m":    metrics_12m,
        "coefficients": {
            "6m":  model_6m.coef_.tolist(),
            "12m": model_12m.coef_.tolist(),
        },
        "intercepts": {
            "6m":  float(model_6m.intercept_),
            "12m": float(model_12m.intercept_),
        },
    }
    with open(ARTIFACTS_DIR / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n✓ Artifacts saved to: {ARTIFACTS_DIR.resolve()}")
    print("    scaler.joblib")
    print("    model_6m.joblib")
    print("    model_12m.joblib")
    print("    metadata.json")
    print("\nDone. You can now start the FastAPI server.\n")


if __name__ == "__main__":
    main()