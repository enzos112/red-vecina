"""Indicadores de la sección 10 calculados con los datos de la base.

Se miran los lunes al recalcular cupos (sección 10), así que el uso del cupo se evalúa
sobre semanas cerradas: la semana en curso todavía no dice nada.
"""

from datetime import datetime, timedelta

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.tiempo import inicio_dia_utc
from app.modulos.boletas import servicio as boletas
from app.modulos.canjes import servicio as canjes
from app.modulos.comercios import servicio as comercios
from app.modulos.equilibrio import servicio as equilibrio
from app.modulos.equilibrio.servicio import UNA_SEMANA
from app.modulos.parametros.reglas import Parametros
from app.modulos.puntos import servicio as puntos
from app.modulos.reportes import reglas
from app.modulos.vecinos import servicio as vecinos


class ReporteComercio(BaseModel):
    comercio_id: int
    comercio: str
    desde: datetime
    hasta: datetime
    vecinos_inscritos: int  # vecinos con este comercio de origen
    ventas: int  # ventas registradas en la ventana de P15
    canjes_recibidos: int
    canjes_pesos: int
    clientes_derivados_total: int  # desde el inicio, una vez por par vecino-comercio
    indicadores: list[reglas.Indicador]


class IndicadoresRed(BaseModel):
    red: list[reglas.Indicador]
    comercios: list[ReporteComercio]


def reporte_comercio(
    sesion: Session, comercio_id: int, ahora: datetime, p: Parametros
) -> ReporteComercio:
    comercio = comercios.obtener(sesion, comercio_id)
    if comercio is None:
        raise ValueError("No encontramos ese comercio.")
    desde = ahora - timedelta(days=p.P15.dias_ventas)
    ventas = boletas.ventas(sesion, comercio_id, desde, ahora)
    recibidos = canjes.recibidos(sesion, comercio_id, desde, ahora)
    canjes_pesos = sum(r.valor_pesos for r in recibidos)
    actual = equilibrio.cupo_vigente(sesion, comercio_id, ahora, p)
    cantidad = max(p.U1.semanas_seguidas, p.U2.semanas_seguidas)
    cerradas = equilibrio.semanas(sesion, comercio_id, actual.semana - UNA_SEMANA, cantidad)
    derivados = vecinos.derivados(sesion, comercio_id, p)
    indicadores = [
        reglas.costo_canjes_sobre_ventas(canjes_pesos, ventas, actual.en_piso, p),
        reglas.uso_cupo_semanal(
            [
                reglas.SemanaUso(
                    semana=s.semana,
                    total=s.total,
                    usado=s.usado,
                    umbral_alto_en=s.umbral_alto_en,
                )
                for s in cerradas
            ],
            p,
        ),
        reglas.ticket_promedio(
            [(r.monto_ticket, r.compra_minima) for r in recibidos if r.monto_ticket is not None],
            p,
        ),
        reglas.clientes_derivados([d.primera_compra for d in derivados], ahora, p),
        reglas.recompra_sin_canje([(d.primera_compra, d.recompra) for d in derivados], ahora, p),
    ]
    return ReporteComercio(
        comercio_id=comercio_id,
        comercio=comercio.nombre,
        desde=desde,
        hasta=ahora,
        vecinos_inscritos=vecinos.contar_por_origen(sesion, comercio_id),
        ventas=ventas,
        canjes_recibidos=len(recibidos),
        canjes_pesos=canjes_pesos,
        clientes_derivados_total=len(derivados),
        indicadores=indicadores,
    )


def indicadores_red(sesion: Session, ahora: datetime, p: Parametros) -> IndicadoresRed:
    equilibrio.recalcular_cupos(sesion, ahora, p)  # idempotente: asegura la semana en curso
    semana = equilibrio.semana_actual(ahora, p)
    # Cobertura (P18): semanas cerradas de la ventana contra los puntos emitidos en ella.
    desde = semana - timedelta(days=p.P18.dias)
    cupos = equilibrio.cupos_entre(sesion, desde, semana - UNA_SEMANA)
    emitidos = boletas.puntos_emitidos(sesion, inicio_dia_utc(desde), inicio_dia_utc(semana))
    red = [
        reglas.cobertura_red(cupos, emitidos, p),
        reglas.puntos_sin_canjear(
            puntos.disponible_red(sesion), equilibrio.total_red(sesion, semana), p
        ),
    ]
    return IndicadoresRed(
        red=red,
        comercios=[reporte_comercio(sesion, c.id, ahora, p) for c in comercios.activos(sesion)],
    )
