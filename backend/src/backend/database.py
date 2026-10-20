import os
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .models.base import Base


# todo: pegar da .env
def db_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./logos.db")


engine = create_engine(
    db_url(),
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in db_url() else {},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db() -> None:
    Base.metadata.create_all(engine)


def get_db():
    with SessionLocal() as db:
        try:
            yield db
        finally:
            db.close()


SessionDep = Annotated[Session, Depends(get_db)]
