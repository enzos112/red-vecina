"""Portal del comercio: cada comercio ve y toca solo lo suyo."""

from datetime import datetime

from app.core.tiempo import a_local
from tests.api_red import ADMIN, BARBERIA, DON_LUIS, ESPIGA, OPERADOR


def emitir_codigo_en_la_panaderia(api) -> str:
    token = api.tokens["rosa"]
    opcion = api.cliente().get(f"/api/t/{token}/opciones").json()["destacadas"][0]
    assert opcion["comercio"] == "Panadería La Espiga"
    r = api.cliente().post(f"/api/t/{token}/canjes", json={"beneficio_id": opcion["beneficio_id"]})
    return r.json()["codigo"]


def test_codigo_de_otro_comercio_no_muestra_detalles_ni_se_usa(api):
    codigo = emitir_codigo_en_la_panaderia(api)
    otro = api.cliente(DON_LUIS)
    r = otro.post("/api/comercio/codigos/consultar", json={"codigo": codigo}).json()
    assert r["resultado"] == "otro_local"
    assert r["mensaje"] == "Este código no corresponde a este local."
    assert r["valor_pesos"] is None and r["texto"] is None and r["vence_en"] is None
    uso = otro.post("/api/comercio/codigos/usar", json={"codigo": codigo, "monto_compra": 50_000})
    assert uso.json()["usado"] is False
    # Sigue vivo para la panadería.
    propio = api.cliente(ESPIGA).post("/api/comercio/codigos/consultar", json={"codigo": codigo})
    assert propio.json()["resultado"] == "valido"


def test_cada_comercio_ve_su_cupo_y_su_reporte(api):
    emitir_codigo_en_la_panaderia(api)
    espiga = api.cliente(ESPIGA).get("/api/comercio/cupo").json()
    don_luis = api.cliente(DON_LUIS).get("/api/comercio/cupo").json()
    assert espiga["reservado"] == 1_000
    assert don_luis["reservado"] == 0
    assert api.cliente(ESPIGA).get("/api/comercio/reporte").json()["comercio"] == (
        "Panadería La Espiga"
    )
    reporte = api.cliente(DON_LUIS).get("/api/comercio/reporte").json()
    assert reporte["comercio"] == "Minimarket Don Luis"
    assert reporte["vecinos_inscritos"] == 1  # Rosa
    assert reporte["ventas"] == 30_000


def test_las_rutas_del_comercio_no_aceptan_otro_comercio_id(api):
    # No hay forma de pedir datos de otro: el comercio sale de la sesión, no de la petición.
    c = api.cliente(DON_LUIS)
    r = c.get("/api/comercio/cupo", params={"comercio_id": api.ids["espiga"]}).json()
    assert r["base"] == c.get("/api/comercio/cupo").json()["base"]
    assert c.get(f"/api/admin/comercios/{api.ids['espiga']}").status_code in (403, 404, 405)


def test_cupo_extra_solo_suma(api):
    c = api.cliente(DON_LUIS)
    antes = c.get("/api/comercio/cupo").json()
    r = c.post("/api/comercio/cupo/extra", json={"monto": 10_000})
    assert r.status_code == 200
    assert r.json()["extra"] == antes["extra"] + 10_000
    assert r.json()["libre"] == antes["libre"] + 10_000
    negativo = c.post("/api/comercio/cupo/extra", json={"monto": -1_000})
    assert negativo.status_code == 422
    # El cupo extra del minimarket no toca a la panadería.
    assert api.cliente(ESPIGA).get("/api/comercio/cupo").json()["extra"] == 0


def test_limite_de_intentos_al_validar_codigos(api):
    c = api.cliente(DON_LUIS)
    for i in range(10):
        r = c.post("/api/comercio/codigos/consultar", json={"codigo": f"{i:06d}"})
        assert r.json()["resultado"] == "no_existe"
    r = c.post("/api/comercio/codigos/consultar", json={"codigo": "123456"})
    assert r.status_code == 429


def test_codigo_con_letras(api):
    r = api.cliente(DON_LUIS).post("/api/comercio/codigos/consultar", json={"codigo": "12A456"})
    assert r.status_code == 422
    assert r.json()["detail"] == "El código tiene solo números."


# --- Beneficios: propuestas y aprobación (B1 a B7, Anexo A.14 y A.15) ---


def propuesta(*niveles, minimo_medio=10_000):
    minimos = {1: 5_000, 2: minimo_medio, 3: 20_000}
    return {
        "beneficios": [
            {
                "nivel": n,
                "tipo": "descuento",
                "texto": f"Nuevo nivel {n}",
                "compra_minima": minimos[n],
            }
            for n in niveles
        ]
    }


def test_cambio_de_beneficios_queda_pendiente_y_rige_desde_un_lunes(api):
    c = api.cliente(DON_LUIS)
    r = c.post("/api/comercio/beneficios", json=propuesta(2, minimo_medio=8_000))
    assert r.status_code == 200
    estado = r.json()
    assert [b["texto"] for b in estado["pendientes"]] == ["Nuevo nivel 2"]
    assert len(estado["vigentes"]) == 3  # lo anterior sigue rigiendo
    operador = api.cliente(OPERADOR)
    pendientes = operador.get("/api/admin/beneficios/pendientes").json()
    assert [p["comercio"] for p in pendientes] == ["Minimarket Don Luis"]
    aprobados = operador.post(
        f"/api/admin/comercios/{api.ids['don_luis']}/beneficios/aprobar"
    ).json()
    desde = a_local(datetime.fromisoformat(aprobados[0]["vigente_desde"]))
    # Pedido el miércoles 18: el primer lunes a 7 días o más es el 30 de noviembre.
    assert (desde.month, desde.day, desde.hour, desde.weekday()) == (11, 30, 0, 0)
    estado = c.get("/api/comercio/beneficios").json()
    assert len(estado["vigentes"]) == 3 and len(estado["proximos"]) == 1
    api.avanzar(days=13)  # martes 1 de diciembre
    estado = c.get("/api/comercio/beneficios").json()
    assert [b["texto"] for b in estado["vigentes"]] == ["Nuevo nivel 2"]


def test_primeros_beneficios_rigen_al_aprobarse(api):
    barberia = api.cliente(BARBERIA)
    barberia.post("/api/comercio/beneficios", json=propuesta(1, 2))
    api.cliente(ADMIN).post(f"/api/admin/comercios/{api.ids['barberia']}/beneficios/aprobar")
    estado = barberia.get("/api/comercio/beneficios").json()
    assert [b["nivel"] for b in estado["vigentes"]] == [1, 2]
    red = {c["nombre"]: c for c in api.cliente().get("/api/red/comercios").json()}
    assert red["Barbería Central"]["destacado"]["nivel"] == 2


def test_aprobacion_tarde_rige_el_lunes_siguiente(api):
    api.cliente(DON_LUIS).post("/api/comercio/beneficios", json=propuesta(2))
    api.avanzar(days=13)  # martes 1 de diciembre: el lunes 30 ya pasó
    aprobados = (
        api.cliente(OPERADOR)
        .post(f"/api/admin/comercios/{api.ids['don_luis']}/beneficios/aprobar")
        .json()
    )
    desde = a_local(datetime.fromisoformat(aprobados[0]["vigente_desde"]))
    assert (desde.month, desde.day, desde.weekday()) == (12, 7, 0)


def test_propuesta_invalida_y_rechazo(api):
    c = api.cliente(DON_LUIS)
    sin_medio = c.post("/api/comercio/beneficios", json=propuesta(1))
    assert sin_medio.status_code == 400
    assert "obligatorio" in sin_medio.json()["detail"]
    c.post("/api/comercio/beneficios", json=propuesta(2))
    r = api.cliente(OPERADOR).post(
        f"/api/admin/comercios/{api.ids['don_luis']}/beneficios/rechazar",
        json={"comentario": "El texto no es claro."},
    )
    assert r.status_code == 200
    estado = c.get("/api/comercio/beneficios").json()
    assert estado["pendientes"] == []
    assert estado["rechazados"][0]["comentario_revision"] == "El texto no es claro."


def test_comercio_no_aprueba_sus_propios_beneficios(api):
    c = api.cliente(DON_LUIS)
    c.post("/api/comercio/beneficios", json=propuesta(2))
    r = c.post(f"/api/admin/comercios/{api.ids['don_luis']}/beneficios/aprobar")
    assert r.status_code == 403


def test_comercio_retirado_pierde_el_portal(api):
    api.cliente(ADMIN).patch(
        f"/api/admin/comercios/{api.ids['espiga']}", json={"estado": "retirado"}
    )
    r = api.cliente(ESPIGA).get("/api/comercio/cupo")
    assert r.status_code == 403
    assert r.json()["detail"] == "Tu comercio ya no está en la red."
