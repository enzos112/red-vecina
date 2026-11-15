"""De punta a punta por la API: entra la foto, se lee sola, el operador decide y recibe el
mensaje para el vecino. El lector es un proveedor simulado (sin red ni claves)."""

import io
from urllib.parse import unquote

from app.servicios.lector import ErrorLector
from tests.api_red import OPERADOR
from tests.test_lector import RESPUESTA, Simulado

JPEG = b"\xff\xd8\xff\xe0" + b"1" * 200


def subir(api) -> dict:
    r = api.cliente().post(
        f"/api/t/{api.tokens['rosa']}/boletas",
        files={"foto": ("b.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    assert r.status_code == 201
    return r.json()


def test_boleta_leida_queda_lista_para_aprobar_con_un_clic(api):
    api.app.state.lector = Simulado()
    boleta = subir(api)
    c = api.cliente(OPERADOR)
    assert c.get("/api/admin/boletas/resumen").json()["pendientes"] == 1

    # La lectura corre después de responder y completa los campos con lo leído.
    b = c.get(f"/api/admin/boletas/{boleta['id']}").json()
    assert b["lectura"]["proveedor"] == "simulado" and b["lectura"]["error"] is None
    assert b["comercio"] == "Panadería La Espiga" and b["rut_emisor"] == "76100003-9"
    assert b["folio"] == "8812" and b["monto_total"] == 7_850 and b["puntos"] == 78
    colores = {k["clave"]: k["color"] for k in b["controles"]}
    assert set(colores.values()) == {"verde"}
    assert {"lectura", "comercio", "folio", "plazo", "monto_minimo", "excluidos"} <= set(colores)

    # Aprobar con los datos leídos: puntos y mensaje con enlace wa.me.
    datos = {
        "comercio_id": b["comercio_id"],
        "folio": b["folio"],
        "fecha_compra": b["fecha_compra"],
        "monto_total": b["monto_total"],
    }
    r = c.post(f"/api/admin/boletas/{boleta['id']}/aprobar", json=datos).json()
    assert r["boleta"]["estado"] == "aprobada" and r["boleta"]["puntos"] == 78
    assert r["mensaje"]["texto"].startswith("Listo: +78 puntos.")
    assert r["mensaje"]["whatsapp"].startswith("https://wa.me/56900010000?text=")
    assert unquote(r["mensaje"]["whatsapp"].split("text=")[1]) == r["mensaje"]["texto"]
    assert c.get("/api/admin/boletas/resumen").json()["pendientes"] == 0


def test_cigarros_leidos_proponen_el_monto_sin_ellos(api):
    lineas = [
        {"descripcion": "Pan amasado", "monto": 5_850},
        {"descripcion": "Cigarros Belmont", "monto": 2_000},
    ]
    api.app.state.lector = Simulado({**RESPUESTA, "lineas": lineas})
    b = api.cliente(OPERADOR).get(f"/api/admin/boletas/{subir(api)['id']}").json()
    assert b["monto_excluido"] == 2_000 and b["puntos"] == 58
    excluidos = next(k for k in b["controles"] if k["clave"] == "excluidos")
    assert excluidos["color"] == "ambar" and "Cigarros Belmont" in excluidos["mensaje"]


def test_si_el_lector_falla_la_boleta_queda_para_digitar(api):
    api.app.state.lector = Simulado(falla=ErrorLector("Gemini no respondió bien (503)."))
    c = api.cliente(OPERADOR)
    b = c.get(f"/api/admin/boletas/{subir(api)['id']}").json()
    assert b["estado"] == "pendiente" and b["folio"] is None
    assert b["lectura"]["error"] == "Gemini no respondió bien (503)."
    lectura = b["controles"][0]
    assert lectura["clave"] == "lectura" and lectura["color"] == "ambar"
    assert "monto_total" in lectura["campos"]

    # Volver a leer cuando el proveedor ya responde.
    api.app.state.lector = Simulado()
    r = c.post(f"/api/admin/boletas/{b['id']}/leer").json()
    assert r["folio"] == "8812" and r["lectura"]["error"] is None


def test_operador_sube_boleta_de_whatsapp_para_un_vecino(api):
    api.app.state.lector = Simulado()
    c = api.cliente(OPERADOR)
    r = c.post(
        "/api/admin/boletas",
        data={"vecino_id": str(api.ids["rosa"])},
        files={"foto": ("b.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    assert r.status_code == 201 and r.json()["origen"] == "operador"
    en_cola = c.get("/api/admin/boletas").json()
    assert [b["vecino"]["nombre"] for b in en_cola] == ["Rosa"]
    assert en_cola[0]["folio"] == "8812"
    sin_vecino = c.post(
        "/api/admin/boletas",
        data={"vecino_id": "999999"},
        files={"foto": ("b.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    assert sin_vecino.status_code == 404


def test_cola_filtra_por_comercio_y_muestra_todas(api):
    api.app.state.lector = Simulado()
    subir(api)
    c = api.cliente(OPERADOR)
    assert len(c.get("/api/admin/boletas", params={"comercio_id": api.ids["espiga"]}).json()) == 1
    assert c.get("/api/admin/boletas", params={"comercio_id": api.ids["don_luis"]}).json() == []
    todas = c.get("/api/admin/boletas", params={"todas": "true"}).json()
    assert {b["estado"] for b in todas} == {"pendiente", "aprobada"}


def test_rechazo_entrega_mensaje_con_el_motivo(api):
    api.app.state.lector = Simulado()
    c = api.cliente(OPERADOR)
    motivos = c.get("/api/admin/boletas/motivos").json()
    assert "48 horas" in next(m for m in motivos if m["clave"] == "fuera_de_plazo")["motivo"]
    boleta = subir(api)
    r = c.post(f"/api/admin/boletas/{boleta['id']}/rechazar", json={"clave": "ilegible"}).json()
    assert r["mensaje"]["texto"].startswith("No pudimos sumar tu boleta de Panadería La Espiga")
    assert "buena luz" in r["mensaje"]["texto"]


def test_detalle_del_vecino_trae_el_mensaje_para_reenviar_su_enlace(api):
    v = api.cliente(OPERADOR).get(f"/api/admin/vecinos/{api.ids['rosa']}").json()
    assert v["whatsapp"]["numero"] == "56900010000"
    mensaje = v["whatsapp"]["mensaje"]
    assert mensaje.startswith("Hola Rosa,") and "{enlace}" in mensaje
