from datetime import datetime

from pydantic import BaseModel, Field

from .enums import IncidentCategory, IncidentCriticality, IncidentStatus
from .truck import TruckResponse


# classe base
class IncidentBase(BaseModel):
    category: IncidentCategory
    criticality: IncidentCriticality
    title: str = Field(min_length=3, max_length=255)
    description: str | None = None
    location: str = Field(max_length=255)
    notes: str | None = None


# pra GET
class IncidentResponse(IncidentBase):
    model_config = {
        "from_attributes": True
    }  # permite que o pydantic valide direto aparentemente

    id: int
    status: IncidentStatus
    version: int
    truck: TruckResponse
    created_at: datetime
    updated_at: datetime


# pra POST
class IncidentCreate(IncidentBase):
    status: IncidentStatus = IncidentStatus.OPEN
    truck_id: int


# pra PATCH
class IncidentUpdate(BaseModel):
    version: int = Field(ge=1)
    status: IncidentStatus | None = None
