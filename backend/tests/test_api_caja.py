"""La caja del comercio: usar un código en dos toques, ingreso sin internet (sección 8) y el
reporte del mes."""

from datetime import timedelta

from tests.api_red import AHORA, DON_LUIS, ESPIGA, OPERADOR
from tests.test_api_comercio import emitir_codigo_en_la_panaderia


def saldo(api) -> dict:
    return api.cliente().get(f"/api/t/{api.tokens['rosa']}").json()["saldo"]


def test_usar_sin_monto_del_ticket_descuenta_puntos_y_cupo(api):
    antes = saldo(api)
    codigo = emitir_codigo_en_la_panaderia(api)
    caja = api.cliente(ESPIGA)
    retenido = saldo(api)
    assert retenido["retenido"] == 250 and retenido["disponible"] == antes["disponible"] - 250

    paso1 = caja.post("/api/comercio/codigos/consultar", json={"codigo": codigo}).json()
    assert paso1["resultado"] == "valido"
    assert paso1["mensaje"] == "Válido: $1.000 de descuento, compra mínima $5.000."
    r = caja.post("/api/comercio/codigos/usar", json={"codigo": codigo}).json()
    assert r["usado"] is True

    despues = saldo(api)
    assert despues["retenido"] == 0 and despues["disponible"] == antes["disponible"] - 250
    cupo = caja.get("/api/comercio/cupo").json()
    assert cupo["usado"] == 1_000 and cupo["reservado"] == 0
    otra_vez = caja.post("/api/comercio/codigos/consultar", json={"codigo": codigo}).json()
    assert otra_vez["resultado"] == "usado" and otra_vez["mensaje"].startswith("Este código ya fue")


def test_ingreso_diferido_valido_se_descuenta_y_queda_para_revision(api):
    codigo = emitir_codigo_en_la_panaderia(api)
    api.avanzar(hours=2)
    caja = api.cliente(ESPIGA)
    r = caja.post(
        "/api/comercio/codigos/diferido",
        json={
            "codigo": codigo,
            "monto_compra": 8_000,
            "aplicado_en": (AHORA + timedelta(hours=1)).isoformat(),
        },
    )
    assert r.status_code == 201
    ingreso = r.json()
    assert ingreso["resultado"] == "valido" and ingreso["descontado"] is True
    assert ingreso["valor_pesos"] == 1_000
    assert caja.get("/api/comercio/cupo").json()["usado"] == 1_000
    assert saldo(api)["retenido"] == 0
    assert [d["codigo"] for d in caja.get("/api/comercio/codigos/diferidos").json()] == [codigo]

    # El operador lo ve y lo marca revisado.
    equipo = api.cliente(OPERADOR)
    pendientes = equipo.get("/api/admin/canjes/diferidos").json()
    assert [d["id"] for d in pendientes] == [ingreso["id"]]
    revisado = equipo.post(
        f"/api/admin/canjes/diferidos/{ingreso['id']}/revisado", json={"nota": "Ok con el dueño"}
    ).json()
    assert revisado["revisado_en"] is not None
    assert equipo.get("/api/admin/canjes/diferidos").json() == []
    canje = equipo.get("/api/admin/canjes").json()[0]
    assert canje["estado"] == "usado" and canje["monto_ticket"] == 8_000


def test_ingreso_diferido_invalido_no_toca_el_cupo(api):
    caja = api.cliente(ESPIGA)
    r = caja.post("/api/comercio/codigos/diferido", json={"codigo": "000000"}).json()
    assert r["resultado"] == "no_existe" and r["descontado"] is False
    assert caja.get("/api/comercio/cupo").json()["usado"] == 0
    # De otro local: tampoco se descuenta, y el código sigue vivo para su comercio.
    codigo = emitir_codigo_en_la_panaderia(api)
    otro = api.cliente(DON_LUIS).post("/api/comercio/codigos/diferido", json={"codigo": codigo})
    assert otro.json()["resultado"] == "otro_local"
    assert (
        caja.post("/api/comercio/codigos/consultar", json={"codigo": codigo}).json()["resultado"]
        == "valido"
    )
    assert len(api.cliente(OPERADOR).get("/api/admin/canjes/diferidos").json()) == 2


def test_ingreso_diferido_solo_el_mismo_dia(api):
    codigo = emitir_codigo_en_la_panaderia(api)
    caja = api.cliente(ESPIGA)
    ayer = caja.post(
        "/api/comercio/codigos/diferido",
        json={"codigo": codigo, "aplicado_en": (AHORA - timedelta(days=1)).isoformat()},
    )
    assert ayer.json()["detail"] == "Solo puedes ingresar hoy los códigos que aplicaste hoy."
    futuro = caja.post(
        "/api/comercio/codigos/diferido",
        json={"codigo": codigo, "aplicado_en": (AHORA + timedelta(hours=1)).isoformat()},
    )
    assert futuro.json()["detail"] == "La hora en que aplicaste el código no puede ser futura."
    antes_de_emitir = caja.post(
        "/api/comercio/codigos/diferido",
        json={"codigo": codigo, "aplicado_en": (AHORA - timedelta(hours=1)).isoformat()},
    ).json()
    assert antes_de_emitir["resultado"] == "no_existe" and antes_de_emitir["descontado"] is False


def test_reporte_del_mes_compara_con_el_mes_anterior(api):
    r = api.cliente(DON_LUIS).get("/api/comercio/reporte").json()
    assert r["nombre_mes"] == "noviembre"
    assert r["mes"]["ventas"] == 30_000 and r["mes"]["inscritos"] == 1
    assert r["mes_anterior"]["ventas"] == 0
    assert r["resumen"].startswith("En noviembre llevas $30.000 en ventas registradas.")
    vacio = api.cliente(ESPIGA).get("/api/comercio/reporte").json()
    assert vacio["resumen"].startswith("En noviembre aún no hay ventas registradas")
