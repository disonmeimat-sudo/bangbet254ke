from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.wallet import Wallet


def get_or_create_wallet(
    db: Session,
    user_id: int,
) -> Wallet:
    wallet = (
        db.query(Wallet)
        .filter(Wallet.user_id == user_id)
        .first()
    )

    if wallet:
        return wallet

    wallet = Wallet(
        user_id=user_id,
        balance=Decimal("0.00"),
    )

    db.add(wallet)
    db.flush()

    return wallet


def credit_wallet(
    db: Session,
    wallet: Wallet,
    amount: Decimal,
) -> Wallet:
    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount must be greater than zero",
        )

    wallet.balance += amount
    db.flush()

    return wallet


def debit_wallet(
    db: Session,
    wallet: Wallet,
    amount: Decimal,
) -> Wallet:
    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount must be greater than zero",
        )

    if wallet.balance < amount:
        raise HTTPException(
            status_code=400,
            detail="Insufficient wallet balance",
        )

    wallet.balance -= amount
    db.flush()

    return wallet
