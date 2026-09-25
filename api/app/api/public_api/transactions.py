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

    # Serialize account selection so simultaneous deposits cannot
    # accidentally select the same PalPluss account.
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

        # Alternate:
        # first -> Account 1
        # second -> Account 2
        # third -> Account 1
        # fourth -> Account 2
        if last_deposit and last_deposit.palpluss_account == 1:
            preferred_account = 2
        else:
            preferred_account = 1

        alternate_account = 2 if preferred_account == 1 else 1

    except Exception:
        # If advisory locking is unavailable, still provide a safe
        # deterministic fallback based on the latest deposit.
        last_deposit = (
            db.query(Transaction)
            .filter(
                Transaction.transaction_type == "deposit",
                Transaction.palpluss_account.in_([1, 2]),
            )
            .order_by(Transaction.id.desc())
            .first()
        )

        if last_deposit and last_deposit.palpluss_account == 1:
            preferred_account = 2
        else:
            preferred_account = 1

        alternate_account = 2 if preferred_account == 1 else 1

    def account_available(account: int) -> bool:
        if account == 1:
            return bool(settings.palpluss_api_key)
        return bool(settings.palpluss_api_key_2)

    # Normal wallet deposits currently use Account 1 / Till A only.
    # Account 2 remains available for Autotransact and can be re-enabled
    # here later without changing the PalPluss service.
    DEPOSIT_ACCOUNT_2_ENABLED = False

    if DEPOSIT_ACCOUNT_2_ENABLED:
        if account_available(preferred_account):
            accounts_to_try = [preferred_account, alternate_account]
        elif account_available(alternate_account):
            accounts_to_try = [alternate_account]
        else:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Both PalPluss deposit accounts are currently unavailable."
                ),
            )
    else:
        if not account_available(1):
            raise HTTPException(
                status_code=503,
                detail="PalPluss Account 1 / Till A is currently unavailable.",
            )

        accounts_to_try = [1]

    last_error = None

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

            if not provider_transaction_id:
                transaction.status = "rejected"
                transaction.description = (
                    f"PalPluss Account {palpluss_account} did not return "
                    "a transaction ID."
                )
                db.commit()

                last_error = (
                    f"PalPluss Account {palpluss_account} did not return "
                    "a transaction ID."
                )

                # Try the other account if one exists.
                continue

            transaction.provider_transaction_id = str(
                provider_transaction_id
            )
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

            # Automatically continue to the other configured account.
            continue

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
