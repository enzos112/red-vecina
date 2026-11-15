from datetime import datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC, columna_enum
from app.modulos.boletas.esquemas import EstadoBoleta, OrigenBoleta


class Boleta(Base):
    __tablename__ = "boletas"
    __table_args__ = (Index("ix_boletas_comercio_folio", "comercio_id", "folio"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    vecino_id: Mapped[int] = mapped_column(ForeignKey("vecinos.id"), index=True)
    comercio_id: Mapped[int | None] = mapped_column(ForeignKey("comercios.id"), index=True)
    archivo_id: Mapped[int | None] = mapped_column(ForeignKey("archivos.id"))
    origen: Mapped[OrigenBoleta] = mapped_column(columna_enum(OrigenBoleta))
    lectura: Mapped[dict[str, Any] | None] = mapped_column(JSON)  # salida del lector
    controles: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    rut_emisor: Mapped[str | None] = mapped_column(String(12))
    folio: Mapped[str | None] = mapped_column(String(40))
    fecha_compra: Mapped[datetime | None] = mapped_column(FechaHoraUTC, index=True)
    monto_total: Mapped[int | None]  # pesos pagados (A7: ya descontado el canje)
    monto_valido: Mapped[int | None]  # sin productos excluidos (A12, A13, A15)
    puntos: Mapped[int | None]
    estado: Mapped[EstadoBoleta] = mapped_column(
        columna_enum(EstadoBoleta), default=EstadoBoleta.PENDIENTE, index=True
    )
    motivo: Mapped[str | None] = mapped_column(Text)
    revisor_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    revisada_en: Mapped[datetime | None] = mapped_column(FechaHoraUTC)
    canje_id: Mapped[int | None] = mapped_column(ForeignKey("canjes.id"))
    recibida_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)
    es_demo: Mapped[bool] = mapped_column(default=False)
