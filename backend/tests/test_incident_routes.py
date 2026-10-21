"""Tests for the /incidents/ routes: GET, POST, PATCH, ordering, and Truck relationship."""

import asyncio
from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.orm import selectinload


async def _create(client: AsyncClient, truck_id: int, **overrides) -> dict:
    """Create an incident via POST /incidents/; return status code and body."""
    payload = {
        "category": "VEHICLE_ACCIDENT",
        "criticality": "HIGH",
        "title": "Test incident",
        "location": "BR-116 km 100",
        "truck_id": truck_id,
    }
    payload.update(overrides)
    r = await client.post("/incidents/", json=payload)
    return {"status_code": r.status_code, "body": r.json()}


@pytest.mark.asyncio
async def test_post_incident_creates_record(client: AsyncClient, default_truck: dict):
    """POST /incidents/ returns 201 with the created IncidentResponse and persists it."""
    result = await _create(
        client,
        default_truck["id"],
        title="Created incident record",
        location="SP-348 km 50",
        notes="Initial triage notes",
    )

    assert result["status_code"] == 201, f"expected 201, got {result['status_code']}"
    assert result["body"] is not None
    assert result["body"]["title"] == "Created incident record"
    assert result["body"]["location"] == "SP-348 km 50"
    assert result["body"]["notes"] == "Initial triage notes"
    assert result["body"]["truck"]["id"] == default_truck["id"]
    assert result["body"]["truck"]["plate"] == default_truck["plate"]
    assert "id" in result["body"]

    get_r = await client.get("/incidents/")
    assert get_r.status_code == 200
    body = get_r.json()
    assert isinstance(body, list)
    created = next((i for i in body if i["title"] == "Created incident record"), None)
    assert created is not None
    assert created["location"] == "SP-348 km 50"
    assert created["notes"] == "Initial triage notes"
    assert created["truck"]["id"] == default_truck["id"]


@pytest.mark.asyncio
async def test_post_incident_default_status_open_and_notes_none(
    client: AsyncClient, default_truck: dict
):
    """POST /incidents/ defaults status to OPEN and notes to None when not provided."""
    await _create(client, default_truck["id"], title="Default status incident")

    get_r = await client.get("/incidents/")
    assert get_r.status_code == 200
    incidents = get_r.json()
    target = next(i for i in incidents if i["title"] == "Default status incident")
    assert target["status"] == "OPEN"
    assert target["notes"] is None


@pytest.mark.asyncio
async def test_post_incident_custom_status(client: AsyncClient, default_truck: dict):
    """POST /incidents/ honors an explicit initial status when provided."""
    result = await _create(
        client,
        default_truck["id"],
        title="Custom status incident",
        status="UNDER_INVESTIGATION",
    )
    assert result["status_code"] == 201
    assert result["body"]["status"] == "UNDER_INVESTIGATION"


@pytest.mark.asyncio
async def test_post_incident_invalid_category_422(
    client: AsyncClient, default_truck: dict
):
    """POST /incidents/ rejects an invalid category with 422."""
    result = await _create(client, default_truck["id"], category="NOT_A_REAL_CATEGORY")

    assert result["status_code"] == 422


@pytest.mark.asyncio
async def test_post_incident_invalid_title_422(
    client: AsyncClient, default_truck: dict
):
    """POST /incidents/ rejects an empty or too-short (<3 chars) title with 422."""
    r_empty = await _create(client, default_truck["id"], title="")
    assert r_empty["status_code"] == 422

    r_short = await _create(client, default_truck["id"], title="ab")
    assert r_short["status_code"] == 422


@pytest.mark.asyncio
async def test_post_incident_missing_location_422(
    client: AsyncClient, default_truck: dict
):
    """POST /incidents/ rejects payload without location with 422."""
    r = await client.post(
        "/incidents/",
        json={
            "category": "VEHICLE_ACCIDENT",
            "criticality": "HIGH",
            "title": "Incident missing location",
            "truck_id": default_truck["id"],
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_post_incident_missing_truck_id_422(client: AsyncClient):
    """POST /incidents/ rejects payload without truck_id with 422."""
    r = await client.post(
        "/incidents/",
        json={
            "category": "VEHICLE_ACCIDENT",
            "criticality": "HIGH",
            "title": "Incident missing truck_id",
            "location": "BR-116 km 100",
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_post_incident_nonexistent_truck_404(client: AsyncClient):
    """POST /incidents/ returns 404 when truck_id does not reference an existing truck."""
    result = await _create(
        client,
        999999,
        title="Orphaned truck incident",
    )
    assert result["status_code"] == 404


@pytest.mark.asyncio
async def test_incident_timestamps_are_dynamic(
    client: AsyncClient, default_truck: dict
):
    """Creating two incidents at different times yields distinct created_at timestamps."""
    await _create(client, default_truck["id"], title="Timestamp incident 1")
    await asyncio.sleep(0.02)
    await _create(client, default_truck["id"], title="Timestamp incident 2")

    incidents = (await client.get("/incidents/")).json()
    inc1 = next(i for i in incidents if i["title"] == "Timestamp incident 1")
    inc2 = next(i for i in incidents if i["title"] == "Timestamp incident 2")

    t1 = datetime.fromisoformat(inc1["created_at"]).replace(tzinfo=None)
    t2 = datetime.fromisoformat(inc2["created_at"]).replace(tzinfo=None)
    assert t2 > t1


@pytest.mark.asyncio
async def test_get_incidents_empty_list(client: AsyncClient):
    """GET /incidents/ returns a valid (possibly empty) list."""
    r = await client.get("/incidents/")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)


@pytest.mark.asyncio
async def test_get_incidents_with_filter(client: AsyncClient, default_truck: dict):
    """GET /incidents/?category=VEHICLE_ACCIDENT returns only matching incidents."""
    await _create(
        client,
        default_truck["id"],
        title="Vehicle accident A",
        category="VEHICLE_ACCIDENT",
    )
    await _create(
        client,
        default_truck["id"],
        title="Weather B",
        category="WEIRD_WEATHER_CONDITION",
    )

    r = await client.get("/incidents/", params={"category": "VEHICLE_ACCIDENT"})
    assert r.status_code == 200
    body = r.json()
    categories = {i["category"] for i in body}
    assert "VEHICLE_ACCIDENT" in categories
    assert "WEIRD_WEATHER_CONDITION" not in categories


@pytest.mark.asyncio
async def test_get_incidents_with_criticality_filter(
    client: AsyncClient, default_truck: dict
):
    """GET /incidents/?criticality=LOW returns only LOW incidents."""
    await _create(client, default_truck["id"], title="Low A", criticality="LOW")
    await _create(client, default_truck["id"], title="High B", criticality="HIGH")

    r = await client.get("/incidents/", params={"criticality": "LOW"})
    assert r.status_code == 200
    body = r.json()
    assert len(body) >= 1
    for i in body:
        assert i["criticality"] == "LOW"


@pytest.mark.asyncio
async def test_get_incidents_with_status_filter(
    client: AsyncClient, default_truck: dict
):
    """GET /incidents/?status=OPEN returns only OPEN incidents."""
    await _create(client, default_truck["id"], title="Open A", category="ROAD_BLOCK")

    r = await client.get("/incidents/", params={"status": "OPEN"})
    assert r.status_code == 200
    body = r.json()
    assert len(body) >= 1
    for i in body:
        assert i["status"] == "OPEN"


@pytest.mark.asyncio
async def test_get_incidents_combined_filters(client: AsyncClient, default_truck: dict):
    """GET /incidents/ supports combining category, criticality, and status filters."""
    await _create(
        client,
        default_truck["id"],
        title="Combined match incident",
        category="MECHANICAL_ISSUE",
        criticality="MEDIUM",
        status="INCONCLUSIVE",
    )
    await _create(
        client,
        default_truck["id"],
        title="Combined non-match incident",
        category="MECHANICAL_ISSUE",
        criticality="MEDIUM",
        status="OPEN",
    )

    r = await client.get(
        "/incidents/",
        params={
            "category": "MECHANICAL_ISSUE",
            "criticality": "MEDIUM",
            "status": "INCONCLUSIVE",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body) >= 1
    assert any(i["title"] == "Combined match incident" for i in body)
    for i in body:
        assert i["category"] == "MECHANICAL_ISSUE"
        assert i["criticality"] == "MEDIUM"
        assert i["status"] == "INCONCLUSIVE"


@pytest.mark.asyncio
async def test_get_incidents_invalid_filter_422(client: AsyncClient):
    """GET /incidents/ rejects an invalid category enum value with 422."""
    r = await client.get("/incidents/", params={"category": "INVALID_CATEGORY"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_get_incidents_invalid_status_filter_422(client: AsyncClient):
    """GET /incidents/ rejects an invalid status value with 422."""
    r = await client.get("/incidents/", params={"status": "NOT_A_STATUS"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_get_incidents_invalid_criticality_filter_422(client: AsyncClient):
    """GET /incidents/ rejects an invalid criticality value with 422."""
    r = await client.get("/incidents/", params={"criticality": "NOT_A_CRITICALITY"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_get_incidents_sorting_by_criticality(
    client: AsyncClient, default_truck: dict
):
    """GET /incidents/ orders by criticality desc (HIGH > MEDIUM > LOW)."""
    await _create(client, default_truck["id"], title="Low A", criticality="LOW")
    await _create(client, default_truck["id"], title="High B", criticality="HIGH")
    await _create(client, default_truck["id"], title="Med C", criticality="MEDIUM")

    r = await client.get("/incidents/")
    assert r.status_code == 200
    body = r.json()
    crits = [i["criticality"] for i in body]

    idx_high = next(i for i, c in enumerate(crits) if c == "HIGH")
    idx_med = next(i for i, c in enumerate(crits) if c == "MEDIUM")
    idx_low = next(i for i, c in enumerate(crits) if c == "LOW")

    assert idx_high < idx_med < idx_low


@pytest.mark.asyncio
async def test_get_incidents_sorting_by_category_within_same_criticality(
    client: AsyncClient, default_truck: dict
):
    """Within the same criticality, GET /incidents/ orders by category severity desc:
    VICTIM_ACCIDENT > VEHICLE_ACCIDENT > WEIRD_WEATHER_CONDITION > MECHANICAL_ISSUE > ROAD_BLOCK.
    """
    categories_in_reverse = [
        ("ROAD_BLOCK", "CatOrder RoadBlock"),
        ("MECHANICAL_ISSUE", "CatOrder Mechanical"),
        ("WEIRD_WEATHER_CONDITION", "CatOrder Weather"),
        ("VEHICLE_ACCIDENT", "CatOrder Vehicle"),
        ("VICTIM_ACCIDENT", "CatOrder Victim"),
    ]
    for category, title in categories_in_reverse:
        await _create(
            client,
            default_truck["id"],
            title=title,
            criticality="LOW",
            category=category,
        )

    r = await client.get("/incidents/", params={"criticality": "LOW"})
    assert r.status_code == 200
    body = r.json()
    titles = [i["title"] for i in body]

    idx_victim = titles.index("CatOrder Victim")
    idx_vehicle = titles.index("CatOrder Vehicle")
    idx_weather = titles.index("CatOrder Weather")
    idx_mech = titles.index("CatOrder Mechanical")
    idx_road = titles.index("CatOrder RoadBlock")

    assert idx_victim < idx_vehicle < idx_weather < idx_mech < idx_road


@pytest.mark.asyncio
async def test_get_incidents_sorting_by_created_at_desc_within_same_criticality_and_category(
    client: AsyncClient, default_truck: dict
):
    """Within the same criticality and category, newer incidents appear before older ones."""
    await _create(
        client,
        default_truck["id"],
        title="TieBreak Older",
        criticality="LOW",
        category="ROAD_BLOCK",
    )
    await asyncio.sleep(0.02)
    await _create(
        client,
        default_truck["id"],
        title="TieBreak Newer",
        criticality="LOW",
        category="ROAD_BLOCK",
    )

    r = await client.get(
        "/incidents/",
        params={"criticality": "LOW", "category": "ROAD_BLOCK"},
    )
    assert r.status_code == 200
    titles = [i["title"] for i in r.json()]

    assert titles.index("TieBreak Newer") < titles.index("TieBreak Older")


@pytest.mark.asyncio
async def test_post_incident_missing_required_field_422(client: AsyncClient):
    """POST /incidents/ rejects a payload missing required fields."""
    r = await client.post("/incidents/", json={})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_patch_incident_updates_fields(client: AsyncClient, default_truck: dict):
    """PATCH /incidents/{id} updates status and increments version."""
    await _create(
        client,
        default_truck["id"],
        title="Patchable incident",
        criticality="LOW",
    )
    incidents = (await client.get("/incidents/")).json()
    target = next(i for i in incidents if i["title"] == "Patchable incident")

    await asyncio.sleep(0.02)
    r = await client.patch(
        f"/incidents/{target['id']}",
        json={
            "version": target["version"],
            "status": "UNDER_INVESTIGATION",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == target["id"]
    assert body["status"] == "UNDER_INVESTIGATION"
    assert body["version"] == target["version"] + 1
    assert body["truck"]["id"] == default_truck["id"]
    assert datetime.fromisoformat(body["updated_at"]).replace(
        tzinfo=None
    ) > datetime.fromisoformat(target["created_at"]).replace(tzinfo=None)


@pytest.mark.asyncio
async def test_patch_incident_null_fields_ignored(
    client: AsyncClient, default_truck: dict
):
    """PATCH /incidents/{id} ignores explicit null values on non-nullable columns."""
    await _create(
        client,
        default_truck["id"],
        title="Null patch incident",
        criticality="MEDIUM",
    )
    incidents = (await client.get("/incidents/")).json()
    target = next(i for i in incidents if i["title"] == "Null patch incident")

    r = await client.patch(
        f"/incidents/{target['id']}",
        json={
            "version": target["version"],
            "status": None,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == target["status"]
    assert body["version"] == target["version"] + 1


@pytest.mark.asyncio
async def test_patch_incident_not_found_404(client: AsyncClient):
    """PATCH /incidents/{id} returns 404 when the incident does not exist."""
    r = await client.patch(
        "/incidents/999999",
        json={"version": 1, "status": "CLOSED"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_patch_incident_version_conflict_409(
    client: AsyncClient, default_truck: dict
):
    """PATCH /incidents/{id} returns 409 when version is outdated."""
    await _create(client, default_truck["id"], title="Conflict incident")
    incidents = (await client.get("/incidents/")).json()
    target = next(i for i in incidents if i["title"] == "Conflict incident")

    r = await client.patch(
        f"/incidents/{target['id']}",
        json={"version": target["version"] + 99, "status": "CLOSED"},
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_patch_incident_invalid_payload_422(
    client: AsyncClient, default_truck: dict
):
    """PATCH /incidents/{id} returns 422 when version is missing or < 1."""
    await _create(client, default_truck["id"], title="Invalid patch incident")
    incidents = (await client.get("/incidents/")).json()
    target = next(i for i in incidents if i["title"] == "Invalid patch incident")

    r_missing = await client.patch(
        f"/incidents/{target['id']}",
        json={"status": "CLOSED"},
    )
    assert r_missing.status_code == 422

    r_zero = await client.patch(
        f"/incidents/{target['id']}",
        json={"version": 0, "status": "CLOSED"},
    )
    assert r_zero.status_code == 422


@pytest.mark.asyncio
async def test_incidents_across_multiple_trucks_resolve_correct_truck(
    client: AsyncClient,
):
    """Incidents linked to different trucks embed their respective TruckResponse."""
    t1_res = await client.post(
        "/trucks/",
        json={
            "plate": "REL1A01",
            "driver_name": "Driver One",
            "location": "BR-101 km 10",
            "model": "Volvo FH 540",
        },
    )
    t2_res = await client.post(
        "/trucks/",
        json={
            "plate": "REL1A02",
            "driver_name": "Driver Two",
            "location": "BR-116 km 20",
            "model": "DAF XF 530",
        },
    )
    assert t1_res.status_code == 201
    assert t2_res.status_code == 201
    truck1 = t1_res.json()
    truck2 = t2_res.json()

    await _create(client, truck1["id"], title="Truck1 Incident A")
    await _create(client, truck1["id"], title="Truck1 Incident B")
    await _create(client, truck2["id"], title="Truck2 Incident C")

    incidents = (await client.get("/incidents/")).json()
    inc_a = next(i for i in incidents if i["title"] == "Truck1 Incident A")
    inc_b = next(i for i in incidents if i["title"] == "Truck1 Incident B")
    inc_c = next(i for i in incidents if i["title"] == "Truck2 Incident C")

    assert inc_a["truck"]["id"] == truck1["id"]
    assert inc_a["truck"]["plate"] == "REL1A01"
    assert inc_a["truck"]["driver_name"] == "Driver One"
    assert inc_b["truck"]["id"] == truck1["id"]
    assert inc_b["truck"]["plate"] == "REL1A01"
    assert inc_c["truck"]["id"] == truck2["id"]
    assert inc_c["truck"]["plate"] == "REL1A02"
    assert inc_c["truck"]["driver_name"] == "Driver Two"
    assert inc_c["truck"]["model"] == "DAF XF 530"


@pytest.mark.asyncio
async def test_patch_truck_propagates_to_incident_response(client: AsyncClient):
    """Updating a truck via PATCH /trucks/{id} reflects in GET /incidents/ nested truck data."""
    t_res = await client.post(
        "/trucks/",
        json={
            "plate": "REL2B01",
            "driver_name": "Before Update Driver",
            "location": "SP-330 km 100",
            "model": "Scania R500",
        },
    )
    assert t_res.status_code == 201
    truck = t_res.json()

    inc_res = await _create(
        client,
        truck["id"],
        title="Incident tracking truck update",
    )
    assert inc_res["status_code"] == 201

    patch_res = await client.patch(
        f"/trucks/{truck['id']}",
        json={
            "driver_name": "After Update Driver",
            "location": "SP-330 km 250",
        },
    )
    assert patch_res.status_code == 200

    incidents = (await client.get("/incidents/")).json()
    target = next(
        i for i in incidents if i["title"] == "Incident tracking truck update"
    )
    assert target["truck"]["id"] == truck["id"]
    assert target["truck"]["driver_name"] == "After Update Driver"
    assert target["truck"]["location"] == "SP-330 km 250"


@pytest.mark.asyncio
async def test_truck_incidents_back_populates_and_cascade_delete(client: AsyncClient):
    """Truck.incidents back-populates ORM instances and deleting a Truck cascades to its Incidents."""
    from backend.database import AsyncSessionLocal
    from backend.models import Incident, Truck

    t_res = await client.post(
        "/trucks/",
        json={
            "plate": "CAS1C01",
            "driver_name": "Cascade Driver",
            "location": "BR-040 km 80",
            "model": "Iveco S-Way",
        },
    )
    assert t_res.status_code == 201
    truck_id = t_res.json()["id"]

    inc1 = await _create(client, truck_id, title="Cascade Incident 1")
    inc2 = await _create(client, truck_id, title="Cascade Incident 2")
    inc1_id = inc1["body"]["id"]
    inc2_id = inc2["body"]["id"]

    async with AsyncSessionLocal() as session:
        stmt = (
            select(Truck)
            .where(Truck.id == truck_id)
            .options(selectinload(Truck.incidents))
        )
        truck_obj = (await session.execute(stmt)).scalar_one()
        assert {i.id for i in truck_obj.incidents} == {inc1_id, inc2_id}

        await session.delete(truck_obj)
        await session.commit()

    async with AsyncSessionLocal() as session:
        remaining = (
            (
                await session.execute(
                    select(Incident).where(Incident.id.in_([inc1_id, inc2_id]))
                )
            )
            .scalars()
            .all()
        )
        assert remaining == []
