from fastapi import APIRouter

from app.core.dependencias import Admin, Ahora, Equipo, SesionDB
from app.modulos.parametros import servicio
from app.modulos.parametros.esquemas import (
    CambioParametroNuevo,
    CambioParametroSalida,
    ParametroSalida,
)

router = APIRouter(tags=["Parámetros"])


@router.get("/admin/parametros", summary="P1 a P20 y umbrales, con su valor vigente")
def listar(_: Equipo, sesion: SesionDB) -> list[ParametroSalida]:
    return [ParametroSalida.model_validate(f) for f in servicio.listar(sesion)]


@router.put("/admin/parametros/{codigo}", summary="Cambiar un parámetro (solo admin)")
def cambiar(
    codigo: str, datos: CambioParametroNuevo, admin: Admin, sesion: SesionDB, ahora: Ahora
) -> ParametroSalida:
    fila = servicio.cambiar(sesion, codigo.upper(), datos.valor, datos.motivo, admin.id, ahora)
    return ParametroSalida.model_validate(fila)


@router.get("/admin/parametros/{codigo}/cambios", summary="Historial de cambios de un parámetro")
def cambios(codigo: str, _: Equipo, sesion: SesionDB) -> list[CambioParametroSalida]:
    return [
        CambioParametroSalida.model_validate(c) for c in servicio.historial(sesion, codigo.upper())
    ]
