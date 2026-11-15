def test_salud_responde_ok(cliente):
    respuesta = cliente.get("/api/salud")
    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "ok"


def test_salud_acepta_head(cliente):
    # UptimeRobot usa HEAD por defecto.
    assert cliente.head("/api/salud").status_code == 200
