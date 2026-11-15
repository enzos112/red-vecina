from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.auditoria import auditar
from app.core.dependencias import Admin, Ahora, SesionDB
from app.tareas import servicio

router = APIRouter(tags=["Tareas"])


class EjecutarTareas(BaseModel):
    forzar: bool = True


class ResultadoTareas(BaseModel):
    resultados: dict[str, dict[str, Any]]  # vacío si no había nada pendiente


class EstadoTarea(BaseModel):
    tarea: str
    nombre: str
    ejecutada_en: datetime | None
    forzada: bool
    resultado: dict[str, Any]


@router.get("/admin/tareas", summary="Última ejecución de cada tarea programada")
def estado(_: Admin, sesion: SesionDB) -> list[EstadoTarea]:
    return [
        EstadoTarea(
            tarea=nombre,
            nombre=servicio.NOMBRES[nombre],
            ejecutada_en=e.ejecutada_en if e else None,
            forzada=e.forzada if e else False,
            resultado=e.resultado if e else {},
        )
        for nombre, e in servicio.ultimas(sesion).items()
    ]


@router.post(
    "/admin/tareas",
    summary="Correr las tareas del día: códigos vencidos, puntos vencidos y cupos (solo admin)",
)
def ejecutar(
    datos: EjecutarTareas, admin: Admin, sesion: SesionDB, ahora: Ahora
) -> ResultadoTareas:
    resultados = servicio.ejecutar(sesion, ahora, forzar=datos.forzar)
    auditar(sesion, "ejecutar_tareas", "tareas", None, admin.id, {"forzar": datos.forzar}, ahora)
    return ResultadoTareas(resultados=resultados)
