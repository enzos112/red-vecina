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
