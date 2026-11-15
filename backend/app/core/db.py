"""Motor de SQLAlchemy 2, sesión y clase base de los modelos.

Regla: sin tipos exclusivos de Postgres, para que todo corra igual en SQLite.
"""

from collections.abc import Iterator

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import obtener_configuracion

# Nombres de restricciones estables para que Alembic genere migraciones limpias.
CONVENCION_NOMBRES = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=CONVENCION_NOMBRES)


def crear_motor(url: str):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    # Pool pequeño y con verificación: Neon suspende la base cuando no hay uso.
    return create_engine(url, pool_size=3, max_overflow=2, pool_pre_ping=True, pool_recycle=300)


motor = crear_motor(obtener_configuracion().DATABASE_URL)
SesionLocal = sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)


def obtener_sesion() -> Iterator[Session]:
    """Dependencia de FastAPI: una sesión por petición."""
    sesion = SesionLocal()
    try:
        yield sesion
    finally:
        sesion.close()
