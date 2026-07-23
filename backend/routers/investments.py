from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import get_current_user
from db import get_db
from models import Investment, User
from schemas import (
    InvestmentCreate, InvestmentOut, InvestmentUpdate,
    MessageResponse, PortfolioSummary,
)

router = APIRouter(prefix="/investments", tags=["investments"])


# ── helpers ───────────────────────────────────────────────────────────────────
def _enrich(inv: Investment) -> dict:
    """Add computed fields to a raw Investment ORM row."""
    total   = Decimal(str(inv.quantity)) * Decimal(str(inv.purchase_price))
    # Phase 5: current_value = cost basis (live prices added in Phase 6)
    current = total
    gain    = current - total
    pct     = (gain / total * 100) if total else Decimal("0")
    return {
        **{c.name: getattr(inv, c.name) for c in inv.__table__.columns},
        "total_invested": total,
        "current_value":  current,
        "gain_loss":      gain,
        "gain_loss_pct":  pct,
    }


def _get_or_404(inv_id: int, user: User, db: Session) -> Investment:
    inv = (
        db.query(Investment)
        .filter(Investment.id == inv_id, Investment.user_id == user.id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found")
    return inv


# ── POST /api/investments/ ────────────────────────────────────────────────────
@router.post("/", response_model=InvestmentOut, status_code=status.HTTP_201_CREATED)
def create_investment(
    body: InvestmentCreate,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    inv = Investment(user_id=user.id, **body.model_dump())
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return InvestmentOut(**_enrich(inv))


# ── GET /api/investments/ ─────────────────────────────────────────────────────
@router.get("/", response_model=PortfolioSummary)
def list_investments(
    asset_type: Optional[str] = Query(None),
    db:         Session        = Depends(get_db),
    user:       User           = Depends(get_current_user),
):
    q = db.query(Investment).filter(Investment.user_id == user.id)
    if asset_type:
        q = q.filter(Investment.asset_type == asset_type)
    q = q.order_by(Investment.created_at.desc())
    rows = q.all()

    enriched = [InvestmentOut(**_enrich(r)) for r in rows]

    total_invested  = sum(e.total_invested for e in enriched) or Decimal("0")
    current_value   = sum(e.current_value  for e in enriched) or Decimal("0")
    total_gain_loss = current_value - total_invested

    # Group invested amount by asset type
    by_type: dict[str, Decimal] = {}
    for e in enriched:
        by_type[e.asset_type] = by_type.get(e.asset_type, Decimal("0")) + e.total_invested

    return PortfolioSummary(
        investments     = enriched,
        total_count     = len(enriched),
        total_invested  = total_invested,
        current_value   = current_value,
        total_gain_loss = total_gain_loss,
        by_type         = by_type,
    )


# ── GET /api/investments/{id} ─────────────────────────────────────────────────
@router.get("/{inv_id}", response_model=InvestmentOut)
def get_investment(
    inv_id: int,
    db:     Session = Depends(get_db),
    user:   User    = Depends(get_current_user),
):
    return InvestmentOut(**_enrich(_get_or_404(inv_id, user, db)))


# ── PATCH /api/investments/{id} ───────────────────────────────────────────────
@router.patch("/{inv_id}", response_model=InvestmentOut)
def update_investment(
    inv_id: int,
    body:   InvestmentUpdate,
    db:     Session = Depends(get_db),
    user:   User    = Depends(get_current_user),
):
    inv = _get_or_404(inv_id, user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return InvestmentOut(**_enrich(inv))


# ── DELETE /api/investments/{id} ──────────────────────────────────────────────
@router.delete("/{inv_id}", response_model=MessageResponse)
def delete_investment(
    inv_id: int,
    db:     Session = Depends(get_db),
    user:   User    = Depends(get_current_user),
):
    inv = _get_or_404(inv_id, user, db)
    db.delete(inv)
    db.commit()
    return MessageResponse(message=f"Investment {inv_id} deleted")