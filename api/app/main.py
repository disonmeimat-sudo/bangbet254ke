from fastapi import FastAPI
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine

# Import all models so SQLAlchemy registers them.
from app.models.user import User
from app.models.league import League
from app.models.team import Team
from app.models.match import Match
from app.models.market import Market
from app.models.odd import Odd
from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.models.bet import Bet

from app.api.auth import router as auth_router
from app.api.leagues import router as leagues_router
from app.api.teams import router as teams_router
from app.api.matches import router as matches_router
from app.api.public_api.matches import router as public_matches_router
from app.api.admin.transactions import router as admin_transactions_router
from app.api.admin.markets import router as admin_markets_router
from app.api.admin.odds import router as admin_odds_router
from app.api.admin.users import router as admin_users_router
from app.api.public_api.wallet import router as wallet_router
from app.api.public_api.transactions import router as transactions_router
from app.api.public_api.bets import router as bets_router
from app.api.public_api.palpluss import router as palpluss_router



# Built React/Vite frontend.
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="BangBet254 Betting Platform API",
)


# Allow the React/Vite frontend to communicate with the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication
app.include_router(auth_router)

# Admin
app.include_router(leagues_router)
app.include_router(teams_router)
app.include_router(matches_router)
app.include_router(admin_transactions_router)
app.include_router(admin_markets_router)
app.include_router(admin_odds_router)
app.include_router(admin_users_router)

# Public
app.include_router(public_matches_router)
app.include_router(wallet_router)
app.include_router(transactions_router)
app.include_router(bets_router)
app.include_router(palpluss_router)


@app.get("/")
def root():
    index_file = FRONTEND_DIST / "index.html"

    if index_file.exists():
        return FileResponse(index_file)

    return {
        "message": "Welcome to BangBet254 API",
        "status": "online",
        "version": "1.0.0",
    }


@app.get("/assets/{path:path}")
def frontend_assets(path: str):
    return FileResponse(FRONTEND_DIST / "assets" / path)


@app.get("/favicon.svg")
def favicon():
    return FileResponse(FRONTEND_DIST / "favicon.svg")


@app.get("/icons.svg")
def icons():
    return FileResponse(FRONTEND_DIST / "icons.svg")


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "bangbet254-api",
    }


@app.get("/api/health")
def api_health():
    return {
        "status": "healthy",
        "service": "bangbet254-api",
    }
