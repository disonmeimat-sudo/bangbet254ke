from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.admin import get_current_admin
from app.core.database import get_db
from app.models.match import Match
from app.models.market import Market
from app.models.user import User
from app.schemas.market import (
    MarketCreate,
    MarketResponse,
    MarketUpdate,
)


router = APIRouter(
    prefix="/api/admin/markets",
    tags=["Admin - Markets"],
)


@router.get(
    "",
    response_model=list[MarketResponse],
)
def get_markets(
    match_id: int | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(Market)

    if match_id is not None:
        query = query.where(Market.match_id == match_id)

    return db.scalars(
        query.order_by(Market.created_at.desc())
    ).all()


@router.get(
    "/{market_id}",
    response_model=MarketResponse,
)
def get_market(
    market_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    market = db.get(Market, market_id)

    if not market:
        raise HTTPException(
            status_code=404,
            detail="Market not found",
        )

    return market


@router.post(
    "",
    response_model=MarketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_market(
    data: MarketCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    match = db.get(Match, data.match_id)

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found",
        )

    name = data.name.strip()
    market_type = data.market_type.strip().lower()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Market name is required",
        )

    if not market_type:
        raise HTTPException(
            status_code=400,
            detail="Market type is required",
        )

    existing = db.scalar(
        select(Market).where(
            Market.match_id == data.match_id,
            Market.market_type == market_type,
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This market type already exists for this match",
        )

    market = Market(
        match_id=data.match_id,
        name=name,
        market_type=market_type,
        is_active=True,
    )

    db.add(market)
    db.commit()
    db.refresh(market)

    return market


@router.patch(
    "/{market_id}",
    response_model=MarketResponse,
)
def update_market(
    market_id: int,
    data: MarketUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    market = db.get(Market, market_id)

    if not market:
        raise HTTPException(
            status_code=404,
            detail="Market not found",
        )

    if data.name is not None:
        name = data.name.strip()

        if not name:
            raise HTTPException(
                status_code=400,
                detail="Market name cannot be empty",
            )

        market.name = name

    if data.market_type is not None:
        market_type = data.market_type.strip().lower()

        if not market_type:
            raise HTTPException(
                status_code=400,
                detail="Market type cannot be empty",
            )

        duplicate = db.scalar(
            select(Market).where(
                Market.match_id == market.match_id,
                Market.market_type == market_type,
                Market.id != market.id,
            )
        )

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="This market type already exists for this match",
            )

        market.market_type = market_type

    if data.is_active is not None:
        market.is_active = data.is_active

    db.commit()
    db.refresh(market)

    return market


@router.delete(
    "/{market_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_market(
    market_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    market = db.get(Market, market_id)

    if not market:
        raise HTTPException(
            status_code=404,
            detail="Market not found",
        )

    db.delete(market)
    db.commit()

    return None
