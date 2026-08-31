from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.transaction import (
    DepositCreate,
    WithdrawalCreate,
    TransactionResponse,
)
from app.services.wallet import get_or_create_wallet


router = APIRouter(
    prefix="/api/transactions",
    tags=["Transactions"],
)


@router.post(
    "/deposit",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_deposit(
    data: DepositCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = get_or_create_wallet(
        db=db,
        user_id=current_user.id,
    )

    transaction = Transaction(
        user_id=current_user.id,
        wallet_id=wallet.id,
        transaction_type="deposit",
        status="pending",
        amount=data.amount,
        reference=data.reference,
        payment_method=data.payment_method,
        description="Deposit awaiting verification",
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.post(
    "/withdrawal",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_withdrawal(
    data: WithdrawalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = get_or_create_wallet(
        db=db,
        user_id=current_user.id,
    )

    if wallet.balance < data.amount:
        raise HTTPException(
            status_code=400,
            detail="Insufficient wallet balance",
        )

    transaction = Transaction(
        user_id=current_user.id,
        wallet_id=wallet.id,
        transaction_type="withdrawal",
        status="pending",
        amount=data.amount,
        reference=data.reference,
        payment_method=data.payment_method,
        description="Withdrawal awaiting admin approval",
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get(
    "",
    response_model=list[TransactionResponse],
)
def get_my_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.created_at.desc())
        .all()
    )
