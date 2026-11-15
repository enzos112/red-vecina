"""Saldo y vencimiento de puntos a partir del libro de movimientos.

Los puntos forman lotes (uno por cada GANA o AJUSTA positivo) con su fecha de
vencimiento. Todo consumo toma primero los lotes que vencen antes (P8: se gastan primero
los más antiguos). Un saldo negativo (A16) queda como deuda que pagan los puntos siguientes.
"""

from dataclasses import dataclass, field
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.modulos.puntos.esquemas import TipoMovimiento as T

_FIN = datetime.max.replace(tzinfo=None)


class Mov(BaseModel):
    """Vista pura de un movimiento del libro."""

    model_config = ConfigDict(frozen=True)

    tipo: T
    puntos: int
    creado_en: datetime
    vence_en: datetime | None = None
    canje_id: int | None = None
    id: int = 0


class Saldos(BaseModel):
    model_config = ConfigDict(frozen=True)

    disponible: int
    retenido: int


def saldos(movs: list[Mov]) -> Saldos:
    """El saldo es la suma de los movimientos."""
    disponible = retenido = 0
    for m in movs:
        match m.tipo:
            case T.GANA:
                disponible += m.puntos
            case T.RETIENE:
                disponible -= m.puntos
                retenido += m.puntos
            case T.LIBERA:
                disponible += m.puntos
                retenido -= m.puntos
            case T.CANJEA:
                retenido -= m.puntos
            case T.VENCE:
                disponible -= m.puntos
            case T.AJUSTA:
                disponible += m.puntos
    return Saldos(disponible=disponible, retenido=retenido)


@dataclass
class Lote:
    vence_en: datetime | None
    disponibles: int
    retenidos: dict[int, int] = field(default_factory=dict)  # canje_id → puntos

    def clave(self) -> datetime:
        return self.vence_en.replace(tzinfo=None) if self.vence_en else _FIN


@dataclass
class EstadoLotes:
    lotes: list[Lote]
    deuda: int

    @property
    def disponible(self) -> int:
        return sum(lote.disponibles for lote in self.lotes) - self.deuda

    def por_vencer(self, ahora: datetime) -> int:
        """Puntos disponibles cuyo lote ya venció (los retenidos no vencen: Anexo A.11)."""
        return sum(
            lote.disponibles for lote in self.lotes if lote.vence_en and lote.vence_en <= ahora
        )

    def proximos(self, ahora: datetime, hasta: datetime) -> list[tuple[datetime, int]]:
        """Puntos disponibles que vencen en (ahora, hasta], agrupados por fecha."""
        resultado: dict[datetime, int] = {}
        for lote in self.lotes:
            if lote.vence_en and ahora < lote.vence_en <= hasta and lote.disponibles:
                resultado[lote.vence_en] = resultado.get(lote.vence_en, 0) + lote.disponibles
        return sorted(resultado.items())


def _tomar(lotes: list[Lote], puntos: int) -> tuple[list[tuple[Lote, int]], int]:
    """Toma puntos disponibles de los lotes que vencen antes. Devuelve (tomado, faltante)."""
    tomado: list[tuple[Lote, int]] = []
    for lote in lotes:
        if puntos == 0:
            break
        n = min(lote.disponibles, puntos)
        if n:
            lote.disponibles -= n
            puntos -= n
            tomado.append((lote, n))
    return tomado, puntos


def calcular_lotes(movs: list[Mov]) -> EstadoLotes:
    lotes: list[Lote] = []
    deuda = 0
    for m in sorted(movs, key=lambda m: (m.creado_en, m.id)):
        if m.tipo == T.GANA or (m.tipo == T.AJUSTA and m.puntos > 0):
            n = m.puntos
            pago = min(deuda, n)
            deuda -= pago
            n -= pago
            if n:
                lotes.append(Lote(vence_en=m.vence_en, disponibles=n))
                lotes.sort(key=Lote.clave)
        elif m.tipo == T.RETIENE:
            assert m.canje_id is not None
            tomado, faltante = _tomar(lotes, m.puntos)
            if faltante:
                raise ValueError("Se retuvieron más puntos de los disponibles.")
            for lote, n in tomado:
                lote.retenidos[m.canje_id] = lote.retenidos.get(m.canje_id, 0) + n
        elif m.tipo in (T.LIBERA, T.CANJEA):
            assert m.canje_id is not None
            pendiente = m.puntos
            for lote in lotes:
                n = min(lote.retenidos.get(m.canje_id, 0), pendiente)
                if n:
                    lote.retenidos[m.canje_id] -= n
                    pendiente -= n
                    if m.tipo == T.LIBERA:
                        lote.disponibles += n
            if pendiente:
                raise ValueError("Se liberaron o canjearon puntos que no estaban retenidos.")
        elif m.tipo == T.VENCE or m.tipo == T.AJUSTA:  # AJUSTA negativo
            _, faltante = _tomar(lotes, abs(m.puntos))
            if m.tipo == T.VENCE and faltante:
                raise ValueError("Vencieron más puntos de los disponibles.")
            deuda += faltante
        lotes = [lote for lote in lotes if lote.disponibles or any(lote.retenidos.values())]
    return EstadoLotes(lotes=lotes, deuda=deuda)
