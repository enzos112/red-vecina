"""Panel del operador y del administrador."""

import io

from tests.api_red import ADMIN, OPERADOR
from tests.utiles import local

JPEG = b"\xff\xd8\xff\xe0" + b"1" * 200


def subir_boleta(api) -> int:
    r = api.cliente().post(
        f"/api/t/{api.tokens['rosa']}/boletas",
        files={"foto": ("b.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    return r.json()["id"]


def datos(api, **cambios):
    return {
        "comercio_id": api.ids["espiga"],
        "folio": "555",
        "fecha_compra": local(18, 9).isoformat(),
        "monto_total": 7_850,
        **cambios,
    }


def test_evaluar_y_aprobar_con_ajustes(api):
    boleta_id = subir_boleta(api)
    c = api.cliente(OPERADOR)
    vista = c.post(f"/api/admin/boletas/{boleta_id}/evaluar", json=datos(api)).json()
    assert vista["puntos"] == 78 and vista["rechazo_sugerido"] is False
    # El operador descuenta $850 en cigarros (A15): quedan $7.000 y 70 puntos.
    r = c.post(f"/api/admin/boletas/{boleta_id}/aprobar", json=datos(api, monto_excluido=850))
    assert r.status_code == 200
    aprobada = r.json()["boleta"]
    assert aprobada["estado"] == "aprobada" and aprobada["puntos"] == 70
    assert aprobada["comercio"] == "Panadería La Espiga"
    observados = {k["clave"] for k in aprobada["controles"] if k["color"] != "verde"}
    # Con el lector manual, la lectura queda en ámbar: el operador digitó los campos.
    assert observados == {"lectura", "excluidos"}
    tarjeta = api.cliente().get(f"/api/t/{api.tokens['rosa']}").json()
    assert tarjeta["saldo"]["disponible"] == 370
    assert c.get("/api/admin/boletas").json() == []  # la cola quedó vacía


def test_aprobar_con_control_rojo_explica_el_motivo(api):
    boleta_id = subir_boleta(api)
    c = api.cliente(OPERADOR)
    # Folio 1001 ya lo registró Rosa en Don Luis (A9).
    r = c.post(
        f"/api/admin/boletas/{boleta_id}/aprobar",
        json=datos(api, comercio_id=api.ids["don_luis"], folio="1001"),
    )
    assert r.status_code == 400
    assert r.json()["detail"].startswith("Esta boleta ya fue registrada (A9). Ya la registró")
    assert c.get(f"/api/admin/boletas/{boleta_id}").json()["estado"] == "pendiente"


def test_rechazar_con_motivo(api):
    boleta_id = subir_boleta(api)
    c = api.cliente(OPERADOR)
    url = f"/api/admin/boletas/{boleta_id}/rechazar"
    assert c.post(url, json={"clave": ""}).status_code == 422
    assert c.post(url, json={"clave": "otro"}).json()["detail"] == "Escribe el motivo del rechazo."
    r = c.post(url, json={"clave": "ilegible"})
    assert r.json()["boleta"]["estado"] == "rechazada"
    tarjeta = api.cliente().get(f"/api/t/{api.tokens['rosa']}").json()
    assert tarjeta["boletas"][0]["motivo"] == "No se lee bien la foto."
    otra_vez = c.post(url, json={"clave": "ilegible"})
    assert otra_vez.json()["detail"] == "Esta boleta ya fue revisada."


def test_boleta_inexistente(api):
    r = api.cliente(OPERADOR).get("/api/admin/boletas/999")
    assert r.status_code == 404
    assert r.json()["detail"] == "No encontramos esa boleta."


def test_buscar_vecinos_y_ver_detalle(api):
    c = api.cliente(OPERADOR)
    por_nombre = c.get("/api/admin/vecinos", params={"q": "ros"}).json()
    assert [v["nombre"] for v in por_nombre] == ["Rosa"]
    por_telefono = c.get("/api/admin/vecinos", params={"q": "0001 0000"}).json()
    assert [v["nombre"] for v in por_telefono] == ["Rosa"]
    detalle = c.get(f"/api/admin/vecinos/{api.ids['rosa']}").json()
    assert detalle["saldo"]["disponible"] == 300
    assert detalle["comercio_origen"] == "Minimarket Don Luis"
    assert detalle["enlace"] == f"/t/{api.tokens['rosa']}"


def test_ajustar_saldo_con_motivo(api):
    c = api.cliente(OPERADOR)
    url = f"/api/admin/vecinos/{api.ids['rosa']}/ajustes"
    sin_motivo = c.post(url, json={"puntos": 10, "motivo": ""})
    assert sin_motivo.status_code == 422
    cero = c.post(url, json={"puntos": 0, "motivo": "Nada"})
    assert cero.json()["detail"] == "El ajuste debe sumar o restar puntos."
    r = c.post(url, json={"puntos": -100, "motivo": "Devolución de compra (A16)"})
    assert r.json()["saldo"]["disponible"] == 200
    assert r.json()["movimientos"][0]["motivo"] == "Devolución de compra (A16)"


def test_enlace_nuevo_invalida_el_anterior(api):
    viejo = api.tokens["rosa"]
    r = api.cliente(OPERADOR).post(f"/api/admin/vecinos/{api.ids['rosa']}/enlace")
    nuevo = r.json()["enlace"]
    assert nuevo != f"/t/{viejo}"
    assert api.cliente().get(f"/api/t/{viejo}").status_code == 404
    assert api.cliente().get(f"/api{nuevo}").status_code == 200


def test_canjes_y_local_cerrado(api):
    token = api.tokens["rosa"]
    opcion = api.cliente().get(f"/api/t/{token}/opciones").json()["destacadas"][0]
    api.cliente().post(f"/api/t/{token}/canjes", json={"beneficio_id": opcion["beneficio_id"]})
    c = api.cliente(OPERADOR)
    activo = c.get("/api/admin/canjes").json()[0]
    assert activo["estado"] == "activo" and activo["vecino"] == "Rosa"
    no_vencido = c.post(f"/api/admin/canjes/{activo['id']}/local-cerrado")
    assert no_vencido.json()["detail"] == "Solo se puede marcar un código vencido."
    api.avanzar(hours=49)
    api.cliente(ADMIN).post("/api/admin/tareas", json={"forzar": True})
    r = c.post(f"/api/admin/canjes/{activo['id']}/local-cerrado")
    assert r.json()["estado"] == "vencido" and r.json()["cuenta_para_p19"] is False


def test_indicadores_de_la_red(api):
    r = api.cliente(OPERADOR).get("/api/admin/indicadores")
    assert r.status_code == 200
    cuerpo = r.json()
    assert {i["clave"] for i in cuerpo["red"]} == {"cobertura", "puntos_sin_canjear"}
    don_luis = next(c for c in cuerpo["comercios"] if c["comercio"] == "Minimarket Don Luis")
    claves = {i["clave"] for i in don_luis["indicadores"]}
    assert claves == {
        "costo_canjes",
        "uso_cupo",
        "ticket_promedio",
        "clientes_derivados",
        "recompra",
    }
    sin_canjear = next(i for i in cuerpo["red"] if i["clave"] == "puntos_sin_canjear")
    assert sin_canjear["valor"] == 300 * 4  # saldo de la red × P2


def test_comercios_y_usuarios_para_el_admin(api):
    admin = api.cliente(ADMIN)
    assert len(admin.get("/api/admin/comercios").json()) == 3
    usuarios = admin.get("/api/admin/usuarios").json()
    assert {u["rol"] for u in usuarios} == {"admin", "operador", "comercio"}
    assert all("contrasena" not in str(u) for u in usuarios)
    r = admin.patch(f"/api/admin/usuarios/{api.ids['admin']}", json={"activo": False})
    assert r.json()["detail"] == "No puedes desactivar tu propia cuenta."


def test_inscribir_vecino_a_mano(api):
    c = api.cliente(OPERADOR)
    base = {"nombre": " Elena ", "telefono": "9 0001 7777", "acepta_condiciones": True}
    sin_aceptar = c.post("/api/admin/vecinos", json={**base, "acepta_condiciones": False})
    assert sin_aceptar.status_code == 400
    otro = c.post("/api/admin/vecinos", json={**base, "comercio_id": 9999})
    assert otro.json()["detail"] == "Ese comercio no está en la red."
    r = c.post("/api/admin/vecinos", json={**base, "comercio_id": api.ids["espiga"]})
    assert r.status_code == 201
    v = r.json()
    assert v["nombre"] == "Elena" and v["telefono"] == "+56900017777"
    assert v["comercio_origen"] == "Panadería La Espiga"
    assert v["enlace"].startswith("/t/") and v["saldo"]["disponible"] == 0
    repetido = c.post("/api/admin/vecinos", json=base)
    assert repetido.json()["detail"] == "Ese número ya está inscrito en Red Vecina."
    # El vecino abre su tarjeta con el enlace que le manda el operador.
    assert api.cliente().get(f"/api/t/{v['enlace'].removeprefix('/t/')}").status_code == 200
    # Sin sesión no se inscribe a nadie.
    assert api.cliente().post("/api/admin/vecinos", json=base).status_code == 401
