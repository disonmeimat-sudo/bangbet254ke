import sys
from pathlib import Path

# Put the deployed backend package on Python's import path.
ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.main import app

__all__ = ["app"]
