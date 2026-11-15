from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auditoria import auditar
from app.core.formato import miles
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


# --- Edición desde /admin (plantillas editables con vista previa) ---


def _base(clave: str) -> dict[str, str]:
    base = next((t for t in reglas.leer_plantillas() if t["clave"] == clave), None)
    if base is None:
        raise ValueError(f"No existe la plantilla {clave}.")
    return base


def permitidas(clave: str) -> set[str]:
    """Las variables que el código llena para esta plantilla: las del texto base."""
    return reglas.variables(_base(clave)["texto"])


def ejemplo(horas_validacion: int) -> dict[str, str]:
    """Datos de ejemplo; los plazos salen de los parámetros vigentes."""
    plazo = "1 hora" if horas_validacion == 1 else f"{miles(horas_validacion)} horas"
    return {**reglas.leer_ejemplos(), "plazo_validacion": plazo}


def listar(sesion: Session) -> list[tuple[dict[str, str], PlantillaMensaje | None]]:
    guardadas = {p.clave: p for p in sesion.scalars(select(PlantillaMensaje))}
    return [(b, guardadas.get(b["clave"])) for b in reglas.leer_plantillas()]


def editar(
    sesion: Session, clave: str, texto_nuevo: str, ahora: datetime, usuario_id: int
) -> PlantillaMensaje:
    base = _base(clave)
    texto_nuevo = reglas.validar_texto(texto_nuevo, permitidas(clave))
    plantilla = sesion.scalar(select(PlantillaMensaje).where(PlantillaMensaje.clave == clave))
    if plantilla is None:
        plantilla = PlantillaMensaje(**base)
        sesion.add(plantilla)
    anterior = plantilla.texto
    plantilla.texto = texto_nuevo
    plantilla.actualizado_en = ahora
    plantilla.actualizado_por = usuario_id
    auditar(
        sesion,
        "editar_plantilla",
        "plantilla",
        None,
        usuario_id,
        {"clave": clave, "antes": anterior, "despues": texto_nuevo},
        ahora,
    )
    sesion.flush()
    return plantilla
