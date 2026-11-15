"""Tareas sin servidor de fondo (sección 5): corren al primer uso del día o a pedido.

Orden: primero se liberan los códigos vencidos (devuelven puntos y cupo), luego vencen los
puntos (los recién devueltos que ya pasaron su plazo vencen de inmediato, Anexo A.11) y al
final se asegura el cupo de la semana. Cada tarea es idempotente por sí misma, y además se
registra una vez por día.
"""

from collections.abc import Callable
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.tiempo import dia_local
from app.modulos.canjes import servicio as canjes
from app.modulos.equilibrio import servicio as equilibrio
from app.modulos.parametros import servicio as parametros
from app.modulos.parametros.reglas import Parametros
from app.modulos.puntos import servicio as puntos
from app.tareas.modelos import EjecucionTarea

Tarea = Callable[[Session, datetime, Parametros], dict[str, Any]]

TAREAS: dict[str, Tarea] = {
    "liberar_codigos": canjes.liberar_vencidos,
    "vencer_puntos": lambda s, ahora, p: puntos.vencer_puntos(s, ahora),
    "recalcular_cupos": equilibrio.recalcular_cupos,
}


def ejecutar(sesion: Session, ahora: datetime, forzar: bool = False) -> dict[str, Any]:
    """Corre las tareas que falten hoy. Con `forzar`, las corre igual (botón del admin)."""
    p = parametros.cargar(sesion)
    periodo = dia_local(ahora).isoformat()
    resultados: dict[str, Any] = {}
    for nombre, tarea in TAREAS.items():
        registro = sesion.scalar(
            select(EjecucionTarea).where(
                EjecucionTarea.tarea == nombre, EjecucionTarea.periodo == periodo
            )
        )
        if registro and not forzar:
            continue
        resultado = tarea(sesion, ahora, p)
        resultados[nombre] = resultado
        if registro:
            registro.resultado = resultado
            registro.forzada = True
            registro.ejecutada_en = ahora
        else:
            sesion.add(
                EjecucionTarea(
                    tarea=nombre,
                    periodo=periodo,
                    resultado=resultado,
                    forzada=forzar,
                    ejecutada_en=ahora,
                )
            )
        sesion.flush()
    return resultados
