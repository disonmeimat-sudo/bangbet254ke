from decimal import Decimal

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
from app.services.wallet import credit_wallet, debit_wallet


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
        .filter(Transaction.status == "pending")
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

    # Deposit approval
    if (
        transaction.transaction_type == "deposit"
        and new_status == "approved"
    ):
        credit_wallet(
            db=db,
            wallet=wallet,
            amount=transaction.amount,
        )

    # Withdrawal approval
    elif (
        transaction.transaction_type == "withdrawal"
        and new_status == "approved"
    ):
        debit_wallet(
            db=db,
            wallet=wallet,
            amount=transaction.amount,
        )

    transaction.status = new_status

    if data.description is not None:
        transaction.description = data.description

    db.commit()
    db.refresh(transaction)

    return transaction
