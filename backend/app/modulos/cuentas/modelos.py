from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC, columna_enum
from app.modulos.cuentas.esquemas import Rol


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(200), unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    contrasena_cifrada: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Rol] = mapped_column(columna_enum(Rol))
    comercio_id: Mapped[int | None] = mapped_column(ForeignKey("comercios.id"), index=True)
    activo: Mapped[bool] = mapped_column(default=True)
    es_demo: Mapped[bool] = mapped_column(default=False)
    creado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)
