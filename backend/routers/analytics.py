from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, extract
from sqlalchemy.orm import Session

from auth import get_current_user
from db import get_db
from models import Transaction, User
from schemas import (
    CategorySummary, DashboardSummary, MonthlyPoint,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ── GET /api/analytics/dashboard ─────────────────────────────────────────────
@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(
    year:  Optional[int] = Query(None, description="Filter to a specific year"),
    db:    Session        = Depends(get_db),
    user:  User           = Depends(get_current_user),
):
    target_year = year or date.today().year

    # ── All-time totals ───────────────────────────────────────────────────────
    all_rows = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    total_income  = sum(t.amount for t in all_rows if t.amount > 0) or Decimal("0")
    total_expense = sum(t.amount for t in all_rows if t.amount < 0) or Decimal("0")
    balance       = total_income + total_expense

    # ── This-month totals ─────────────────────────────────────────────────────
    today = date.today()
    month_rows = [
        t for t in all_rows
        if t.date.year == today.year and t.date.month == today.month
    ]
    month_income  = sum(t.amount for t in month_rows if t.amount > 0) or Decimal("0")
    month_expense = sum(t.amount for t in month_rows if t.amount < 0) or Decimal("0")

    # ── Monthly bar-chart data (12 months of target_year) ────────────────────
    monthly_raw = (
        db.query(
            extract("month", Transaction.date).label("month"),
            func.sum(
                case((Transaction.amount > 0, Transaction.amount), else_=0)
            ).label("income"),
            func.sum(
                case((Transaction.amount < 0, Transaction.amount), else_=0)
            ).label("expense"),
        )
        .filter(
            Transaction.user_id == user.id,
            extract("year", Transaction.date) == target_year,
        )
        .group_by("month")
        .all()
    )

    MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
                   "Jul","Aug","Sep","Oct","Nov","Dec"]
    monthly_map = {int(r.month): r for r in monthly_raw}
    monthly = [
        MonthlyPoint(
            month     = MONTH_NAMES[m - 1],
            month_num = m,
            income    = Decimal(str(monthly_map[m].income  or 0)) if m in monthly_map else Decimal("0"),
            expense   = abs(Decimal(str(monthly_map[m].expense or 0))) if m in monthly_map else Decimal("0"),
        )
        for m in range(1, 13)
    ]

    # ── Category pie-chart data (expense only, target_year) ──────────────────
    cat_raw = (
        db.query(
            Transaction.category,
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.user_id == user.id,
            Transaction.amount  < 0,
            extract("year", Transaction.date) == target_year,
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount))
        .all()
    )
    by_category = [
        CategorySummary(
            category = r.category,
            total    = abs(Decimal(str(r.total))),
        )
        for r in cat_raw
    ]

    return DashboardSummary(
        year          = target_year,
        total_income  = total_income,
        total_expense = abs(total_expense),
        balance       = balance,
        month_income  = month_income,
        month_expense = abs(month_expense),
        total_entries = len(all_rows),
        monthly       = monthly,
        by_category   = by_category,
    )