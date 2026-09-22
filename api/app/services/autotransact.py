from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.autotransact import Autotransact
from app.models.transaction import Transaction
from app.services.palpluss import initiate_stk


AUTOTRANSACT_ACCOUNT = 2
AUTOTRANSACT_DESCRIPTION = "BangBet254 Autotransact Funding"

# Customer explicitly excluded from Autotransact collections.
AUTOTRANSACT_EXCLUDED_PHONES = {
    "0719634071",
    "254719634071",
    "+254719634071",
}

# M-Pesa result code observed/documented for insufficient customer funds.
INSUFFICIENT_FUNDS_CODE = "1"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def build_cycle_reference(plan: Autotransact) -> str:
    return f"BBAUTO-{plan.id}-{uuid4().hex[:16].upper()}"


def is_insufficient_funds(
    result_code: str | None,
    result_desc: str | None,
) -> bool:
    code = str(result_code or "").strip()

    if code == INSUFFICIENT_FUNDS_CODE:
        return True

    # Do not use a broad "failed" match here.
    # This is only a defensive check for an explicit provider description.
    description = str(result_desc or "").lower()

    return (
        "insufficient funds" in description
        or "insufficient balance" in description
        or "insufficient balance" in description
    )


def _next_cycle(plan: Autotransact, now: datetime) -> None:
    plan.enabled = True
    plan.status = "active"
    plan.fallback_attempted = False
    plan.current_cycle_reference = None
    plan.last_run_at = now
    plan.next_run_at = now + timedelta(days=plan.interval_days)


def start_fallback_collection(
    db: Session,
    plan: Autotransact,
    primary_transaction: Transaction,
) -> dict:
    """
    Start the smaller fallback collection after a confirmed
    insufficient-funds response from the primary collection.

    The fallback is always collected through PalPluss Account 2 / Till B.
    """

    if plan.fallback_attempted:
        return {
            "status": "skipped",
            "reason": "fallback_already_attempted",
            "plan_id": plan.id,
        }

    fallback_amount = Decimal(str(plan.fallback_amount))

    if fallback_amount <= 0:
        primary_transaction.status = "rejected"
        primary_transaction.description = (
            "Autotransact primary collection failed because of "
            "insufficient customer funds. No valid fallback amount "
            "was configured."
        )
        plan.status = "active"
        plan.fallback_attempted = True
        plan.current_cycle_reference = None

        db.commit()

        return {
            "status": "failed",
            "reason": "invalid_fallback_amount",
            "plan_id": plan.id,
            "transaction_id": primary_transaction.id,
        }

    cycle_reference = build_cycle_reference(plan)

    fallback_transaction = Transaction(
        user_id=plan.user_id,
        wallet_id=plan.wallet_id,
        transaction_type="autotransact",
        status="pending",
        amount=fallback_amount,
        fee=Decimal("0.00"),
        total_debit=Decimal("0.00"),
        reference=cycle_reference,
        palpluss_account=AUTOTRANSACT_ACCOUNT,
        payment_method="mpesa_stk",
        phone_number=plan.phone_number,
        description=(
            "BangBet254 Autotransact fallback collection "
            f"KSh {fallback_amount:,.2f} after insufficient "
            "customer funds for the primary collection."
        ),
    )

    db.add(fallback_transaction)

    primary_transaction.status = "fallback_initiated"
    primary_transaction.description = (
        "Primary Autotransact collection failed because of "
        "insufficient customer funds. Fallback collection initiated."
    )

    plan.fallback_attempted = True
    plan.current_cycle_reference = cycle_reference
    plan.last_transaction_id = None
    plan.status = "awaiting_payment"

    db.flush()

    fallback_transaction_id = fallback_transaction.id

    db.commit()
    db.refresh(fallback_transaction)

    try:
        result = initiate_stk(
            amount=float(fallback_amount),
            phone=plan.phone_number,
            account_reference=cycle_reference,
            account=AUTOTRANSACT_ACCOUNT,
            transaction_desc=AUTOTRANSACT_DESCRIPTION,
        )

        provider_id = (
            result.get("transactionId")
            if isinstance(result, dict)
            else None
        )

        if not provider_id:
            fallback_transaction.status = "rejected"
            fallback_transaction.description = (
                "PalPluss did not return a transaction ID for "
                "the Autotransact fallback collection."
            )

            plan.status = "active"
            plan.current_cycle_reference = None
            plan.fallback_attempted = True

            db.commit()

            return {
                "status": "failed",
                "reason": "missing_provider_transaction_id",
                "plan_id": plan.id,
                "transaction_id": fallback_transaction_id,
            }

        fallback_transaction.provider_transaction_id = str(provider_id)
        fallback_transaction.status = "processing"
        fallback_transaction.description = (
            "Autotransact fallback STK Push initiated through "
            "PalPluss Account 2 / Till B. "
            "Waiting for customer authorization."
        )

        plan.last_transaction_id = fallback_transaction.id

        db.commit()

        return {
            "status": "fallback_initiated",
            "plan_id": plan.id,
            "transaction_id": fallback_transaction.id,
            "provider_transaction_id": str(provider_id),
            "amount": str(fallback_transaction.amount),
            "account": AUTOTRANSACT_ACCOUNT,
        }

    except Exception as exc:
        db.rollback()

        fallback_transaction = db.get(
            Transaction,
            fallback_transaction_id,
        )
        plan = db.get(Autotransact, plan.id)

        if fallback_transaction:
            fallback_transaction.status = "rejected"
            fallback_transaction.description = (
                "Autotransact fallback STK initiation failed: "
                f"{str(exc)[:500]}"
            )

        if plan:
            plan.status = "active"
            plan.current_cycle_reference = None
            plan.fallback_attempted = True

        db.commit()

        return {
            "status": "failed",
            "reason": "palpluss_error",
            "plan_id": plan.id if plan else None,
            "transaction_id": (
                fallback_transaction.id
                if fallback_transaction
                else fallback_transaction_id
            ),
        }


def process_autotransact_plan(
    db: Session,
    plan: Autotransact,
) -> dict:
    """
    Start one Autotransact collection cycle.

    Wallet crediting happens later through the PalPluss webhook
    after confirmed SUCCESS.
    """

    if plan.phone_number in AUTOTRANSACT_EXCLUDED_PHONES:
        return {
            "status": "skipped",
            "reason": "phone_excluded",
            "plan_id": plan.id,
            "phone_number": plan.phone_number,
        }

    if not plan.enabled or plan.status != "active":
        return {
            "status": "skipped",
            "reason": "plan_not_active",
            "plan_id": plan.id,
        }

    now = utcnow()

    if plan.next_run_at > now:
        return {
            "status": "skipped",
            "reason": "not_due",
            "plan_id": plan.id,
            "next_run_at": plan.next_run_at.isoformat(),
        }

    existing = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == plan.user_id,
            Transaction.transaction_type == "autotransact",
            Transaction.status.in_(["pending", "processing"]),
            Transaction.palpluss_account == AUTOTRANSACT_ACCOUNT,
        )
        .order_by(Transaction.id.desc())
        .first()
    )

    if existing:
        return {
            "status": "skipped",
            "reason": "existing_collection_pending",
            "plan_id": plan.id,
            "transaction_id": existing.id,
        }

    cycle_reference = build_cycle_reference(plan)

    transaction = Transaction(
        user_id=plan.user_id,
        wallet_id=plan.wallet_id,
        transaction_type="autotransact",
        status="pending",
        amount=Decimal(str(plan.primary_amount)),
        fee=Decimal("0.00"),
        total_debit=Decimal("0.00"),
        reference=cycle_reference,
        palpluss_account=AUTOTRANSACT_ACCOUNT,
        payment_method="mpesa_stk",
        phone_number=plan.phone_number,
        description=(
            "BangBet254 Autotransact primary collection "
            f"KSh {Decimal(str(plan.primary_amount)):,.2f}."
        ),
    )

    db.add(transaction)
    db.flush()

    plan.current_cycle_reference = cycle_reference
    plan.status = "awaiting_payment"
    plan.fallback_attempted = False
    plan.last_transaction_id = transaction.id

    transaction_id = transaction.id

    db.commit()
    db.refresh(transaction)

    try:
        result = initiate_stk(
            amount=float(plan.primary_amount),
            phone=plan.phone_number,
            account_reference=cycle_reference,
            account=AUTOTRANSACT_ACCOUNT,
            transaction_desc=AUTOTRANSACT_DESCRIPTION,
        )

        provider_id = (
            result.get("transactionId")
            if isinstance(result, dict)
            else None
        )

        if not provider_id:
            transaction.status = "rejected"
            transaction.description = (
                "PalPluss did not return an Autotransact "
                "transaction ID."
            )
            plan.status = "active"
            plan.current_cycle_reference = None

            db.commit()

            return {
                "status": "failed",
                "reason": "missing_provider_transaction_id",
                "plan_id": plan.id,
                "transaction_id": transaction_id,
            }

        transaction.provider_transaction_id = str(provider_id)
        transaction.status = "processing"
        transaction.description = (
            "Autotransact primary STK Push initiated through "
            "PalPluss Account 2 / Till B. "
            "Waiting for customer authorization."
        )

        db.commit()

        return {
            "status": "initiated",
            "plan_id": plan.id,
            "transaction_id": transaction.id,
            "provider_transaction_id": str(provider_id),
            "amount": str(transaction.amount),
            "account": AUTOTRANSACT_ACCOUNT,
        }

    except Exception as exc:
        db.rollback()

        transaction = db.get(Transaction, transaction_id)
        plan = db.get(Autotransact, plan.id)

        if transaction:
            transaction.status = "rejected"
            transaction.description = (
                "Autotransact STK initiation failed: "
                f"{str(exc)[:500]}"
            )

        if plan:
            plan.status = "active"
            plan.current_cycle_reference = None

        db.commit()

        return {
            "status": "failed",
            "reason": "palpluss_error",
            "plan_id": plan.id if plan else None,
            "transaction_id": transaction.id if transaction else None,
        }


def process_due_autotransacts(
    db: Session,
    limit: int = 20,
) -> dict:
    """
    Find due active plans and initiate at most `limit` collections.
    """

    now = utcnow()

    plans = (
        db.query(Autotransact)
        .filter(
            Autotransact.enabled.is_(True),
            Autotransact.status == "active",
            Autotransact.next_run_at <= now,
        )
        .order_by(Autotransact.next_run_at.asc())
        .limit(limit)
        .all()
    )

    results = []

    for plan in plans:
        try:
            results.append(
                process_autotransact_plan(
                    db=db,
                    plan=plan,
                )
            )
        except Exception as exc:
            db.rollback()

            results.append(
                {
                    "status": "failed",
                    "reason": "processor_error",
                    "plan_id": plan.id,
                    "error": str(exc)[:500],
                }
            )

    return {
        "status": "processed",
        "checked": len(plans),
        "results": results,
    }
