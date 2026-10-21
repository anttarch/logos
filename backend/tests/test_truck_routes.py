"""Tests for the /trucks/ routes: GET, POST, and PATCH."""

import asyncio
from datetime import datetime

import pytest
from httpx import AsyncClient


async def _create_truck(client: AsyncClient, **overrides) -> dict:
    """Create a truck via POST /trucks/; return status code and body."""
    payload = {
        "plate": "TRK1A00",
        "driver_name": "Carlos Silva",
        "location": "BR-116 km 210",
        "model": "Volvo FH 540",
    }
    payload.update(overrides)
    r = await client.post("/trucks/", json=payload)
    return {"status_code": r.status_code, "body": r.json()}


@pytest.mark.asyncio
async def test_get_trucks_returns_list(client: AsyncClient):
    """GET /trucks/ returns 200 and a list of trucks."""
    r = await client.get("/trucks/")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_post_truck_creates_record(client: AsyncClient):
    """POST /trucks/ returns 201 with TruckResponse and persists the truck."""
    result = await _create_truck(
        client,
        plate="TRK1A01",
        driver_name="Maria Oliveira",
        location="Rodovia Castello Branco km 42",
        model="Mercedes-Benz Actros",
    )
    assert result["status_code"] == 201
    assert result["body"] is not None
    assert result["body"]["plate"] == "TRK1A01"
    assert result["body"]["model"] == "Mercedes-Benz Actros"
    assert "id" in result["body"]

    get_r = await client.get("/trucks/")
    assert get_r.status_code == 200
    trucks = get_r.json()
    created = next((t for t in trucks if t["plate"] == "TRK1A01"), None)
    assert created is not None
    assert created["driver_name"] == "Maria Oliveira"
    assert created["location"] == "Rodovia Castello Branco km 42"
    assert created["model"] == "Mercedes-Benz Actros"
    assert "id" in created
    assert "created_at" in created
    assert "updated_at" in created


@pytest.mark.asyncio
async def test_post_truck_duplicate_plate_409(client: AsyncClient):
    """POST /trucks/ returns 409 Conflict when plate already exists."""
    first = await _create_truck(client, plate="DUP1A99")
    assert first["status_code"] == 201

    duplicate = await _create_truck(client, plate="DUP1A99")
    assert duplicate["status_code"] == 409


@pytest.mark.asyncio
async def test_truck_timestamps_are_dynamic(client: AsyncClient):
    """Creating two trucks at different times yields distinct created_at timestamps."""
    await _create_truck(client, plate="TMS1A01")
    await asyncio.sleep(0.02)
    await _create_truck(client, plate="TMS1A02")

    trucks = (await client.get("/trucks/")).json()
    t1_row = next(t for t in trucks if t["plate"] == "TMS1A01")
    t2_row = next(t for t in trucks if t["plate"] == "TMS1A02")

    t1 = datetime.fromisoformat(t1_row["created_at"]).replace(tzinfo=None)
    t2 = datetime.fromisoformat(t2_row["created_at"]).replace(tzinfo=None)
    assert t2 > t1


@pytest.mark.asyncio
async def test_post_truck_missing_required_fields_422(client: AsyncClient):
    """POST /trucks/ rejects payloads missing required fields (driver_name, location, model)."""
    r_only_plate = await client.post("/trucks/", json={"plate": "TRK1A02"})
    assert r_only_plate.status_code == 422

    r_missing_model = await client.post(
        "/trucks/",
        json={
            "plate": "TRK1A02",
            "driver_name": "Carlos Silva",
            "location": "BR-116 km 210",
        },
    )
    assert r_missing_model.status_code == 422


@pytest.mark.asyncio
async def test_post_truck_invalid_plate_length_422(client: AsyncClient):
    """POST /trucks/ rejects plates shorter or longer than 7 characters with 422."""
    r_short = await _create_truck(client, plate="SHORT")
    assert r_short["status_code"] == 422

    r_long = await _create_truck(client, plate="TOOLONGPLATE")
    assert r_long["status_code"] == 422


@pytest.mark.asyncio
async def test_post_truck_invalid_driver_name_422(client: AsyncClient):
    """POST /trucks/ rejects a driver_name shorter than 3 characters with 422."""
    r_empty = await _create_truck(client, plate="TRK1A03", driver_name="")
    assert r_empty["status_code"] == 422

    r_short = await _create_truck(client, plate="TRK1A03", driver_name="AB")
    assert r_short["status_code"] == 422


@pytest.mark.asyncio
async def test_post_truck_missing_plate_422(client: AsyncClient):
    """POST /trucks/ rejects payload missing plate with 422."""
    r = await client.post(
        "/trucks/",
        json={
            "driver_name": "No Plate Driver",
            "location": "BR-116 km 210",
            "model": "Volvo FH 540",
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_patch_truck_updates_fields(client: AsyncClient):
    """PATCH /trucks/{truck_id} updates driver_name and location."""
    await _create_truck(
        client,
        plate="TRK1A04",
        driver_name="Initial Driver",
        location="Initial Location",
    )
    trucks = (await client.get("/trucks/")).json()
    target = next(t for t in trucks if t["plate"] == "TRK1A04")

    await asyncio.sleep(0.02)
    r = await client.patch(
        f"/trucks/{target['id']}",
        json={
            "driver_name": "Updated Driver",
            "location": "Updated Location km 99",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == target["id"]
    assert body["plate"] == "TRK1A04"
    assert body["driver_name"] == "Updated Driver"
    assert body["location"] == "Updated Location km 99"
    assert datetime.fromisoformat(body["updated_at"]).replace(
        tzinfo=None
    ) > datetime.fromisoformat(target["created_at"]).replace(tzinfo=None)


@pytest.mark.asyncio
async def test_patch_truck_partial_update(client: AsyncClient):
    """PATCH /trucks/{truck_id} updates only the provided field."""
    await _create_truck(
        client,
        plate="TRK1A05",
        driver_name="Keep This Driver",
        location="Old Location",
    )
    trucks = (await client.get("/trucks/")).json()
    target = next(t for t in trucks if t["plate"] == "TRK1A05")

    r = await client.patch(
        f"/trucks/{target['id']}",
        json={"location": "New Location Only"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["driver_name"] == "Keep This Driver"
    assert body["location"] == "New Location Only"


@pytest.mark.asyncio
async def test_patch_truck_empty_payload_noop(client: AsyncClient):
    """PATCH /trucks/{truck_id} with {} returns 200 and leaves truck unchanged."""
    await _create_truck(
        client,
        plate="TRK1A07",
        driver_name="Unchanged Driver",
        location="Unchanged Location",
    )
    trucks = (await client.get("/trucks/")).json()
    target = next(t for t in trucks if t["plate"] == "TRK1A07")

    r = await client.patch(f"/trucks/{target['id']}", json={})
    assert r.status_code == 200
    body = r.json()
    assert body["driver_name"] == "Unchanged Driver"
    assert body["location"] == "Unchanged Location"


@pytest.mark.asyncio
async def test_patch_truck_not_found_404(client: AsyncClient):
    """PATCH /trucks/{truck_id} returns 404 when the truck does not exist."""
    r = await client.patch(
        "/trucks/999999",
        json={"location": "Nowhere"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_patch_truck_invalid_payload_422(client: AsyncClient):
    """PATCH /trucks/{truck_id} returns 422 when driver_name is shorter than 3 chars."""
    await _create_truck(client, plate="TRK1A06")
    trucks = (await client.get("/trucks/")).json()
    target = next(t for t in trucks if t["plate"] == "TRK1A06")

    r_empty = await client.patch(
        f"/trucks/{target['id']}",
        json={"driver_name": ""},
    )
    assert r_empty.status_code == 422

    r_short = await client.patch(
        f"/trucks/{target['id']}",
        json={"driver_name": "AB"},
    )
    assert r_short.status_code == 422
