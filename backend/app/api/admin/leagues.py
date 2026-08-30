from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.league import League
from app.schemas.league import LeagueCreate, LeagueResponse
from app.api.admin import get_current_admin

router = APIRouter(
    prefix="/api/admin/leagues",
    tags=["Admin - Leagues"],
)


@router.get("", response_model=list[LeagueResponse])
def get_leagues(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    return db.scalars(
        select(League).order_by(League.name)
    ).all()


@router.post("", response_model=LeagueResponse)
def create_league(
    data: LeagueCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    existing = db.scalar(
        select(League).where(League.name == data.name)
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="League already exists.",
        )

    league = League(
        name=data.name.strip(),
        country=data.country,
        sport=data.sport,
    )

    db.add(league)
    db.commit()
    db.refresh(league)

    return league
