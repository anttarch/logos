import os
from typing import Annotated

from fastapi import Depends
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .models.base import Base


# todo: pegar da .env
def db_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./logos.db")


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()


engine = create_async_engine(
    db_url(),
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in db_url() else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, autocommit=False, autoflush=False, expire_on_commit=False
)
SessionDep = Annotated[AsyncSession, Depends(get_db)]


# garante o suporte a foreign_keys do sqlite
@event.listens_for(engine.sync_engine, "connect")
def _sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in db_url():
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
