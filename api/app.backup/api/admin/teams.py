from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.team import Team
from app.models.league import League
from app.schemas.team import TeamCreate, TeamResponse
from app.api.admin import get_current_admin

router = APIRouter(
    prefix="/api/admin/teams",
    tags=["Admin - Teams"],
)


@router.post("", response_model=TeamResponse)
def create_team(
    data: TeamCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    league = db.get(League, data.league_id)

    if not league:
        raise HTTPException(
            status_code=404,
            detail="League not found.",
        )

    existing = db.scalar(
        select(Team).where(
            Team.name == data.name,
            Team.league_id == data.league_id,
        )
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Team already exists in this league.",
        )

    team = Team(
        name=data.name.strip(),
        league_id=data.league_id,
    )

    db.add(team)
    db.commit()
    db.refresh(team)

    return team


@router.get("", response_model=list[TeamResponse])
def get_teams(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    return db.scalars(
        select(Team).order_by(Team.name)
    ).all()
