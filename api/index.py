import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

# Make backend the first import location.
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app

__all__ = ["app"]
