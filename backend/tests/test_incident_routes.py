"""Tests for the /incidents/ routes: GET, POST, and PATCH."""

import asyncio
from datetime import datetime

import pytest
from httpx import AsyncClient


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
async def test_get_incidents_invalid_filter_422(client: AsyncClient):
    """GET /incidents/ rejects an invalid enum value with 422."""
    r = await client.get("/incidents/", params={"category": "INVALID_CATEGORY"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_get_incidents_sorting_by_criticality(
    client: AsyncClient, default_truck: dict
):
    """GET /incidents/ orders by criticality desc (HIGH first)."""
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
async def test_get_incidents_invalid_status_filter_422(client: AsyncClient):
    """GET /incidents/ rejects an invalid status value with 422."""
    r = await client.get("/incidents/", params={"status": "NOT_A_STATUS"})
    assert r.status_code == 422


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
