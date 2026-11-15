"""Armado de mensajes a partir de plantillas con variables entre llaves."""

import json
import re
from pathlib import Path
from typing import Any

RUTA_PLANTILLAS = Path(__file__).with_name("plantillas.json")
RUTA_EJEMPLOS = Path(__file__).with_name("ejemplos.json")
VARIABLE = re.compile(r"\{(\w+)\}")


def variables(texto: str) -> set[str]:
    return set(VARIABLE.findall(texto))


def armar(texto: str, datos: dict[str, Any]) -> str:
    faltan = variables(texto) - datos.keys()
    if faltan:
        raise ValueError(f"Faltan datos para el mensaje: {', '.join(sorted(faltan))}.")
    return VARIABLE.sub(lambda m: str(datos[m.group(1)]), texto).strip()


def validar_texto(texto: str, permitidas: set[str]) -> str:
    """Un texto editado solo puede usar las variables que la plantilla sabe llenar."""
    texto = texto.strip()
    if not texto:
        raise ValueError("Escribe el texto del mensaje.")
    if texto.count("{") != texto.count("}"):
        raise ValueError("Revisa las llaves: cada variable va entre { y }.")
    desconocidas = variables(texto) - permitidas
    if desconocidas:
        lista = ", ".join("{" + v + "}" for v in sorted(desconocidas))
        raise ValueError(
            f"Esta plantilla no sabe llenar {lista}. Usa solo las variables de la lista."
        )
    return texto


def leer_ejemplos() -> dict[str, str]:
    return json.loads(RUTA_EJEMPLOS.read_text(encoding="utf-8"))


def leer_plantillas() -> list[dict[str, str]]:
    return json.loads(RUTA_PLANTILLAS.read_text(encoding="utf-8"))


def enlace_whatsapp(telefono: str, texto: str) -> str:
    """wa.me con el número en dígitos (sin + ni espacios) y el texto ya escrito."""
    from urllib.parse import quote

    numero = re.sub(r"\D", "", telefono)
    return f"https://wa.me/{numero}?text={quote(texto)}"
