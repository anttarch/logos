from http import HTTPStatus

from fastapi import APIRouter
from sqlalchemy import select

from ..database import SessionDep
from ..models import Truck
from ..schemas import TruckCreate, TruckResponse

router = APIRouter(prefix="/trucks", tags=["trucks"])


@router.get("/", response_model=list[TruckResponse])
def get_trucks(db: SessionDep):
    trucks = db.execute(select(Truck)).scalars().all()
    return [TruckResponse.model_validate(t).model_dump(mode="json") for t in trucks]


@router.post("/", status_code=HTTPStatus.CREATED)
def create_truck(db: SessionDep, truck_create: TruckCreate):
    truck = Truck(**truck_create.model_dump())
    db.add(truck)
    db.commit()
