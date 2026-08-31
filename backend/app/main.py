from fastapi import FastAPI
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

from app.api.auth import router as auth_router
from app.api.leagues import router as leagues_router
from app.api.teams import router as teams_router
from app.api.matches import router as matches_router
from app.api.public.matches import router as public_matches_router
from app.api.admin.transactions import router as admin_transactions_router
from app.api.admin.markets import router as admin_markets_router
from app.api.admin.odds import router as admin_odds_router
from app.api.public.wallet import router as wallet_router
from app.api.public.transactions import router as transactions_router


# Create missing database tables.
Base.metadata.create_all(bind=engine)


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

# Public
app.include_router(public_matches_router)
app.include_router(wallet_router)
app.include_router(transactions_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to BangBet254 API",
        "status": "online",
        "version": "1.0.0",
    }


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
