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


class NivelPublico(BaseModel):
    numero: int
    nombre: str
    puntos: int
    valor_pesos: int


class CondicionesRed(BaseModel):
    """Valores vigentes que el público necesita para entender el programa."""

    contacto_whatsapp: str | None = None  # del equipo de Red Vecina (configuración)

    pesos_por_punto: int  # P1
    compra_minima_sumar: int  # P3
    maximo_puntos_boleta: int  # P4
    plazo_boleta_horas: int  # P7
    vigencia_puntos_dias: int  # P8
    niveles: list[NivelPublico]  # P9 con P2
    veces_compra_minima_canje: int  # P10
    vigencia_codigo_horas: int  # P11
    canjes_por_comercio: int  # P12
    canjes_por_comercio_dias: int
    canjes_red: int  # P13
    canjes_red_dias: int
    codigos_activos: int  # P14
    boletas_para_canjear: int  # P20
    plazo_validacion_horas: int  # U11
    avisos_vencimiento_dias: list[int]  # U16
    plazo_reclamo_dias: int  # U17
    cuenta_sin_compras_dias: int  # U18
    aviso_cierre_dias: int  # U25
