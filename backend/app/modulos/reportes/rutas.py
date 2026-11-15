from fastapi import APIRouter

from app.core.dependencias import Ahora, ComercioActual, Equipo, Params, SesionDB
from app.modulos.reportes import servicio
from app.modulos.reportes.esquemas import (
    CifrasMesSalida,
    IndicadoresRedSalida,
    ReporteMensualSalida,
)

router = APIRouter(tags=["Reportes"])


@router.get(
    "/comercio/reporte",
    summary="Mi reporte: inscritos, derivados, recompra y costo de canjes",
)
def reporte(
    comercio: ComercioActual, sesion: SesionDB, ahora: Ahora, p: Params
) -> ReporteMensualSalida:
    r = servicio.reporte_comercio(sesion, comercio.id, ahora, p)
    m = servicio.reporte_mensual(sesion, comercio.id, ahora, p)

    def cifras(c) -> CifrasMesSalida:
        costo = c.costo_pct
        return CifrasMesSalida(
            **c.model_dump(), costo_pct=float(costo) if costo is not None else None
        )

    return ReporteMensualSalida(
        **r.model_dump(),
        nombre_mes=m.nombre_mes,
        mes_desde=m.mes_desde,
        anterior_desde=m.anterior_desde,
        anterior_hasta=m.anterior_hasta,
        mes=cifras(m.mes),
        mes_anterior=cifras(m.mes_anterior),
        resumen=m.resumen,
    )


@router.get("/admin/indicadores", summary="Indicadores de la sección 10, con alertas")
def indicadores(_: Equipo, sesion: SesionDB, ahora: Ahora, p: Params) -> IndicadoresRedSalida:
    return IndicadoresRedSalida.model_validate(
        servicio.indicadores_red(sesion, ahora, p).model_dump()
    )
