from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencias import Ahora, Config, Equipo, Params, SesionDB, VecinoToken, limitador
from app.modulos.boletas import servicio
from app.modulos.boletas.esquemas import (
    BoletaDetalle,
    BoletaEnCola,
    BoletaSalida,
    ControlSalida,
    DatosBoleta,
    EstadoBoleta,
    Evaluacion,
    OrigenBoleta,
    Rechazo,
    VecinoDeBoleta,
)
from app.modulos.boletas.modelos import Boleta
from app.modulos.comercios import servicio as comercios
from app.modulos.parametros.reglas import Parametros
from app.modulos.vecinos import servicio as vecinos

router = APIRouter(tags=["Boletas"])

LIMITE_LISTA = 200  # tamaño de página, no regla de negocio


def boleta_salida(b: Boleta, nombres: dict[int, str]) -> BoletaSalida:
    return BoletaSalida(
        id=b.id,
        estado=b.estado,
        origen=b.origen,
        recibida_en=b.recibida_en,
        tiene_imagen=b.archivo_id is not None,
        comercio_id=b.comercio_id,
        comercio=nombres.get(b.comercio_id) if b.comercio_id else None,
        folio=b.folio,
        fecha_compra=b.fecha_compra,
        monto_total=b.monto_total,
        monto_valido=b.monto_valido,
        puntos=b.puntos,
        motivo=b.motivo,
        revisada_en=b.revisada_en,
    )


def boletas_salida(sesion: Session, lista: list[Boleta]) -> list[BoletaSalida]:
    nombres = comercios.nombres(sesion, {b.comercio_id for b in lista if b.comercio_id})
    return [boleta_salida(b, nombres) for b in lista]


def _en_cola(sesion: Session, b: Boleta, p: Parametros, nombres: dict[int, str]) -> dict:
    vecino = vecinos.obtener(sesion, b.vecino_id)
    assert vecino is not None
    return {
        **boleta_salida(b, nombres).model_dump(),
        "vecino": VecinoDeBoleta(id=vecino.id, nombre=vecino.nombre, telefono=vecino.telefono),
        "revisar_antes_de": b.recibida_en + timedelta(hours=p.U11.horas),
    }


def _boleta(sesion: Session, boleta_id: int) -> Boleta:
    boleta = servicio.obtener(sesion, boleta_id)
    if boleta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No encontramos esa boleta.")
    return boleta


def _detalle(sesion: Session, b: Boleta, p: Parametros) -> BoletaDetalle:
    nombres = comercios.nombres(sesion, {b.comercio_id} if b.comercio_id else set())
    return BoletaDetalle(
        **_en_cola(sesion, b, p, nombres),
        lectura=b.lectura,
        controles=[ControlSalida(**c) for c in b.controles] if b.controles else None,
    )


# --- Vecino ---


@router.post(
    "/t/{token}/boletas",
    status_code=status.HTTP_201_CREATED,
    summary="Subir la foto de una boleta (queda pendiente)",
)
def subir(
    vecino: VecinoToken,
    request: Request,
    sesion: SesionDB,
    ahora: Ahora,
    config: Config,
    foto: Annotated[UploadFile, File(description="Foto de la boleta (JPG, PNG o WEBP).")],
) -> BoletaSalida:
    limite = limitador(request, "subidas")
    clave = f"vecino:{vecino.id}"
    limite.exigir(clave)
    datos = foto.file.read(config.BOLETA_MAX_BYTES + 1)
    boleta = servicio.recibir_foto(
        sesion, vecino.id, datos, OrigenBoleta.VECINO, ahora, config.BOLETA_MAX_BYTES
    )
    limite.fallo(clave)  # cuenta cada subida
    return boleta_salida(boleta, {})


# --- Equipo (operador y admin) ---


@router.get("/admin/boletas", summary="Cola de boletas (por defecto, las pendientes)")
def cola(
    _: Equipo,
    sesion: SesionDB,
    p: Params,
    estado: EstadoBoleta | None = EstadoBoleta.PENDIENTE,
) -> list[BoletaEnCola]:
    lista = servicio.listar(sesion, estado=estado, limite=LIMITE_LISTA)
    nombres = comercios.nombres(sesion, {b.comercio_id for b in lista if b.comercio_id})
    return [BoletaEnCola(**_en_cola(sesion, b, p, nombres)) for b in lista]


@router.get("/admin/boletas/{boleta_id}", summary="Una boleta con su lectura y controles")
def detalle(boleta_id: int, _: Equipo, sesion: SesionDB, p: Params) -> BoletaDetalle:
    return _detalle(sesion, _boleta(sesion, boleta_id), p)


@router.get(
    "/admin/boletas/{boleta_id}/imagen",
    summary="Foto de la boleta",
    response_class=Response,
    responses={200: {"content": {"image/jpeg": {}, "image/png": {}, "image/webp": {}}}},
)
def imagen(boleta_id: int, _: Equipo, sesion: SesionDB) -> Response:
    foto = servicio.imagen(sesion, _boleta(sesion, boleta_id))
    if foto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esta boleta no tiene foto.")
    datos, tipo = foto
    return Response(datos, media_type=tipo, headers={"Cache-Control": "private, max-age=3600"})


@router.post(
    "/admin/boletas/{boleta_id}/evaluar",
    summary="Vista previa de controles y puntos con los datos corregidos",
)
def evaluar(
    boleta_id: int, datos: DatosBoleta, _: Equipo, sesion: SesionDB, p: Params
) -> Evaluacion:
    r = servicio.evaluar(sesion, _boleta(sesion, boleta_id).id, **datos.model_dump(), p=p)
    return Evaluacion(
        monto_valido=r.monto_valido,
        puntos_calculados=r.puntos_calculados,
        puntos=r.puntos,
        rechazo_sugerido=r.rechazo_sugerido,
        controles=[ControlSalida(**c.model_dump()) for c in r.controles],
    )


@router.post("/admin/boletas/{boleta_id}/aprobar", summary="Aprobar, con ajustes si hace falta")
def aprobar(
    boleta_id: int, datos: DatosBoleta, usuario: Equipo, sesion: SesionDB, ahora: Ahora, p: Params
) -> BoletaDetalle:
    boleta = servicio.aprobar(
        sesion,
        _boleta(sesion, boleta_id).id,
        **datos.model_dump(),
        p=p,
        ahora=ahora,
        revisor_id=usuario.id,
    )
    return _detalle(sesion, boleta, p)


@router.post("/admin/boletas/{boleta_id}/rechazar", summary="Rechazar con un motivo")
def rechazar(
    boleta_id: int, datos: Rechazo, usuario: Equipo, sesion: SesionDB, ahora: Ahora, p: Params
) -> BoletaDetalle:
    boleta = servicio.rechazar(
        sesion, _boleta(sesion, boleta_id).id, datos.motivo, ahora, revisor_id=usuario.id
    )
    return _detalle(sesion, boleta, p)
