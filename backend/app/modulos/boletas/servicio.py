"""Boletas: registro, evaluación con las reglas y aprobación con sus puntos."""

from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auditoria import auditar
from app.core.tiempo import dia_local, inicio_dia_utc
from app.modulos.boletas import reglas
from app.modulos.boletas.esquemas import EstadoBoleta, OrigenBoleta
from app.modulos.boletas.modelos import Boleta
from app.modulos.canjes import servicio as canjes
from app.modulos.comercios import servicio as comercios
from app.modulos.parametros.reglas import Parametros
from app.modulos.puntos import servicio as puntos
from app.modulos.puntos.esquemas import TipoMovimiento
from app.modulos.vecinos import servicio as vecinos

_APROBADA = Boleta.estado == EstadoBoleta.APROBADA


def crear(
    sesion: Session,
    vecino_id: int,
    origen: OrigenBoleta,
    recibida_en: datetime,
    archivo_id: int | None = None,
    es_demo: bool = False,
) -> Boleta:
    boleta = Boleta(
        vecino_id=vecino_id,
        origen=origen,
        recibida_en=recibida_en,
        archivo_id=archivo_id,
        es_demo=es_demo,
    )
    sesion.add(boleta)
    sesion.flush()
    return boleta


def _rango_dia(momento: datetime) -> tuple[datetime, datetime]:
    dia = dia_local(momento)
    return inicio_dia_utc(dia), inicio_dia_utc(dia + timedelta(days=1))


def entrada(
    sesion: Session,
    boleta: Boleta,
    comercio_id: int | None,
    folio: str | None,
    fecha_compra: datetime,
    monto_total: int,
    monto_excluido: int,
) -> reglas.EntradaBoleta:
    """Reúne desde la base el contexto que necesitan las reglas (A3, A9, P5, P6)."""
    comercio = comercios.obtener(sesion, comercio_id) if comercio_id else None
    desde, hasta = _rango_dia(fecha_compra)
    del_dia = (
        Boleta.vecino_id == boleta.vecino_id,
        _APROBADA,
        Boleta.fecha_compra >= desde,
        Boleta.fecha_compra < hasta,
        Boleta.id != boleta.id,
    )
    puntos_dia = sesion.scalar(select(func.coalesce(func.sum(Boleta.puntos), 0)).where(*del_dia))
    boletas_dia = sesion.scalar(
        select(func.count(Boleta.id)).where(*del_dia, Boleta.comercio_id == comercio_id)
    )
    folio_repetido = bool(
        folio
        and sesion.scalar(
            select(Boleta.id).where(
                Boleta.comercio_id == comercio_id,
                Boleta.folio == folio,
                _APROBADA,
                Boleta.id != boleta.id,
            )
        )
    )
    return reglas.EntradaBoleta(
        monto_total=monto_total,
        monto_excluido=monto_excluido,
        fecha_compra=fecha_compra,
        recibida_en=boleta.recibida_en,
        comercio_en_red=comercio is not None and comercios.en_red(comercio),
        vecino_trabaja_ahi=bool(comercio_id)
        and vecinos.trabaja_en(sesion, boleta.vecino_id, comercio_id),
        folio_ya_registrado=folio_repetido,
        boletas_dia_comercio=boletas_dia or 0,
        puntos_dia=puntos_dia or 0,
    )


def aprobar(
    sesion: Session,
    boleta_id: int,
    *,
    comercio_id: int,
    folio: str,
    fecha_compra: datetime,
    monto_total: int,
    p: Parametros,
    ahora: datetime,
    revisor_id: int | None = None,
    monto_excluido: int = 0,
) -> Boleta:
    """Aprueba una boleta con los datos que confirmó el operador y acredita sus puntos."""
    boleta = sesion.get(Boleta, boleta_id)
    if boleta is None:
        raise ValueError("No encontramos esa boleta.")
    if boleta.estado != EstadoBoleta.PENDIENTE:
        raise ValueError("Esta boleta ya fue revisada.")
    resultado = reglas.evaluar_boleta(
        entrada(sesion, boleta, comercio_id, folio, fecha_compra, monto_total, monto_excluido), p
    )
    if resultado.rechazo_sugerido:
        rojos = [c.mensaje for c in resultado.controles if c.color == reglas.Color.ROJO]
        raise ValueError(" ".join(rojos))
    comercio = comercios.obtener(sesion, comercio_id)
    boleta.comercio_id = comercio_id
    boleta.rut_emisor = comercio.rut if comercio else None
    boleta.folio = folio
    boleta.fecha_compra = fecha_compra
    boleta.monto_total = monto_total
    boleta.monto_valido = resultado.monto_valido
    boleta.puntos = resultado.puntos
    boleta.controles = [c.model_dump(mode="json") for c in resultado.controles]
    boleta.estado = EstadoBoleta.APROBADA
    boleta.revisor_id = revisor_id
    boleta.revisada_en = ahora
    boleta.canje_id = canjes.usado_el_mismo_dia(sesion, boleta.vecino_id, comercio_id, fecha_compra)
    sesion.flush()
    if resultado.puntos:
        puntos.registrar(
            sesion,
            boleta.vecino_id,
            TipoMovimiento.GANA,
            resultado.puntos,
            ahora,
            vence_en=fecha_compra + timedelta(days=p.P8.dias),
            boleta_id=boleta.id,
            usuario_id=revisor_id,
        )
    auditar(
        sesion, "aprobar_boleta", "boleta", boleta.id, revisor_id, {"puntos": boleta.puntos}, ahora
    )
    return boleta


def rechazar(
    sesion: Session, boleta_id: int, motivo: str, ahora: datetime, revisor_id: int | None = None
) -> Boleta:
    boleta = sesion.get(Boleta, boleta_id)
    if boleta is None:
        raise ValueError("No encontramos esa boleta.")
    if boleta.estado != EstadoBoleta.PENDIENTE:
        raise ValueError("Esta boleta ya fue revisada.")
    if not motivo.strip():
        raise ValueError("Indica el motivo del rechazo.")
    boleta.estado = EstadoBoleta.RECHAZADA
    boleta.motivo = motivo
    boleta.puntos = 0
    boleta.revisor_id = revisor_id
    boleta.revisada_en = ahora
    auditar(sesion, "rechazar_boleta", "boleta", boleta.id, revisor_id, {"motivo": motivo}, ahora)
    sesion.flush()
    return boleta


# --- Consultas para otros módulos ---


def contar_aprobadas(sesion: Session, vecino_id: int) -> int:
    return (
        sesion.scalar(select(func.count(Boleta.id)).where(Boleta.vecino_id == vecino_id, _APROBADA))
        or 0
    )


def compras_aprobadas(sesion: Session, vecino_id: int) -> list[tuple[int, datetime]]:
    filas = sesion.execute(
        select(Boleta.comercio_id, Boleta.fecha_compra).where(
            Boleta.vecino_id == vecino_id, _APROBADA
        )
    ).all()
    return [(c, f) for c, f in filas]


def ventas(sesion: Session, comercio_id: int, desde: datetime, hasta: datetime) -> int:
    """Anexo A.4: monto válido de las boletas aprobadas por fecha de compra en [desde, hasta)."""
    return (
        sesion.scalar(
            select(func.coalesce(func.sum(Boleta.monto_valido), 0)).where(
                Boleta.comercio_id == comercio_id,
                _APROBADA,
                Boleta.fecha_compra >= desde,
                Boleta.fecha_compra < hasta,
            )
        )
        or 0
    )


def puntos_emitidos(sesion: Session, desde: datetime, hasta: datetime) -> int:
    return (
        sesion.scalar(
            select(func.coalesce(func.sum(Boleta.puntos), 0)).where(
                _APROBADA, Boleta.fecha_compra >= desde, Boleta.fecha_compra < hasta
            )
        )
        or 0
    )
