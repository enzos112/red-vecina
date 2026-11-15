"""Fechas: UTC en la base de datos, hora de Santiago para días calendario y semanas."""

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

ZONA_LOCAL = ZoneInfo("America/Santiago")


def ahora_utc() -> datetime:
    return datetime.now(UTC)


def a_utc(momento: datetime) -> datetime:
    if momento.tzinfo is None:
        raise ValueError("Las fechas deben tener zona horaria.")
    return momento.astimezone(UTC)


def a_local(momento: datetime) -> datetime:
    return a_utc(momento).astimezone(ZONA_LOCAL)


def dia_local(momento: datetime) -> date:
    """Día calendario en hora de Santiago."""
    return a_local(momento).date()


def inicio_dia_utc(dia: date) -> datetime:
    """Medianoche de Santiago de ese día, expresada en UTC."""
    return datetime.combine(dia, time.min, tzinfo=ZONA_LOCAL).astimezone(UTC)


def inicio_semana(dia: date, dia_inicio: int) -> date:
    """Primer día de la semana que contiene `dia`. dia_inicio: 0 = lunes … 6 = domingo."""
    return dia - timedelta(days=(dia.weekday() - dia_inicio) % 7)


def semana_de(momento: datetime, dia_inicio: int) -> date:
    return inicio_semana(dia_local(momento), dia_inicio)


def dias_locales_entre(desde: datetime, hasta: datetime) -> list[date]:
    """Días calendario de Santiago que toca el intervalo [desde, hasta]."""
    primero, ultimo = dia_local(desde), dia_local(hasta)
    return [primero + timedelta(days=i) for i in range((ultimo - primero).days + 1)]
