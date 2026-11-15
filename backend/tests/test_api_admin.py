"""Fase 7: comercios (edición, sanciones, solicitudes), parámetros, plantillas, tareas,
exportación, revisión del lunes y salida del vecino."""

from sqlalchemy import select

from app.modulos.boletas.modelos import Boleta
from app.modulos.vecinos.modelos import Vecino
from tests.api_red import ADMIN, DON_LUIS, ESPIGA, OPERADOR
from tests.test_api_comercio import emitir_codigo_en_la_panaderia


def test_editar_comercio_sin_cambiar_su_qr(api):
    admin = api.cliente(ADMIN)
    id_ = api.ids["espiga"]
    r = admin.patch(f"/api/admin/comercios/{id_}", json={"nombre": "La Espiga", "rubro": "Pan"})
    assert r.status_code == 200
    assert r.json()["nombre"] == "La Espiga" and r.json()["slug"] == "panaderia-la-espiga"
    malo = admin.patch(f"/api/admin/comercios/{id_}", json={"rut": "76100001-2"})
    assert malo.status_code == 400 and malo.json()["detail"] == "Ya hay un comercio con ese RUT."
    # El operador no edita comercios (A.15).
    assert api.cliente(OPERADOR).patch(f"/api/admin/comercios/{id_}", json={}).status_code == 403


def test_detalle_con_usuarios_y_editar_usuario(api):
    admin = api.cliente(ADMIN)
    d = admin.get(f"/api/admin/comercios/{api.ids['espiga']}").json()
    assert [u["email"] for u in d["usuarios"]] == [ESPIGA]
    assert d["sugerencias"]["otra"]["tipo"] == "advertencia"
    usuario = d["usuarios"][0]["id"]
    r = admin.patch(f"/api/admin/usuarios/{usuario}", json={"contrasena": "otra-clave-larga"})
    assert r.status_code == 200
    # La clave antigua ya no sirve.
    c = api.cliente()
    viejo = c.post("/api/acceso/login", json={"email": ESPIGA, "contrasena": "clave-de-prueba-1"})
    assert viejo.status_code == 401
    nuevo = c.post("/api/acceso/login", json={"email": ESPIGA, "contrasena": "otra-clave-larga"})
    assert nuevo.status_code == 200


def test_sanciones_escalan_y_la_suspension_se_levanta_sola(api):
    operador = api.cliente(OPERADOR)
    id_ = api.ids["espiga"]
    url = f"/api/admin/comercios/{id_}/sanciones"
    datos = {"causa": "nego_codigo", "motivo": "No aceptó un código", "evidencia": "Chat 12:30"}

    d = operador.post(url, json={**datos, "tipo": "advertencia"}).json()
    assert d["comercio"]["estado"] == "activo"
    # Segundo caso en 30 días de negarse a un código: corresponde suspender (U20, U21).
    assert d["sugerencias"]["nego_codigo"]["tipo"] == "suspension"

    d = operador.post(url, json={**datos, "tipo": "suspension"}).json()
    assert d["comercio"]["estado"] == "suspendido"
    hasta = d["sanciones"][0]["hasta"]
    assert hasta is not None and len(d["sanciones"]) == 2
    assert d["sugerencias"]["otra"]["tipo"] == "salida"
    # Sin beneficios visibles mientras dure.
    nombres = [c["nombre"] for c in api.cliente().get("/api/red/comercios").json()]
    assert "Panadería La Espiga" not in nombres

    api.avanzar(weeks=2, hours=1)
    admin = api.cliente(ADMIN)
    r = admin.post("/api/admin/tareas", json={"forzar": True}).json()
    assert r["resultados"]["levantar_suspensiones"] == {"comercios": 1}
    assert admin.get(f"/api/admin/comercios/{id_}").json()["comercio"]["estado"] == "activo"
    ultimas = {t["tarea"]: t for t in admin.get("/api/admin/tareas").json()}
    assert ultimas["levantar_suspensiones"]["ejecutada_en"] is not None


def test_aprobar_beneficios_con_comentario(api):
    caja = api.cliente(ESPIGA)
    actual = caja.get("/api/comercio/beneficios").json()
    propuesta = [
        {
            "nivel": b["nivel"],
            "tipo": b["tipo"],
            "texto": b["texto"],
            "restriccion": None,
            "dias_permitidos": None,
            "compra_minima": b["compra_minima"],
        }
        for b in actual["vigentes"]
    ]
    assert caja.post("/api/comercio/beneficios", json={"beneficios": propuesta}).status_code == 200
    r = api.cliente(OPERADOR).post(
        f"/api/admin/comercios/{api.ids['espiga']}/beneficios/aprobar",
        json={"comentario": "Bien, rige el lunes"},
    )
    assert r.status_code == 200
    assert {b["comentario_revision"] for b in r.json()} == {"Bien, rige el lunes"}


def test_bandeja_de_solicitudes(api):
    publico = api.cliente()
    publico.post(
        "/api/red/solicitudes",
        json={
            "comercio": "Verdulería Ana",
            "rubro": "Verdulería",
            "contacto": "Ana",
            "telefono": "+56 9 0001 2222",
        },
    )
    equipo = api.cliente(OPERADOR)
    [s] = equipo.get("/api/admin/solicitudes").json()
    assert s["estado"] == "nueva"
    r = equipo.patch(
        f"/api/admin/solicitudes/{s['id']}",
        json={"estado": "contactada", "nota": "Llamar el lunes"},
    ).json()
    assert r["estado"] == "contactada" and r["nota"] == "Llamar el lunes"


def test_parametros_con_rangos_y_registro(api):
    admin = api.cliente(ADMIN)
    lista = {x["codigo"]: x for x in admin.get("/api/admin/parametros").json()}
    assert lista["P3"]["esquema"]["properties"]["pesos"]["minimum"] == 0
    r = admin.put("/api/admin/parametros/P3", json={"valor": {"pesos": -1}, "motivo": "prueba"})
    assert r.status_code == 400
    r = admin.put("/api/admin/parametros/P3", json={"valor": {"pesos": 2000}, "motivo": "Piloto"})
    assert r.status_code == 200 and r.json()["actualizado_por_nombre"] == "Admin"
    cambio = admin.get("/api/admin/parametros/cambios").json()[0]
    assert cambio["codigo"] == "P3" and cambio["usuario"] == "Admin"
    assert cambio["valor_anterior"] == {"pesos": 1000}
    # Rige hacia adelante: la boleta ya aprobada conserva sus puntos.
    tarjeta = api.cliente().get(f"/api/t/{api.tokens['rosa']}").json()
    assert tarjeta["saldo"]["disponible"] == 300


def test_plantillas_editables_con_vista_previa(api):
    admin = api.cliente(ADMIN)
    lista = {x["clave"]: x for x in admin.get("/api/admin/plantillas").json()}
    bienvenida = lista["bienvenida"]
    assert bienvenida["variables"] == ["enlace", "nombre"]
    assert "Rosa" in bienvenida["vista_previa"] and not bienvenida["editada"]
    recibida = lista["boleta_recibida"]
    assert "24 horas" in recibida["vista_previa"]  # el plazo sale de U11

    previa = admin.post(
        "/api/admin/plantillas/bienvenida/vista-previa", json={"texto": "Hola {nombre} {saldo}"}
    ).json()
    assert previa["error"].startswith("Esta plantilla no sabe llenar {saldo}")
    r = admin.put("/api/admin/plantillas/bienvenida", json={"texto": "¡Hola {nombre}! {enlace}"})
    assert r.status_code == 200
    assert r.json()["editada"] is True and r.json()["actualizado_por"] == "Admin"
    assert api.cliente(OPERADOR).get("/api/admin/plantillas").status_code == 403


def test_exportar_csv(api):
    admin = api.cliente(ADMIN)
    r = admin.get("/api/admin/exportar/boletas.csv")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    lineas = r.content.decode("utf-8-sig").splitlines()
    assert lineas[0].startswith("id;recibida;fecha_compra;comercio")
    assert "Minimarket Don Luis" in lineas[1]
    assert "Rosa" not in r.text  # sin datos personales
    assert admin.get("/api/admin/exportar/canjes.csv").status_code == 200
    comercios = admin.get("/api/admin/exportar/comercios.csv").content.decode("utf-8-sig")
    assert comercios.splitlines()[0].startswith("comercio;desde;hasta;vecinos_inscritos")
    vacio = admin.get("/api/admin/exportar/boletas.csv?desde=2030-01-01")
    assert len(vacio.content.decode("utf-8-sig").splitlines()) == 1
    assert api.cliente(OPERADOR).get("/api/admin/exportar/boletas.csv").status_code == 403


def test_revision_del_lunes_y_fraude(api):
    r = api.cliente(OPERADOR).get("/api/admin/revision-semanal")
    assert r.status_code == 200
    d = r.json()
    assert {c["comercio"] for c in d["cupos"]} >= {"Minimarket Don Luis", "Panadería La Espiga"}
    assert {i["clave"] for i in d["red"]} == {"cobertura", "puntos_sin_canjear"}
    assert isinstance(d["fraude"], list)
    assert api.cliente(OPERADOR).get("/api/admin/fraude").status_code == 200


def test_salida_del_vecino_borra_datos_y_anula_puntos(api):
    codigo = emitir_codigo_en_la_panaderia(api)
    assert codigo
    caja = api.cliente(ESPIGA)
    assert caja.get("/api/comercio/cupo").json()["reservado"] == 1_000
    equipo = api.cliente(OPERADOR)
    url = f"/api/admin/vecinos/{api.ids['rosa']}/salida"
    sin_confirmar = equipo.post(url, json={"motivo": "Lo pidió", "confirmar": False})
    assert sin_confirmar.status_code == 400

    r = equipo.post(url, json={"motivo": "Lo pidió por WhatsApp", "confirmar": True})
    assert r.status_code == 200
    assert r.json()["puntos_anulados"] == 300 and r.json()["codigos_anulados"] == 1
    # El cupo reservado vuelve al comercio; el enlace deja de funcionar.
    assert caja.get("/api/comercio/cupo").json()["reservado"] == 0
    assert api.cliente().get(f"/api/t/{api.tokens['rosa']}").status_code == 404
    detalle = equipo.get(f"/api/admin/vecinos/{api.ids['rosa']}").json()
    assert detalle["nombre"] == "Vecino retirado" and detalle["estado"] == "cerrado"
    assert detalle["saldo"]["disponible"] == 0 and detalle["saldo"]["retenido"] == 0
    assert "+56900010000" not in str(detalle)
    with api.sesion() as s:
        assert s.get(Vecino, api.ids["rosa"]).telefono.startswith("baja-")
        # La boleta queda para los totales, sin foto ni lectura.
        boleta = s.scalar(select(Boleta).where(Boleta.vecino_id == api.ids["rosa"]))
        assert boleta.monto_total == 30_000 and boleta.archivo_id is None
    # Las ventas registradas del comercio no cambian.
    reporte = api.cliente(DON_LUIS).get("/api/comercio/reporte").json()
    assert reporte["ventas"] == 30_000
    # El mismo número puede volver a inscribirse desde cero.
    again = api.cliente().post(
        "/api/red/inscripcion",
        json={
            "nombre": "Rosa",
            "telefono": "+56 9 0001 0000",
            "comercio": "minimarket-don-luis",
            "acepta_condiciones": True,
        },
    )
    assert again.status_code == 201, again.text
    assert equipo.post(url, json={"motivo": "x", "confirmar": True}).status_code == 400


def test_comercio_retirado_respeta_los_codigos_ya_emitidos(api):
    codigo = emitir_codigo_en_la_panaderia(api)
    admin = api.cliente(ADMIN)
    r = admin.patch(f"/api/admin/comercios/{api.ids['espiga']}", json={"estado": "retirado"})
    assert r.json()["estado"] == "retirado"
    caja = api.cliente(ESPIGA)
    usado = caja.post("/api/comercio/codigos/usar", json={"codigo": codigo}).json()
    assert usado["usado"] is True
    # Sin códigos vigentes, el portal se cierra.
    assert caja.get("/api/comercio/cupo").status_code == 403
