from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC, columna_enum
from app.modulos.canjes.esquemas import EstadoCanje


class Canje(Base):
    __tablename__ = "canjes"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(6), unique=True)
    vecino_id: Mapped[int] = mapped_column(ForeignKey("vecinos.id"), index=True)
    comercio_id: Mapped[int] = mapped_column(ForeignKey("comercios.id"), index=True)
    beneficio_id: Mapped[int] = mapped_column(ForeignKey("beneficios.id"))
    # Copia de las condiciones al emitir: los cambios posteriores no afectan al código.
    nivel: Mapped[int]
    puntos: Mapped[int]
    valor_pesos: Mapped[int]
    compra_minima: Mapped[int]
    estado: Mapped[EstadoCanje] = mapped_column(
        columna_enum(EstadoCanje), default=EstadoCanje.ACTIVO, index=True
    )
    emitido_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)
    vence_en: Mapped[datetime] = mapped_column(FechaHoraUTC, index=True)
    semana_cupo: Mapped[date] = mapped_column(Date)  # semana cuyo cupo reservó (Anexo A.6)
    usado_en: Mapped[datetime | None] = mapped_column(FechaHoraUTC)
    monto_ticket: Mapped[int | None]
    validado_por: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    ingreso_diferido: Mapped[bool] = mapped_column(default=False)  # sección 8, sin internet
    vencido_en: Mapped[datetime | None] = mapped_column(FechaHoraUTC)
    # False si el operador lo marca "local cerrado": no cuenta para P19 (sección 8).
    cuenta_para_p19: Mapped[bool] = mapped_column(default=True)
    nota: Mapped[str | None] = mapped_column(Text)
    es_demo: Mapped[bool] = mapped_column(default=False)
