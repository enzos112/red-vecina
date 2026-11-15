from datetime import datetime
from typing import Any

from sqlalchemy import JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC


class EjecucionTarea(Base):
    """Una fila por tarea y periodo: impide correr dos veces la misma tarea del mismo día."""

    __tablename__ = "tareas_ejecuciones"
    __table_args__ = (UniqueConstraint("tarea", "periodo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tarea: Mapped[str] = mapped_column(String(40))
    periodo: Mapped[str] = mapped_column(String(20))  # día local, p. ej. 2026-11-16
    resultado: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    forzada: Mapped[bool] = mapped_column(default=False)
    ejecutada_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)
