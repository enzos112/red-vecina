"""Rutas públicas y del vecino con su enlace personal."""

import io

from tests.api_red import ADMIN, ESPIGA, OPERADOR

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 200  # basta con la firma para reconocerla


def test_red_muestra_el_beneficio_del_nivel_obligatorio(api):
    red = api.cliente().get("/api/red/comercios").json()
    por_nombre = {c["nombre"]: c for c in red}
    assert set(por_nombre) == {"Minimarket Don Luis", "Panadería La Espiga", "Barbería Central"}
    destacado = por_nombre["Minimarket Don Luis"]["destacado"]
    assert destacado["nivel"] == 2 and destacado["valor_pesos"] == 2_000
    assert por_nombre["Barbería Central"]["destacado"] is None


def test_comercio_por_slug(api):
    c = api.cliente()
    assert c.get("/api/red/comercios/panaderia-la-espiga").json()["nombre"] == "Panadería La Espiga"
    r = c.get("/api/red/comercios/no-existe")
    assert r.status_code == 404
    assert r.json()["detail"] == "No encontramos ese comercio en la red."


def test_inscripcion_con_comercio_de_origen(api):
    r = api.cliente().post(
        "/api/red/inscripcion",
        json={
            "nombre": "Juan",
            "telefono": "9 0001 2345",
            "comercio": "panaderia-la-espiga",
            "acepta_condiciones": True,
        },
    )
    assert r.status_code == 201
    inscrito = r.json()
    assert inscrito["enlace"] == f"/t/{inscrito['token']}"
    tarjeta = api.cliente().get(f"/api/t/{inscrito['token']}").json()
    assert tarjeta["comercio_origen"] == "Panadería La Espiga"
    assert tarjeta["saldo"] == {"disponible": 0, "retenido": 0}


def test_inscripcion_exige_consentimiento_y_numero_nuevo(api):
    c = api.cliente()
    base = {"nombre": "Ana", "telefono": "+56 9 0001 0000", "acepta_condiciones": True}
    r = c.post("/api/red/inscripcion", json={**base, "acepta_condiciones": False})
    assert r.json()["detail"] == "Para inscribirte debes aceptar las condiciones."
    r = c.post("/api/red/inscripcion", json=base)  # el número de Rosa
    assert r.status_code == 400
    assert r.json()["detail"] == "Ese número ya está inscrito en Red Vecina."
    r = c.post("/api/red/inscripcion", json={**base, "telefono": "2 2345 6789"})  # fijo
    assert r.status_code == 400
    assert "celular chileno" in r.json()["detail"]
    r = c.post("/api/red/inscripcion", json={**base, "telefono": "90009999", "comercio": "x"})
    assert r.json()["detail"] == "Ese comercio no está en la red."


def test_solicitud_de_comercio_interesado(api):
    r = api.cliente().post(
        "/api/red/solicitudes",
        json={
            "comercio": "Ferretería El Clavo",
            "rubro": "Ferretería",
            "contacto": "Luis",
            "telefono": "9 0001 5555",
        },
    )
    assert r.status_code == 201
    lista = api.cliente(OPERADOR).get("/api/admin/solicitudes").json()
    assert lista[0]["comercio"] == "Ferretería El Clavo"
    assert lista[0]["telefono"] == "+56900015555"


# --- Enlace personal ---


def test_token_invalido_no_revela_si_el_vecino_existe(api):
    c = api.cliente()
    inexistente = c.get("/api/t/" + "x" * 43)
    cerrado = c.get(f"/api/t/{api.tokens['pedro']}")  # existe, pero la cuenta está cerrada
    assert inexistente.status_code == cerrado.status_code == 404
    assert inexistente.json() == cerrado.json()
    assert "Pedro" not in cerrado.text
    for ruta in ("opciones",):
        assert c.get(f"/api/t/{api.tokens['pedro']}/{ruta}").json() == inexistente.json()


def test_limite_de_intentos_con_tokens(api):
    c = api.cliente()
    for i in range(20):
        assert c.get(f"/api/t/falso{i}").status_code == 404
    r = c.get(f"/api/t/{api.tokens['rosa']}")  # bloquea por IP, aunque el token sea válido
    assert r.status_code == 429


def test_tarjeta_de_rosa(api):
    t = api.cliente().get(f"/api/t/{api.tokens['rosa']}").json()
    assert t["nombre"] == "Rosa"
    assert t["saldo"] == {"disponible": 300, "retenido": 0}
    assert t["proximo_nivel"] == {
        "nombre": "Medio",
        "puntos": 500,
        "valor_pesos": 2_000,
        "faltan": 200,
    }
    assert t["boletas"][0]["estado"] == "aprobada"
    assert t["boletas"][0]["comercio"] == "Minimarket Don Luis"
    assert t["movimientos"][0]["tipo"] == "gana"
    assert t["codigo_activo"] is None


def test_subir_boleta_queda_pendiente_y_llega_a_la_cola(api):
    token = api.tokens["rosa"]
    r = api.cliente().post(
        f"/api/t/{token}/boletas", files={"foto": ("boleta.jpg", io.BytesIO(JPEG), "image/jpeg")}
    )
    assert r.status_code == 201
    assert r.json()["estado"] == "pendiente"
    assert r.json()["tiene_imagen"] is True
    tarjeta = api.cliente().get(f"/api/t/{token}").json()
    assert tarjeta["pendientes"] == {"boletas": 1}
    operador = api.cliente(OPERADOR)
    cola = operador.get("/api/admin/boletas").json()
    assert [b["id"] for b in cola] == [r.json()["id"]]
    assert cola[0]["vecino"]["nombre"] == "Rosa"
    imagen = operador.get(f"/api/admin/boletas/{cola[0]['id']}/imagen")
    assert imagen.headers["content-type"] == "image/jpeg"
    assert imagen.content == JPEG


def test_subir_algo_que_no_es_foto(api):
    r = api.cliente().post(
        f"/api/t/{api.tokens['rosa']}/boletas",
        files={"foto": ("boleta.jpg", io.BytesIO(b"hola"), "image/jpeg")},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "El archivo no es una foto. Sube una imagen JPG, PNG o WEBP."


def test_opciones_y_pedir_codigo(api):
    c = api.cliente()
    token = api.tokens["rosa"]
    opciones = c.get(f"/api/t/{token}/opciones").json()
    assert opciones["puede"] is True
    # Rosa nunca compró en la panadería: va primero (sección 7.2).
    primera = opciones["destacadas"][0]
    assert primera["comercio"] == "Panadería La Espiga" and primera["puntos"] == 250
    r = c.post(f"/api/t/{token}/canjes", json={"beneficio_id": primera["beneficio_id"]})
    assert r.status_code == 201
    codigo = r.json()
    assert len(codigo["codigo"]) == 6 and codigo["comercio"] == "Panadería La Espiga"
    tarjeta = c.get(f"/api/t/{token}").json()
    assert tarjeta["saldo"] == {"disponible": 50, "retenido": 250}
    assert tarjeta["codigo_activo"]["codigo"] == codigo["codigo"]
    # P14: un código activo a la vez.
    otra = c.post(f"/api/t/{token}/canjes", json={"beneficio_id": primera["beneficio_id"]})
    assert otra.status_code == 400
    assert otra.json()["detail"] == "Ya tienes un código activo. Úsalo o espera a que venza."
    sin = c.get(f"/api/t/{token}/opciones").json()
    assert sin["puede"] is False and sin["codigo_activo"]["codigo"] == codigo["codigo"]


def test_codigo_vencido_devuelve_los_puntos(api):
    c = api.cliente()
    token = api.tokens["rosa"]
    opcion = c.get(f"/api/t/{token}/opciones").json()["destacadas"][0]
    c.post(f"/api/t/{token}/canjes", json={"beneficio_id": opcion["beneficio_id"]})
    api.avanzar(hours=49)
    tarjeta = c.get(f"/api/t/{token}").json()
    assert tarjeta["saldo"] == {"disponible": 300, "retenido": 0}
    assert tarjeta["codigo_activo"] is None


def test_canje_completo_en_la_caja(api):
    token = api.tokens["rosa"]
    opcion = api.cliente().get(f"/api/t/{token}/opciones").json()["destacadas"][0]
    codigo = (
        api.cliente()
        .post(f"/api/t/{token}/canjes", json={"beneficio_id": opcion["beneficio_id"]})
        .json()["codigo"]
    )
    caja = api.cliente(ESPIGA)
    con_espacio = f"{codigo[:3]} {codigo[3:]}"
    paso1 = caja.post("/api/comercio/codigos/consultar", json={"codigo": con_espacio}).json()
    assert paso1["resultado"] == "valido" and paso1["se_puede_usar"] is True
    assert paso1["valor_pesos"] == 1_000 and paso1["compra_minima"] == 5_000
    bajo = caja.post("/api/comercio/codigos/usar", json={"codigo": codigo, "monto_compra": 4_000})
    assert bajo.json()["resultado"] == "bajo_minimo" and bajo.json()["usado"] is False
    paso2 = caja.post("/api/comercio/codigos/usar", json={"codigo": codigo, "monto_compra": 6_200})
    assert paso2.json()["usado"] is True
    otra_vez = caja.post("/api/comercio/codigos/consultar", json={"codigo": codigo}).json()
    assert otra_vez["resultado"] == "usado"
    tarjeta = api.cliente().get(f"/api/t/{token}").json()
    assert tarjeta["saldo"] == {"disponible": 50, "retenido": 0}
    cupo = caja.get("/api/comercio/cupo").json()
    assert cupo["usado"] == 1_000 and cupo["reservado"] == 0
    canjes = api.cliente(ADMIN).get("/api/admin/canjes", params={"estado": "usado"}).json()
    assert canjes[0]["monto_ticket"] == 6_200


def test_condiciones_publicas_salen_de_los_parametros(api, p):
    r = api.cliente().get("/api/red/condiciones")
    assert r.status_code == 200
    datos = r.json()
    assert datos["pesos_por_punto"] == p.P1.pesos_por_punto
    assert datos["vigencia_puntos_dias"] == p.P8.dias
    assert [n["puntos"] for n in datos["niveles"]] == list(p.P9.puntos)
    assert datos["niveles"][0]["valor_pesos"] == p.P9.puntos[0] * p.P2.pesos
