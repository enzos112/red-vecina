"""Tipos de columna compartidos. Sin tipos exclusivos de Postgres."""

import enum
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum
from sqlalchemy.types import TypeDecorator


class FechaHoraUTC(TypeDecorator[datetime]):
    """Guarda fechas en UTC sin zona (igual en SQLite y Postgres) y las devuelve con UTC."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, valor: datetime | None, dialect) -> datetime | None:
        if valor is None:
            return None
        if valor.tzinfo is None:
            raise ValueError("Las fechas deben tener zona horaria.")
        return valor.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, valor: datetime | None, dialect) -> datetime | None:
        if valor is None:
            return None
        return valor.replace(tzinfo=UTC)


def columna_enum(enumeracion: type[enum.StrEnum]) -> Enum:
    """Enum guardado como texto con CHECK: igual en SQLite y Postgres."""
    return Enum(
        enumeracion,
        native_enum=False,
        length=20,
        values_callable=lambda e: [m.value for m in e],
        validate_strings=True,
    )
