from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Database - default to in-memory SQLite for serverless
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///:memory:"  # In-memory database for serverless
    )
    
    # Security
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "change-me-in-production-use-strong-random-key"
    )
    ALGORITHM: str = "HS256"
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_URL: str = os.getenv("API_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()