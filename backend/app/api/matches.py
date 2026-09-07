from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.admin import get_current_admin
from app.core.database import get_db
from app.models.league import League
from app.models.match import Match
from app.models.team import Team
from app.models.user import User
from app.models.bet import Bet
from app.models.transaction import Transaction
from app.services.wallet import credit_wallet, get_or_create_wallet
from app.schemas.match import (
    MatchBettingUpdate,
    MatchCreate,
    MatchFeaturedUpdate,
    MatchResponse,
    MatchScoreUpdate,
    MatchStatusUpdate,
)


router = APIRouter(
    prefix="/api/admin/matches",
    tags=["Admin - Matches"],
)


@router.post(
    "",
    response_model=MatchResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_match(
    data: MatchCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if data.home_team_id == data.away_team_id:
        raise HTTPException(
            status_code=400,
            detail="Home and away teams must be different",
        )

    league = db.get(League, data.league_id)

    if not league:
        raise HTTPException(
            status_code=404,
            detail="League not found",
        )

    home_team = db.get(Team, data.home_team_id)
    away_team = db.get(Team, data.away_team_id)

    if not home_team or not away_team:
        raise HTTPException(
            status_code=404,
            detail="One or both teams not found",
        )

    match = Match(
        league_id=data.league_id,
        home_team_id=data.home_team_id,
        away_team_id=data.away_team_id,
        scheduled_at=data.scheduled_at,
        status="upcoming",
        is_live=False,
        is_featured=False,
        is_betting_open=True,
        home_score=0,
        away_score=0,
    )

    db.add(match)
    db.commit()
    db.refresh(match)

    return match


@router.get(
    "",
    response_model=list[MatchResponse],
)
def get_matches(
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    league_id: int | None = None,
    team_id: int | None = None,
    is_live: bool | None = None,
    is_featured: bool | None = None,
    is_betting_open: bool | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Match)

    if status_filter:
        query = query.filter(
            Match.status == status_filter.lower()
        )

    if league_id is not None:
        query = query.filter(
            Match.league_id == league_id
        )

    if team_id is not None:
        query = query.filter(
            (Match.home_team_id == team_id)
            | (Match.away_team_id == team_id)
        )

    if is_live is not None:
        query = query.filter(
            Match.is_live == is_live
        )

    if is_featured is not None:
        query = query.filter(
            Match.is_featured == is_featured
        )

    if is_betting_open is not None:
        query = query.filter(
            Match.is_betting_open == is_betting_open
        )

    if date_from is not None:
        query = query.filter(
            Match.scheduled_at >= date_from
        )

    if date_to is not None:
        query = query.filter(
            Match.scheduled_at <= date_to
        )

    if search:
        search_term = f"%{search.strip()}%"

        query = (
            query
            .join(
                Team,
                Match.home_team_id == Team.id,
            )
            .filter(Team.name.ilike(search_term))
        )

    return (
        query
        .order_by(Match.scheduled_at.asc())
        .all()
    )


@router.patch(
    "/{match_id}/score",
    response_model=MatchResponse,
)
def update_score(
    match_id: int,
    data: MatchScoreUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if data.home_score < 0 or data.away_score < 0:
        raise HTTPException(
            status_code=400,
            detail="Scores cannot be negative",
        )

    match = db.get(Match, match_id)

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found",
        )

    match.home_score = data.home_score
    match.away_score = data.away_score

    db.commit()
    db.refresh(match)

    return match


@router.patch(
    "/{match_id}/status",
    response_model=MatchResponse,
)
def update_status(
    match_id: int,
    data: MatchStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    allowed_statuses = {
        "upcoming",
        "live",
        "ended",
        "suspended",
        "cancelled",
    }

    new_status = data.status.lower()

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Use: upcoming, live, "
                "ended, suspended, or cancelled"
            ),
        )

    match = db.get(Match, match_id)

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found",
        )

    match.status = new_status
    match.is_live = new_status == "live"

    if new_status in {"ended", "cancelled"}:
        match.is_betting_open = False

    # ---------------------------------------------------------
    # SETTLE BETS WHEN A MATCH ENDS
    # ---------------------------------------------------------
    if new_status == "ended":
        home_score = match.home_score
        away_score = match.away_score

        if home_score > away_score:
            winning_selection = "HOME"
        elif away_score > home_score:
            winning_selection = "AWAY"
        else:
            winning_selection = "DRAW"

        pending_bets = (
            db.query(Bet)
            .filter(Bet.status == "pending")
            .all()
        )

        for bet in pending_bets:
            # Find selections belonging to this match.
            match_selections = [
                selection
                for selection in (bet.selections or [])
                if int(selection.get("match_id", -1)) == match.id
            ]

            if not match_selections:
                continue

            # Never settle the same match selection twice.
            for selection in match_selections:
                selection["result"] = (
                    "won"
                    if selection.get("selection") == winning_selection
                    else "lost"
                )
                selection["settled"] = True

            # Make sure SQLAlchemy detects the JSON change.
            bet.selections = list(bet.selections or [])

            # Check every selection in the bet.
            all_settled = True
            all_won = True

            for selection in bet.selections:
                selection_match_id = int(
                    selection.get("match_id", -1)
                )

                # This selection belongs to a match that has not ended yet.
                if selection.get("settled") is not True:
                    all_settled = False
                    all_won = False
                    continue

                if selection.get("result") != "won":
                    all_won = False

            # Single bet / accumulator containing a losing selection.
            if all_settled and not all_won:
                bet.status = "lost"

            # Only pay when every selection in the bet has won.
            elif all_settled and all_won:
                bet.status = "won"

                payout = Decimal(str(bet.potential_win))

                wallet = get_or_create_wallet(
                    db=db,
                    user_id=bet.user_id,
                )

                balance_before = wallet.balance

                credit_wallet(
                    db=db,
                    wallet=wallet,
                    amount=payout,
                )

                transaction = Transaction(
                    user_id=bet.user_id,
                    wallet_id=wallet.id,
                    transaction_type="win",
                    status="completed",
                    amount=payout,
                    reference=f"BET_WIN_{bet.id}",
                    payment_method="wallet",
                    description=f"Winnings for bet #{bet.id}",
                )

                db.add(transaction)

        db.commit()

    db.commit()
    db.refresh(match)

    return match


@router.patch(
    "/{match_id}/featured",
    response_model=MatchResponse,
)
def update_featured(
    match_id: int,
    data: MatchFeaturedUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    match = db.get(Match, match_id)

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found",
        )

    match.is_featured = data.is_featured

    db.commit()
    db.refresh(match)

    return match


@router.patch(
    "/{match_id}/betting",
    response_model=MatchResponse,
)
def update_betting(
    match_id: int,
    data: MatchBettingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    match = db.get(Match, match_id)

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found",
        )

    if match.status in {"ended", "cancelled"}:
        raise HTTPException(
            status_code=400,
            detail="Betting cannot be reopened for this match",
        )

    match.is_betting_open = data.is_betting_open

    db.commit()
    db.refresh(match)

    return match
