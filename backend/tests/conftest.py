"""Shared fixtures for the Logos backend route tests."""

from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest.fixture(
    scope="session",
    name="db_url_override",
)
def db_url_override() -> Iterator[str]:
    """Point the app at a throwaway SQLite DB so tests never touch logos.db."""
    tmp = Path(__file__).parent / "test.db"
    if tmp.exists():
        tmp.unlink()
    url = f"sqlite+aiosqlite:///{tmp}"

    import os

    old_url = os.environ.get("DATABASE_URL", "")
    os.environ["DATABASE_URL"] = url
    yield url
    os.environ["DATABASE_URL"] = old_url
    if tmp.exists():
        tmp.unlink()


@pytest_asyncio.fixture(
    scope="session",
    loop_scope="session",
    name="client",
)
async def client(db_url_override: str) -> AsyncIterator[AsyncClient]:
    """HTTP client against the app via ASGI (no uvicorn server needed)."""
    from backend.database import engine, init_db
    from backend.main import app

    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    await engine.dispose()


@pytest_asyncio.fixture(
    scope="session",
    loop_scope="session",
    name="default_truck",
)
async def default_truck(client: AsyncClient) -> dict:
    """Create and return a default truck for incident tests."""
    plate = "ABC1D23"
    r = await client.post(
        "/trucks/",
        json={
            "plate": plate,
            "driver_name": "Default Driver",
            "location": "SP-348 km 50",
            "model": "Scania R450",
        },
    )
    assert r.status_code == 201
    trucks = (await client.get("/trucks/")).json()
    return next(t for t in trucks if t["plate"] == plate)


@pytest.fixture(name="create_incident_payload")
def create_incident_payload(default_truck: dict) -> dict:
    """Minimal valid payload for POST /incidents/."""
    return {
        "category": "VEHICLE_ACCIDENT",
        "criticality": "HIGH",
        "title": "Truck collision on the highway",
        "description": "Two trucks collided near km 123.",
        "location": "km 123, northbound",
        "truck_id": default_truck["id"],
    }
