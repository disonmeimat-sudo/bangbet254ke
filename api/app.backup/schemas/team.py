from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    name: str
    short_name: str | None = None
    logo_url: str | None = None
    country: str | None = None
    sport: str = "football"
    league_id: int


class TeamResponse(BaseModel):
    id: int
    name: str
    short_name: str | None
    logo_url: str | None
    country: str | None
    sport: str
    league_id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
