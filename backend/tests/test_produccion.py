"""Ajustes de producción: documentación apagada, encabezados de seguridad y tope del cuerpo."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Configuracion
from app.main import crear_app


@pytest.fixture
def produccion(tmp_path) -> TestClient:
    config = Configuracion(
        ENTORNO="produccion",
        SECRET_KEY="x" * 48,
        DATABASE_URL="postgresql://u:p@localhost/db",
        FRONTEND_DIST=tmp_path / "dist-inexistente",
        TAREAS_PEREZOSAS=False,
    )
    return TestClient(crear_app(config))


def test_produccion_no_publica_docs_ni_esquema(produccion, cliente):
    assert produccion.get("/docs").status_code == 404
    assert produccion.get("/api/openapi.json").status_code == 404
    assert cliente.get("/docs").status_code == 200


def test_encabezados_de_seguridad(produccion, cliente):
    r = produccion.get("/api/salud")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]
    assert r.headers["strict-transport-security"].startswith("max-age=")
    # HSTS solo en producción: en tu PC se trabaja con http.
    assert "strict-transport-security" not in cliente.get("/api/salud").headers


def test_rechaza_cuerpo_demasiado_grande(cliente, config):
    grande = b"x" * (config.CUERPO_MAX_BYTES + 1)
    r = cliente.post("/api/t/cualquiera/boletas", files={"foto": ("b.jpg", grande, "image/jpeg")})
    assert r.status_code == 413
    assert "demasiado grande" in r.json()["detail"]


def test_rechaza_cuerpo_grande_sin_content_length(cliente, config):
    def trozos():
        for _ in range(5):
            yield b"x" * (config.CUERPO_MAX_BYTES // 4)

    r = cliente.post(
        "/api/acceso/login", content=trozos(), headers={"content-type": "application/json"}
    )
    assert r.status_code == 413
