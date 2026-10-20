from datetime import UTC, datetime

from sqlalchemy import (
    DateTime,
    Integer,
    String,
    Text,
)
from sqlalchemy import (
    Enum as DBEnum,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..schemas.enums import Criticality, IncidentCategory, IncidentStatus
from .base import Base


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
    criticality: Mapped[Criticality] = mapped_column(
        DBEnum(Criticality),
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
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.now(UTC).replace(tzinfo=None),
        onupdate=datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
