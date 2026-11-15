"""Libro de puntos en la base. Otros módulos registran movimientos solo a través de aquí."""

from datetime import datetime, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.auditoria import auditar
from app.modulos.parametros.reglas import Parametros
from app.modulos.puntos import reglas
from app.modulos.puntos.esquemas import TipoMovimiento as T
from app.modulos.puntos.modelos import MovimientoPuntos


def movimientos(sesion: Session, vecino_id: int) -> list[reglas.Mov]:
    filas = sesion.scalars(
        select(MovimientoPuntos).where(MovimientoPuntos.vecino_id == vecino_id)
    ).all()
    return [
        reglas.Mov(
            tipo=f.tipo,
            puntos=f.puntos,
            creado_en=f.creado_en,
            vence_en=f.vence_en,
            canje_id=f.canje_id,
            id=f.id,
        )
        for f in filas
    ]


def saldos(sesion: Session, vecino_id: int) -> reglas.Saldos:
    return reglas.saldos(movimientos(sesion, vecino_id))


def registrar(
    sesion: Session,
    vecino_id: int,
    tipo: T,
    puntos: int,
    momento: datetime,
    *,
    vence_en: datetime | None = None,
    boleta_id: int | None = None,
    canje_id: int | None = None,
    usuario_id: int | None = None,
    motivo: str | None = None,
) -> MovimientoPuntos:
    if tipo != T.AJUSTA and puntos <= 0:
        raise ValueError("Un movimiento de puntos debe ser positivo.")
    if tipo == T.AJUSTA and not (motivo or "").strip():
        raise ValueError("Todo ajuste de saldo necesita un motivo.")
    movimiento = MovimientoPuntos(
        vecino_id=vecino_id,
        tipo=tipo,
        puntos=puntos,
        vence_en=vence_en,
        boleta_id=boleta_id,
        canje_id=canje_id,
        usuario_id=usuario_id,
        motivo=motivo,
        creado_en=momento,
    )
    sesion.add(movimiento)
    sesion.flush()
    return movimiento


def ajustar(
    sesion: Session,
    vecino_id: int,
    puntos: int,
    motivo: str,
    ahora: datetime,
    p: Parametros,
    usuario_id: int | None,
) -> MovimientoPuntos:
    """Corrección del operador con motivo (A16). Un ajuste positivo crea puntos que vencen
    a P8 días (Anexo A.14); uno negativo puede dejar el saldo en deuda."""
    if puntos == 0:
        raise ValueError("El ajuste debe sumar o restar puntos.")
    movimiento = registrar(
        sesion,
        vecino_id,
        T.AJUSTA,
        puntos,
        ahora,
        vence_en=ahora + timedelta(days=p.P8.dias) if puntos > 0 else None,
        usuario_id=usuario_id,
        motivo=motivo.strip(),
    )
    auditar(
        sesion,
        "ajustar_saldo",
        "vecino",
        vecino_id,
        usuario_id,
        {"puntos": puntos, "motivo": motivo.strip()},
        ahora,
    )
    return movimiento


def historial(sesion: Session, vecino_id: int, limite: int) -> list[MovimientoPuntos]:
    return list(
        sesion.scalars(
            select(MovimientoPuntos)
            .where(MovimientoPuntos.vecino_id == vecino_id)
            .order_by(MovimientoPuntos.creado_en.desc(), MovimientoPuntos.id.desc())
            .limit(limite)
        )
    )


def por_vencer(
    sesion: Session, vecino_id: int, ahora: datetime, hasta: datetime
) -> list[tuple[datetime, int]]:
    return reglas.calcular_lotes(movimientos(sesion, vecino_id)).proximos(ahora, hasta)


def disponible_red(sesion: Session) -> int:
    """Saldo disponible sumado de todos los vecinos (indicador de puntos sin canjear)."""
    signo = case(
        (MovimientoPuntos.tipo.in_([T.GANA, T.LIBERA, T.AJUSTA]), MovimientoPuntos.puntos),
        (MovimientoPuntos.tipo.in_([T.RETIENE, T.VENCE]), -MovimientoPuntos.puntos),
        else_=0,
    )
    return sesion.scalar(select(func.coalesce(func.sum(signo), 0))) or 0


def vencer_vecino(sesion: Session, vecino_id: int, ahora: datetime) -> int:
    """Registra el vencimiento de los puntos disponibles cuyo plazo pasó. Idempotente."""
    por_vencer = reglas.calcular_lotes(movimientos(sesion, vecino_id)).por_vencer(ahora)
    if por_vencer:
        registrar(sesion, vecino_id, T.VENCE, por_vencer, ahora, motivo="Vencimiento (P8)")
    return por_vencer


def vencer_puntos(sesion: Session, ahora: datetime) -> dict[str, int]:
    """Tarea: vence los puntos de todos los vecinos con lotes vencidos."""
    candidatos = sesion.scalars(
        select(MovimientoPuntos.vecino_id)
        .where(MovimientoPuntos.vence_en.is_not(None), MovimientoPuntos.vence_en <= ahora)
        .distinct()
    ).all()
    vecinos = puntos = 0
    for vecino_id in candidatos:
        n = vencer_vecino(sesion, vecino_id, ahora)
        if n:
            vecinos += 1
            puntos += n
    return {"vecinos": vecinos, "puntos": puntos}
