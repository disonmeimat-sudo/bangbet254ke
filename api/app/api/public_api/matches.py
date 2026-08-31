from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.match import Match
from app.models.team import Team

router = APIRouter(
    prefix="/api/public/matches",
    tags=["Public - Matches"],
)


@router.get("")
def get_public_matches(
    status: str | None = None,
    league_id: int | None = None,
    team_id: int | None = None,
    is_live: bool | None = None,
    is_featured: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Match)
        .options(
            joinedload(Match.league),
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.markets),
        )
    )

    if status:
        query = query.filter(
            Match.status == status.lower()
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

    if search:
        search_term = f"%{search.strip()}%"

        query = (
            query
            .join(
                Team,
                (Match.home_team_id == Team.id)
                | (Match.away_team_id == Team.id),
            )
            .filter(Team.name.ilike(search_term))
            .distinct()
        )

    matches = (
        query
        .order_by(Match.scheduled_at.asc())
        .all()
    )

    return [
        {
            "id": match.id,
            "league_id": match.league_id,
            "league": (
                {
                    "id": match.league.id,
                    "name": match.league.name,
                    "country": match.league.country,
                    "sport": match.league.sport,
                }
                if match.league
                else None
            ),
            "home_team_id": match.home_team_id,
            "home_team": (
                {
                    "id": match.home_team.id,
                    "name": match.home_team.name,
                    "country": match.home_team.country,
                }
                if match.home_team
                else None
            ),
            "away_team_id": match.away_team_id,
            "away_team": (
                {
                    "id": match.away_team.id,
                    "name": match.away_team.name,
                    "country": match.away_team.country,
                }
                if match.away_team
                else None
            ),
            "scheduled_at": match.scheduled_at,
            "status": match.status,
            "is_live": match.is_live,
            "is_featured": match.is_featured,
            "is_betting_open": match.is_betting_open,
            "home_score": match.home_score,
            "away_score": match.away_score,
            "markets": [
                {
                    "id": market.id,
                    "match_id": market.match_id,
                    "name": market.name,
                    "market_type": market.market_type,
                    "is_active": market.is_active,
                    "odds": [
                        {
                            "id": odd.id,
                            "market_id": odd.market_id,
                            "name": odd.name,
                            "value": odd.value,
                            "is_active": odd.is_active,
                        }
                        for odd in market.odds
                        if odd.is_active
                    ],
                }
                for market in match.markets
                if market.is_active
            ],
        }
        for match in matches
    ]
