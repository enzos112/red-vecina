"""Sección 9: sanción sugerida a un comercio y alertas de fraude."""

from datetime import timedelta

from app.modulos.comercios.esquemas import CausaSancion, TipoSancion
from app.modulos.comercios.reglas import SancionPrevia, fin_suspension, sancion_sugerida
from app.modulos.reportes.reglas import (
    CompraVecino,
    alza_ventas,
    concentracion_boletas,
    horarios_superpuestos,
)
from tests.utiles import local

AHORA = local(18, 12)
OTRA = CausaSancion.OTRA
NEGO = CausaSancion.NEGO_CODIGO


def previa(dias_atras: int, causa=OTRA, tipo=TipoSancion.ADVERTENCIA) -> SancionPrevia:
    return SancionPrevia(tipo=tipo, causa=causa, decidida_en=AHORA - timedelta(days=dias_atras))


def test_primera_vez_advertencia(p):
    assert sancion_sugerida([], OTRA, AHORA, p).tipo == TipoSancion.ADVERTENCIA


def test_segunda_vez_en_60_dias_suspension_de_2_semanas(p):
    s = sancion_sugerida([previa(59)], OTRA, AHORA, p)
    assert s.tipo == TipoSancion.SUSPENSION
    assert f"{p.U21.semanas_suspension} semanas" in s.razon
    assert fin_suspension(AHORA, p) == AHORA + timedelta(weeks=p.U21.semanas_suspension)


def test_sancion_antigua_no_cuenta(p):
    assert (
        sancion_sugerida([previa(p.U21.dias + 1)], OTRA, AHORA, p).tipo == TipoSancion.ADVERTENCIA
    )


def test_tercera_vez_salida(p):
    s = sancion_sugerida([previa(10), previa(40)], OTRA, AHORA, p)
    assert s.tipo == TipoSancion.SALIDA


def test_dos_negativas_a_codigos_en_30_dias_suspenden(p):
    # La primera negativa ya tuvo advertencia hace más de 30 días: no suma para U20.
    assert sancion_sugerida([previa(p.U20.dias + 5, NEGO)], NEGO, AHORA, p).tipo == (
        TipoSancion.SUSPENSION  # pero sí para U21 (60 días)
    )
    sola = sancion_sugerida([], NEGO, AHORA, p)
    assert sola.tipo == TipoSancion.ADVERTENCIA
    # Con U21 más corto, solo U20 explica la suspensión.
    corto = p.model_copy(update={"U21": p.U21.model_copy(update={"dias": 1})})
    s = sancion_sugerida([previa(10, NEGO)], NEGO, AHORA, corto)
    assert s.tipo == TipoSancion.SUSPENSION and "negarse" in s.razon


def compra(vecino: int, comercio: int, minuto: int) -> CompraVecino:
    return CompraVecino(
        vecino_id=vecino,
        vecino=f"V{vecino}",
        comercio_id=comercio,
        comercio=f"C{comercio}",
        momento=AHORA + timedelta(minutes=minuto),
    )


def test_concentracion_sobre_el_umbral(p):
    tope = p.U12.boletas_semana
    justo = [compra(1, 1, i * 60) for i in range(tope)]
    assert concentracion_boletas(justo, p) == []
    [alerta] = concentracion_boletas([*justo, compra(1, 1, 9999)], p)
    assert alerta.clave == "concentracion" and alerta.vecino_id == 1 and alerta.comercio_id == 1


def test_superpuestos_sin_valor_no_alerta(p):
    assert p.U13.minutos is None
    assert horarios_superpuestos([compra(1, 1, 0), compra(1, 2, 1)], p) == []


def test_superpuestos_con_ventana(p):
    con = p.model_copy(update={"U13": p.U13.model_copy(update={"minutos": 30})})
    assert horarios_superpuestos([compra(1, 1, 0), compra(1, 2, 45)], con) == []
    assert horarios_superpuestos([compra(1, 1, 0), compra(1, 1, 5)], con) == []  # mismo local
    [alerta] = horarios_superpuestos([compra(1, 1, 0), compra(1, 2, 10), compra(1, 3, 15)], con)
    assert alerta.clave == "superpuestos" and alerta.vecino_id == 1


def test_alza_de_ventas_sin_mas_vecinos(p):
    assert alza_ventas(1, "C", 100_000, 160_000, 10, 10, p) is not None
    assert alza_ventas(1, "C", 100_000, 150_000, 10, 10, p) is None  # 50% justo no alerta
    assert alza_ventas(1, "C", 100_000, 200_000, 10, 12, p) is None  # llegaron más vecinos
    assert alza_ventas(1, "C", 0, 200_000, 0, 0, p) is None  # sin semana anterior
