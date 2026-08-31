from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.admin import get_current_admin
from app.core.database import get_db
from app.models.league import League
from app.models.match import Match
from app.models.team import Team
from app.models.market import Market
from app.models.odd import Odd
from app.models.user import User
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
    db.flush()

    # Create the standard 1X2 / Match Winner market.
    market = Market(
        match_id=match.id,
        name="Match Winner",
        market_type="1x2",
        is_active=True,
    )

    db.add(market)
    db.flush()

    # Create Home / Draw / Away odds.
    db.add_all([
        Odd(
            market_id=market.id,
            name=home_team.name,
            value=data.home_odds,
            is_active=True,
        ),
        Odd(
            market_id=market.id,
            name="Draw",
            value=data.draw_odds,
            is_active=True,
        ),
        Odd(
            market_id=market.id,
            name=away_team.name,
            value=data.away_odds,
            is_active=True,
        ),
    ])

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


@router.delete(
    "/{match_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_match(
    match_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    match = db.get(Match, match_id)

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found",
        )

    db.delete(match)
    db.commit()

    return None
