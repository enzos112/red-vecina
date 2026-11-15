from datetime import datetime

from pydantic import BaseModel


class IndicadorSalida(BaseModel):
    clave: str
    nombre: str
    valor: float | None  # porcentaje, pesos o cantidad según el indicador; None sin datos
    alerta: bool
    senal: str | None
    accion: str | None


class ReporteComercioSalida(BaseModel):
    comercio_id: int
    comercio: str
    desde: datetime
    hasta: datetime
    vecinos_inscritos: int
    ventas: int
    canjes_recibidos: int
    canjes_pesos: int
    clientes_derivados_total: int
    indicadores: list[IndicadorSalida]


class IndicadoresRedSalida(BaseModel):
    red: list[IndicadorSalida]
    comercios: list[ReporteComercioSalida]
