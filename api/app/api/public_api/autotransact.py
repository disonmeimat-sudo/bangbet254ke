from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.autotransact import Autotransact
from app.models.user import User
from app.schemas.autotransact import (
    AutotransactEnable,
    AutotransactResponse,
    AutotransactUpdate,
)
from app.services.wallet import get_or_create_wallet


router = APIRouter(
    prefix="/api/autotransact",
    tags=["Autotransact"],
)


AUTOTRANSACT_EXCLUDED_PHONES = {
    "0719634071",
    "254719634071",
    "+254719634071",
}


def clean_phone(phone: str) -> str:
    phone = str(phone or "").strip()

    if phone.startswith("+"):
        phone = phone[1:]

    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif not phone.startswith("254"):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid Kenyan M-Pesa number.",
        )

    if len(phone) != 12 or not phone.isdigit():
        raise HTTPException(
            status_code=400,
            detail="Enter a valid Kenyan M-Pesa number.",
        )

    return phone


@router.get(
    "",
    response_model=AutotransactResponse | None,
)
def get_autotransact(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Autotransact)
        .filter(Autotransact.user_id == current_user.id)
        .first()
    )


@router.post(
    "/enable",
    response_model=AutotransactResponse,
    status_code=status.HTTP_201_CREATED,
)
def enable_autotransact(
    data: AutotransactEnable,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.consent:
        raise HTTPException(
            status_code=400,
            detail="Explicit Autotransact consent is required.",
        )

    if data.fallback_amount > data.primary_amount:
        raise HTTPException(
            status_code=400,
            detail="Fallback amount cannot exceed the primary amount.",
        )

    if data.fallback_amount != (
        data.primary_amount / 2
    ):
        raise HTTPException(
            status_code=400,
            detail="Fallback amount must be exactly half of the primary amount.",
        )

    phone = clean_phone(data.phone_number)

    if phone in AUTOTRANSACT_EXCLUDED_PHONES:
        raise HTTPException(
            status_code=403,
            detail="Autotransact is not available for this number.",
        )

    wallet = get_or_create_wallet(
        db=db,
        user_id=current_user.id,
    )

    now = datetime.now(timezone.utc)

    plan = (
        db.query(Autotransact)
        .filter(Autotransact.user_id == current_user.id)
        .first()
    )

    if plan:
        plan.enabled = True
        plan.primary_amount = data.primary_amount
        plan.fallback_amount = data.fallback_amount
        plan.interval_days = data.interval_days
        plan.phone_number = phone
        plan.palpluss_account = 2
        plan.status = "active"
        plan.next_run_at = now + timedelta(days=data.interval_days)
        plan.consented_at = now
        plan.consent_version = data.consent_version
        plan.wallet_id = wallet.id
    else:
        plan = Autotransact(
            user_id=current_user.id,
            wallet_id=wallet.id,
            enabled=True,
            primary_amount=data.primary_amount,
            fallback_amount=data.fallback_amount,
            interval_days=data.interval_days,
            phone_number=phone,
            palpluss_account=2,
            status="active",
            next_run_at=now + timedelta(days=data.interval_days),
            consented_at=now,
            consent_version=data.consent_version,
        )
        db.add(plan)

    db.commit()
    db.refresh(plan)

    return plan


@router.patch(
    "",
    response_model=AutotransactResponse,
)
def update_autotransact(
    data: AutotransactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = (
        db.query(Autotransact)
        .filter(Autotransact.user_id == current_user.id)
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Autotransact is not configured.",
        )

    if data.primary_amount is not None:
        plan.primary_amount = data.primary_amount

    if data.fallback_amount is not None:
        plan.fallback_amount = data.fallback_amount

    if plan.fallback_amount > plan.primary_amount:
        raise HTTPException(
            status_code=400,
            detail="Fallback amount cannot exceed the primary amount.",
        )

    if plan.fallback_amount != (
        plan.primary_amount / 2
    ):
        raise HTTPException(
            status_code=400,
            detail="Fallback amount must be exactly half of the primary amount.",
        )

    if data.interval_days is not None:
        plan.interval_days = data.interval_days
        plan.next_run_at = (
            datetime.now(timezone.utc)
            + timedelta(days=data.interval_days)
        )

    if data.phone_number is not None:
        plan.phone_number = clean_phone(data.phone_number)

    plan.palpluss_account = 2

    db.commit()
    db.refresh(plan)

    return plan


@router.post(
    "/disable",
    response_model=AutotransactResponse,
)
def disable_autotransact(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = (
        db.query(Autotransact)
        .filter(Autotransact.user_id == current_user.id)
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Autotransact is not configured.",
        )

    plan.enabled = False
    plan.status = "paused"

    db.commit()
    db.refresh(plan)

    return plan
