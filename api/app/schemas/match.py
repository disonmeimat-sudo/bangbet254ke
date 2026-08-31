from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MatchCreate(BaseModel):
    league_id: int
    home_team_id: int
    away_team_id: int
    scheduled_at: datetime

    home_odds: float = Field(gt=1)
    draw_odds: float = Field(gt=1)
    away_odds: float = Field(gt=1)


class MatchScoreUpdate(BaseModel):
    home_score: int
    away_score: int


class MatchStatusUpdate(BaseModel):
    status: str


class MatchFeaturedUpdate(BaseModel):
    is_featured: bool


class MatchBettingUpdate(BaseModel):
    is_betting_open: bool


class MatchResponse(BaseModel):
    id: int
    league_id: int
    home_team_id: int
    away_team_id: int
    scheduled_at: datetime
    status: str
    is_live: bool
    is_featured: bool
    is_betting_open: bool
    home_score: int
    away_score: int

    model_config = ConfigDict(from_attributes=True)
