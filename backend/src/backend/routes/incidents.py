from http import HTTPStatus

from fastapi import APIRouter, HTTPException
from sqlalchemy import case as sql_case
from sqlalchemy import exists, select, update

from ..database import SessionDep
from ..models.incident import Incident
from ..schemas import (
    Criticality,
    IncidentCategory,
    IncidentCreate,
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
    criticality: Criticality | None = None,
):
    query = select(Incident)

    if category is not None:
        query = query.where(Incident.category == category)
    if status is not None:
        query = query.where(Incident.status == status)
    if criticality is not None:
        query = query.where(Incident.criticality == criticality)

    criticality_ordering = sql_case(
        (Incident.criticality == Criticality.HIGH, 3),
        (Incident.criticality == Criticality.MEDIUM, 2),
        (Incident.criticality == Criticality.LOW, 1),
    ).desc()

    query = query.order_by(criticality_ordering, Incident.created_at.desc())

    incidents = db.execute(query).scalars().all()

    return [
        IncidentResponse.model_validate(i).model_dump(mode="json") for i in incidents
    ]


@router.post("/", status_code=HTTPStatus.CREATED)
def create_incident(db: SessionDep, incident_create: IncidentCreate):
    incident = Incident(**incident_create.model_dump())
    db.add(incident)
    db.commit()


@router.patch(
    "/{incident_id}",
    response_model=IncidentResponse,
    responses={HTTPStatus.NOT_FOUND: {}, HTTPStatus.CONFLICT: {}},
)
def update_incident(db: SessionDep, incident_id: int, incident_update: IncidentUpdate):
    incident = db.query(exists().where(Incident.id == incident_id)).scalar()
    if not incident:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Incident not found"
        )

    new_data = incident_update.model_dump(exclude_unset=True)
    stmt = (
        update(Incident)
        .where(Incident.id == incident_id, Incident.version == incident_update.version)
        .values(new_data)
    )

    did_change = db.execute(stmt)

    if did_change == 0:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT, detail="Incident is outdated"
        )

    db.commit()
    updated = db.get(Incident, incident_id)
    return IncidentResponse.model_validate(updated).model_dump(mode="json")
