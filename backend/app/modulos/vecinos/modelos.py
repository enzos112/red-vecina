from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC, columna_enum
from app.modulos.vecinos.esquemas import EstadoVecino


class Vecino(Base):
    __tablename__ = "vecinos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    telefono: Mapped[str] = mapped_column(String(20), unique=True)  # +569XXXXXXXX (A1)
    token: Mapped[str] = mapped_column(String(64), unique=True)
    comercio_origen_id: Mapped[int | None] = mapped_column(ForeignKey("comercios.id"), index=True)
    consentimiento_en: Mapped[datetime] = mapped_column(FechaHoraUTC)
    estado: Mapped[EstadoVecino] = mapped_column(
        columna_enum(EstadoVecino), default=EstadoVecino.ACTIVO
    )
    es_demo: Mapped[bool] = mapped_column(default=False)
    creado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)


class VecinoEmpleo(Base):
    """A3: dueños y empleados no suman puntos en el local donde trabajan."""

    __tablename__ = "vecinos_empleos"
    __table_args__ = (UniqueConstraint("vecino_id", "comercio_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    vecino_id: Mapped[int] = mapped_column(ForeignKey("vecinos.id"), index=True)
    comercio_id: Mapped[int] = mapped_column(ForeignKey("comercios.id"))
