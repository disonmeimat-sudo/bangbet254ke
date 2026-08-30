from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.admin import get_current_admin
from app.core.database import get_db
from app.models.market import Market
from app.models.odd import Odd
from app.models.user import User
from app.schemas.odd import (
    OddCreate,
    OddResponse,
    OddUpdate,
)


router = APIRouter(
    prefix="/api/admin/odds",
    tags=["Admin - Odds"],
)


@router.get(
    "",
    response_model=list[OddResponse],
)
def get_odds(
    market_id: int | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = select(Odd)

    if market_id is not None:
        query = query.where(Odd.market_id == market_id)

    return db.scalars(
        query.order_by(Odd.created_at.desc())
    ).all()


@router.get(
    "/{odd_id}",
    response_model=OddResponse,
)
def get_odd(
    odd_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    odd = db.get(Odd, odd_id)

    if not odd:
        raise HTTPException(
            status_code=404,
            detail="Odd not found",
        )

    return odd


@router.post(
    "",
    response_model=OddResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_odd(
    data: OddCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    market = db.get(Market, data.market_id)

    if not market:
        raise HTTPException(
            status_code=404,
            detail="Market not found",
        )

    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Odd name is required",
        )

    if not market.is_active:
        raise HTTPException(
            status_code=400,
            detail="Cannot add odds to an inactive market",
        )

    existing = db.scalar(
        select(Odd).where(
            Odd.market_id == data.market_id,
            Odd.name == name,
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This odd already exists in this market",
        )

    odd = Odd(
        market_id=data.market_id,
        name=name,
        value=data.value,
        is_active=True,
    )

    db.add(odd)
    db.commit()
    db.refresh(odd)

    return odd


@router.patch(
    "/{odd_id}",
    response_model=OddResponse,
)
def update_odd(
    odd_id: int,
    data: OddUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    odd = db.get(Odd, odd_id)

    if not odd:
        raise HTTPException(
            status_code=404,
            detail="Odd not found",
        )

    if data.name is not None:
        name = data.name.strip()

        if not name:
            raise HTTPException(
                status_code=400,
                detail="Odd name cannot be empty",
            )

        duplicate = db.scalar(
            select(Odd).where(
                Odd.market_id == odd.market_id,
                Odd.name == name,
                Odd.id != odd.id,
            )
        )

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="This odd already exists in this market",
            )

        odd.name = name

    if data.value is not None:
        odd.value = data.value

    if data.is_active is not None:
        odd.is_active = data.is_active

    db.commit()
    db.refresh(odd)

    return odd


@router.delete(
    "/{odd_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_odd(
    odd_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    odd = db.get(Odd, odd_id)

    if not odd:
        raise HTTPException(
            status_code=404,
            detail="Odd not found",
        )

    db.delete(odd)
    db.commit()

    return None
