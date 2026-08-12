"""
Vercel serverless function entry point for FastAPI backend.
This wraps the FastAPI app for Vercel's Python runtime.
"""

import sys
import os
from pathlib import Path

# Add backend directory to path so imports work correctly
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Import the FastAPI app
from main import app

# Export the app for Vercel
__all__ = ["app"]
