from datetime import date, datetime

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


class CifrasMesSalida(BaseModel):
    inscritos: int
    derivados: int
    recompras: int
    canjes: int
    canjes_pesos: int
    ventas: int
    costo_pct: float | None  # canjes ÷ ventas del tramo


class ReporteMensualSalida(ReporteComercioSalida):
    """Reporte del comercio: los indicadores de la ventana más el mes en curso comparado
    con el mismo tramo del mes anterior."""

    nombre_mes: str
    mes_desde: datetime
    anterior_desde: datetime
    anterior_hasta: datetime
    mes: CifrasMesSalida
    mes_anterior: CifrasMesSalida
    resumen: str


class IndicadoresRedSalida(BaseModel):
    red: list[IndicadorSalida]
    comercios: list[ReporteComercioSalida]


class AlertaFraudeSalida(BaseModel):
    clave: str
    titulo: str
    detalle: str
    accion: str
    comercio_id: int | None
    vecino_id: int | None


class CupoComparadoSalida(BaseModel):
    comercio_id: int
    comercio: str
    estado: str
    en_piso: bool
    base: int
    arrastre: int
    extra: int
    total: int
    usado: int
    reservado: int
    total_anterior: int | None
    usado_anterior: int | None


class AlertaActivaSalida(BaseModel):
    comercio_id: int | None
    comercio: str | None
    indicador: IndicadorSalida


class RevisionSemanalSalida(BaseModel):
    """Lo que el operador mira cada lunes (sección 10)."""

    semana: date
    semana_anterior: date
    cupos: list[CupoComparadoSalida]
    red: list[IndicadorSalida]
    alertas: list[AlertaActivaSalida]
    fraude: list[AlertaFraudeSalida]
