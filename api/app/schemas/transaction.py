from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class DepositCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    payment_method: str
    reference: str | None = None


class WithdrawalCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    payment_method: str
    reference: str | None = None


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    wallet_id: int
    transaction_type: str
    status: str
    amount: Decimal
    reference: str | None
    payment_method: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionAdminUpdate(BaseModel):
    status: str
    description: str | None = None
