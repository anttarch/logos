import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized")
    yield


app = FastAPI(lifespan=lifespan)
