from decimal import Decimal

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.transaction import Transaction
from app.services.wallet import credit_wallet, debit_wallet


router = APIRouter(
    prefix="/api/palpluss",
    tags=["PalPluss"],
)


SUCCESS_STATUSES = {
    "success",
    "successful",
    "completed",
}

FAILED_STATUSES = {
    "failed",
    "cancelled",
    "expired",
}


@router.post("/webhook")
async def palpluss_webhook(request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON payload",
        )

    event_type = payload.get("event_type")

    transaction_data = (
        payload.get("transaction") or {}
    )

    provider_transaction_id = transaction_data.get(
        "id"
    )

    provider_status = str(
        transaction_data.get("status") or ""
    ).lower()

    external_reference = (
        transaction_data.get("external_reference")
        or transaction_data.get("account_reference")
        or transaction_data.get("reference")
    )

    if not provider_transaction_id:
        raise HTTPException(
            status_code=400,
            detail="Missing PalPluss transaction ID",
        )

    db: Session = SessionLocal()

    try:
        # First try provider transaction ID.
        transaction = (
            db.query(Transaction)
            .filter(
                Transaction.provider_transaction_id
                == provider_transaction_id
            )
            .first()
        )

        # Fallback to our own reference.
        if transaction is None and external_reference:
            transaction = (
                db.query(Transaction)
                .filter(
                    Transaction.reference
                    == external_reference
                )
                .first()
            )

        if transaction is None:
            return {
                "status": "ignored",
                "message": "Transaction not found",
            }

        # ========================================================
        # DEPOSIT
        # ========================================================

        if transaction.transaction_type == "deposit":

            # ----------------------------------------------------
            # SPLIT DEPOSIT CHILD
            # ----------------------------------------------------

            if transaction.parent_transaction_id is not None:

                # Lock the child row while processing the webhook.
                transaction = (
                    db.query(Transaction)
                    .filter(
                        Transaction.id == transaction.id
                    )
                    .with_for_update()
                    .first()
                )

                parent = (
                    db.query(Transaction)
                    .filter(
                        Transaction.id
                        == transaction.parent_transaction_id
                    )
                    .with_for_update()
                    .first()
                )

                if parent is None:
                    return {
                        "status": "ignored",
                        "message": "Split deposit parent not found",
                    }

                # Duplicate webhook protection.
                if transaction.status in {
                    "approved",
                    "rejected",
                    "cancelled",
                }:
                    return {
                        "status": "already_processed",
                        "transaction_id": transaction.id,
                        "parent_transaction_id": parent.id,
                    }

                success = (
                    event_type == "transaction.success"
                    or provider_status in SUCCESS_STATUSES
                )

                failed = (
                    event_type in {
                        "transaction.failed",
                        "transaction.cancelled",
                        "transaction.expired",
                    }
                    or provider_status in FAILED_STATUSES
                )

                if success:

                    transaction.status = "approved"

                    transaction.description = (
                        f"Split deposit payment successful. "
                        f"Account {transaction.split_account} "
                        f"received KSh {transaction.amount:,.2f}."
                    )

                    db.flush()

                    children = (
                        db.query(Transaction)
                        .filter(
                            Transaction.parent_transaction_id
                            == parent.id
                        )
                        .all()
                    )

                    successful_children = [
                        child
                        for child in children
                        if child.status == "approved"
                    ]

                    failed_children = [
                        child
                        for child in children
                        if child.status in {
                            "rejected",
                            "cancelled",
                        }
                    ]

                    # A failed child means the complete parent deposit
                    # cannot be credited.
                    if failed_children:

                        parent.status = "rejected"

                        parent.description = (
                            "Split deposit failed because one "
                            "or more PalPluss payments failed. "
                            "Wallet was not credited."
                        )

                    # ONLY HERE is the customer's wallet credited.
                    # The full parent amount is credited exactly once.
                    elif (
                        len(children) == 2
                        and len(successful_children) == 2
                        and parent.status == "pending"
                    ):

                        credit_wallet(
                            db=db,
                            wallet=parent.wallet,
                            amount=Decimal(
                                str(parent.amount)
                            ),
                        )

                        parent.status = "approved"

                        parent.description = (
                            "Split M-Pesa deposit successful. "
                            "Both PalPluss accounts confirmed. "
                            f"Wallet credited once with "
                            f"KSh {parent.amount:,.2f}."
                        )

                    else:

                        parent.status = "pending"

                        parent.description = (
                            "Split deposit partially confirmed. "
                            f"{len(successful_children)}/2 "
                            "payments successful. "
                            "Waiting for the remaining payment."
                        )

                elif failed:

                    transaction.status = "rejected"

                    transaction.description = (
                        f"Split deposit payment failed. "
                        f"PalPluss Account {transaction.split_account} "
                        "did not complete the payment."
                    )

                    parent.status = "rejected"

                    parent.description = (
                        "Split deposit failed because one "
                        "PalPluss payment was not completed. "
                        "Wallet was not credited."
                    )

                else:

                    transaction.status = "pending"

                db.commit()

                return {
                    "status": "processed",
                    "transaction_id": transaction.id,
                    "transaction_status": transaction.status,
                    "parent_transaction_id": parent.id,
                    "parent_status": parent.status,
                }

            # ----------------------------------------------------
            # LEGACY NON-SPLIT DEPOSIT
            # ----------------------------------------------------

            if transaction.status == "approved":
                return {
                    "status": "already_processed",
                }

            success = (
                event_type == "transaction.success"
                or provider_status in SUCCESS_STATUSES
            )

            failed = (
                event_type in {
                    "transaction.failed",
                    "transaction.cancelled",
                    "transaction.expired",
                }
                or provider_status in FAILED_STATUSES
            )

            if success:

                credit_wallet(
                    db=db,
                    wallet=transaction.wallet,
                    amount=Decimal(
                        str(transaction.amount)
                    ),
                )

                transaction.status = "approved"

                transaction.description = (
                    "M-Pesa deposit successful. "
                    "Wallet credited."
                )

            elif failed:

                transaction.status = "rejected"

                transaction.description = (
                    "M-Pesa STK payment was not completed."
                )

            else:

                transaction.status = "pending"

            db.commit()

            return {
                "status": "processed",
                "transaction_id": transaction.id,
                "transaction_status": transaction.status,
            }

        # ========================================================
        # WITHDRAWAL
        # ========================================================

        if transaction.transaction_type == "withdrawal":

            # A withdrawal is already financially completed.
            if transaction.status == "approved":
                return {
                    "status": "already_processed",
                }

            success = (
                event_type == "transaction.success"
                or provider_status in SUCCESS_STATUSES
            )

            failed = (
                event_type in {
                    "transaction.failed",
                    "transaction.cancelled",
                    "transaction.expired",
                }
                or provider_status in FAILED_STATUSES
            )

            if success:

                # Make sure the wallet still has the full amount.
                if transaction.wallet.balance < transaction.total_debit:
                    transaction.status = "failed"
                    transaction.description = (
                        "Payout succeeded at PalPluss, but the "
                        "wallet no longer has sufficient funds "
                        "to settle the withdrawal."
                    )

                    db.commit()

                    return {
                        "status": "settlement_error",
                        "transaction_id": transaction.id,
                    }

                # Debit withdrawal amount + company fee.
                debit_wallet(
                    db=db,
                    wallet=transaction.wallet,
                    amount=Decimal(
                        str(transaction.total_debit)
                    ),
                )

                transaction.status = "approved"

                transaction.description = (
                    f"Withdrawal successful. "
                    f"KSh {transaction.amount:,.2f} "
                    f"sent to customer. "
                    f"Withdrawal fee: "
                    f"KSh {transaction.fee:,.2f}. "
                    f"Total wallet debit: "
                    f"KSh {transaction.total_debit:,.2f}."
                )

            elif failed:

                transaction.status = "rejected"

                transaction.description = (
                    "PalPluss B2C withdrawal failed. "
                    "No wallet funds were deducted."
                )

            else:

                transaction.status = "processing"

                transaction.description = (
                    "PalPluss B2C withdrawal is still processing."
                )

            db.commit()

            return {
                "status": "processed",
                "transaction_id": transaction.id,
                "transaction_status": transaction.status,
            }

        return {
            "status": "ignored",
            "message": "Unsupported transaction type",
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
