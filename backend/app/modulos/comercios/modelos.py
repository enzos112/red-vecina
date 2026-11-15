from datetime import datetime

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.tiempo import ahora_utc
from app.core.tipos import FechaHoraUTC, columna_enum
from app.modulos.comercios.esquemas import EstadoBeneficio, EstadoComercio, TipoBeneficio


class Comercio(Base):
    __tablename__ = "comercios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    rubro: Mapped[str] = mapped_column(String(60))
    rut: Mapped[str] = mapped_column(String(12), unique=True)  # formato 12345678-9
    direccion: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    estado: Mapped[EstadoComercio] = mapped_column(
        columna_enum(EstadoComercio), default=EstadoComercio.ACTIVO
    )
    # Fecha de alta en la red: base de la proyección de ventas de las primeras semanas.
    alta_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)
    es_demo: Mapped[bool] = mapped_column(default=False)
    creado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)


class SolicitudComercio(Base):
    """Formulario "Quiero unirme al piloto" de la landing para dueños."""

    __tablename__ = "solicitudes_comercio"

    id: Mapped[int] = mapped_column(primary_key=True)
    comercio: Mapped[str] = mapped_column(String(120))
    rubro: Mapped[str] = mapped_column(String(60))
    contacto: Mapped[str] = mapped_column(String(120))
    telefono: Mapped[str] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(200))
    direccion: Mapped[str | None] = mapped_column(String(200))
    mensaje: Mapped[str | None] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc, index=True)


class Beneficio(Base):
    __tablename__ = "beneficios"

    id: Mapped[int] = mapped_column(primary_key=True)
    comercio_id: Mapped[int] = mapped_column(ForeignKey("comercios.id"), index=True)
    nivel: Mapped[int]  # 1 = primer nivel de P9
    tipo: Mapped[TipoBeneficio] = mapped_column(columna_enum(TipoBeneficio))
    texto: Mapped[str] = mapped_column(String(200))
    restriccion: Mapped[str | None] = mapped_column(String(200))  # texto visible (B6)
    # Días permitidos, 0 = lunes … 6 = domingo. None = todos los días.
    dias_permitidos: Mapped[list[int] | None] = mapped_column(JSON)
    compra_minima: Mapped[int]  # pesos; tope: descuento × P10 (B4)
    estado: Mapped[EstadoBeneficio] = mapped_column(
        columna_enum(EstadoBeneficio), default=EstadoBeneficio.PENDIENTE
    )
    vigente_desde: Mapped[datetime | None] = mapped_column(FechaHoraUTC)
    comentario_revision: Mapped[str | None] = mapped_column(Text)
    revisado_por: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    revisado_en: Mapped[datetime | None] = mapped_column(FechaHoraUTC)
    creado_en: Mapped[datetime] = mapped_column(FechaHoraUTC, default=ahora_utc)
