import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parent

# Vercel build puts the backend package here:
# api/app/
sys.path.insert(0, str(API_DIR))

from app.main import app

__all__ = ["app"]
