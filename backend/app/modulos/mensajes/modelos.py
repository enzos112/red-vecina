from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC


class PlantillaMensaje(Base):
    __tablename__ = "plantillas_mensajes"

    id: Mapped[int] = mapped_column(primary_key=True)
    clave: Mapped[str] = mapped_column(String(40), unique=True)
    momento: Mapped[str] = mapped_column(String(80))
    texto: Mapped[str] = mapped_column(Text)
    actualizado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)
    actualizado_por: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
