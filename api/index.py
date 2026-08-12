"""
Vercel serverless function entry point for FastAPI backend.
This wraps the FastAPI app for Vercel's Python runtime.
"""

import sys
import os
from pathlib import Path

# Add backend directory to path so imports work correctly
backend_path = Path(__file__).parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

try:
    # Import the FastAPI app
    from main import app
except ImportError as e:
    print(f"Error importing FastAPI app: {e}")
    # Fallback: create a minimal app
    from fastapi import FastAPI
    app = FastAPI()
    
    @app.get("/health")
    def health():
        return {"status": "error", "message": f"Failed to import main app: {e}"}

# Export the app for Vercel
__all__ = ["app"]
