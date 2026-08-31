import sys
from pathlib import Path

# The FastAPI application package lives directly inside /api.
API_DIR = Path(__file__).resolve().parent

# Ensure /api is the first import location.
sys.path.insert(0, str(API_DIR))

from app.main import app

__all__ = ["app"]
