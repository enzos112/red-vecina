"""Límites por vecino (P12 a P14, P19, P20) y ciclo del código (B10 a B14, sección 8)."""

from datetime import timedelta

import pytest

from app.modulos.canjes.esquemas import EstadoCanje as E
from app.modulos.canjes.reglas import (
    CanjeResumen,
    CodigoEnCaja,
    ResultadoCaja,
    comercios_bloqueados_p12,
    cupo_vuelve_al_vencer,
    pausa_p19_hasta,
    revisar_vecino,
    validar_en_caja,
    vence_en,
)
from tests.utiles import local

AHORA = local(20, 12)  # viernes


def canje(emitido, estado=E.USADO, comercio=1, cuenta=True):
    return CanjeResumen(
        comercio_id=comercio,
        estado=estado,
        emitido_en=emitido,
        vence_en=emitido + timedelta(hours=48),
        vencido_en=emitido + timedelta(hours=48) if estado == E.VENCIDO else None,
        cuenta_para_p19=cuenta,
    )


def motivos(canjes, p, boletas=1, activo=True, ahora=AHORA):
    return [m.clave for m in revisar_vecino(activo, boletas, canjes, ahora, p).motivos]


def test_vecino_sin_historial_con_una_boleta_puede(p):
    assert motivos([], p) == []


def test_p20_necesita_una_boleta_validada(p):
    assert motivos([], p, boletas=0) == ["sin_boletas"]


def test_vecino_suspendido(p):
    assert motivos([], p, activo=False) == ["suspendido"]


def test_p14_un_codigo_activo_a_la_vez(p):
    activo = canje(AHORA - timedelta(days=1), E.ACTIVO)
    assert motivos([activo], p) == ["codigo_activo"]


def test_activo_con_plazo_cumplido_ya_no_bloquea(p):
    """Aunque la tarea no haya corrido, un código con 48 horas cumplidas está vencido."""
    viejo = canje(AHORA - timedelta(days=3), E.ACTIVO)
    assert motivos([viejo], p) == []


def test_p13_uno_al_dia(p):
    hoy = canje(local(20, 9))
    assert motivos([hoy], p) == ["canje_hoy"]
    ayer = canje(local(19, 23))
    assert motivos([ayer], p) == []


def test_p13_cuatro_en_30_dias(p):
    canjes = [canje(AHORA - timedelta(days=d)) for d in (2, 9, 16, 23)]
    assert motivos(canjes, p) == ["canjes_ventana"]
    canjes[-1] = canje(AHORA - timedelta(days=31))
    assert motivos(canjes, p) == []


def test_vencidos_no_cuentan_para_p12_ni_p13(p):
    """Anexo A.2."""
    canjes = [canje(AHORA - timedelta(days=d), E.VENCIDO) for d in (5, 15)] + [
        canje(AHORA - timedelta(hours=1), E.VENCIDO)
    ]
    assert "canje_hoy" not in motivos(canjes, p)
    assert comercios_bloqueados_p12(canjes, AHORA, p) == set()


def test_p12_un_canje_cada_30_dias_por_comercio(p):
    canjes = [
        canje(AHORA - timedelta(days=10), comercio=3),
        canje(AHORA - timedelta(days=31), comercio=4),
    ]
    assert comercios_bloqueados_p12(canjes, AHORA, p) == {3}


def test_p19_tres_vencidos_en_30_dias_pausan_7_dias(p):
    vencidos = [canje(AHORA - timedelta(days=d), E.VENCIDO) for d in (20, 12, 4)]
    ultimo = AHORA - timedelta(days=4) + timedelta(hours=48)
    assert pausa_p19_hasta(vencidos, AHORA, p) == ultimo + timedelta(days=7)
    assert motivos(vencidos, p) == ["pausa_vencidos"]
    assert motivos(vencidos, p, ahora=ultimo + timedelta(days=7, minutes=1)) == []


def test_p19_dos_vencidos_no_pausan(p):
    vencidos = [canje(AHORA - timedelta(days=d), E.VENCIDO) for d in (12, 4)]
    assert pausa_p19_hasta(vencidos, AHORA, p) is None


def test_p19_vencidos_fuera_de_la_ventana_no_suman(p):
    vencidos = [canje(AHORA - timedelta(days=d), E.VENCIDO) for d in (40, 12, 4)]
    assert pausa_p19_hasta(vencidos, AHORA, p) is None


def test_p19_local_cerrado_no_cuenta(p):
    """Sección 8: el local estuvo cerrado durante las 48 horas."""
    vencidos = [canje(AHORA - timedelta(days=d), E.VENCIDO) for d in (20, 12)] + [
        canje(AHORA - timedelta(days=4), E.VENCIDO, cuenta=False)
    ]
    assert pausa_p19_hasta(vencidos, AHORA, p) is None


def test_p19_cada_vencimiento_nuevo_reinicia_la_pausa(p):
    """Anexo A.10."""
    dias = (25, 20, 15, 3)
    vencidos = [canje(AHORA - timedelta(days=d), E.VENCIDO) for d in dias]
    ultimo = AHORA - timedelta(days=3) + timedelta(hours=48)
    assert pausa_p19_hasta(vencidos, AHORA, p) == ultimo + timedelta(days=7)


def test_vigencia_del_codigo_48_horas(p):
    assert vence_en(local(18, 18, 30), p) == local(20, 18, 30)


def test_cupo_vuelve_solo_si_vence_en_la_misma_semana(p):
    """Anexo A.6."""
    from datetime import date

    semana = date(2026, 11, 16)
    assert cupo_vuelve_al_vencer(semana, local(22, 23), p)  # domingo
    assert not cupo_vuelve_al_vencer(semana, local(23, 1), p)  # lunes siguiente


# --- Validador en la caja ---


def codigo(**cambios) -> CodigoEnCaja:
    datos = {
        "comercio_id": 3,
        "estado": E.ACTIVO,
        "vence_en": local(20, 18, 30),
        "usado_en": None,
        "valor_pesos": 1_000,
        "compra_minima": 5_000,
        "dias_permitidos": None,
    }
    return CodigoEnCaja(**{**datos, **cambios})


def test_validador_codigo_valido():
    """Sección 7.2: "Válido. $1.000 de descuento. Compra mínima $5.000."""
    v = validar_en_caja(codigo(), 3, local(19, 10))
    assert v.se_puede_usar
    assert v.mensaje == "Válido: $1.000 de descuento, compra mínima $5.000."


@pytest.mark.parametrize(
    ("datos", "comercio", "ahora", "resultado", "texto"),
    [
        (None, 3, local(19), ResultadoCaja.NO_EXISTE, "no existe"),
        ({}, 4, local(19), ResultadoCaja.OTRO_LOCAL, "no corresponde a este local"),
        ({}, 3, local(20, 18, 30), ResultadoCaja.VENCIDO, "vencido"),
        ({"estado": E.VENCIDO}, 3, local(19), ResultadoCaja.VENCIDO, "vencido"),
        (
            {"estado": E.USADO, "usado_en": local(19, 10, 5)},
            3,
            local(19, 11),
            ResultadoCaja.USADO,
            "ya fue usado el jueves 19, 10:05",
        ),
        (
            {"dias_permitidos": [0, 1, 2, 3]},
            3,
            local(20, 10),
            ResultadoCaja.DIA_NO_PERMITIDO,
            "Válido solo lunes a jueves",
        ),
    ],
)
def test_validador_rechazos(datos, comercio, ahora, resultado, texto):
    v = validar_en_caja(None if datos is None else codigo(**datos), comercio, ahora)
    assert v.resultado == resultado
    assert texto in v.mensaje
    assert not v.se_puede_usar


def test_compra_bajo_el_minimo_no_aplica_y_el_codigo_sigue_vigente():
    """Sección 8: la compra no llega al mínimo."""
    v = validar_en_caja(codigo(), 3, local(19), monto_compra=4_500)
    assert v.resultado == ResultadoCaja.BAJO_MINIMO
    assert "sigue vigente" in v.mensaje
    assert validar_en_caja(codigo(), 3, local(19), monto_compra=6_200).se_puede_usar
