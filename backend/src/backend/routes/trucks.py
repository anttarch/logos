from http import HTTPStatus

from fastapi import APIRouter, HTTPException
from sqlalchemy import exists, select, update

from ..database import SessionDep
from ..models import Truck
from ..schemas import TruckCreate, TruckResponse, TruckUpdate

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


@router.patch(
    "/{truck_id}", response_model=TruckResponse, responses={HTTPStatus.NOT_FOUND: {}}
)
def update_truck(db: SessionDep, truck_id: int, truck_update: TruckUpdate):
    truck = db.query(exists().where(Truck.id == truck_id)).scalar()
    if not truck:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Truck not found")

    new_data = truck_update.model_dump(exclude_none=True)
    stmt = update(Truck).where(Truck.id == truck_id).values(new_data).returning(Truck)

    changed = db.execute(stmt).scalar_one()
    db.commit()
    return TruckResponse.model_validate(changed).model_dump(mode="json")
