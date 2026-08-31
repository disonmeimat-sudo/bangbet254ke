from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.admin import get_current_admin
from app.core.database import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.transaction import (
    TransactionAdminUpdate,
    TransactionResponse,
)


router = APIRouter(
    prefix="/api/admin/transactions",
    tags=["Admin - Transactions"],
)


@router.get(
    "",
    response_model=list[TransactionResponse],
)
def get_transactions(
    transaction_type: str | None = Query(
        default=None,
        alias="type",
    ),
    transaction_status: str | None = Query(
        default=None,
        alias="status",
    ),
    user_id: int | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Transaction)

    if transaction_type:
        query = query.filter(
            Transaction.transaction_type
            == transaction_type.lower()
        )

    if transaction_status:
        query = query.filter(
            Transaction.status
            == transaction_status.lower()
        )

    if user_id is not None:
        query = query.filter(
            Transaction.user_id == user_id
        )

    return (
        query
        .order_by(Transaction.created_at.desc())
        .all()
    )


@router.get(
    "/pending",
    response_model=list[TransactionResponse],
)
def get_pending_transactions(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return (
        db.query(Transaction)
        .filter(
            Transaction.status == "pending"
        )
        .order_by(Transaction.created_at.asc())
        .all()
    )


@router.patch(
    "/{transaction_id}",
    response_model=TransactionResponse,
)
def update_transaction(
    transaction_id: int,
    data: TransactionAdminUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    transaction = db.get(
        Transaction,
        transaction_id,
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    new_status = data.status.lower()

    allowed_statuses = {
        "approved",
        "rejected",
        "cancelled",
    }

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Use approved, "
                "rejected, or cancelled."
            ),
        )

    if transaction.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=(
                "Only pending transactions can be "
                "approved, rejected, or cancelled."
            ),
        )

    wallet = db.get(
        Wallet,
        transaction.wallet_id,
    )

    if not wallet:
        raise HTTPException(
            status_code=404,
            detail="Wallet not found",
        )

    # ============================================================
    # DEPOSIT
    # ============================================================

    if transaction.transaction_type == "deposit":

        if new_status == "approved":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Deposits are approved automatically "
                    "through the PalPluss webhook."
                ),
            )

        transaction.status = new_status

        if data.description is not None:
            transaction.description = data.description

        db.commit()
        db.refresh(transaction)

        return transaction

    # ============================================================
    # WITHDRAWAL
    # ============================================================

    if transaction.transaction_type == "withdrawal":

        if new_status in {"rejected", "cancelled"}:
            transaction.status = new_status

            if data.description is not None:
                transaction.description = data.description
            else:
                transaction.description = (
                    "Withdrawal rejected/cancelled by administrator."
                )

            db.commit()
            db.refresh(transaction)

            return transaction

        # --------------------------------------------------------
        # ADMIN APPROVES WITHDRAWAL
        # --------------------------------------------------------

        user = db.get(
            User,
            transaction.user_id,
        )

        if not user or not user.phone:
            raise HTTPException(
                status_code=400,
                detail=(
                    "User does not have a valid phone number "
                    "for the B2C payout."
                ),
            )

        # Check the complete amount that will eventually be
        # deducted from the wallet.
        total_debit = transaction.total_debit

        if wallet.balance < total_debit:
            raise HTTPException(
                status_code=400,
                detail=(
                    "User no longer has sufficient wallet "
                    "balance for this withdrawal and fee."
                ),
            )

        from app.services.palpluss import initiate_b2c_payout

        try:
            payout = initiate_b2c_payout(
                amount=float(transaction.amount),
                phone=transaction.phone_number or user.phone.strip(),
                reference=transaction.reference,
            )

        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    f"Unable to initiate PalPluss payout: {exc}"
                ),
            )

        provider_transaction_id = payout.get(
            "transactionId"
        )

        if not provider_transaction_id:
            raise HTTPException(
                status_code=502,
                detail=(
                    "PalPluss did not return a payout "
                    "transaction ID."
                ),
            )

        provider_status = str(
            payout.get("status") or ""
        ).lower()

        transaction.provider_transaction_id = (
            provider_transaction_id
        )

        # The B2C response means the payout was accepted/
        # initiated. Final wallet debit happens through
        # the PalPluss webhook.
        transaction.status = "processing"

        transaction.description = (
            f"Withdrawal approved by admin. "
            f"KSh {transaction.amount:,.2f} payout initiated. "
            f"Withdrawal fee: KSh {transaction.fee:,.2f}. "
            f"PalPluss status: {provider_status or 'unknown'}."
        )

        if data.description is not None:
            transaction.description = data.description

        db.commit()
        db.refresh(transaction)

        return transaction

    raise HTTPException(
        status_code=400,
        detail="Unsupported transaction type.",
    )
