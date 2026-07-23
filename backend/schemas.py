import re
from pydantic import BaseModel, EmailStr, field_validator


# ── Request bodies ────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name:     str
    email:    EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


# ── Response bodies ───────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id:    int
    name:  str
    email: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    user:          UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


class MessageResponse(BaseModel):
    message: str

# ── Expense / Transaction schemas ─────────────────────────────────────────────
from datetime import date as DateType
from decimal import Decimal
from typing import Optional

VALID_CATEGORIES = {
    "Food & Dining", "Transport", "Housing", "Healthcare",
    "Shopping", "Entertainment", "Education", "Investment",
    "Income", "Other",
}


class ExpenseCreate(BaseModel):
    amount:      Decimal
    category:    str
    description: Optional[str] = None
    date:        DateType

    @field_validator("amount")
    @classmethod
    def amount_nonzero(cls, v: Decimal) -> Decimal:
        if v == 0:
            raise ValueError("Amount must not be zero")
        return v

    @field_validator("category")
    @classmethod
    def category_valid(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}")
        return v


class ExpenseUpdate(BaseModel):
    amount:      Optional[Decimal]  = None
    category:    Optional[str]      = None
    description: Optional[str]      = None
    date:        Optional[DateType] = None

    @field_validator("amount")
    @classmethod
    def amount_nonzero(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v == 0:
            raise ValueError("Amount must not be zero")
        return v

    @field_validator("category")
    @classmethod
    def category_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}")
        return v


class ExpenseOut(BaseModel):
    id:          int
    user_id:     int
    amount:      Decimal
    category:    str
    description: Optional[str]
    date:        DateType

    model_config = {"from_attributes": True}


class ExpenseListResponse(BaseModel):
    items:   list[ExpenseOut]
    total:   int
    income:  Decimal
    expense: Decimal
    balance: Decimal

# ── Analytics / Dashboard schemas ─────────────────────────────────────────────
class MonthlyPoint(BaseModel):
    month:     str
    month_num: int
    income:    Decimal
    expense:   Decimal


class CategorySummary(BaseModel):
    category: str
    total:    Decimal


class DashboardSummary(BaseModel):
    year:          int
    total_income:  Decimal
    total_expense: Decimal
    balance:       Decimal
    month_income:  Decimal
    month_expense: Decimal
    total_entries: int
    monthly:       list[MonthlyPoint]
    by_category:   list[CategorySummary]

# ── Analytics / Dashboard schemas ─────────────────────────────────────────────
class MonthlyPoint(BaseModel):
    month:     str
    month_num: int
    income:    Decimal
    expense:   Decimal


class CategorySummary(BaseModel):
    category: str
    total:    Decimal


class DashboardSummary(BaseModel):
    year:          int
    total_income:  Decimal
    total_expense: Decimal
    balance:       Decimal
    month_income:  Decimal
    month_expense: Decimal
    total_entries: int
    monthly:       list[MonthlyPoint]
    by_category:   list[CategorySummary]

# ── Investment schemas ────────────────────────────────────────────────────────
from datetime import date as _DateType
from decimal  import Decimal as _Decimal
from typing   import Optional as _Optional

VALID_ASSET_TYPES = {
    "Stock", "Crypto", "ETF", "Mutual Fund", "Bond",
    "Real Estate", "Commodity", "Other",
}


class InvestmentCreate(BaseModel):
    asset_name:     str
    asset_type:     str
    ticker:         _Optional[str]       = None
    quantity:       _Decimal
    purchase_price: _Decimal
    purchase_date:  _Optional[_DateType] = None
    notes:          _Optional[str]       = None

    @field_validator("asset_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Asset name is required")
        return v

    @field_validator("asset_type")
    @classmethod
    def type_valid(cls, v: str) -> str:
        if v not in VALID_ASSET_TYPES:
            raise ValueError(f"Asset type must be one of: {', '.join(sorted(VALID_ASSET_TYPES))}")
        return v

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: _Decimal) -> _Decimal:
        if v <= 0:
            raise ValueError("Quantity must be positive")
        return v

    @field_validator("purchase_price")
    @classmethod
    def price_positive(cls, v: _Decimal) -> _Decimal:
        if v <= 0:
            raise ValueError("Purchase price must be positive")
        return v


class InvestmentUpdate(BaseModel):
    asset_name:     _Optional[str]       = None
    asset_type:     _Optional[str]       = None
    ticker:         _Optional[str]       = None
    quantity:       _Optional[_Decimal]  = None
    purchase_price: _Optional[_Decimal]  = None
    purchase_date:  _Optional[_DateType] = None
    notes:          _Optional[str]       = None

    @field_validator("asset_type")
    @classmethod
    def type_valid(cls, v: _Optional[str]) -> _Optional[str]:
        if v is not None and v not in VALID_ASSET_TYPES:
            raise ValueError(f"Asset type must be one of: {', '.join(sorted(VALID_ASSET_TYPES))}")
        return v


class InvestmentOut(BaseModel):
    id:             int
    user_id:        int
    asset_name:     str
    asset_type:     str
    ticker:         _Optional[str]
    quantity:       _Decimal
    purchase_price: _Decimal
    purchase_date:  _Optional[_DateType]
    notes:          _Optional[str]

    # Computed on the fly in the router
    total_invested: _Decimal
    current_value:  _Decimal   # Phase 5: same as cost — live price is Phase 6
    gain_loss:      _Decimal
    gain_loss_pct:  _Decimal

    model_config = {"from_attributes": True}


class PortfolioSummary(BaseModel):
    investments:     list[InvestmentOut]
    total_count:     int
    total_invested:  _Decimal
    current_value:   _Decimal
    total_gain_loss: _Decimal
    by_type:         dict[str, _Decimal]   # asset_type → total invested

# ── ML / Prediction schemas ───────────────────────────────────────────────────
class MLPredictRequest(BaseModel):
    monthly_income:    float
    monthly_savings:   float
    current_portfolio: float

    @field_validator("monthly_income")
    @classmethod
    def income_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Monthly income must be positive")
        return v

    @field_validator("monthly_savings")
    @classmethod
    def savings_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Monthly savings cannot be negative")
        return v

    @field_validator("current_portfolio")
    @classmethod
    def portfolio_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Current portfolio value cannot be negative")
        return v


class MonthlyForecastPoint(BaseModel):
    month:          int
    label:          str
    forecast_value: float


class InputsUsed(BaseModel):
    monthly_income:      float
    monthly_savings:     float
    current_portfolio:   float
    savings_rate:        float
    income_to_portfolio: float


class ModelMetrics(BaseModel):
    r2:   float
    mae:  float
    rmse: float


class MLPredictResponse(BaseModel):
    forecast_6m:       float
    forecast_12m:      float
    gain_6m:           float
    gain_12m:          float
    gain_pct_6m:       float
    gain_pct_12m:      float
    monthly_breakdown: list[MonthlyForecastPoint]
    model_metrics:     dict
    inputs_used:       InputsUsed


class MLStatusResponse(BaseModel):
    ready:   bool
    message: str


class MLModelInfoResponse(BaseModel):
    features:     list[str]
    n_samples:    int
    metrics_6m:   dict
    metrics_12m:  dict
    coefficients: dict    

# ── Fraud / Anomaly Detection schemas (Phase 7) ───────────────────────────────
from typing import Optional as _Opt


class FraudAlertItem(BaseModel):
    transaction_id: int
    amount:         float
    category:       str
    description:    _Opt[str]
    date:           str
    anomaly_score:  float
    is_anomaly:     bool
    severity:       str        # normal | low | medium | high | critical
    reason:         _Opt[str]
    zscore:         float
    amount_vs_avg:  float


class FraudScanResponse(BaseModel):
    scanned:   int
    anomalies: int
    alerts:    list[FraudAlertItem]
    summary:   dict


class FraudStatusResponse(BaseModel):
    ready:   bool
    message: str


class FraudModelInfoResponse(BaseModel):
    features:      list[str]
    n_estimators:  int
    contamination: float
    metrics:       dict
    categories:    list[str]    