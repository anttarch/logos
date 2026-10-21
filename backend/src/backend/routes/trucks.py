from http import HTTPStatus

from fastapi import APIRouter, HTTPException
from sqlalchemy import select, update

from ..database import SessionDep
from ..models import Truck
from ..schemas import TruckCreate, TruckResponse, TruckUpdate

router = APIRouter(prefix="/trucks", tags=["trucks"])


@router.get("/", response_model=list[TruckResponse])
async def get_trucks(db: SessionDep):
    trucks = (await db.scalars(select(Truck))).all()
    return [TruckResponse.model_validate(t).model_dump(mode="json") for t in trucks]


@router.post(
    "/",
    status_code=HTTPStatus.CREATED,
    response_model=TruckResponse,
    responses={HTTPStatus.CONFLICT: {}},
)
async def create_truck(db: SessionDep, truck_create: TruckCreate):
    plate_exists = await db.scalar(
        select(Truck).where(Truck.plate == truck_create.plate)
    )
    if plate_exists:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT, detail="Plate already exists"
        )

    truck = Truck(**truck_create.model_dump())
    db.add(truck)
    await db.commit()
    await db.refresh(truck)
    return TruckResponse.model_validate(truck).model_dump(mode="json")


@router.patch(
    "/{truck_id}",
    response_model=TruckResponse,
    responses={HTTPStatus.NOT_FOUND: {}},
)
async def update_truck(db: SessionDep, truck_id: int, truck_update: TruckUpdate):
    truck = await db.get(Truck, truck_id)
    if not truck:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Truck not found")

    new_data = truck_update.model_dump(exclude_unset=True)
    if not new_data:
        # retorna o truck encontrado, sem alterações
        return TruckResponse.model_validate(truck).model_dump(mode="json")

    stmt = update(Truck).where(Truck.id == truck_id).values(new_data).returning(Truck)
    changed = await db.scalar(stmt)
    await db.commit()

    return TruckResponse.model_validate(changed).model_dump(mode="json")
