from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.admin import get_current_admin
from app.core.database import get_db
from app.models.league import League
from app.models.team import Team
from app.models.user import User
from app.schemas.team import TeamCreate, TeamResponse


router = APIRouter(
    prefix="/api/admin/teams",
    tags=["Admin - Teams"],
)


@router.post(
    "",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_team(
    data: TeamCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    league = db.get(League, data.league_id)

    if not league:
        raise HTTPException(
            status_code=404,
            detail="League not found",
        )

    existing = (
        db.query(Team)
        .filter(
            Team.name == data.name.strip(),
            Team.league_id == data.league_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Team already exists in this league",
        )

    team = Team(
        name=data.name.strip(),
        short_name=data.short_name,
        logo_url=data.logo_url,
        country=data.country,
        sport=data.sport.lower(),
        league_id=data.league_id,
        is_active=True,
    )

    db.add(team)
    db.commit()
    db.refresh(team)

    return team


@router.get(
    "",
    response_model=list[TeamResponse],
)
def get_teams(
    league_id: int | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Team)

    if league_id is not None:
        query = query.filter(
            Team.league_id == league_id
        )

    return (
        query
        .order_by(Team.name.asc())
        .all()
    )
