from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.bet import Bet
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.bet import BetCreate, BetResponse


router = APIRouter(
    prefix="/api/bets",
    tags=["Bets"],
)


def money(value: Decimal) -> Decimal:
    return value.quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


@router.post(
    "",
    response_model=BetResponse,
    status_code=status.HTTP_201_CREATED,
)
def place_bet(
    data: BetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.selections:
        raise HTTPException(
            status_code=400,
            detail="Your betslip is empty.",
        )

    # Prevent multiple selections for the same match.
    match_ids = [selection.match_id for selection in data.selections]

    if len(match_ids) != len(set(match_ids)):
        raise HTTPException(
            status_code=400,
            detail="Only one selection per match is allowed.",
        )

    # Lock the wallet row while checking and deducting.
    wallet = (
        db.query(Wallet)
        .filter(Wallet.user_id == current_user.id)
        .with_for_update()
        .first()
    )

    if wallet is None:
        wallet = Wallet(
            user_id=current_user.id,
            balance=Decimal("0.00"),
        )
        db.add(wallet)
        db.flush()

    stake = money(data.stake)

    if stake <= 0:
        raise HTTPException(
            status_code=400,
            detail="Stake must be greater than zero.",
        )

    current_balance = money(wallet.balance)

    if current_balance < stake:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient wallet balance. "
                f"Your balance is KSh {current_balance:,.2f}, "
                f"but your stake is KSh {stake:,.2f}."
            ),
        )

    total_odds = Decimal("1.0000")

    selections = []

    for selection in data.selections:
        odds = Decimal(selection.odds)

        if odds <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid odds.",
            )

        total_odds *= odds

        selections.append(
            {
                "match_id": selection.match_id,
                "home_team": selection.home_team,
                "away_team": selection.away_team,
                "selection": selection.selection,
                "odds": float(odds),
            }
        )

    total_odds = total_odds.quantize(
        Decimal("0.0001"),
        rounding=ROUND_HALF_UP,
    )

    potential_win = money(stake * total_odds)

    # Deduct the stake.
    wallet.balance = current_balance - stake

    bet = Bet(
        user_id=current_user.id,
        stake=stake,
        total_odds=total_odds,
        potential_win=potential_win,
        status="pending",
        selections=selections,
    )

    db.add(bet)
    db.commit()
    db.refresh(bet)

    return {
        "id": bet.id,
        "stake": bet.stake,
        "total_odds": bet.total_odds,
        "potential_win": bet.potential_win,
        "status": bet.status,
        "created_at": bet.created_at,
        "selections": bet.selections,
        "wallet_balance": wallet.balance,
    }


@router.get(
    "",
    response_model=list[BetResponse],
)
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

    return [
        {
            "id": bet.id,
            "stake": bet.stake,
            "total_odds": bet.total_odds,
            "potential_win": bet.potential_win,
            "status": bet.status,
            "created_at": bet.created_at,
            "selections": bet.selections or [],
            "wallet_balance": None,
        }
        for bet in bets
    ]
