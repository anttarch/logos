from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as DBEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..schemas.enums import IncidentCategory, IncidentCriticality, IncidentStatus
from .base import Base, utcnow


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,  # aparentemente é bom ter
    )
    category: Mapped[IncidentCategory] = mapped_column(
        DBEnum(IncidentCategory),
        nullable=False,
        index=True,
    )
    criticality: Mapped[IncidentCriticality] = mapped_column(
        DBEnum(IncidentCriticality),
        nullable=False,
        index=True,
    )
    status: Mapped[IncidentStatus] = mapped_column(
        DBEnum(IncidentStatus),
        default=IncidentStatus.OPEN,
        nullable=False,
        index=True,
    )
    # vai servir pra evitar updates fora de hora
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str] = mapped_column(String(255), nullable=True)

    truck_id: Mapped[int] = mapped_column(
        ForeignKey("trucks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    if TYPE_CHECKING:
        from .truck import Truck

    truck: Mapped[Truck] = relationship(
        "Truck",
        back_populates="incidents",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utcnow,
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )
