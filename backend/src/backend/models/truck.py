from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, utcnow


class Truck(Base):
    __tablename__ = "trucks"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )
    model: Mapped[str] = mapped_column(String(30), nullable=False)
    plate: Mapped[str] = mapped_column(String(7), unique=True, index=True)
    driver_name: Mapped[str] = mapped_column(String(120), nullable=True)
    location: Mapped[str] = mapped_column(String(255), nullable=True)
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

    if TYPE_CHECKING:
        from .incident import Incident

    incidents: Mapped[list[Incident]] = relationship(
        "Incident",
        back_populates="truck",
        cascade="all, delete-orphan",
    )
