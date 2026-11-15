"""Controles que usan la lectura automática (sección 4 de construccion.md)."""

from datetime import UTC, datetime, timedelta

import pytest

from app.modulos.boletas.reglas import (
    Color,
    EntradaBoleta,
    armar_motivo,
    control_lectura,
    evaluar_boleta,
    fecha_leida,
    motivos,
    palabras_excluidas,
    productos_excluidos,
)
from app.modulos.comercios.reglas import normalizar_rut
from tests.utiles import local

UMBRAL = 0.8


def boleta(**datos) -> EntradaBoleta:
    compra = local(16, 10)
    return EntradaBoleta(
        monto_total=datos.pop("monto_total", 5_000),
        fecha_compra=compra,
        recibida_en=compra + timedelta(hours=2),
        **datos,
    )


def control(r, clave):
    return next(c for c in r.controles if c.clave == clave)


# --- El emisor es un comercio de la red ---


def test_rut_leido_igual_al_registrado_es_verde(p):
    r = evaluar_boleta(
        boleta(comercio="Don Luis", rut_comercio="76100001-2", rut_leido="76100001-2"), p
    )
    assert control(r, "comercio").color == Color.VERDE
    assert "Don Luis" in control(r, "comercio").mensaje


def test_rut_leido_distinto_al_del_comercio_elegido_es_ambar(p):
    r = evaluar_boleta(
        boleta(comercio="Don Luis", rut_comercio="76100001-2", rut_leido="76100003-9"), p
    )
    c = control(r, "comercio")
    assert c.color == Color.AMBAR
    assert "76100003-9" in c.mensaje and c.campos == ("comercio_id",)


def test_rut_que_no_es_de_la_red_es_rojo_y_lo_muestra(p):
    r = evaluar_boleta(boleta(comercio_en_red=False, rut_leido="11111111-1"), p)
    c = control(r, "comercio")
    assert c.color == Color.ROJO and "11111111-1" in c.mensaje
    assert r.rechazo_sugerido and r.puntos == 0


# --- Folio repetido: muestra quién lo registró ---


def test_folio_repetido_dice_quien_lo_registro(p):
    r = evaluar_boleta(
        boleta(folio_ya_registrado=True, folio_registrado_por="Rosa el martes 17, 11:00"), p
    )
    c = control(r, "folio")
    assert c.color == Color.ROJO
    assert "Rosa el martes 17, 11:00" in c.mensaje


# --- Productos excluidos (A12, A13) ---

LINEAS = [
    {"descripcion": "Pan amasado 1 kg", "monto": 2_400},
    {"descripcion": "CIGARROS BELMONT 20", "monto": 4_500},
    {"descripcion": "Recarga Entel", "monto": 2_000},
    {"descripcion": "Leche entera", "monto": 1_100},
    {"descripcion": "Jugo puro naranja", "monto": 1_500},
]


def test_detecta_cigarros_y_recargas_en_las_lineas():
    monto, productos, sin_monto = productos_excluidos(LINEAS, palabras_excluidas())
    assert monto == 6_500
    assert productos == ("CIGARROS BELMONT 20", "Recarga Entel")
    assert sin_monto is False


def test_detecta_sin_tildes_y_avisa_si_falta_el_monto():
    lineas = [{"descripcion": "Lotería Kino", "monto": None}, {"descripcion": "Té", "monto": 900}]
    monto, productos, sin_monto = productos_excluidos(lineas, palabras_excluidas())
    assert (monto, productos, sin_monto) == (0, ("Lotería Kino",), True)


def test_palabras_completas_no_marcan_productos_parecidos():
    lineas = [{"descripcion": "Girasol en maceta", "monto": 3_000}]
    assert productos_excluidos(lineas, palabras_excluidas()) == (0, (), False)


def test_excluidos_proponen_el_monto_sin_esos_productos(p):
    """Ámbar: propone el monto sin cigarros y recargas."""
    r = evaluar_boleta(
        boleta(
            monto_total=11_500,
            monto_excluido=6_500,
            productos_excluidos=("CIGARROS BELMONT 20", "Recarga Entel"),
        ),
        p,
    )
    c = control(r, "excluidos")
    assert c.color == Color.AMBAR and "CIGARROS BELMONT 20" in c.mensaje
    assert (r.monto_valido, r.puntos) == (5_000, 50)


def test_excluidos_detectados_pero_no_descontados_siguen_en_ambar(p):
    r = evaluar_boleta(boleta(productos_excluidos=("Recarga Entel",)), p)
    assert control(r, "excluidos").color == Color.AMBAR
    assert r.puntos == 50


# --- Lectura dudosa ---


def lectura(**cambios):
    datos = {
        "total": 7_850,
        "folio": "555",
        "fecha": "2026-11-16",
        "confianza": {"total": 0.95, "folio": 0.9, "fecha": 0.99},
    }
    return {**datos, **cambios}


def test_lectura_clara_es_verde():
    assert control_lectura("gemini", None, lectura(), UMBRAL).color == Color.VERDE


def test_confianza_baja_resalta_los_campos():
    c = control_lectura(
        "gemini", None, lectura(confianza={"total": 0.4, "folio": 0.9, "fecha": 0.5}), UMBRAL
    )
    assert c.color == Color.AMBAR
    assert c.campos == ("monto_total", "fecha_compra")
    assert "total" in c.mensaje and "fecha" in c.mensaje


def test_campo_no_leido_cuenta_como_dudoso():
    c = control_lectura("anthropic", None, lectura(folio=None), UMBRAL)
    assert c.color == Color.AMBAR and c.campos == ("folio",)


@pytest.mark.parametrize(
    ("proveedor", "error", "texto"),
    [
        ("manual", None, "Sin lector automático"),
        ("gemini", "Gemini tardó demasiado.", "Gemini tardó demasiado."),
        (None, None, "Aún no hay lectura"),
    ],
)
def test_sin_lectura_queda_para_digitar(proveedor, error, texto):
    c = control_lectura(proveedor, error, None, UMBRAL)
    assert c.color == Color.AMBAR and texto in c.mensaje
    assert set(c.campos) == {"monto_total", "folio", "fecha_compra"}


# --- Datos leídos ---


@pytest.mark.parametrize(
    ("texto", "rut"),
    [
        ("76.100.001-2", "76100001-2"),
        ("76100001 - 2", "76100001-2"),
        ("RUT: 9.876.543-k", "9876543-K"),
        ("12", None),
        (None, None),
    ],
)
def test_normalizar_rut(texto, rut):
    assert normalizar_rut(texto) == rut


def test_fecha_y_hora_de_la_boleta_son_hora_de_santiago():
    # 16 de noviembre de 2026: Santiago está en UTC-3.
    assert fecha_leida("2026-11-16", "09:30") == datetime(2026, 11, 16, 12, 30, tzinfo=UTC)
    assert fecha_leida("2026-11-16", None) == datetime(2026, 11, 16, 15, 0, tzinfo=UTC)
    assert fecha_leida("16/11/2026", "09:30") is None
    assert fecha_leida(None, "09:30") is None


# --- Motivos de rechazo ---


def test_motivos_con_plazos_y_montos_de_los_parametros(p):
    plazo = armar_motivo("fuera_de_plazo", None, p)
    assert f"{p.P7.horas} horas" in plazo.motivo
    minimo = armar_motivo("monto_bajo", None, p)
    assert "$1.000" in minimo.motivo and "$1.000" in minimo.como_resolver
    assert all("{" not in m.motivo for m in (plazo, minimo))


def test_motivo_otro_exige_nota(p):
    with pytest.raises(ValueError, match="Escribe el motivo"):
        armar_motivo("otro", "  ", p)
    assert armar_motivo("otro", "la foto es de otra persona", p).motivo == (
        "la foto es de otra persona"
    )


def test_motivo_fuera_de_la_lista(p):
    with pytest.raises(ValueError, match="Elige un motivo"):
        armar_motivo("inventado", None, p)
    assert len({m.clave for m in motivos()}) == len(motivos())
