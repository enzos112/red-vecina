"""Lector de boletas: elige el proveedor según LECTOR_PROVEEDOR y nunca rompe la entrada.

Uso: `lector = crear_lector(config)`; `resultado = leer(lector, imagen, tipo)`.
Si el proveedor falla o tarda, `resultado.lectura` es None y `resultado.error` explica por
qué: la boleta queda para digitación manual.
"""

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as TiempoAgotado

from pydantic import BaseModel

from app.core.config import Configuracion
from app.servicios.lector.base import (
    CAMPOS_CONFIANZA,
    Confianza,
    ErrorLector,
    Lector,
    Lectura,
    LineaLeida,
)
from app.servicios.lector.proveedores import LectorClaude, LectorGemini, LectorManual

__all__ = [
    "CAMPOS_CONFIANZA",
    "Confianza",
    "ErrorLector",
    "Lector",
    "Lectura",
    "LineaLeida",
    "ResultadoLectura",
    "crear_lector",
    "leer",
]

log = logging.getLogger(__name__)

# Hilos para cortar una lectura que tarda más de la cuenta aunque el proveedor no responda.
_hilos = ThreadPoolExecutor(max_workers=4, thread_name_prefix="lector")


class ResultadoLectura(BaseModel):
    proveedor: str
    lectura: Lectura | None
    error: str | None = None
    segundos: float = 0


def crear_lector(config: Configuracion) -> Lector:
    if config.LECTOR_PROVEEDOR == "gemini" and config.GEMINI_API_KEY:
        return LectorGemini(
            config.GEMINI_API_KEY, config.LECTOR_GEMINI_MODELO, config.LECTOR_TIMEOUT_SEGUNDOS
        )
    if config.LECTOR_PROVEEDOR == "anthropic" and config.ANTHROPIC_API_KEY:
        return LectorClaude(
            config.ANTHROPIC_API_KEY,
            config.LECTOR_ANTHROPIC_MODELO,
            config.LECTOR_TIMEOUT_SEGUNDOS,
        )
    return LectorManual()


def leer(
    lector: Lector, imagen: bytes, tipo: str, timeout: float | None = None
) -> ResultadoLectura:
    """Nunca lanza: si el proveedor falla o pasa `timeout` segundos, devuelve el error."""
    inicio = time.monotonic()
    futuro = _hilos.submit(lector.leer, imagen, tipo)
    try:
        lectura = futuro.result(timeout=timeout)
        error = None
    except TiempoAgotado:
        lectura, error = None, f"El lector tardó más de {timeout:g} segundos."
    except ErrorLector as e:
        lectura, error = None, str(e)
    except Exception as e:  # un proveedor nunca debe romper la entrada de una boleta
        log.exception("Falla inesperada del lector %s", lector.nombre)
        lectura, error = None, f"Falla inesperada del lector: {e}"
    if error:
        log.warning("Lector %s: %s", lector.nombre, error)
    return ResultadoLectura(
        proveedor=lector.nombre,
        lectura=lectura,
        error=error,
        segundos=round(time.monotonic() - inicio, 2),
    )
