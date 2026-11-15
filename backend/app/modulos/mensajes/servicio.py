from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modulos.mensajes import reglas
from app.modulos.mensajes.modelos import PlantillaMensaje


def inicializar(sesion: Session) -> int:
    """Carga las plantillas de la sección 4 que falten. No pisa las editadas."""
    existentes = set(sesion.scalars(select(PlantillaMensaje.clave)))
    nuevas = 0
    for item in reglas.leer_plantillas():
        if item["clave"] not in existentes:
            sesion.add(PlantillaMensaje(**item))
            nuevas += 1
    sesion.flush()
    return nuevas


def texto(sesion: Session, clave: str) -> str:
    plantilla = sesion.scalar(select(PlantillaMensaje).where(PlantillaMensaje.clave == clave))
    if plantilla is not None:
        return plantilla.texto
    # Una plantilla nueva que aún no se carga en esta base: vale el texto base.
    base = next((t for t in reglas.leer_plantillas() if t["clave"] == clave), None)
    if base is None:
        raise ValueError(f"No existe la plantilla {clave}.")
    return base["texto"]


def armar(sesion: Session, clave: str, datos: dict[str, Any]) -> str:
    """La plantilla vigente con sus variables reemplazadas."""
    return reglas.armar(texto(sesion, clave), datos)


def para_whatsapp(sesion: Session, clave: str, datos: dict[str, Any], telefono: str) -> dict:
    """Mensaje listo para copiar o abrir en el chat del vecino."""
    texto_final = armar(sesion, clave, datos)
    return {
        "texto": texto_final,
        "telefono": telefono,
        "whatsapp": reglas.enlace_whatsapp(telefono, texto_final),
    }
