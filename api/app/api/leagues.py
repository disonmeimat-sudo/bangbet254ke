from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.admin import get_current_admin
from app.core.database import get_db
from app.models.league import League
from app.models.user import User
from app.schemas.league import LeagueCreate, LeagueResponse


router = APIRouter(
    prefix="/api/admin/leagues",
    tags=["Admin - Leagues"],
)


@router.post(
    "",
    response_model=LeagueResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_league(
    data: LeagueCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    existing = (
        db.query(League)
        .filter(League.name == data.name)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="League already exists",
        )

    league = League(
        name=data.name.strip(),
        country=data.country,
        sport=data.sport.lower(),
    )

    db.add(league)
    db.commit()
    db.refresh(league)

    return league


@router.get(
    "",
    response_model=list[LeagueResponse],
)
def get_leagues(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return (
        db.query(League)
        .order_by(League.name.asc())
        .all()
    )
