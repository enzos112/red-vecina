import enum
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TipoMovimiento(enum.StrEnum):
    GANA = "gana"  # boleta aprobada: + disponible, con vencimiento
    RETIENE = "retiene"  # código emitido: disponible → retenido
    LIBERA = "libera"  # código vencido: retenido → disponible
    CANJEA = "canjea"  # código usado: sale de retenido
    VENCE = "vence"  # P8: sale de disponible
    AJUSTA = "ajusta"  # corrección del operador, con signo y motivo


# --- API ---


class SaldoSalida(BaseModel):
    disponible: int
    retenido: int


class VencimientoSalida(BaseModel):
    fecha: datetime
    puntos: int


class MovimientoSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: TipoMovimiento
    puntos: int
    creado_en: datetime
    vence_en: datetime | None
    boleta_id: int | None
    canje_id: int | None
    motivo: str | None


class Ajuste(BaseModel):
    puntos: int = Field(description="Positivo suma, negativo resta.")
    motivo: str = Field(min_length=1, max_length=500)
