import enum
from datetime import datetime
from typing import Any

from pydantic import AwareDatetime, BaseModel, Field


class EstadoBoleta(enum.StrEnum):
    PENDIENTE = "pendiente"
    APROBADA = "aprobada"
    RECHAZADA = "rechazada"


class OrigenBoleta(enum.StrEnum):
    VECINO = "vecino"  # subida desde la tarjeta
    OPERADOR = "operador"  # llegó por WhatsApp
    DEMO = "demo"


class ColorControl(enum.StrEnum):
    VERDE = "verde"
    AMBAR = "ambar"
    ROJO = "rojo"


# --- API ---


class ControlSalida(BaseModel):
    clave: str
    color: ColorControl
    mensaje: str


class BoletaSalida(BaseModel):
    id: int
    estado: EstadoBoleta
    origen: OrigenBoleta
    recibida_en: datetime
    tiene_imagen: bool
    comercio_id: int | None
    comercio: str | None
    folio: str | None
    fecha_compra: datetime | None
    monto_total: int | None
    monto_valido: int | None
    puntos: int | None
    motivo: str | None
    revisada_en: datetime | None


class VecinoDeBoleta(BaseModel):
    id: int
    nombre: str
    telefono: str


class BoletaEnCola(BoletaSalida):
    vecino: VecinoDeBoleta
    revisar_antes_de: datetime  # recibida + U11 (A8)


class BoletaDetalle(BoletaEnCola):
    lectura: dict[str, Any] | None
    controles: list[ControlSalida] | None


class DatosBoleta(BaseModel):
    """Lo que el operador confirma o corrige al revisar la boleta."""

    comercio_id: int
    folio: str = Field(min_length=1, max_length=40)
    fecha_compra: AwareDatetime
    monto_total: int = Field(ge=0, description="Pesos pagados (A7: ya descontado el canje).")
    monto_excluido: int = Field(default=0, ge=0, description="Cigarros, recargas y similares.")


class Evaluacion(BaseModel):
    monto_valido: int
    puntos_calculados: int
    puntos: int
    rechazo_sugerido: bool
    controles: list[ControlSalida]


class Rechazo(BaseModel):
    motivo: str = Field(min_length=1, max_length=500)
