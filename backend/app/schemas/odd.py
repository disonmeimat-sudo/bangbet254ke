from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OddCreate(BaseModel):
    market_id: int
    name: str
    value: float = Field(gt=1.0)


class OddUpdate(BaseModel):
    name: str | None = None
    value: float | None = Field(default=None, gt=1.0)
    is_active: bool | None = None


class OddResponse(BaseModel):
    id: int
    market_id: int
    name: str
    value: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
