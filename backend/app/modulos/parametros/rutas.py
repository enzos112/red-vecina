from fastapi import APIRouter

from app.core.dependencias import Admin, Ahora, Config, Equipo, Params, SesionDB
from app.modulos.parametros import reglas, servicio
from app.modulos.parametros.esquemas import (
    CambioParametroNuevo,
    CambioParametroSalida,
    CondicionesRed,
    NivelPublico,
    ParametroSalida,
)

router = APIRouter(tags=["Parámetros"])


@router.get("/red/condiciones", summary="Valores vigentes del programa para el público")
def condiciones(p: Params, config: Config) -> CondicionesRed:
    return CondicionesRed(
        contacto_whatsapp=config.CONTACTO_WHATSAPP,
        pesos_por_punto=p.P1.pesos_por_punto,
        compra_minima_sumar=p.P3.pesos,
        maximo_puntos_boleta=p.P4.puntos,
        plazo_boleta_horas=p.P7.horas,
        vigencia_puntos_dias=p.P8.dias,
        niveles=[
            NivelPublico(
                numero=n.numero, nombre=n.nombre, puntos=n.puntos, valor_pesos=n.valor_pesos
            )
            for n in reglas.niveles(p)
        ],
        veces_compra_minima_canje=p.P10.veces_descuento,
        vigencia_codigo_horas=p.P11.horas,
        canjes_por_comercio=p.P12.canjes,
        canjes_por_comercio_dias=p.P12.dias,
        canjes_red=p.P13.canjes,
        canjes_red_dias=p.P13.dias,
        codigos_activos=p.P14.codigos,
        boletas_para_canjear=p.P20.boletas_validadas,
        plazo_validacion_horas=p.U11.horas,
        avisos_vencimiento_dias=list(p.U16.dias),
        plazo_reclamo_dias=p.U17.dias,
        cuenta_sin_compras_dias=p.U18.dias,
        aviso_cierre_dias=p.U25.dias,
    )


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
