from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.bet import Bet
from app.models.match import Match
from app.models.transaction import Transaction
from app.models.user import User
from app.services.wallet import debit_wallet, get_or_create_wallet
from app.schemas.bet import BetCreate, BetResponse


router = APIRouter(prefix="/api/bets", tags=["Bets"])


@router.post("", response_model=BetResponse, status_code=201)
def place_bet(
    data: BetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = get_or_create_wallet(db=db, user_id=current_user.id)

    if wallet.balance < data.stake:
        raise HTTPException(
            status_code=400,
            detail="Insufficient wallet balance",
        )

    total_odds = Decimal("1.00")
    selections = []

    for selection in data.selections:
        if selection.selection not in {"HOME", "DRAW", "AWAY"}:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid selection: {selection.selection}",
            )

        match = db.get(Match, selection.match_id)

        if not match:
            raise HTTPException(
                status_code=404,
                detail=f"Match {selection.match_id} not found",
            )

        if not match.is_betting_open:
            raise HTTPException(
                status_code=400,
                detail=f"Betting is closed for match {selection.match_id}",
            )

        if selection.odds <= 1:
            raise HTTPException(
                status_code=400,
                detail="Odds must be greater than 1",
            )

        total_odds *= Decimal(str(selection.odds))

        selections.append(
            {
                "match_id": selection.match_id,
                "home_team": selection.home_team,
                "away_team": selection.away_team,
                "selection": selection.selection,
                "odds": selection.odds,
            }
        )

    potential_win = data.stake * total_odds

    debit_wallet(
        db=db,
        wallet=wallet,
        amount=data.stake,
    )

    bet = Bet(
        user_id=current_user.id,
        stake=float(data.stake),
        total_odds=float(total_odds),
        potential_win=float(potential_win),
        status="pending",
        selections=selections,
    )

    db.add(bet)
    db.flush()

    transaction = Transaction(
        user_id=current_user.id,
        wallet_id=wallet.id,
        transaction_type="bet",
        status="completed",
        amount=data.stake,
        reference=f"BET_STAKE_{bet.id}",
        payment_method="wallet",
        description=f"Stake for bet #{bet.id}",
    )

    db.add(transaction)

    db.commit()
    db.refresh(bet)
    db.refresh(wallet)

    return {
        "id": bet.id,
        "user_id": bet.user_id,
        "stake": Decimal(str(bet.stake)),
        "total_odds": Decimal(str(bet.total_odds)),
        "potential_win": Decimal(str(bet.potential_win)),
        "status": bet.status,
        "selections": bet.selections,
        "wallet_balance": wallet.balance,
        "created_at": bet.created_at,
        "updated_at": bet.updated_at,
    }


@router.get("", response_model=list[BetResponse])
def get_my_bets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bets = (
        db.query(Bet)
        .filter(Bet.user_id == current_user.id)
        .order_by(Bet.created_at.desc())
        .all()
    )

    return bets
