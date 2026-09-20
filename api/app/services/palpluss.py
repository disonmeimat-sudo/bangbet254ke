from palpluss import PalPluss

from app.core.config import settings


def get_palpluss_client(account: int = 1) -> PalPluss:
    if account == 2:
        api_key = settings.palpluss_api_key_2
    else:
        api_key = settings.palpluss_api_key

    if not api_key:
        raise RuntimeError(
            f"PalPluss account {account} API key is not configured."
        )

    return PalPluss(
        api_key=api_key,
        timeout=settings.palpluss_timeout,
    )


def get_channel_id(account: int = 1) -> str:
    if account == 2:
        return settings.palpluss_channel_id_2

    return settings.palpluss_channel_id


def initiate_stk(
    *,
    amount: float,
    phone: str,
    account_reference: str,
    account: int = 1,
):
    client = get_palpluss_client(account)

    try:
        channel_id = get_channel_id(account)

        result = client.stk_push(
            amount=amount,
            phone=phone,
            account_reference=account_reference,
            transaction_desc="BangBet254 Wallet Deposit",
            channel_id=channel_id or None,
            callback_url=settings.palpluss_callback_url or None,
        )

        return result

    finally:
        client.close()


def get_palpluss_transaction(
    transaction_id: str,
    account: int = 1,
):
    client = get_palpluss_client(account)

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
    # Withdrawals continue using PalPluss account 1.
    client = get_palpluss_client(1)

    try:
        result = client.b2c_payout(
            amount=amount,
            phone=phone,
            currency="KES",
            reference=reference,
            description="BangBet254 Wallet Withdrawal",
            channel_id=settings.palpluss_channel_id or None,
            callback_url=settings.palpluss_callback_url or None,
            idempotency_key=reference,
        )

        return result

    finally:
        client.close()
