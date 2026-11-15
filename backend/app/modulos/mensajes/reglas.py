"""Armado de mensajes a partir de plantillas con variables entre llaves."""

import json
import re
from pathlib import Path
from typing import Any

RUTA_PLANTILLAS = Path(__file__).with_name("plantillas.json")
VARIABLE = re.compile(r"\{(\w+)\}")


def variables(texto: str) -> set[str]:
    return set(VARIABLE.findall(texto))


def armar(texto: str, datos: dict[str, Any]) -> str:
    faltan = variables(texto) - datos.keys()
    if faltan:
        raise ValueError(f"Faltan datos para el mensaje: {', '.join(sorted(faltan))}.")
    return VARIABLE.sub(lambda m: str(datos[m.group(1)]), texto).strip()


def leer_plantillas() -> list[dict[str, str]]:
    return json.loads(RUTA_PLANTILLAS.read_text(encoding="utf-8"))


def enlace_whatsapp(telefono: str, texto: str) -> str:
    """wa.me con el número en dígitos (sin + ni espacios) y el texto ya escrito."""
    from urllib.parse import quote

    numero = re.sub(r"\D", "", telefono)
    return f"https://wa.me/{numero}?text={quote(texto)}"
