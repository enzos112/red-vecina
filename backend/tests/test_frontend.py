import pytest
from fastapi.testclient import TestClient

from app.core.config import Configuracion
from app.main import crear_app


@pytest.fixture
def cliente_con_frontend(tmp_path) -> TestClient:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>red vecina</html>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log('hola')", encoding="utf-8")
    (tmp_path / "secreto.txt").write_text("no", encoding="utf-8")
    config = Configuracion(ENTORNO="pruebas", DATABASE_URL="sqlite://", FRONTEND_DIST=dist)
    return TestClient(crear_app(config))


def test_raiz_sirve_index(cliente_con_frontend):
    r = cliente_con_frontend.get("/")
    assert r.status_code == 200
    assert "red vecina" in r.text


def test_archivo_estatico(cliente_con_frontend):
    r = cliente_con_frontend.get("/assets/app.js")
    assert r.status_code == 200
    assert "hola" in r.text


@pytest.mark.parametrize("ruta", ["/t/abc123", "/comercio/cupo", "/admin/boletas"])
def test_rutas_del_frontend_caen_en_index(cliente_con_frontend, ruta):
    r = cliente_con_frontend.get(ruta)
    assert r.status_code == 200
    assert "red vecina" in r.text


@pytest.mark.parametrize("ruta", ["/api/no-existe", "/api"])
def test_api_inexistente_no_cae_en_index(cliente_con_frontend, ruta):
    r = cliente_con_frontend.get(ruta)
    assert r.status_code == 404
    assert "red vecina" not in r.text


def test_api_sigue_funcionando_con_frontend(cliente_con_frontend):
    assert cliente_con_frontend.get("/api/salud").json()["estado"] == "ok"


def test_no_sale_de_dist(cliente_con_frontend):
    r = cliente_con_frontend.get("/..%2Fsecreto.txt")
    assert r.text != "no"
