"""Tests for the /health route."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_ok(client: AsyncClient):
    r = await client.get("/health")

    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
