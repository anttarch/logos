import os
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from .models.base import Base


# todo: pegar da .env
def db_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./logos.db")


def init_db() -> None:
    Base.metadata.create_all(engine)


def get_db():
    with SessionLocal() as db:
        try:
            yield db
        finally:
            db.close()


engine = create_engine(
    db_url(),
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in db_url() else {},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
SessionDep = Annotated[Session, Depends(get_db)]


# garante o suporte a foreign_keys do sqlite
@event.listens_for(engine, "connect")
def _sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in db_url():
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
