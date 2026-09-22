from decimal import Decimal

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.autotransact import Autotransact
from app.models.transaction import Transaction
from app.services.autotransact import (
    is_insufficient_funds,
    start_fallback_collection,
)
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

    transaction_data = payload.get("transaction") or {}

    provider_transaction_id = transaction_data.get("id")

    provider_status = str(
        transaction_data.get("status") or ""
    ).lower()

    result_code = transaction_data.get("result_code")
    result_desc = transaction_data.get("result_desc")

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
        transaction = (
            db.query(Transaction)
            .filter(
                Transaction.provider_transaction_id
                == provider_transaction_id
            )
            .with_for_update()
            .first()
        )

        if transaction is None and external_reference:
            transaction = (
                db.query(Transaction)
                .filter(
                    Transaction.reference
                    == external_reference
                )
                .with_for_update()
                .first()
            )

        if transaction is None:
            return {
                "status": "ignored",
                "message": "Transaction not found",
            }

        # ========================================================
        # AUTOTRANSACT
        # ========================================================

        if transaction.transaction_type == "autotransact":

            plan = (
                db.query(Autotransact)
                .filter(
                    Autotransact.user_id
                    == transaction.user_id
                )
                .with_for_update()
                .first()
            )

            # A primary collection that already triggered a fallback
            # must never trigger a second fallback if PalPluss retries
            # the original webhook.
            if transaction.status == "fallback_initiated":
                return {
                    "status": "already_processed",
                    "transaction_id": transaction.id,
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
                    "Autotransact collection successful. "
                    f"KSh {transaction.amount:,.2f} "
                    "credited to wallet through "
                    "PalPluss Account 2 / Till B."
                )

                if plan:
                    from datetime import datetime, timedelta, timezone

                    now = datetime.now(timezone.utc)

                    plan.enabled = True
                    plan.status = "active"
                    plan.fallback_attempted = False
                    plan.current_cycle_reference = None
                    plan.last_run_at = now
                    plan.next_run_at = (
                        now
                        + timedelta(days=plan.interval_days)
                    )
                    plan.last_transaction_id = transaction.id

                db.commit()

                return {
                    "status": "processed",
                    "transaction_id": transaction.id,
                    "transaction_status": transaction.status,
                }

            if failed:
                if plan and is_insufficient_funds(
                    result_code=result_code,
                    result_desc=result_desc,
                ):
                    transaction.description = (
                        "Primary Autotransact collection failed "
                        "because of insufficient customer funds. "
                        f"Provider code: {result_code}. "
                        f"Provider message: {result_desc or 'N/A'}"
                    )

                    db.flush()

                    result = start_fallback_collection(
                        db=db,
                        plan=plan,
                        primary_transaction=transaction,
                    )

                    return result

                transaction.status = "rejected"

                transaction.description = (
                    "Autotransact collection failed. "
                    f"Provider code: {result_code or 'N/A'}. "
                    f"Provider message: "
                    f"{result_desc or 'N/A'}"
                )

                if plan:
                    plan.status = "active"
                    plan.current_cycle_reference = None

                db.commit()

                return {
                    "status": "processed",
                    "transaction_id": transaction.id,
                    "transaction_status": transaction.status,
                }

            transaction.status = "processing"

            transaction.description = (
                "Autotransact collection is still processing. "
                f"Provider code: {result_code or 'N/A'}."
            )

            db.commit()

            return {
                "status": "processed",
                "transaction_id": transaction.id,
                "transaction_status": transaction.status,
            }

        # ========================================================
        # DEPOSIT
        # ========================================================

        if transaction.transaction_type == "deposit":

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
