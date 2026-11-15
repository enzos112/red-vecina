import enum
from datetime import date

from pydantic import BaseModel, Field


class Semaforo(enum.StrEnum):
    VERDE = "verde"
    AMBAR = "ambar"
    ROJO = "rojo"


# --- API ---


class CupoSalida(BaseModel):
    semana: date  # primer día de la semana (P17)
    base: int
    extra: int
    arrastre: int
    total: int
    reservado: int  # códigos emitidos que aún no se usan
    usado: int
    libre: int
    semaforo: Semaforo  # U7, sobre lo usado más lo reservado
    en_piso: bool
    ventas_ventana: int  # V con que se calculó la base
    dias_historia: int
    proxima_liberacion: date


class CupoExtra(BaseModel):
    monto: int = Field(gt=0, description="Pesos que se suman al cupo de esta semana.")
