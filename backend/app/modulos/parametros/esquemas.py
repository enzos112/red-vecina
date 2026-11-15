import enum
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class GrupoParametro(enum.StrEnum):
    RED = "red"  # P1 a P20
    UMBRAL = "umbral"  # U1… (Anexo A.1)


class ParametroSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    codigo: str
    grupo: GrupoParametro
    orden: int
    nombre: str
    descripcion: str
    valor: dict[str, Any]
    actualizado_en: datetime
    actualizado_por: int | None


class CambioParametroNuevo(BaseModel):
    valor: dict[str, Any]
    motivo: str = Field(min_length=1, max_length=500)


class CambioParametroSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    valor_anterior: dict[str, Any] | None
    valor_nuevo: dict[str, Any]
    motivo: str
    usuario_id: int | None
    cambiado_en: datetime
