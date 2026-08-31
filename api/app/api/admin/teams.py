from fastapi import APIRouter, Depends, HTTPException, status
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


@router.post(
    "",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_team(
    data: TeamCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Team name is required.",
        )

    league = db.get(League, data.league_id)

    if not league:
        raise HTTPException(
            status_code=404,
            detail="League not found.",
        )

    existing = db.scalar(
        select(Team).where(
            Team.name == name,
            Team.league_id == data.league_id,
        )
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Team already exists in this league.",
        )

    team = Team(
        name=name,
        league_id=data.league_id,
        country=data.country,
        sport=data.sport.lower(),
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
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    return db.scalars(
        select(Team).order_by(Team.name.asc())
    ).all()


@router.patch(
    "/{team_id}",
    response_model=TeamResponse,
)
def update_team(
    team_id: int,
    data: TeamCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    team = db.get(Team, team_id)

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team not found.",
        )

    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Team name is required.",
        )

    league = db.get(League, data.league_id)

    if not league:
        raise HTTPException(
            status_code=404,
            detail="League not found.",
        )

    duplicate = db.scalar(
        select(Team).where(
            Team.name == name,
            Team.league_id == data.league_id,
            Team.id != team_id,
        )
    )

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="Another team with this name already exists in this league.",
        )

    team.name = name
    team.league_id = data.league_id
    team.country = data.country
    team.sport = data.sport.lower()

    db.commit()
    db.refresh(team)

    return team


@router.patch(
    "/{team_id}/status",
    response_model=TeamResponse,
)
def update_team_status(
    team_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    team = db.get(Team, team_id)

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team not found.",
        )

    team.is_active = is_active

    db.commit()
    db.refresh(team)

    return team


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    team = db.get(Team, team_id)

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Team not found.",
        )

    if team.home_matches or team.away_matches:
        raise HTTPException(
            status_code=409,
            detail="This team is already used in matches. Deactivate it instead of deleting it.",
        )

    db.delete(team)
    db.commit()

    return None
