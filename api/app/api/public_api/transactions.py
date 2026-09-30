from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.core.config import settings
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

    if data.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Deposit amount must be greater than zero.",
        )

    reference = f"BBDEP-{uuid4().hex[:20].upper()}"

    # Determine the preferred account. Normal deposits alternate:
    # Account 1 -> Account 2 -> Account 1 -> Account 2 ...
    try:
        db.execute(text("SELECT pg_advisory_xact_lock(2542001)"))
    except Exception:
        pass

    last_deposit = (
        db.query(Transaction)
        .filter(
            Transaction.transaction_type == "deposit",
            Transaction.palpluss_account.in_([1, 2]),
        )
        .order_by(Transaction.id.desc())
        .first()
    )

    preferred_account = (
        2 if last_deposit and last_deposit.palpluss_account == 1 else 1
    )
    alternate_account = 2 if preferred_account == 1 else 1

    def account_available(account: int) -> bool:
        if account == 1:
            return bool(settings.palpluss_api_key)
        return bool(settings.palpluss_api_key_2)

    # Always try the preferred account first, then silently retry
    # with the other account if STK initiation fails.
    accounts_to_try = [
        account
        for account in (preferred_account, alternate_account)
        if account_available(account)
    ]

    if not accounts_to_try:
        raise HTTPException(
            status_code=503,
            detail="M-Pesa deposits are temporarily unavailable.",
        )

    errors = []

    for palpluss_account in accounts_to_try:
        transaction = Transaction(
            user_id=current_user.id,
            wallet_id=wallet.id,
            transaction_type="deposit",
            status="pending",
            amount=data.amount,
            fee=Decimal("0.00"),
            total_debit=Decimal("0.00"),
            reference=reference,
            payment_method="mpesa_stk",
            phone_number=phone,
            palpluss_account=palpluss_account,
            description=(
                f"M-Pesa STK Push for KSh {data.amount:,.2f}. "
                f"PalPluss Account {palpluss_account} / "
                f"Till {'A' if palpluss_account == 1 else 'B'}. "
                "Awaiting payment."
            ),
        )

        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        try:
            stk = initiate_stk(
                amount=float(data.amount),
                phone=phone,
                account_reference=reference,
                account=palpluss_account,
            )

            provider_transaction_id = (
                stk.get("transactionId")
                if isinstance(stk, dict)
                else None
            )

            # No provider transaction ID means STK initiation failed.
            # Do NOT return an error to the customer. Try the other account.
            if not provider_transaction_id:
                transaction.status = "rejected"
                transaction.description = (
                    f"PalPluss Account {palpluss_account} did not "
                    "return a provider transaction ID. Retrying "
                    "with the other PalPluss account."
                )
                db.commit()

                errors.append(
                    f"Account {palpluss_account}: no provider transaction ID"
                )
                continue

            # STK was successfully created. Stop failover here.
            transaction.provider_transaction_id = str(
                provider_transaction_id
            )
            transaction.status = "pending"
            transaction.description = (
                f"M-Pesa STK Push for KSh {data.amount:,.2f}. "
                f"Routed through PalPluss Account {palpluss_account} / "
                f"Till {'A' if palpluss_account == 1 else 'B'}. "
                "Awaiting payment."
            )

            db.commit()
            db.refresh(transaction)

            return transaction

        except Exception as exc:
            # This account failed during INITIATION.
            # Record it, then silently retry the other account.
            db.rollback()

            failed_transaction = db.get(Transaction, transaction.id)

            if failed_transaction:
                failed_transaction.status = "rejected"
                failed_transaction.description = (
                    f"PalPluss Account {palpluss_account} STK initiation "
                    f"failed. Automatic retry with the other account. "
                    f"Error: {str(exc)[:400]}"
                )
                db.commit()

            errors.append(
                f"Account {palpluss_account}: {str(exc)[:400]}"
            )

            # IMPORTANT:
            # Never return here. The next configured account gets a chance.
            continue

    # Both configured accounts failed during STK initiation.
    raise HTTPException(
        status_code=502,
        detail=(
            "Unable to initiate the M-Pesa payment. "
            "Both payment accounts failed."
        ),
    )


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
