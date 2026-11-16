from fastapi import APIRouter

from app.core.dependencias import Admin, Ahora, Config, Equipo, Params, SesionDB
from app.modulos.cuentas import servicio as cuentas
from app.modulos.parametros import reglas, servicio
from app.modulos.parametros.esquemas import (
    CambioParametroNuevo,
    CambioParametroSalida,
    CondicionesRed,
    NivelPublico,
    ParametroSalida,
)

router = APIRouter(tags=["Parámetros"])

ULTIMOS_CAMBIOS = 100  # largo de la lista en pantalla, no regla de negocio


def _nombres(sesion) -> dict[int, str]:
    return {u.id: u.nombre for u in cuentas.listar(sesion)}


def _parametro(fila, nombres: dict[int, str]) -> ParametroSalida:
    salida = ParametroSalida.model_validate(fila)
    salida.esquema = reglas.esquema(fila.codigo)
    salida.actualizado_por_nombre = nombres.get(fila.actualizado_por or 0)
    return salida


def _cambio(c, nombres: dict[int, str]) -> CambioParametroSalida:
    salida = CambioParametroSalida.model_validate(c)
    salida.usuario = nombres.get(c.usuario_id or 0)
    return salida


@router.get("/red/condiciones", summary="Valores vigentes del programa para el público")
def condiciones(p: Params, config: Config) -> CondicionesRed:
    return CondicionesRed(
        contacto_whatsapp=config.CONTACTO_WHATSAPP,
        url_publica=config.url_publica,
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
    nombres = _nombres(sesion)
    return [_parametro(f, nombres) for f in servicio.listar(sesion)]


@router.get(
    "/admin/parametros/cambios", summary="Últimos cambios de parámetros: quién, qué y cuándo"
)
def ultimos_cambios(_: Equipo, sesion: SesionDB) -> list[CambioParametroSalida]:
    nombres = _nombres(sesion)
    return [_cambio(c, nombres) for c in servicio.ultimos_cambios(sesion, ULTIMOS_CAMBIOS)]


@router.put("/admin/parametros/{codigo}", summary="Cambiar un parámetro (solo admin)")
def cambiar(
    codigo: str, datos: CambioParametroNuevo, admin: Admin, sesion: SesionDB, ahora: Ahora
) -> ParametroSalida:
    fila = servicio.cambiar(sesion, codigo.upper(), datos.valor, datos.motivo, admin.id, ahora)
    return _parametro(fila, _nombres(sesion))


@router.get("/admin/parametros/{codigo}/cambios", summary="Historial de cambios de un parámetro")
def cambios(codigo: str, _: Equipo, sesion: SesionDB) -> list[CambioParametroSalida]:
    nombres = _nombres(sesion)
    return [_cambio(c, nombres) for c in servicio.historial(sesion, codigo.upper())]
