from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/")
def get_portfolio(db: Session = Depends(get_db)):
    """Return the user's portfolio. Placeholder for Phase 1."""
    return {
        "holdings": [],
        "total_value": 0.0,
        "message": "Phase 1 — connect your holdings to get started.",
    }
