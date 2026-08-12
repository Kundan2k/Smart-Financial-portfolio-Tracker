from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool, QueuePool, StaticPool
from config import settings
import os
import logging

logger = logging.getLogger(__name__)

# Determine which connection pool to use
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DATABASE_URL = settings.DATABASE_URL

# Use appropriate pool for environment
if "sqlite://" in DATABASE_URL or DATABASE_URL.startswith("sqlite:"):
    # SQLite uses StaticPool for in-memory databases
    logger.info(f"Using SQLite database: {DATABASE_URL}")
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool if ":memory:" in DATABASE_URL else QueuePool,
        echo=False,
    )
elif ENVIRONMENT == "production":
    # Serverless (Vercel) uses NullPool for PostgreSQL
    logger.info(f"Using PostgreSQL with NullPool for serverless")
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        echo=False,
        connect_args={"connect_timeout": 5},
    )
else:
    # Development uses QueuePool
    logger.info(f"Using {DATABASE_URL.split('://')[0]} with QueuePool for development")
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=False,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Ping the database. Returns True if reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.debug("Database connection successful")
        return True
    except Exception as e:
        logger.warning(f"Database connection failed: {e}")
        return False
