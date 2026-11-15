from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC


class CupoSemanal(Base):
    """Cupo de canje de un comercio en una semana (sección 6.1 y Anexo A.4 a A.6)."""

    __tablename__ = "cupos_semanales"
    __table_args__ = (UniqueConstraint("comercio_id", "semana"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    comercio_id: Mapped[int] = mapped_column(ForeignKey("comercios.id"), index=True)
    semana: Mapped[date] = mapped_column(Date)  # primer día de la semana (P17)
    base: Mapped[int]
    extra: Mapped[int] = mapped_column(default=0)
    arrastre: Mapped[int] = mapped_column(default=0)
    reservado: Mapped[int] = mapped_column(default=0)
    usado: Mapped[int] = mapped_column(default=0)
    # Datos con que se calculó la base, para explicarla y auditarla.
    ventas_ventana: Mapped[int]  # V proyectada a la ventana de P15 (0 si quedó en el piso)
    dias_historia: Mapped[int]
    en_piso: Mapped[bool]
    # Momento en que lo consumido (usado + reservado) llegó al porcentaje de U1.
    umbral_alto_en: Mapped[datetime | None] = mapped_column(FechaHoraUTC)
    calculado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)

    @property
    def total(self) -> int:
        return self.base + self.extra + self.arrastre

    @property
    def libre(self) -> int:
        return self.total - self.reservado - self.usado
