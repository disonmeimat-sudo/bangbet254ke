from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class BetSelection(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    selection: str
    odds: float


class BetCreate(BaseModel):
    stake: Decimal = Field(gt=0)
    selections: list[BetSelection] = Field(min_length=1)


class BetResponse(BaseModel):
    id: int
    user_id: int
    stake: Decimal
    total_odds: Decimal
    potential_win: Decimal
    status: str
    selections: list[dict]
    wallet_balance: Decimal | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
