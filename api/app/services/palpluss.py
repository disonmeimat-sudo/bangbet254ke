from palpluss import PalPluss

from app.core.config import settings


def get_palpluss_client() -> PalPluss:
    return PalPluss(
        api_key=settings.palpluss_api_key,
        timeout=settings.palpluss_timeout,
    )


def initiate_stk(
    *,
    amount: float,
    phone: str,
    account_reference: str,
):
    client = get_palpluss_client()

    try:
        result = client.stk_push(
            amount=amount,
            phone=phone,
            account_reference=account_reference,
            transaction_desc="BangBet254 Wallet Deposit",
            callback_url=settings.palpluss_callback_url or None,
        )

        return result

    finally:
        client.close()


def get_palpluss_transaction(transaction_id: str):
    client = get_palpluss_client()

    try:
        return client.get_transaction(transaction_id)

    finally:
        client.close()


def initiate_b2c_payout(
    *,
    amount: float,
    phone: str,
    reference: str,
):
    client = get_palpluss_client()

    try:
        result = client.b2c_payout(
            amount=amount,
            phone=phone,
            currency="KES",
            reference=reference,
            description="BangBet254 Wallet Withdrawal",
            callback_url=settings.palpluss_callback_url or None,
            idempotency_key=reference,
        )

        return result

    finally:
        client.close()
