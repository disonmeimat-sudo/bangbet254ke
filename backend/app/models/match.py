from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    league_id: Mapped[int] = mapped_column(
        ForeignKey("leagues.id"),
        nullable=False,
        index=True,
    )

    home_team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id"),
        nullable=False,
        index=True,
    )

    away_team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id"),
        nullable=False,
        index=True,
    )

    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="upcoming",
        nullable=False,
        index=True,
    )

    is_live: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )

    is_featured: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )

    is_betting_open: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    home_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    away_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    league: Mapped["League"] = relationship(
        "League",
        back_populates="matches",
    )

    home_team: Mapped["Team"] = relationship(
        "Team",
        foreign_keys=[home_team_id],
        back_populates="home_matches",
    )

    away_team: Mapped["Team"] = relationship(
        "Team",
        foreign_keys=[away_team_id],
        back_populates="away_matches",
    )

    markets: Mapped[list["Market"]] = relationship(
        "Market",
        back_populates="match",
        cascade="all, delete-orphan",
    )
