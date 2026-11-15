from datetime import date, timedelta

from fastapi import APIRouter, Response

from app.core.dependencias import Admin, Ahora, ComercioActual, Equipo, Params, SesionDB
from app.core.tiempo import inicio_dia_utc
from app.modulos.reportes import servicio
from app.modulos.reportes.esquemas import (
    AlertaFraudeSalida,
    CifrasMesSalida,
    IndicadoresRedSalida,
    ReporteMensualSalida,
    RevisionSemanalSalida,
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


@router.get("/admin/fraude", summary="Alertas de fraude de la sección 9")
def fraude(_: Equipo, sesion: SesionDB, ahora: Ahora, p: Params) -> list[AlertaFraudeSalida]:
    return [AlertaFraudeSalida(**a.model_dump()) for a in servicio.alertas_fraude(sesion, ahora, p)]


@router.get(
    "/admin/revision-semanal",
    summary="Revisión del lunes: cupos contra la semana anterior, cobertura y alertas",
)
def revision_semanal(_: Equipo, sesion: SesionDB, ahora: Ahora, p: Params) -> RevisionSemanalSalida:
    return RevisionSemanalSalida.model_validate(
        servicio.revision_semanal(sesion, ahora, p).model_dump()
    )


# --- Exportar a CSV (solo admin) ---


def _archivo(contenido: str, nombre: str) -> Response:
    return Response(
        content=contenido.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


def _rango(desde: date | None, hasta: date | None):
    """Días locales, ambos incluidos."""
    return (
        inicio_dia_utc(desde) if desde else None,
        inicio_dia_utc(hasta + timedelta(days=1)) if hasta else None,
    )


@router.get(
    "/admin/exportar/boletas.csv",
    summary="Boletas en CSV (por fecha de recepción)",
    response_class=Response,
)
def exportar_boletas(
    _: Admin, sesion: SesionDB, desde: date | None = None, hasta: date | None = None
) -> Response:
    return _archivo(servicio.csv_boletas(sesion, *_rango(desde, hasta)), "boletas.csv")


@router.get(
    "/admin/exportar/canjes.csv",
    summary="Canjes en CSV (por fecha de emisión)",
    response_class=Response,
)
def exportar_canjes(
    _: Admin, sesion: SesionDB, desde: date | None = None, hasta: date | None = None
) -> Response:
    return _archivo(servicio.csv_canjes(sesion, *_rango(desde, hasta)), "canjes.csv")


@router.get(
    "/admin/exportar/comercios.csv",
    summary="Reporte por comercio en CSV (ventana de P15 e indicadores)",
    response_class=Response,
)
def exportar_comercios(_: Admin, sesion: SesionDB, ahora: Ahora, p: Params) -> Response:
    return _archivo(servicio.csv_comercios(sesion, ahora, p), "reporte-comercios.csv")
