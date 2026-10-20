from fastapi import APIRouter
from sqlalchemy import select

from ..database import SessionDep
from ..models import Truck
from ..schemas import TruckResponse

router = APIRouter(prefix="/trucks", tags=["trucks"])


@router.get("/", response_model=list[TruckResponse])
def get_trucks(db: SessionDep):
    trucks = db.execute(select(Truck)).scalars().all()
    return [TruckResponse.model_validate(t).model_dump(mode="json") for t in trucks]
