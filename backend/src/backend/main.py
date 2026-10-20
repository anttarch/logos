import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .database import init_db
from .routes.incidents import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized")
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(router)
