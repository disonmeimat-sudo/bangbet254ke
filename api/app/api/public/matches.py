from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

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
    query = db.query(Match)

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

    return (
        query
        .order_by(Match.scheduled_at.asc())
        .all()
    )
