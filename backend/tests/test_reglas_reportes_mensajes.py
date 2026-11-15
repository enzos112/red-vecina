"""Indicadores de la sección 10, plantillas de mensajes y parámetros."""

from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.modulos.mensajes.reglas import armar, leer_plantillas, variables
from app.modulos.parametros.reglas import construir_parametros, leer_catalogo, validar_valor
from app.modulos.reportes.reglas import (
    SemanaUso,
    clientes_derivados,
    cobertura_red,
    costo_canjes_sobre_ventas,
    puntos_sin_canjear,
    recompra_sin_canje,
    ticket_promedio,
    uso_cupo_semanal,
)
from tests.utiles import local


def test_cobertura_de_la_tabla_6_4(p):
    """$275.000 de cupo sobre 88.000 puntos ($352.000): 78%, sobre el 70% de P18."""
    i = cobertura_red(275_000, 88_000, p)
    assert round(i.valor) == 78
    assert not i.alerta
    assert cobertura_red(200_000, 88_000, p).alerta


def test_costo_de_canjes_sobre_ventas(p):
    """Panadería: $100.000 sobre $1.200.000 sin reglas (8,3%) alerta; con cupo, 3,0% no."""
    assert costo_canjes_sobre_ventas(100_000, 1_200_000, False, p).alerta
    assert not costo_canjes_sobre_ventas(36_000, 1_200_000, False, p).alerta
    # La barbería supera el 3% porque está en el piso: no alerta.
    assert not costo_canjes_sobre_ventas(19_000, 300_000, True, p).alerta


def test_uso_de_cupo_alto_antes_del_jueves_dos_semanas(p):
    s1 = SemanaUso(semana=date(2026, 11, 9), total=10_000, usado=10_000, umbral_alto_en=local(11))
    s2 = SemanaUso(semana=date(2026, 11, 16), total=10_000, usado=10_000, umbral_alto_en=local(18))
    assert uso_cupo_semanal([s1, s2], p).alerta
    tarde = s2.model_copy(update={"umbral_alto_en": local(19, 10)})  # jueves: ya no
    assert not uso_cupo_semanal([s1, tarde], p).alerta


def test_uso_de_cupo_bajo_dos_semanas(p):
    semanas = [
        SemanaUso(semana=date(2026, 11, 9), total=10_000, usado=2_000),
        SemanaUso(semana=date(2026, 11, 16), total=10_000, usado=2_400),
    ]
    i = uso_cupo_semanal(semanas, p)
    assert i.alerta and "Bajo 25" in i.senal
    semanas[0] = semanas[0].model_copy(update={"usado": 3_000})
    assert not uso_cupo_semanal(semanas, p).alerta


def test_ticket_promedio_sin_umbral_no_alerta(p):
    """U3 sigue pendiente de definir: se calcula pero no alerta."""
    i = ticket_promedio([(5_100, 5_000), (6_200, 5_000)], p)
    assert i.valor == 5_650
    assert not i.alerta


def test_clientes_derivados_cero_en_dos_semanas(p):
    ahora = local(30)
    assert clientes_derivados([], ahora, p).alerta
    assert not clientes_derivados([ahora - timedelta(days=3)], ahora, p).alerta


def test_recompra_sin_canje_solo_cuenta_ventanas_cumplidas(p):
    ahora = local(30)
    maduros = [(ahora - timedelta(days=40), True), (ahora - timedelta(days=35), False)]
    recientes = [(ahora - timedelta(days=5), False)]
    i = recompra_sin_canje(maduros + recientes, ahora, p)
    assert i.valor == Decimal(50)
    assert not i.alerta
    assert recompra_sin_canje([(ahora - timedelta(days=40), False)] * 4, ahora, p).alerta


def test_puntos_sin_canjear(p):
    # $275.000 / 4 de cupo semanal; 12 semanas = $825.000.
    assert not puntos_sin_canjear(200_000, 68_750, p).alerta  # $800.000
    assert puntos_sin_canjear(210_000, 68_750, p).alerta  # $840.000


def test_plantillas_y_variables():
    plantillas = {t["clave"]: t["texto"] for t in leer_plantillas()}
    assert len(plantillas) == 8
    texto = armar(
        plantillas["boleta_recibida"],
        {
            "comercio": "Minimarket Don Luis",
            "monto": "$7.850",
            "puntos": 78,
            "plazo_validacion": "24 horas",
        },
    )
    assert texto == (
        "Recibimos tu boleta de Minimarket Don Luis por $7.850. Tienes 78 puntos pendientes; "
        "te confirmamos en menos de 24 horas."
    )
    assert variables(plantillas["canje_usado"]) == {"comercio", "saldo"}
    with pytest.raises(ValueError, match="saldo"):
        armar(plantillas["canje_usado"], {"comercio": "x"})


def test_catalogo_completo_y_valido(p):
    codigos = [item["codigo"] for item in leer_catalogo()]
    assert codigos[:20] == [f"P{i}" for i in range(1, 21)]
    assert codigos[20:] == [f"U{i}" for i in range(1, 26)]
    assert p.P15.porcentaje == 3


def test_validacion_de_un_parametro():
    assert validar_valor("P3", {"pesos": 2000}) == {"pesos": 2000}
    with pytest.raises(ValueError):
        validar_valor("P3", {"pesos": -1})
    with pytest.raises(ValueError):
        validar_valor("P9", {"puntos": [500, 250], "nombres": ["a", "b"], "obligatorio": 1})
    with pytest.raises(ValueError, match="Faltan"):
        construir_parametros({})
