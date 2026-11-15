from datetime import datetime

from sqlalchemy import LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC


class Archivo(Base):
    """Archivos (fotos de boletas) guardados en la base: el disco de Render se borra."""

    __tablename__ = "archivos"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo_mime: Mapped[str] = mapped_column(String(60))
    nombre: Mapped[str] = mapped_column(String(200))
    tamano: Mapped[int]
    datos: Mapped[bytes] = mapped_column(LargeBinary)
    creado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)
