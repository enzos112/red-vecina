"""Beneficios (B1 a B6), cambios desde el lunes, cliente derivado y recompra (Anexo A.9)."""

from datetime import timedelta

import pytest

from app.core.tiempo import a_local
from app.modulos.comercios.esquemas import TipoBeneficio
from app.modulos.comercios.reglas import (
    BeneficioPropuesto,
    digito_verificador,
    rige_desde,
    rige_desde_aprobacion,
    rut_valido,
    slug,
    validar_beneficios,
)
from app.modulos.vecinos.reglas import (
    Compra,
    es_cliente_derivado,
    hubo_recompra_sin_canje,
    normalizar_telefono,
    primeras_compras,
)
from tests.utiles import local


def b(nivel, compra_minima=None, dias=None):
    return BeneficioPropuesto(
        nivel=nivel,
        tipo=TipoBeneficio.DESCUENTO,
        texto="Descuento",
        dias_permitidos=dias,
        compra_minima=compra_minima or {1: 5_000, 2: 10_000, 3: 20_000}[nivel],
    )


def test_beneficios_validos(p):
    assert validar_beneficios([b(2)], p) == []
    assert validar_beneficios([b(1), b(2), b(3)], p) == []


@pytest.mark.parametrize(
    ("propuestos", "error"),
    [
        ([b(1)], "medio es obligatorio"),  # B1
        ([b(2), b(2)], "un beneficio por nivel"),
        ([b(2, compra_minima=12_000)], "no superar $10.000"),  # B4
        ([b(2, compra_minima=8_000)], None),  # bajarla sí se puede
        ([b(2, dias=[0, 1, 2])], "al menos 4 días"),  # B6
        ([b(2, dias=[0, 1, 2, 3])], None),
        ([], "entre 1 y 3"),
    ],
)
def test_reglas_de_beneficios(p, propuestos, error):
    errores = validar_beneficios(propuestos, p)
    if error is None:
        assert errores == []
    else:
        assert any(error in e for e in errores), errores


def test_cambio_de_beneficios_rige_desde_un_lunes_con_7_dias_de_aviso(p):
    # Pedido el miércoles 18: el lunes 23 está a 5 días; rige el lunes 30.
    assert a_local(rige_desde(local(18, 15), p)).date().isoformat() == "2026-11-30"
    # Pedido el lunes 16 a mediodía: el lunes 23 está a menos de 7 días completos.
    assert a_local(rige_desde(local(16, 0, 0), p)).date().isoformat() == "2026-11-23"


def test_aprobacion_de_beneficios_anexo_a15(p):
    pedido = local(18, 15)  # miércoles 18
    # Primeros beneficios del comercio: rigen al aprobarse.
    assert rige_desde_aprobacion(pedido, local(19, 10), True, p) == local(19, 10)
    # Cambio aprobado a tiempo: el lunes 30, como si se hubiera aprobado al pedirlo.
    a_tiempo = rige_desde_aprobacion(pedido, local(20, 10), False, p)
    assert a_local(a_tiempo).date().isoformat() == "2026-11-30"
    # Aprobado el martes 1 de diciembre, con el lunes 30 ya pasado: rige el lunes 7.
    tarde = rige_desde_aprobacion(pedido, local(1, 10, mes=12), False, p)
    assert a_local(tarde).date().isoformat() == "2026-12-07"
    assert a_local(tarde).hour == 0


def test_rut_y_slug():
    assert digito_verificador(76_543_210) == "3"
    assert rut_valido("76543210-3")
    assert not rut_valido("76543210-4")
    assert slug("Panadería La Espiga") == "panaderia-la-espiga"


def test_cliente_derivado_una_vez_por_par():
    """Sección 7.3: Rosa se inscribió en Don Luis (1) y compró por primera vez en la panadería."""
    compras = [
        Compra(comercio_id=1, momento=local(10), con_canje=False),
        Compra(comercio_id=3, momento=local(18, 11), con_canje=True),
        Compra(comercio_id=3, momento=local(25, 11), con_canje=False),
    ]
    primeras = primeras_compras(compras)
    assert primeras == {1: local(10), 3: local(18, 11)}
    assert es_cliente_derivado(3, 1, compro=3 in primeras)
    assert not es_cliente_derivado(1, 1, compro=True)  # su comercio de origen


def test_recompra_sin_canje(p):
    primera = local(18, 11)
    canjes = [local(18, 11)]
    # La boleta de la misma compra con canje no es recompra.
    assert not hubo_recompra_sin_canje(primera, [local(18, 11, 5)], canjes, p)
    # Vuelve la semana siguiente sin código: es recompra.
    assert hubo_recompra_sin_canje(primera, [local(25, 10)], canjes, p)
    # Pasados 30 días ya no cuenta.
    assert not hubo_recompra_sin_canje(primera, [primera + timedelta(days=31)], canjes, p)
    # Un día con canje usado en ese comercio no cuenta como recompra.
    assert not hubo_recompra_sin_canje(primera, [local(25, 10)], [*canjes, local(25, 9)], p)


@pytest.mark.parametrize("texto", ["+56 9 1234 5678", "912345678", "56912345678", "9 1234-5678"])
def test_telefono_normalizado(texto):
    assert normalizar_telefono(texto) == "+56912345678"


def test_telefono_invalido():
    with pytest.raises(ValueError):
        normalizar_telefono("22 123 4567")
