import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .database import init_db
from .routes.incidents import router as incident_router
from .routes.trucks import router as truck_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized")
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(incident_router)
app.include_router(truck_router)
