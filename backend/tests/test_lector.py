"""Servicio lector: interfaz única, elección del proveedor y fallas que no rompen nada."""

import json
import time

import pytest

from app.core.config import Configuracion
from app.servicios import lector
from app.servicios.lector.base import ErrorLector, Lectura, esquema_json, interpretar
from app.servicios.lector.proveedores import LectorClaude, LectorGemini, LectorManual

RESPUESTA = {
    "rut_emisor": "76.100.003-9",
    "nombre_emisor": "Panadería La Espiga",
    "folio": "8812",
    "fecha": "2026-11-18",
    "hora": "09:12",
    "total": 7850,
    "lineas": [{"descripcion": "Pan amasado", "monto": 7850}],
    "confianza": {
        "rut_emisor": 0.9,
        "nombre_emisor": 0.9,
        "folio": 0.95,
        "fecha": 0.99,
        "hora": 0.8,
        "total": 0.97,
        "lineas": 0.7,
    },
}


class Simulado:
    """Proveedor simulado: devuelve una lectura fija, falla o tarda."""

    nombre = "simulado"

    def __init__(self, respuesta=RESPUESTA, falla: Exception | None = None, demora: float = 0):
        self.respuesta, self.falla, self.demora = respuesta, falla, demora
        self.llamadas: list[tuple[int, str]] = []

    def leer(self, imagen: bytes, tipo: str) -> Lectura | None:
        self.llamadas.append((len(imagen), tipo))
        if self.demora:
            time.sleep(self.demora)
        if self.falla:
            raise self.falla
        return interpretar(json.dumps(self.respuesta))


def test_lectura_trae_todos_los_campos_con_su_confianza():
    r = lector.leer(Simulado(), b"foto", "image/jpeg")
    assert r.error is None and r.proveedor == "simulado"
    assert r.lectura.folio == "8812" and r.lectura.total == 7850
    assert r.lectura.lineas[0].descripcion == "Pan amasado"
    assert r.lectura.confianza.total == 0.97


def test_error_del_proveedor_deja_la_boleta_para_digitar():
    r = lector.leer(Simulado(falla=ErrorLector("Gemini tardó demasiado.")), b"x", "image/png")
    assert r.lectura is None and r.error == "Gemini tardó demasiado."


def test_falla_inesperada_tampoco_rompe():
    r = lector.leer(Simulado(falla=RuntimeError("boom")), b"x", "image/png")
    assert r.lectura is None and "boom" in r.error


def test_respuesta_invalida_es_un_error_del_lector():
    with pytest.raises(ErrorLector):
        interpretar("esto no es json")
    with pytest.raises(ErrorLector):
        interpretar(json.dumps({**RESPUESTA, "total": "mucho"}))


def test_confianza_fuera_de_rango_se_acota():
    datos = {**RESPUESTA, "confianza": {**RESPUESTA["confianza"], "total": 1.7, "folio": -2}}
    leida = interpretar(json.dumps(datos))
    assert (leida.confianza.total, leida.confianza.folio) == (1.0, 0.0)


def test_manual_no_lee_nada():
    r = lector.leer(LectorManual(), b"foto", "image/jpeg")
    assert r.lectura is None and r.error is None and r.proveedor == "manual"


def test_esquema_plano_con_todos_los_campos_obligatorios():
    esquema = esquema_json()
    assert set(esquema["required"]) == set(Lectura.model_fields)
    assert esquema["additionalProperties"] is False
    assert "$ref" not in json.dumps(esquema)
    # La salida del esquema se valida con el modelo.
    assert interpretar(json.dumps(RESPUESTA)).rut_emisor == "76.100.003-9"


def config(**valores) -> Configuracion:
    return Configuracion(ENTORNO="pruebas", DATABASE_URL="sqlite://", **valores)


def test_proveedor_segun_variable_de_entorno():
    assert isinstance(lector.crear_lector(config(LECTOR_PROVEEDOR="manual")), LectorManual)
    gemini = lector.crear_lector(config(LECTOR_PROVEEDOR="gemini", GEMINI_API_KEY="clave-falsa"))
    assert isinstance(gemini, LectorGemini)
    claude = lector.crear_lector(
        config(LECTOR_PROVEEDOR="anthropic", ANTHROPIC_API_KEY="clave-falsa")
    )
    assert isinstance(claude, LectorClaude)


def test_proveedor_real_sin_clave_no_arranca():
    """La clave va en variables de entorno; sin ella la configuración avisa al arrancar."""
    with pytest.raises(ValueError, match="GEMINI_API_KEY"):
        config(LECTOR_PROVEEDOR="gemini", GEMINI_API_KEY="")


def test_proveedor_real_sin_conexion_responde_con_error(monkeypatch):
    """Una clave inválida o una caída del servicio terminan en error, nunca en excepción."""
    claude = LectorClaude("clave-falsa", "claude-opus-5-5", timeout_segundos=0.01)

    def caida(**_):
        import anthropic
        import httpx

        raise anthropic.APIConnectionError(request=httpx.Request("POST", "https://x"))

    monkeypatch.setattr(claude.cliente.beta.messages, "create", caida)
    r = lector.leer(claude, b"foto", "image/jpeg")
    assert r.lectura is None and r.error == "No se pudo conectar con Anthropic."


def test_si_tarda_mas_del_limite_queda_para_digitar():
    r = lector.leer(Simulado(demora=0.5), b"x", "image/jpeg", timeout=0.05)
    assert r.lectura is None and "tardó" in r.error
