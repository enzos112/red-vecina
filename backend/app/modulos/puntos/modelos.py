from datetime import datetime

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC, columna_enum
from app.modulos.puntos.esquemas import TipoMovimiento


class MovimientoPuntos(Base):
    """Libro de movimientos. El saldo es la suma; nunca se edita un saldo a mano.

    `puntos` es siempre positivo salvo en AJUSTA, donde el signo indica la dirección.
    """

    __tablename__ = "movimientos_puntos"

    id: Mapped[int] = mapped_column(primary_key=True)
    vecino_id: Mapped[int] = mapped_column(ForeignKey("vecinos.id"), index=True)
    tipo: Mapped[TipoMovimiento] = mapped_column(columna_enum(TipoMovimiento))
    puntos: Mapped[int]
    vence_en: Mapped[datetime | None] = mapped_column(FechaHoraUTC)  # GANA y AJUSTA positivo
    boleta_id: Mapped[int | None] = mapped_column(ForeignKey("boletas.id"))
    canje_id: Mapped[int | None] = mapped_column(ForeignKey("canjes.id"))
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    motivo: Mapped[str | None] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc, index=True)
