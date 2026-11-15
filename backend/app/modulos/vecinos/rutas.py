from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.dependencias import Ahora, Equipo, Params, SesionDB, VecinoToken, ip, limitador
from app.modulos.boletas import servicio as boletas
from app.modulos.boletas.rutas import boletas_salida
from app.modulos.canjes import servicio as canjes
from app.modulos.canjes.rutas import canjes_salida, codigo_salida
from app.modulos.comercios import servicio as comercios
from app.modulos.parametros.reglas import Parametros, niveles
from app.modulos.puntos import servicio as puntos
from app.modulos.puntos.esquemas import Ajuste, MovimientoSalida, SaldoSalida, VencimientoSalida
from app.modulos.vecinos import servicio
from app.modulos.vecinos.esquemas import (
    EnlaceNuevo,
    Inscripcion,
    Inscrito,
    PendientesSalida,
    ProximoNivel,
    Tarjeta,
    VecinoDetalle,
    VecinoResumen,
)
from app.modulos.vecinos.modelos import Vecino

router = APIRouter(tags=["Vecinos"])

# Tamaños de página, no reglas de negocio.
HISTORIAL_TARJETA = 30
BOLETAS_TARJETA = 20
LIMITE_BUSQUEDA = 50
HISTORIAL_ADMIN = 200


def enlace(vecino: Vecino) -> str:
    return f"/t/{vecino.token}"


def _por_vencer(sesion: Session, vecino_id: int, ahora, p: Parametros) -> list[VencimientoSalida]:
    """Puntos que vencen dentro del aviso más largo de U16."""
    hasta = ahora + timedelta(days=max(p.U16.dias))
    return [
        VencimientoSalida(fecha=f, puntos=n)
        for f, n in puntos.por_vencer(sesion, vecino_id, ahora, hasta)
    ]


def _resumen(v: Vecino, nombres: dict[int, str]) -> VecinoResumen:
    return VecinoResumen(
        id=v.id,
        nombre=v.nombre,
        telefono=v.telefono,
        estado=v.estado,
        comercio_origen_id=v.comercio_origen_id,
        comercio_origen=nombres.get(v.comercio_origen_id) if v.comercio_origen_id else None,
        creado_en=v.creado_en,
        es_demo=v.es_demo,
    )


# --- Público ---


@router.post(
    "/red/inscripcion",
    status_code=status.HTTP_201_CREATED,
    summary="Inscribir a un vecino (al escanear el QR de un comercio)",
)
def inscribir(datos: Inscripcion, request: Request, sesion: SesionDB, ahora: Ahora) -> Inscrito:
    limite = limitador(request, "inscripcion")
    limite.exigir(ip(request))
    if not datos.acepta_condiciones:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Para inscribirte debes aceptar las condiciones."
        )
    origen_id = None
    if datos.comercio:
        comercio = comercios.por_slug(sesion, datos.comercio)
        if comercio is None or not comercios.en_red(comercio):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ese comercio no está en la red.")
        origen_id = comercio.id
    limite.fallo(ip(request))  # cuenta cada intento, también los repetidos
    vecino = servicio.inscribir(sesion, datos.nombre, datos.telefono, origen_id, ahora)
    return Inscrito(nombre=vecino.nombre, token=vecino.token, enlace=enlace(vecino))


# --- Tarjeta del vecino ---


@router.get("/t/{token}", summary="Tarjeta: saldo, pendientes, por vencer e historial")
def tarjeta(vecino: VecinoToken, sesion: SesionDB, ahora: Ahora, p: Params) -> Tarjeta:
    # Pone al día sus códigos y vencimientos aunque la tarea del día no haya corrido.
    canjes.liberar_vencidos(sesion, ahora, p)
    puntos.vencer_vecino(sesion, vecino.id, ahora)
    saldo = puntos.saldos(sesion, vecino.id)
    siguiente = next((n for n in niveles(p) if n.puntos > saldo.disponible), None)
    activo = canjes.activo_de(sesion, vecino.id, ahora)
    origen = (
        comercios.obtener(sesion, vecino.comercio_origen_id) if vecino.comercio_origen_id else None
    )
    return Tarjeta(
        nombre=vecino.nombre,
        comercio_origen=origen.nombre if origen else None,
        estado=vecino.estado,
        saldo=SaldoSalida(disponible=saldo.disponible, retenido=saldo.retenido),
        pendientes=PendientesSalida(boletas=boletas.contar_pendientes(sesion, vecino.id)),
        por_vencer=_por_vencer(sesion, vecino.id, ahora, p),
        proximo_nivel=ProximoNivel(
            nombre=siguiente.nombre,
            puntos=siguiente.puntos,
            valor_pesos=siguiente.valor_pesos,
            faltan=siguiente.puntos - max(saldo.disponible, 0),
        )
        if siguiente
        else None,
        codigo_activo=codigo_salida(sesion, activo) if activo else None,
        boletas=boletas_salida(
            sesion, boletas.listar(sesion, vecino_id=vecino.id, limite=BOLETAS_TARJETA)
        ),
        movimientos=[
            MovimientoSalida.model_validate(m)
            for m in puntos.historial(sesion, vecino.id, HISTORIAL_TARJETA)
        ],
    )


# --- Equipo (operador y admin) ---


def _vecino(sesion: Session, vecino_id: int) -> Vecino:
    vecino = servicio.obtener(sesion, vecino_id)
    if vecino is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No encontramos a este vecino.")
    return vecino


def _detalle(sesion: Session, v: Vecino, ahora, p: Parametros) -> VecinoDetalle:
    nombres = comercios.nombres(sesion, {v.comercio_origen_id} if v.comercio_origen_id else set())
    saldo = puntos.saldos(sesion, v.id)
    return VecinoDetalle(
        **_resumen(v, nombres).model_dump(),
        enlace=enlace(v),
        consentimiento_en=v.consentimiento_en,
        saldo=SaldoSalida(disponible=saldo.disponible, retenido=saldo.retenido),
        por_vencer=_por_vencer(sesion, v.id, ahora, p),
        movimientos=[
            MovimientoSalida.model_validate(m)
            for m in puntos.historial(sesion, v.id, HISTORIAL_ADMIN)
        ],
        boletas=boletas_salida(
            sesion, boletas.listar(sesion, vecino_id=v.id, limite=HISTORIAL_ADMIN)
        ),
        canjes=canjes_salida(sesion, canjes.listar(sesion, vecino_id=v.id, limite=HISTORIAL_ADMIN)),
    )


@router.get("/admin/vecinos", summary="Buscar vecinos por nombre o teléfono")
def buscar(_: Equipo, sesion: SesionDB, q: str = "") -> list[VecinoResumen]:
    lista = servicio.buscar(sesion, q, LIMITE_BUSQUEDA)
    nombres = comercios.nombres(
        sesion, {v.comercio_origen_id for v in lista if v.comercio_origen_id}
    )
    return [_resumen(v, nombres) for v in lista]


@router.get("/admin/vecinos/{vecino_id}", summary="Un vecino con sus movimientos")
def detalle(vecino_id: int, _: Equipo, sesion: SesionDB, ahora: Ahora, p: Params) -> VecinoDetalle:
    return _detalle(sesion, _vecino(sesion, vecino_id), ahora, p)


@router.post("/admin/vecinos/{vecino_id}/ajustes", summary="Ajustar el saldo con un motivo")
def ajustar(
    vecino_id: int, datos: Ajuste, usuario: Equipo, sesion: SesionDB, ahora: Ahora, p: Params
) -> VecinoDetalle:
    vecino = _vecino(sesion, vecino_id)
    puntos.ajustar(sesion, vecino.id, datos.puntos, datos.motivo, ahora, p, usuario.id)
    return _detalle(sesion, vecino, ahora, p)


@router.post(
    "/admin/vecinos/{vecino_id}/enlace",
    summary="Generar un enlace nuevo (el anterior deja de funcionar)",
)
def nuevo_enlace(vecino_id: int, usuario: Equipo, sesion: SesionDB, ahora: Ahora) -> EnlaceNuevo:
    vecino = servicio.regenerar_token(sesion, _vecino(sesion, vecino_id).id, ahora, usuario.id)
    return EnlaceNuevo(enlace=enlace(vecino))
