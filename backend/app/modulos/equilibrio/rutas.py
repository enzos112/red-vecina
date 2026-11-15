from datetime import datetime

from fastapi import APIRouter

from app.core.dependencias import Ahora, ComercioActual, Params, SesionDB, UsuarioComercio
from app.modulos.equilibrio import reglas, servicio
from app.modulos.equilibrio.esquemas import CupoExtra, CupoSalida
from app.modulos.equilibrio.modelos import CupoSemanal
from app.modulos.parametros.reglas import Parametros

router = APIRouter(tags=["Cupos"])


def cupo_salida(c: CupoSemanal, ahora: datetime, p: Parametros) -> CupoSalida:
    return CupoSalida(
        semana=c.semana,
        base=c.base,
        extra=c.extra,
        arrastre=c.arrastre,
        total=c.total,
        reservado=c.reservado,
        usado=c.usado,
        libre=c.libre,
        semaforo=reglas.semaforo(c.usado + c.reservado, c.total, p),
        en_piso=c.en_piso,
        ventas_ventana=c.ventas_ventana,
        dias_historia=c.dias_historia,
        proxima_liberacion=reglas.proximo_inicio_semana(ahora, p),
        explicacion=reglas.explicacion_cupo(c.en_piso, c.dias_historia, p),
    )


@router.get("/comercio/cupo", summary="Mi cupo de la semana: usado, reservado y libre")
def cupo(comercio: ComercioActual, sesion: SesionDB, ahora: Ahora, p: Params) -> CupoSalida:
    return cupo_salida(servicio.cupo_vigente(sesion, comercio.id, ahora, p), ahora, p)


@router.post("/comercio/cupo/extra", summary="Agregar cupo extra a esta semana (no se arrastra)")
def extra(
    datos: CupoExtra,
    comercio: ComercioActual,
    usuario: UsuarioComercio,
    sesion: SesionDB,
    ahora: Ahora,
    p: Params,
) -> CupoSalida:
    c = servicio.agregar_extra(sesion, comercio.id, datos.monto, ahora, p, usuario.id)
    return cupo_salida(c, ahora, p)
