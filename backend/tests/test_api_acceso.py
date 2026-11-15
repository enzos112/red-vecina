"""Acceso, roles, límites de intentos y formato de los errores."""

from sqlalchemy import func, select

from app.tareas.modelos import EjecucionTarea
from tests.api_red import ADMIN, CLAVE, DON_LUIS, OPERADOR, armar_entorno


def test_login_deja_cookie_httponly_y_quien_soy(api):
    c = api.cliente()
    r = c.post("/api/acceso/login", json={"email": "  Admin@RedVecina.test ", "contrasena": CLAVE})
    assert r.status_code == 200
    assert r.json()["rol"] == "admin"
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie and "path=/api" in cookie
    assert c.get("/api/acceso/yo").json()["email"] == ADMIN


def test_quien_soy_del_comercio_trae_su_comercio(api):
    yo = api.cliente(DON_LUIS).get("/api/acceso/yo").json()
    assert yo["rol"] == "comercio"
    assert yo["comercio"]["nombre"] == "Minimarket Don Luis"


def test_logout_cierra_la_sesion(api):
    c = api.cliente(OPERADOR)
    assert c.post("/api/acceso/logout").status_code == 204
    r = c.get("/api/acceso/yo")
    assert r.status_code == 401
    assert r.json()["detail"] == "Inicia sesión para continuar."


def test_clave_incorrecta_y_correo_inexistente_responden_igual(api):
    c = api.cliente()
    malo = c.post("/api/acceso/login", json={"email": ADMIN, "contrasena": "otra-clave-1"})
    nadie = c.post("/api/acceso/login", json={"email": "nadie@redvecina.test", "contrasena": "x"})
    assert malo.status_code == nadie.status_code == 401
    assert malo.json() == nadie.json() == {"detail": "Correo o contraseña incorrectos."}


def test_cookie_alterada_no_sirve(api):
    c = api.cliente(ADMIN)
    valor = c.cookies.get("rv_sesion")
    _, expira, firma = valor.split(".")
    c.cookies.clear()
    c.cookies.set("rv_sesion", f"{api.ids['operador']}.{expira}.{firma}")
    assert c.get("/api/acceso/yo").status_code == 401


def test_sesion_expira(api):
    c = api.cliente(ADMIN)
    api.avanzar(days=60)
    assert c.get("/api/acceso/yo").status_code == 401


def test_usuario_desactivado_pierde_el_acceso(api):
    operador = api.cliente(OPERADOR)
    admin = api.cliente(ADMIN)
    r = admin.patch(f"/api/admin/usuarios/{api.ids['operador']}", json={"activo": False})
    assert r.status_code == 200
    assert operador.get("/api/acceso/yo").status_code == 401
    otro = api.cliente()
    login = otro.post("/api/acceso/login", json={"email": OPERADOR, "contrasena": CLAVE})
    assert login.status_code == 401


def test_limite_de_intentos_en_el_login(api):
    c = api.cliente()
    for _ in range(5):
        r = c.post("/api/acceso/login", json={"email": ADMIN, "contrasena": "equivocada"})
        assert r.status_code == 401
    # Bloqueado aunque ahora la clave sea la correcta.
    r = c.post("/api/acceso/login", json={"email": ADMIN, "contrasena": CLAVE})
    assert r.status_code == 429
    assert r.json()["detail"].startswith("Demasiados intentos. Espera")
    assert "Retry-After" in r.headers


# --- Roles ---


def test_sin_sesion_no_entra_al_panel(api):
    r = api.cliente().get("/api/admin/boletas")
    assert r.status_code == 401


def test_comercio_no_entra_al_panel_del_equipo(api):
    c = api.cliente(DON_LUIS)
    for ruta in ("/api/admin/boletas", "/api/admin/vecinos", "/api/admin/parametros"):
        r = c.get(ruta)
        assert r.status_code == 403
        assert r.json()["detail"] == "No tienes permiso para hacer esto."


def test_equipo_no_usa_las_rutas_del_comercio(api):
    assert api.cliente(OPERADOR).get("/api/comercio/cupo").status_code == 403


def test_operador_no_cambia_parametros(api):
    c = api.cliente(OPERADOR)
    assert c.get("/api/admin/parametros").status_code == 200  # sí puede verlos
    r = c.put("/api/admin/parametros/P3", json={"valor": {"pesos": 2_000}, "motivo": "Probar"})
    assert r.status_code == 403
    cambios = c.get("/api/admin/parametros/P3/cambios").json()
    assert len(cambios) == 1  # solo el valor inicial


def test_admin_cambia_un_parametro_con_historial(api):
    c = api.cliente(ADMIN)
    r = c.put("/api/admin/parametros/p3", json={"valor": {"pesos": 2_000}, "motivo": "Piloto"})
    assert r.status_code == 200
    assert r.json()["valor"] == {"pesos": 2_000}
    cambios = c.get("/api/admin/parametros/P3/cambios").json()
    assert cambios[0]["motivo"] == "Piloto"
    assert cambios[0]["valor_anterior"] == {"pesos": 1_000}


def test_parametro_invalido_explica_en_espanol(api):
    r = api.cliente(ADMIN).put(
        "/api/admin/parametros/P3", json={"valor": {"pesos": -5}, "motivo": "x"}
    )
    assert r.status_code == 400
    assert r.json()["detail"].startswith("Valor inválido para P3: el campo pesos")


def test_solo_el_admin_crea_comercios_y_usuarios(api):
    operador = api.cliente(OPERADOR)
    comercio = {
        "nombre": "Verdulería Doña Ana",
        "rubro": "Verdulería",
        "rut": "76100007-1",
        "direccion": "Las Lilas 5",
    }
    assert operador.post("/api/admin/comercios", json=comercio).status_code == 403
    usuario = {
        "email": "nuevo@redvecina.test",
        "nombre": "Nuevo",
        "contrasena": CLAVE,
        "rol": "admin",
    }
    assert operador.post("/api/admin/usuarios", json=usuario).status_code == 403
    admin = api.cliente(ADMIN)
    r = admin.post("/api/admin/comercios", json=comercio)
    assert r.status_code == 201
    assert r.json()["slug"] == "verduleria-dona-ana"
    assert admin.post("/api/admin/usuarios", json=usuario).status_code == 201


def test_rut_repetido_y_contrasena_corta(api):
    admin = api.cliente(ADMIN)
    r = admin.post(
        "/api/admin/comercios",
        json={"nombre": "Otro", "rubro": "X", "rut": "76100001-2", "direccion": "Y"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Ya hay un comercio con ese RUT."
    r = admin.post(
        "/api/admin/usuarios",
        json={"email": "a@redvecina.test", "nombre": "A", "contrasena": "corta", "rol": "operador"},
    )
    assert r.status_code == 400
    assert "al menos 10 caracteres" in r.json()["detail"]


# --- Errores ---


def test_datos_incompletos_responden_en_espanol(api):
    r = api.cliente().post("/api/acceso/login", json={"email": ADMIN})
    assert r.status_code == 422
    assert r.json()["detail"] == "Revisa los datos: el campo contrasena es obligatorio."


def test_ruta_inexistente_responde_en_espanol(api):
    r = api.cliente().get("/api/no-existe")
    assert r.status_code == 404
    assert r.json()["detail"] == "No encontramos lo que buscas."


def test_error_inesperado_no_filtra_detalles(api):
    @api.app.get("/api/explota")
    def explota():
        raise RuntimeError("detalle interno")

    r = api.cliente().get("/api/explota")
    assert r.status_code == 500
    assert r.json()["detail"] == "Algo falló de nuestro lado. Intenta de nuevo en un momento."


def test_salud_no_necesita_sesion(api):
    assert api.cliente().get("/api/salud").json()["estado"] == "ok"


# --- Tareas ---


def test_tareas_perezosas_corren_una_vez_al_dia(tmp_path):
    entorno = armar_entorno(tmp_path, TAREAS_PEREZOSAS=True)
    try:
        c = entorno.cliente()

        def ejecuciones() -> int:
            with entorno.sesion() as s:
                return s.scalar(select(func.count(EjecucionTarea.id)))

        c.get("/api/salud")
        assert ejecuciones() == 0  # /salud no toca la base
        c.get("/api/red/comercios")
        primera = ejecuciones()
        assert primera == 3
        c.get("/api/red/comercios")
        assert ejecuciones() == primera
        entorno.avanzar(days=1)
        c.get("/api/red/comercios")
        assert ejecuciones() == primera * 2
    finally:
        entorno.cerrar()


def test_solo_el_admin_fuerza_las_tareas(api):
    assert api.cliente(OPERADOR).post("/api/admin/tareas", json={}).status_code == 403
    r = api.cliente(ADMIN).post("/api/admin/tareas", json={"forzar": True})
    assert r.status_code == 200
    assert set(r.json()["resultados"]) == {"liberar_codigos", "vencer_puntos", "recalcular_cupos"}
