from fastapi import APIRouter

from app.core.dependencias import Ahora, ComercioActual, Equipo, Params, SesionDB
from app.modulos.reportes import servicio
from app.modulos.reportes.esquemas import IndicadoresRedSalida, ReporteComercioSalida

router = APIRouter(tags=["Reportes"])


@router.get(
    "/comercio/reporte",
    summary="Mi reporte: inscritos, derivados, recompra y costo de canjes",
)
def reporte(
    comercio: ComercioActual, sesion: SesionDB, ahora: Ahora, p: Params
) -> ReporteComercioSalida:
    r = servicio.reporte_comercio(sesion, comercio.id, ahora, p)
    return ReporteComercioSalida.model_validate(r.model_dump())


@router.get("/admin/indicadores", summary="Indicadores de la sección 10, con alertas")
def indicadores(_: Equipo, sesion: SesionDB, ahora: Ahora, p: Params) -> IndicadoresRedSalida:
    return IndicadoresRedSalida.model_validate(
        servicio.indicadores_red(sesion, ahora, p).model_dump()
    )
