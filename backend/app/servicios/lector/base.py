"""Interfaz única del lector de boletas (sección 4 de construccion.md).

Un lector recibe la foto y devuelve los campos de la boleta, cada uno con su nivel de
confianza. No decide nada: los controles los aplica el módulo de boletas.
"""

from typing import Protocol

from pydantic import BaseModel, Field

CAMPOS_CONFIANZA = ("rut_emisor", "nombre_emisor", "folio", "fecha", "hora", "total", "lineas")


class LineaLeida(BaseModel):
    descripcion: str
    monto: int | None = None  # pesos de la línea, si se ve


class Confianza(BaseModel):
    """Confianza de 0 a 1 por campo."""

    rut_emisor: float = Field(default=0, ge=0, le=1)
    nombre_emisor: float = Field(default=0, ge=0, le=1)
    folio: float = Field(default=0, ge=0, le=1)
    fecha: float = Field(default=0, ge=0, le=1)
    hora: float = Field(default=0, ge=0, le=1)
    total: float = Field(default=0, ge=0, le=1)
    lineas: float = Field(default=0, ge=0, le=1)


class Lectura(BaseModel):
    rut_emisor: str | None = None
    nombre_emisor: str | None = None
    folio: str | None = None
    fecha: str | None = Field(default=None, description="AAAA-MM-DD")
    hora: str | None = Field(default=None, description="HH:MM, 24 horas")
    total: int | None = Field(default=None, description="Total pagado en pesos")
    lineas: list[LineaLeida] = Field(default_factory=list)
    confianza: Confianza = Field(default_factory=Confianza)


class ErrorLector(Exception):
    """El proveedor no pudo leer la boleta (caída, tiempo, respuesta inválida)."""


class Lector(Protocol):
    nombre: str

    def leer(self, imagen: bytes, tipo: str) -> Lectura | None:
        """Lee la foto. None significa "no lee" (proveedor manual). Lanza ErrorLector."""
        ...


INSTRUCCIONES = (
    "Eres un lector de boletas chilenas fotografiadas con celular (papel térmico, a veces "
    "arrugado). Extrae solo lo que se ve; no inventes. Si un campo no se lee, déjalo en null "
    "y pon su confianza en 0.\n"
    "- rut_emisor: RUT del comercio emisor, con guion y dígito verificador (76100001-2).\n"
    "- nombre_emisor: nombre o razón social del emisor.\n"
    "- folio: número de la boleta o de la operación del comprobante de tarjeta.\n"
    "- fecha: fecha de la compra en formato AAAA-MM-DD. hora: HH:MM en 24 horas.\n"
    "- total: total pagado en pesos chilenos, entero, sin puntos ni signo.\n"
    "- lineas: cada producto con su descripción tal como aparece y su monto en pesos.\n"
    "- confianza: de 0 a 1 por campo, según qué tan seguro estás de la lectura.\n"
    "Si la imagen no es una boleta ni un comprobante de pago, deja todo en null."
)


def _nullable(tipo: dict) -> dict:
    return {"anyOf": [tipo, {"type": "null"}]}


def esquema_json() -> dict:
    """Esquema plano (sin $ref) que aceptan ambos proveedores para la salida estructurada."""
    texto = {"type": "string"}
    entero = {"type": "integer"}
    numero = {"type": "number"}
    return {
        "type": "object",
        "properties": {
            "rut_emisor": _nullable(texto),
            "nombre_emisor": _nullable(texto),
            "folio": _nullable(texto),
            "fecha": _nullable(texto),
            "hora": _nullable(texto),
            "total": _nullable(entero),
            "lineas": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"descripcion": texto, "monto": _nullable(entero)},
                    "required": ["descripcion", "monto"],
                    "additionalProperties": False,
                },
            },
            "confianza": {
                "type": "object",
                "properties": {c: numero for c in CAMPOS_CONFIANZA},
                "required": list(CAMPOS_CONFIANZA),
                "additionalProperties": False,
            },
        },
        "required": [
            "rut_emisor",
            "nombre_emisor",
            "folio",
            "fecha",
            "hora",
            "total",
            "lineas",
            "confianza",
        ],
        "additionalProperties": False,
    }


def interpretar(texto: str) -> Lectura:
    """Valida el JSON del proveedor. Acota la confianza por si el modelo se sale del rango."""
    try:
        import json

        datos = json.loads(texto)
        confianza = datos.get("confianza") or {}
        datos["confianza"] = {k: min(max(float(v or 0), 0.0), 1.0) for k, v in confianza.items()}
        return Lectura.model_validate(datos)
    except Exception as error:
        raise ErrorLector(f"La respuesta del lector no es válida: {error}") from error
