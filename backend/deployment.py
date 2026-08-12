"""
Deployment configuration for Vercel.
Handles environment-specific settings and CORS configuration.
"""

import os
from backend.config import settings


def get_allowed_origins():
    """Get allowed CORS origins based on environment."""
    
    if settings.environment == "production":
        return [
            settings.frontend_url,
            "https://your-domain.com",  # Update with your domain
        ]
    elif settings.environment == "staging":
        return [
            settings.frontend_url,
            "https://staging.your-domain.com",
        ]
    else:  # development
        return [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]


def get_database_url():
    """Get database URL, with fallback for Vercel."""
    url = os.getenv("DATABASE_URL")
    
    if url:
        # Ensure SQLAlchemy compatibility for PostgreSQL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url
    
    return settings.database_url
