from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Portfolio Tracker API",
    description="Smart Financial Portfolio Tracker — Phase 7",
    version="0.7.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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