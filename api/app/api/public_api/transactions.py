from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.transaction import Transaction
from app.models.user import User
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


def clean_phone(phone: str) -> str:
    phone = str(phone or "").strip()

    if not phone:
        raise HTTPException(
            status_code=400,
            detail="M-Pesa phone number is required.",
        )

    # Accept common Kenyan formats:
    # 0712345678
    # 0112345678
    # 254712345678
    # +254712345678
    if phone.startswith("+"):
        phone = phone[1:]

    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("254"):
        pass
    else:
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

    phone = clean_phone(data.phone_number)

    amount = Decimal(str(data.amount))

    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Deposit amount must be greater than zero.",
        )

    # One parent transaction represents the customer's complete
    # requested deposit.
    parent_reference = (
        f"BBDEP-{uuid4().hex[:20].upper()}"
    )

    # Split the requested amount into two child payments.
    # The second side receives any fractional-cent remainder so
    # the two child amounts always add up exactly to the parent.
    account_1_amount = (
        amount / Decimal("2")
    ).quantize(Decimal("0.01"))

    account_2_amount = (
        amount - account_1_amount
    ).quantize(Decimal("0.01"))

    parent = Transaction(
        user_id=current_user.id,
        wallet_id=wallet.id,
        transaction_type="deposit",
        status="pending",
        amount=amount,
        fee=Decimal("0.00"),
        total_debit=Decimal("0.00"),
        reference=parent_reference,
        payment_method="mpesa_stk_split",
        phone_number=phone,
        description=(
            f"Split M-Pesa deposit of KSh {amount:,.2f}. "
            f"Account 1: KSh {account_1_amount:,.2f}; "
            f"Account 2: KSh {account_2_amount:,.2f}. "
            "Awaiting both payments."
        ),
    )

    db.add(parent)
    db.flush()

    child_1 = Transaction(
        user_id=current_user.id,
        wallet_id=wallet.id,
        transaction_type="deposit",
        status="pending",
        amount=account_1_amount,
        fee=Decimal("0.00"),
        total_debit=Decimal("0.00"),
        reference=f"{parent_reference}-A1",
        payment_method="mpesa_stk_split",
        phone_number=phone,
        parent_transaction_id=parent.id,
        split_account=1,
        description=(
            f"Split deposit child 1/2. "
            f"KSh {account_1_amount:,.2f}. "
            "PalPluss Account 1."
        ),
    )

    child_2 = Transaction(
        user_id=current_user.id,
        wallet_id=wallet.id,
        transaction_type="deposit",
        status="pending",
        amount=account_2_amount,
        fee=Decimal("0.00"),
        total_debit=Decimal("0.00"),
        reference=f"{parent_reference}-A2",
        payment_method="mpesa_stk_split",
        phone_number=phone,
        parent_transaction_id=parent.id,
        split_account=2,
        description=(
            f"Split deposit child 2/2. "
            f"KSh {account_2_amount:,.2f}. "
            "PalPluss Account 2."
        ),
    )

    db.add_all([child_1, child_2])

    # Commit the parent and child references BEFORE contacting
    # PalPluss. This ensures a very fast webhook can find the
    # transaction even if it arrives immediately after STK initiation.
    db.commit()

    try:
        stk_1 = initiate_stk(
            amount=float(account_1_amount),
            phone=phone,
            account_reference=child_1.reference,
            account=1,
        )

        provider_id_1 = stk_1.get("transactionId")

        if not provider_id_1:
            raise RuntimeError(
                "PalPluss Account 1 did not return a transaction ID."
            )

        child_1.provider_transaction_id = provider_id_1
        child_1.description = (
            f"Split deposit child 1/2. "
            f"KSh {account_1_amount:,.2f}. "
            "PalPluss Account 1 STK initiated."
        )
        db.commit()

    except Exception as exc:
        child_1.status = "rejected"
        parent.status = "rejected"
        parent.description = (
            f"Unable to initiate PalPluss Account 1 payment: {exc}. "
            "Wallet was not credited."
        )
        db.commit()

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to initiate the first split M-Pesa payment. "
                "The wallet was not credited."
            ),
        )

    try:
        stk_2 = initiate_stk(
            amount=float(account_2_amount),
            phone=phone,
            account_reference=child_2.reference,
            account=2,
        )

        provider_id_2 = stk_2.get("transactionId")

        if not provider_id_2:
            raise RuntimeError(
                "PalPluss Account 2 did not return a transaction ID."
            )

        child_2.provider_transaction_id = provider_id_2
        child_2.description = (
            f"Split deposit child 2/2. "
            f"KSh {account_2_amount:,.2f}. "
            "PalPluss Account 2 STK initiated."
        )
        db.commit()

    except Exception as exc:
        child_2.status = "rejected"
        parent.status = "pending"
        parent.description = (
            "Account 1 STK was initiated, but Account 2 STK "
            f"could not be initiated: {exc}. "
            "Wallet remains uncredited pending resolution."
        )
        db.commit()

        raise HTTPException(
            status_code=502,
            detail=(
                "The first M-Pesa payment was initiated but the "
                "second payment could not be initiated. "
                "The wallet was not credited."
            ),
        )

    db.refresh(parent)

    return parent


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

    phone = clean_phone(data.phone_number)

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
        phone_number=phone,
        description=(
            f"Withdrawal request pending admin approval. "
            f"KSh {data.amount:,.2f} to {phone}; "
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
