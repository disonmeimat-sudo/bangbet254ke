from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MarketCreate(BaseModel):
    match_id: int
    name: str
    market_type: str


class MarketUpdate(BaseModel):
    name: str | None = None
    market_type: str | None = None
    is_active: bool | None = None


class MarketResponse(BaseModel):
    id: int
    match_id: int
    name: str
    market_type: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
