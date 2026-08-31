from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BetSelectionCreate(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    selection: str
    odds: Decimal = Field(gt=0)


class BetCreate(BaseModel):
    stake: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    selections: list[BetSelectionCreate] = Field(min_length=1)


class BetSelectionResponse(BetSelectionCreate):
    pass


class BetResponse(BaseModel):
    id: int
    stake: Decimal
    total_odds: Decimal
    potential_win: Decimal
    status: str
    created_at: datetime
    selections: list[BetSelectionResponse]
    wallet_balance: Decimal | None = None

    model_config = {
        "from_attributes": True,
    }
