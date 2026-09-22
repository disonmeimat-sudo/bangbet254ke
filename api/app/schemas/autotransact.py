from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class AutotransactEnable(BaseModel):
    primary_amount: Decimal = Field(
        ...,
        gt=0,
        decimal_places=2,
    )

    fallback_amount: Decimal = Field(
        ...,
        gt=0,
        decimal_places=2,
    )

    interval_days: int = Field(
        ...,
        description="Collection interval: 2 or 3 days.",
    )

    phone_number: str

    consent: bool = Field(
        ...,
        description="Explicit customer consent.",
    )

    consent_version: str = "2026-09-22"

    @field_validator("interval_days")
    @classmethod
    def validate_interval(cls, value: int) -> int:
        if value not in (2, 3):
            raise ValueError("interval_days must be 2 or 3.")
        return value

    @field_validator("fallback_amount")
    @classmethod
    def validate_fallback(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("fallback_amount must be greater than zero.")
        return value


class AutotransactUpdate(BaseModel):
    primary_amount: Decimal | None = Field(
        default=None,
        gt=0,
        decimal_places=2,
    )

    fallback_amount: Decimal | None = Field(
        default=None,
        gt=0,
        decimal_places=2,
    )

    interval_days: int | None = None

    phone_number: str | None = None

    @field_validator("interval_days")
    @classmethod
    def validate_interval(cls, value: int | None) -> int | None:
        if value is not None and value not in (2, 3):
            raise ValueError("interval_days must be 2 or 3.")
        return value


class AutotransactResponse(BaseModel):
    id: int
    enabled: bool
    primary_amount: Decimal
    fallback_amount: Decimal
    interval_days: int
    phone_number: str
    palpluss_account: int
    status: str
    next_run_at: datetime
    last_run_at: datetime | None
    last_transaction_id: int | None
    consented_at: datetime
    consent_version: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }
