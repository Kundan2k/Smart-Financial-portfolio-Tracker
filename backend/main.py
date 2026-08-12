from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from config import settings
from db import check_db_connection
from db.database import Base, engine
from models import User, Transaction, Investment  # noqa: F401
from routers import (
    portfolio_router, auth_router,
    expenses_router,  analytics_router,
    investments_router, ml_router,
    fraud_router,
)

# Only initialize database if DATABASE_URL is properly set
if settings.DATABASE_URL and settings.DATABASE_URL != "sqlite:///./test.db":
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Could not initialize database: {e}")
else:
    # For development/testing with SQLite
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Could not initialize SQLite database: {e}")

app = FastAPI(
    title="Portfolio Tracker API",
    description="Smart Financial Portfolio Tracker — Phase 7",
    version="0.7.0",
)

# CORS configuration - supports both local development and production
def get_allowed_origins():
    """Get allowed CORS origins based on environment."""
    if settings.ENVIRONMENT == "production":
        return [
            "https://smart-financial-portfolio-tracker.vercel.app",
            "https://www.smart-financial-portfolio-tracker.vercel.app",
            settings.FRONTEND_URL,
        ]
    else:
        return [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            settings.FRONTEND_URL,
        ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,        prefix="/api")
app.include_router(expenses_router,    prefix="/api")
app.include_router(analytics_router,   prefix="/api")
app.include_router(investments_router, prefix="/api")
app.include_router(ml_router,          prefix="/api")
app.include_router(fraud_router,       prefix="/api")
app.include_router(portfolio_router,   prefix="/api")


@app.get("/api/health", tags=["health"])
def health_check():
    db_ok = check_db_connection()
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_ok else "unreachable",
    }


@app.get("/", tags=["root"])
def root():
    return {"message": "Portfolio Tracker API is running 🚀"}