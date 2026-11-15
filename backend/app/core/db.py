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


def crear_motor(url: str, timeout: int = 15):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    # Neon: conexión con pooling (PgBouncer) y SSL; la base se suspende si no hay uso.
    # - Pool pequeño: el pooler de Neon ya reparte conexiones.
    # - pool_pre_ping descarta conexiones que murieron mientras la base dormía.
    # - pool_recycle las renueva antes de que Neon (5 min de inactividad) las corte.
    # - prepare_threshold=None: sin sentencias preparadas, que PgBouncer no comparte.
    # - connect_timeout da tiempo a que la base despierte.
    return create_engine(
        url,
        pool_size=3,
        max_overflow=2,
        pool_pre_ping=True,
        pool_recycle=240,
        pool_timeout=30,
        connect_args={"connect_timeout": timeout, "prepare_threshold": None},
    )


_config = obtener_configuracion()
motor = crear_motor(_config.DATABASE_URL, _config.DB_TIMEOUT_SEGUNDOS)
SesionLocal = sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)


def obtener_sesion() -> Iterator[Session]:
    """Dependencia de FastAPI: una sesión por petición."""
    sesion = SesionLocal()
    try:
        yield sesion
    finally:
        sesion.close()
