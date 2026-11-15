from datetime import datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC


class Parametro(Base):
    __tablename__ = "parametros"

    codigo: Mapped[str] = mapped_column(String(5), primary_key=True)
    grupo: Mapped[str] = mapped_column(String(10))  # red | umbral
    orden: Mapped[int]
    nombre: Mapped[str] = mapped_column(String(80))
    descripcion: Mapped[str] = mapped_column(Text)
    valor: Mapped[dict[str, Any]] = mapped_column(JSON)
    actualizado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)
    actualizado_por: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))


class CambioParametro(Base):
    """Historial. Los cambios rigen hacia adelante y nunca recalculan lo ya otorgado."""

    __tablename__ = "parametros_cambios"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(ForeignKey("parametros.codigo"), index=True)
    valor_anterior: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    valor_nuevo: Mapped[dict[str, Any]] = mapped_column(JSON)
    motivo: Mapped[str] = mapped_column(Text)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    cambiado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)
