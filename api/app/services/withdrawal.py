from decimal import Decimal


MAX_WITHDRAWAL = Decimal("200000.00")


# These are intentionally configurable placeholder tiers.
# Change them here later when the company decides on the
# final withdrawal-fee structure.
WITHDRAWAL_FEES = [
    (Decimal("0.00"), Decimal("100.00"), Decimal("20.00")),
    (Decimal("101.00"), Decimal("500.00"), Decimal("75.00")),
    (Decimal("501.00"), Decimal("1000.00"), Decimal("100.00")),
    (Decimal("1001.00"), Decimal("2000.00"), Decimal("150.00")),
    (Decimal("2001.00"), Decimal("5000.00"), Decimal("250.00")),
    (Decimal("5001.00"), Decimal("10000.00"), Decimal("400.00")),
    (Decimal("10001.00"), Decimal("20000.00"), Decimal("600.00")),
    (Decimal("20001.00"), Decimal("50000.00"), Decimal("1000.00")),
    (Decimal("50001.00"), Decimal("100000.00"), Decimal("1500.00")),
    (Decimal("100001.00"), Decimal("200000.00"), Decimal("2500.00")),
]


def get_withdrawal_fee(amount: Decimal) -> Decimal:
    amount = Decimal(amount)

    if amount <= 0:
        raise ValueError("Withdrawal amount must be greater than zero.")

    if amount > MAX_WITHDRAWAL:
        raise ValueError(
            f"Maximum withdrawal amount is KSh {MAX_WITHDRAWAL:,.2f}."
        )

    for minimum, maximum, fee in WITHDRAWAL_FEES:
        if minimum <= amount <= maximum:
            return fee

    raise ValueError("No withdrawal fee tier exists for this amount.")


def calculate_withdrawal(amount: Decimal) -> tuple[Decimal, Decimal]:
    amount = Decimal(amount)
    fee = get_withdrawal_fee(amount)
    total = amount + fee

    return fee, total
