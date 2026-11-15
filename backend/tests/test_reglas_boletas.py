"""Cálculo de puntos de una boleta: A3 a A10, P3 a P7 y Anexo A.3."""

from datetime import timedelta

import pytest

from app.modulos.boletas.reglas import Color, EntradaBoleta, evaluar_boleta, puntos_por_monto
from tests.utiles import local


def boleta(monto: int, **datos) -> EntradaBoleta:
    compra = local(16, 10)
    return EntradaBoleta(
        monto_total=monto,
        fecha_compra=datos.pop("fecha_compra", compra),
        recibida_en=datos.pop("recibida_en", compra + timedelta(hours=2)),
        **datos,
    )


def colores(resultado) -> dict[str, Color]:
    return {c.clave: c.color for c in resultado.controles}


def test_boleta_de_7850_da_78_puntos(p):
    """A6: el ejemplo del documento."""
    assert puntos_por_monto(7_850, p) == 78
    r = evaluar_boleta(boleta(7_850), p)
    assert r.puntos == 78
    assert not r.rechazo_sugerido
    assert r.controles == []


def test_a7_puntos_sobre_lo_pagado_tras_el_canje(p):
    """Rosa paga $5.200 de una compra de $6.200 con $1.000 de descuento: suma 52."""
    assert evaluar_boleta(boleta(5_200), p).puntos == 52


@pytest.mark.parametrize(("monto", "puntos"), [(999, 0), (1_000, 10), (1_099, 10)])
def test_p3_compra_minima_para_sumar(p, monto, puntos):
    r = evaluar_boleta(boleta(monto), p)
    assert r.puntos == puntos
    assert (colores(r).get("monto_minimo") == Color.ROJO) is (monto < 1_000)


def test_exclusiones_van_antes_que_p3(p):
    """Anexo A.3: $1.500 con $600 en cigarros deja $900 válidos, bajo el mínimo."""
    r = evaluar_boleta(boleta(1_500, monto_excluido=600), p)
    assert r.monto_valido == 900
    assert r.puntos == 0
    assert colores(r) == {"excluidos": Color.AMBAR, "monto_minimo": Color.ROJO}


def test_exclusiones_descuentan_monto(p):
    r = evaluar_boleta(boleta(5_000, monto_excluido=2_000), p)
    assert (r.monto_valido, r.puntos) == (3_000, 30)
    assert colores(r) == {"excluidos": Color.AMBAR}


def test_p4_tope_por_boleta(p):
    """Una compra de $80.000 acredita 500 (ámbar)."""
    r = evaluar_boleta(boleta(80_000), p)
    assert (r.puntos_calculados, r.puntos) == (800, 500)
    assert colores(r) == {"tope_boleta": Color.AMBAR}


def test_p6_acredita_lo_que_falta_para_el_tope_diario(p):
    r = evaluar_boleta(boleta(30_000, puntos_dia=900), p)
    assert r.puntos == 100
    assert colores(r) == {"tope_dia": Color.AMBAR}


def test_p6_sin_margen_es_rojo(p):
    r = evaluar_boleta(boleta(30_000, puntos_dia=1_000), p)
    assert r.puntos == 0
    assert colores(r) == {"tope_dia": Color.ROJO}


def test_p4_se_aplica_antes_que_p6(p):
    """Anexo A.3: 800 calculados → 500 por P4 → 300 por P6 (ya tenía 700 ese día)."""
    r = evaluar_boleta(boleta(80_000, puntos_dia=700), p)
    assert r.puntos == 300
    assert colores(r) == {"tope_boleta": Color.AMBAR, "tope_dia": Color.AMBAR}


def test_p5_tercera_boleta_del_dia_en_el_mismo_comercio_se_rechaza(p):
    assert not evaluar_boleta(boleta(5_000, boletas_dia_comercio=1), p).rechazo_sugerido
    r = evaluar_boleta(boleta(5_000, boletas_dia_comercio=2), p)
    assert r.rechazo_sugerido
    assert r.puntos == 0


@pytest.mark.parametrize(("horas", "rechazo"), [(47, False), (48, False), (49, True)])
def test_p7_plazo_de_48_horas(p, horas, rechazo):
    compra = local(16, 10)
    r = evaluar_boleta(
        boleta(5_000, fecha_compra=compra, recibida_en=compra + timedelta(hours=horas)), p
    )
    assert r.rechazo_sugerido is rechazo


def test_fecha_de_compra_futura_se_rechaza(p):
    compra = local(16, 10)
    r = evaluar_boleta(
        boleta(5_000, fecha_compra=compra, recibida_en=compra - timedelta(hours=1)), p
    )
    assert colores(r)["plazo"] == Color.ROJO


@pytest.mark.parametrize(
    ("dato", "clave"),
    [
        ({"vecino_trabaja_ahi": True}, "empleado"),  # A3
        ({"folio_ya_registrado": True}, "folio"),  # A9 y "dos vecinos mandan la misma boleta"
        ({"comercio_en_red": False}, "comercio"),
    ],
)
def test_controles_rojos(p, dato, clave):
    r = evaluar_boleta(boleta(5_000, **dato), p)
    assert colores(r)[clave] == Color.ROJO
    assert r.puntos == 0
