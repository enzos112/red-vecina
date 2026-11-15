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
    if plantilla is None:
        raise ValueError(f"No existe la plantilla {clave}.")
    return plantilla.texto
