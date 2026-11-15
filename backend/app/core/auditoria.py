"""Registro de auditoría: quién hizo qué, sobre qué y cuándo."""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC


class RegistroAuditoria(Base):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), index=True)
    accion: Mapped[str] = mapped_column(String(60))
    entidad: Mapped[str] = mapped_column(String(40))
    entidad_id: Mapped[int | None]
    detalle: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    creado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc, index=True)


def auditar(
    sesion: Session,
    accion: str,
    entidad: str,
    entidad_id: int | None = None,
    usuario_id: int | None = None,
    detalle: dict[str, Any] | None = None,
    ahora: datetime | None = None,
) -> None:
    sesion.add(
        RegistroAuditoria(
            usuario_id=usuario_id,
            accion=accion,
            entidad=entidad,
            entidad_id=entidad_id,
            detalle=detalle or {},
            creado_en=ahora or ahora_utc(),
        )
    )
