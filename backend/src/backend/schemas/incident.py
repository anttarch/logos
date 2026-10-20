from datetime import datetime

from pydantic import BaseModel, Field

from .enums import Criticality, IncidentCategory, IncidentStatus


# classe base
class IncidentBase(BaseModel):
    category: IncidentCategory
    criticality: Criticality
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    location: str | None = Field(None, max_length=255)


# pra GET
class IncidentResponse(IncidentBase):
    model_config = {
        "from_attributes": True
    }  # permite que o pydantic valide direto aparentemente

    id: int
    status: IncidentStatus
    version: int
    created_at: datetime
    updated_at: datetime


# pra POST
class IncidentCreate(IncidentBase):
    status: IncidentStatus = IncidentStatus.OPEN


# pra PATCH
class IncidentUpdate(BaseModel):
    version: int = Field(ge=1)
    status: IncidentStatus | None = None
    criticality: Criticality | None = None
