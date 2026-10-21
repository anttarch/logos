from datetime import datetime

from pydantic import BaseModel, Field


# classe base
class TruckBase(BaseModel):
    plate: str = Field(min_length=7, max_length=7)
    driver_name: str = Field(min_length=3, max_length=120)
    location: str = Field(max_length=255)


# pra GET
class TruckResponse(TruckBase):
    model_config = {"from_attributes": True}

    id: int
    created_at: datetime
    updated_at: datetime


# pra POST
class TruckCreate(TruckBase):
    pass


# pra PATCH
class TruckUpdate(BaseModel):
    driver_name: str | None = Field(None, min_length=3, max_length=120)
    location: str | None = Field(None, max_length=255)
