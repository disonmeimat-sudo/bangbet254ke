from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    name: str
    country: str | None = None
    sport: str = "football"
    league_id: int


class TeamResponse(BaseModel):
    id: int
    name: str
    country: str | None
    sport: str
    league_id: int | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
