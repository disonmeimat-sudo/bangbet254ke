from decimal import Decimal
from uuid import uuid4

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
    WithdrawalQuote,
    TransactionResponse,
)
from app.services.wallet import get_or_create_wallet
from app.services.palpluss import initiate_stk
from app.services.withdrawal import calculate_withdrawal


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

    # Use the registered account phone unless another phone
    # is eventually added to the deposit form.
    phone = current_user.phone.strip()

    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Your account does not have a phone number.",
        )

    # Our own unique reference is sent to PalPluss as
    # accountReference. The same reference comes back in
    # the webhook, allowing us to identify this transaction.
    reference = f"BBDEP-{uuid4().hex[:20].upper()}"

    try:
        stk = initiate_stk(
            amount=float(data.amount),
            phone=phone,
            account_reference=reference,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to initiate STK payment: {exc}",
        )

    provider_transaction_id = stk.get("transactionId")

    if not provider_transaction_id:
        raise HTTPException(
            status_code=502,
            detail="PalPluss did not return a transaction ID.",
        )

    transaction = Transaction(
        user_id=current_user.id,
        wallet_id=wallet.id,
        transaction_type="deposit",
        status="pending",
        amount=data.amount,
        reference=reference,
        provider_transaction_id=provider_transaction_id,
        payment_method="mpesa_stk",
        description="M-Pesa STK Push initiated. Awaiting payment.",
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

    if not current_user.phone or not current_user.phone.strip():
        raise HTTPException(
            status_code=400,
            detail="Your account does not have a phone number.",
        )

    try:
        fee, total_debit = calculate_withdrawal(data.amount)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    if wallet.balance < total_debit:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient wallet balance. "
                f"You need KSh {total_debit:,.2f} "
                f"including the KSh {fee:,.2f} withdrawal fee."
            ),
        )

    reference = f"BBWDR-{uuid4().hex[:20].upper()}"

    transaction = Transaction(
        user_id=current_user.id,
        wallet_id=wallet.id,
        transaction_type="withdrawal",
        status="pending",
        amount=data.amount,
        fee=fee,
        total_debit=total_debit,
        reference=reference,
        payment_method="mpesa_b2c",
        description=(
            f"Withdrawal request pending admin approval. "
            f"Withdrawal KSh {data.amount:,.2f}; "
            f"fee KSh {fee:,.2f}."
        ),
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get(
    "/withdrawal/quote",
    response_model=WithdrawalQuote,
)
def withdrawal_quote(
    amount: Decimal,
    current_user: User = Depends(get_current_user),
):
    try:
        fee, total_debit = calculate_withdrawal(amount)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    return WithdrawalQuote(
        amount=amount,
        fee=fee,
        total_debit=total_debit,
    )


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


@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse,
)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    return transaction
