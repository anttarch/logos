from http import HTTPStatus

from fastapi import APIRouter
from sqlalchemy import case as sql_case
from sqlalchemy import select

from ..database import SessionDep
from ..models.incident import Incident
from ..schemas import (
    Criticality,
    IncidentCategory,
    IncidentCreate,
    IncidentRead,
    IncidentStatus,
)

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("/")
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

    return {
        "incidents": [
            IncidentRead.model_validate(i).model_dump(mode="json") for i in incidents
        ]
    }


@router.post("/", status_code=HTTPStatus.CREATED)
def create_incident(db: SessionDep, incident_create: IncidentCreate):
    incident = Incident(**incident_create.model_dump())
    db.add(incident)
    db.commit()
