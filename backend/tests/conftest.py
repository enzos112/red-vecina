import pytest
from fastapi.testclient import TestClient

from app.core.config import Configuracion
from app.main import crear_app


@pytest.fixture
def config(tmp_path) -> Configuracion:
    return Configuracion(
        ENTORNO="pruebas",
        DATABASE_URL="sqlite://",
        FRONTEND_DIST=tmp_path / "dist-inexistente",
    )


@pytest.fixture
def cliente(config) -> TestClient:
    return TestClient(crear_app(config))


@pytest.fixture
def p():
    """Parámetros con los valores iniciales del documento de reglas (catalogo.json)."""
    from app.modulos.parametros.reglas import parametros_iniciales

    return parametros_iniciales()


@pytest.fixture
def sesion():
    """Base SQLite en memoria con todas las tablas, parámetros y plantillas iniciales."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    import app.modelos  # noqa: F401
    from app.core.db import Base
    from app.modulos.mensajes import servicio as mensajes
    from app.modulos.parametros import servicio as parametros

    motor = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(motor)
    s = sessionmaker(bind=motor, expire_on_commit=False)()
    parametros.inicializar(s)
    mensajes.inicializar(s)
    yield s
    s.close()
    motor.dispose()
