from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    short_name: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    logo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    country: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    sport: Mapped[str] = mapped_column(
        String(50),
        default="football",
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    league_id: Mapped[int | None] = mapped_column(
        ForeignKey("leagues.id"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    league: Mapped["League | None"] = relationship(
        "League",
        back_populates="teams",
    )

    home_matches: Mapped[list["Match"]] = relationship(
        "Match",
        foreign_keys="Match.home_team_id",
        back_populates="home_team",
    )

    away_matches: Mapped[list["Match"]] = relationship(
        "Match",
        foreign_keys="Match.away_team_id",
        back_populates="away_team",
    )
