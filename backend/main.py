from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import logging

from config import settings
from db import check_db_connection
from db.database import Base, engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import models to register them
try:
    from models import User, Transaction, Investment  # noqa: F401
except Exception as e:
    logger.warning(f"Could not import models: {e}")

# Import routers
try:
    from routers import (
        portfolio_router, auth_router,
        expenses_router, analytics_router,
        investments_router, ml_router,
        fraud_router,
    )
except Exception as e:
    logger.warning(f"Could not import routers: {e}")
    portfolio_router = auth_router = expenses_router = None
    analytics_router = investments_router = ml_router = None
    fraud_router = None

# Initialize database tables (with error handling)
def init_db():
    """Initialize database tables safely."""
    try:
        if settings.DATABASE_URL and settings.DATABASE_URL != "sqlite:///./test.db":
            logger.info("Initializing PostgreSQL database...")
            Base.metadata.create_all(bind=engine)
            logger.info("Database initialized successfully")
        else:
            logger.info("Using SQLite database")
            Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Could not initialize database: {e}")
        logger.warning("Continuing without database initialization...")

# Startup event
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Application starting up...")
    init_db()
    yield
    # Shutdown
    logger.info("Application shutting down...")

app = FastAPI(
    title="Portfolio Tracker API",
    description="Smart Financial Portfolio Tracker — Phase 7",
    version="0.7.0",
    lifespan=lifespan,
)

# CORS configuration - allows both local development and production origins
def get_allowed_origins():
    """Get allowed CORS origins for both development and production."""
    return [
        # Production
        "https://smart-financial-portfolio-tracker.vercel.app",
        "https://www.smart-financial-portfolio-tracker.vercel.app",
        "https://smart-financial-portfolio-tracker-c.vercel.app",
        # Development
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        settings.FRONTEND_URL,
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers safely
try:
    if auth_router:
        app.include_router(auth_router, prefix="/api")
    if expenses_router:
        app.include_router(expenses_router, prefix="/api")
    if analytics_router:
        app.include_router(analytics_router, prefix="/api")
    if investments_router:
        app.include_router(investments_router, prefix="/api")
    if ml_router:
        app.include_router(ml_router, prefix="/api")
    if fraud_router:
        app.include_router(fraud_router, prefix="/api")
    if portfolio_router:
        app.include_router(portfolio_router, prefix="/api")
    logger.info("All routers registered successfully")
except Exception as e:
    logger.warning(f"Could not register some routers: {e}")


@app.options("/{full_path:path}")
async def preflight_handler(full_path: str):
    """Handle CORS preflight requests."""
    return {"status": "ok"}


@app.get("/api/health", tags=["health"])
def health_check():
    """Health check endpoint - minimal database dependency."""
    try:
        db_ok = check_db_connection()
    except Exception as e:
        logger.warning(f"Health check database error: {e}")
        db_ok = False
    
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_ok else "unreachable",
    }


@app.get("/", tags=["root"])
def root():
    """Root endpoint - no database dependency."""
    return {"message": "Portfolio Tracker API is running 🚀"}