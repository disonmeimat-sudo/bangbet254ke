from pydantic import BaseModel, ConfigDict


class LeagueCreate(BaseModel):
    name: str
    country: str | None = None
    sport: str = "football"


class LeagueResponse(BaseModel):
    id: int
    name: str
    country: str | None
    sport: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
