from http import HTTPStatus

from fastapi import APIRouter, HTTPException
from sqlalchemy import case as sql_case
from sqlalchemy import select, update

from ..database import SessionDep
from ..models import Incident, Truck
from ..schemas import (
    IncidentCategory,
    IncidentCreate,
    IncidentCriticality,
    IncidentResponse,
    IncidentStatus,
    IncidentUpdate,
)
from .websocket import ws

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("/", response_model=list[IncidentResponse])
async def get_incidents(
    db: SessionDep,
    category: IncidentCategory | None = None,
    status: IncidentStatus | None = None,
    criticality: IncidentCriticality | None = None,
):
    query = select(Incident)

    if category is not None:
        query = query.where(Incident.category == category)
    if status is not None:
        query = query.where(Incident.status == status)
    if criticality is not None:
        query = query.where(Incident.criticality == criticality)

    criticality_ordering = sql_case(
        (Incident.criticality == IncidentCriticality.HIGH, 3),
        (Incident.criticality == IncidentCriticality.MEDIUM, 2),
        (Incident.criticality == IncidentCriticality.LOW, 1),
    ).desc()

    # completamente arbitrario, mas faz sentido pra mim...
    category_ordering = sql_case(
        (Incident.category == IncidentCategory.VICTIM_ACCIDENT, 5),
        (Incident.category == IncidentCategory.VEHICLE_ACCIDENT, 4),
        (Incident.category == IncidentCategory.WEIRD_WEATHER_CONDITION, 3),
        (Incident.category == IncidentCategory.MECHANICAL_ISSUE, 2),
        (Incident.category == IncidentCategory.ROAD_BLOCK, 1),
    ).desc()

    query = query.order_by(
        criticality_ordering, category_ordering, Incident.created_at.desc()
    )

    incidents = (await db.scalars(query)).all()

    return [
        IncidentResponse.model_validate(i).model_dump(mode="json") for i in incidents
    ]


@router.post(
    "/",
    status_code=HTTPStatus.CREATED,
    response_model=IncidentResponse,
    responses={HTTPStatus.NOT_FOUND: {}},
)
async def create_incident(db: SessionDep, incident_create: IncidentCreate):
    truck_exists = await db.scalar(
        select(Truck).where(Truck.id == incident_create.truck_id)
    )
    if not truck_exists:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Truck not found")

    incident = Incident(**incident_create.model_dump())
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    json = IncidentResponse.model_validate(incident).model_dump(mode="json")
    await ws.broadcast({"event": "NEW_INCIDENT", "payload": json})
    return json


@router.patch(
    "/{incident_id}",
    response_model=IncidentResponse,
    responses={HTTPStatus.NOT_FOUND: {}, HTTPStatus.CONFLICT: {}},
)
async def update_incident(
    db: SessionDep, incident_id: int, incident_update: IncidentUpdate
):
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Incident not found"
        )

    # primeira verificação: rejeita versões diferentes ou lock de outro usuário
    if incident.version != incident_update.version:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="Incident version is outdated.",
        )

    raw_update = incident_update.model_dump(exclude_unset=True)
    explict_reassign = "assigned_to" in raw_update
    if (
        incident.status == IncidentStatus.UNDER_INVESTIGATION
        and incident_update.status == IncidentStatus.UNDER_INVESTIGATION
        and explict_reassign
        and incident.assigned_to not in (None, incident_update.assigned_to)
    ):
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="Incident is already assigned.",
        )

    new_data = {k: v for k, v in raw_update.items() if v is not None}
    if not new_data:
        return IncidentResponse.model_validate(incident).model_dump(mode="json")

    new_data["version"] = incident_update.version + 1
    if new_data.get("status") == IncidentStatus.UNDER_INVESTIGATION:
        if explict_reassign:
            new_data["assigned_to"] = incident_update.assigned_to
        # se não explicit, mantém o valor atual no banco
    elif "status" in new_data:
        new_data["assigned_to"] = None

    stmt = (
        update(Incident)
        # segunda verificação: caso o valor mude desde a primeira
        .where(Incident.id == incident_id, Incident.version == incident_update.version)
        .values(new_data)
        .returning(Incident)
    )

    changed = await db.scalar(stmt)
    if not changed:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="Incident was modified by another user.",
        )
    await db.commit()
    json = IncidentResponse.model_validate(changed).model_dump(mode="json")
    await ws.broadcast({"event": "PATCH_INCIDENT", "payload": json})
    return json
