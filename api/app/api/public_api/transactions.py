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

    # Serialize account selection so simultaneous deposits alternate safely.
    try:
        db.execute(text("SELECT pg_advisory_xact_lock(2542001)"))

        last_deposit = (
            db.query(Transaction)
            .filter(
                Transaction.transaction_type == "deposit",
                Transaction.palpluss_account.in_([1, 2]),
            )
            .order_by(Transaction.id.desc())
            .first()
        )

    except Exception:
        last_deposit = (
            db.query(Transaction)
            .filter(
                Transaction.transaction_type == "deposit",
                Transaction.palpluss_account.in_([1, 2]),
            )
            .order_by(Transaction.id.desc())
            .first()
        )

    # Normal routing alternates the preferred account:
    # 1 -> 2 -> 1 -> 2 ...
    if last_deposit and last_deposit.palpluss_account == 1:
        preferred_account = 2
    else:
        preferred_account = 1

    alternate_account = 2 if preferred_account == 1 else 1

    def account_available(account: int) -> bool:
        if account == 1:
            return bool(settings.palpluss_api_key)
        return bool(settings.palpluss_api_key_2)

    # Both accounts participate in normal deposits.
    accounts_to_try = []

    if account_available(preferred_account):
        accounts_to_try.append(preferred_account)

    if account_available(alternate_account):
        accounts_to_try.append(alternate_account)

    if not accounts_to_try:
        raise HTTPException(
            status_code=503,
            detail="Both PalPluss deposit accounts are currently unavailable.",
        )

    last_error = None

    for attempt, palpluss_account in enumerate(accounts_to_try):
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

            # No provider transaction ID means this account failed
            # during STK initiation. Try the other account silently.
            if not provider_transaction_id:
                transaction.status = "rejected"
                transaction.description = (
                    f"PalPluss Account {palpluss_account} failed to "
                    "return a transaction ID during STK initiation."
                )
                db.commit()

                last_error = (
                    f"Account {palpluss_account} did not return "
                    "a provider transaction ID."
                )
                continue

            # STK was successfully created. Do NOT fail over after this point.
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
            db.rollback()

            transaction = db.get(Transaction, transaction.id)

            if transaction:
                transaction.status = "rejected"
                transaction.description = (
                    f"PalPluss Account {palpluss_account} failed to "
                    f"initiate the STK Push: {str(exc)[:500]}"
                )
                db.commit()

            last_error = (
                f"PalPluss Account {palpluss_account} failed: {exc}"
            )

            # IMPORTANT:
            # This is an initiation failure, so automatically try
            # the other configured PalPluss account.
            continue

    # Only reach this point if every configured account failed to
    # initiate an STK transaction.
    raise HTTPException(
        status_code=502,
        detail=(
            "Unable to initiate the M-Pesa STK payment through either "
            f"PalPluss account. {last_error or ''}"
        ).strip(),
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
