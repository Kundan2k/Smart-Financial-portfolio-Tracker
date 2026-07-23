from datetime import date as DateType
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import get_current_user
from db import get_db
from models import Transaction, User
from schemas import (
    ExpenseCreate, ExpenseListResponse, ExpenseOut, ExpenseUpdate, MessageResponse,
)

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _get_or_404(expense_id: int, user: User, db: Session) -> Transaction:
    """Fetch a transaction owned by this user or raise 404."""
    tx = (
        db.query(Transaction)
        .filter(Transaction.id == expense_id, Transaction.user_id == user.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return tx


# ── POST /api/expenses/ ───────────────────────────────────────────────────────
@router.post("/", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    body: ExpenseCreate,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    tx = Transaction(
        user_id=user.id,
        amount=body.amount,
        category=body.category,
        description=body.description,
        date=body.date,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


# ── GET /api/expenses/ ────────────────────────────────────────────────────────
@router.get("/", response_model=ExpenseListResponse)
def list_expenses(
    category:  Optional[str]      = Query(None),
    date_from: Optional[DateType] = Query(None),
    date_to:   Optional[DateType] = Query(None),
    db:        Session             = Depends(get_db),
    user:      User                = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.user_id == user.id)

    if category:
        q = q.filter(Transaction.category == category)
    if date_from:
        q = q.filter(Transaction.date >= date_from)
    if date_to:
        q = q.filter(Transaction.date <= date_to)

    q = q.order_by(Transaction.date.desc(), Transaction.id.desc())
    items = q.all()

    income  = sum(tx.amount for tx in items if tx.amount > 0) or Decimal("0")
    expense = sum(tx.amount for tx in items if tx.amount < 0) or Decimal("0")

    return ExpenseListResponse(
        items=items,
        total=len(items),
        income=income,
        expense=expense,
        balance=income + expense,
    )


# ── GET /api/expenses/{id} ────────────────────────────────────────────────────
@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(
    expense_id: int,
    db:         Session = Depends(get_db),
    user:       User    = Depends(get_current_user),
):
    return _get_or_404(expense_id, user, db)


# ── PATCH /api/expenses/{id} ──────────────────────────────────────────────────
@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    body:       ExpenseUpdate,
    db:         Session = Depends(get_db),
    user:       User    = Depends(get_current_user),
):
    tx = _get_or_404(expense_id, user, db)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(tx, field, value)

    db.commit()
    db.refresh(tx)
    return tx


# ── DELETE /api/expenses/{id} ─────────────────────────────────────────────────
@router.delete("/{expense_id}", response_model=MessageResponse)
def delete_expense(
    expense_id: int,
    db:         Session = Depends(get_db),
    user:       User    = Depends(get_current_user),
):
    tx = _get_or_404(expense_id, user, db)
    db.delete(tx)
    db.commit()
    return MessageResponse(message=f"Expense {expense_id} deleted")