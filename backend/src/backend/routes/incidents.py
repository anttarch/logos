from http import HTTPStatus

from fastapi import APIRouter, HTTPException
from sqlalchemy import case as sql_case
from sqlalchemy import exists, select, update

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

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("/", response_model=list[IncidentResponse])
def get_incidents(
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

    query = query.order_by(criticality_ordering, Incident.created_at.desc())

    incidents = db.execute(query).scalars().all()

    return [
        IncidentResponse.model_validate(i).model_dump(mode="json") for i in incidents
    ]


@router.post(
    "/",
    status_code=HTTPStatus.CREATED,
    response_model=IncidentResponse,
    responses={HTTPStatus.NOT_FOUND: {}},
)
def create_incident(db: SessionDep, incident_create: IncidentCreate):
    truck = db.query(exists().where(Truck.id == incident_create.truck_id)).scalar()
    if not truck:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Truck not found")

    incident = Incident(**incident_create.model_dump())
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return IncidentResponse.model_validate(incident).model_dump(mode="json")


@router.patch(
    "/{incident_id}",
    response_model=IncidentResponse,
    responses={HTTPStatus.NOT_FOUND: {}, HTTPStatus.CONFLICT: {}},
)
def update_incident(db: SessionDep, incident_id: int, incident_update: IncidentUpdate):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Incident not found"
        )

    # primeira verificação: rejeita versões diferentes de início
    if incident.version != incident_update.version:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT, detail="Incident is outdated"
        )

    new_data = incident_update.model_dump(exclude_unset=True, exclude_none=True)
    if not new_data:
        # retorna o incident encontrado, sem alterações
        return IncidentResponse.model_validate(incident).model_dump(mode="json")

    new_data["version"] = incident_update.version + 1
    stmt = (
        update(Incident)
        # segunda verificação: caso o valor desde a primeira
        .where(Incident.id == incident_id, Incident.version == incident_update.version)
        .values(new_data)
        .returning(Incident)
    )

    changed = db.execute(stmt).scalar()
    db.commit()
    return IncidentResponse.model_validate(changed).model_dump(mode="json")
