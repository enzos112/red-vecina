import enum
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EstadoComercio(enum.StrEnum):
    ACTIVO = "activo"
    SUSPENDIDO = "suspendido"
    RETIRADO = "retirado"


class TipoBeneficio(enum.StrEnum):
    DESCUENTO = "descuento"
    PRODUCTO = "producto"


class EstadoBeneficio(enum.StrEnum):
    PENDIENTE = "pendiente"  # propuesto por el comercio, espera aprobación
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"
    REEMPLAZADO = "reemplazado"  # otro conjunto lo reemplazó antes de regir


# --- API ---


class NivelSalida(BaseModel):
    """Un nivel de P9 con su descuento (P2) y su compra mínima tope (P10)."""

    numero: int
    nombre: str
    puntos: int
    valor_pesos: int
    compra_minima_tope: int
    obligatorio: bool = False  # P9: el nivel que todo comercio debe ofrecer


class BeneficioSalida(BaseModel):
    id: int
    nivel: int
    nombre_nivel: str
    puntos: int
    valor_pesos: int
    tipo: TipoBeneficio
    texto: str
    restriccion: str | None
    dias_permitidos: list[int] | None
    compra_minima: int
    estado: EstadoBeneficio
    vigente_desde: datetime | None
    comentario_revision: str | None


class ComercioPublico(BaseModel):
    nombre: str
    slug: str
    rubro: str
    direccion: str
    destacado: BeneficioSalida | None


class SolicitudNueva(BaseModel):
    comercio: str = Field(min_length=1, max_length=120)
    rubro: str = Field(min_length=1, max_length=60)
    contacto: str = Field(min_length=1, max_length=120)
    telefono: str = Field(min_length=8, max_length=20)
    email: str | None = Field(default=None, max_length=200)
    direccion: str | None = Field(default=None, max_length=200)
    mensaje: str | None = Field(default=None, max_length=2000)


class SolicitudRecibida(BaseModel):
    id: int
    mensaje: str


class SolicitudSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    comercio: str
    rubro: str
    contacto: str
    telefono: str
    email: str | None
    direccion: str | None
    mensaje: str | None
    creado_en: datetime


class BeneficioNuevo(BaseModel):
    nivel: int
    tipo: TipoBeneficio
    texto: str = Field(min_length=1, max_length=200)
    restriccion: str | None = Field(default=None, max_length=200)
    dias_permitidos: list[int] | None = None  # 0 = lunes … 6 = domingo; None = todos
    compra_minima: int


class PropuestaBeneficios(BaseModel):
    beneficios: list[BeneficioNuevo]


class BeneficiosComercio(BaseModel):
    niveles: list[NivelSalida]
    dias_minimos: int  # U9: días a la semana en que debe valer una restricción
    rige_si_pides_hoy: datetime  # U23: desde cuándo regiría una propuesta enviada ahora
    vigentes: list[BeneficioSalida]
    proximos: list[BeneficioSalida]  # aprobados que todavía no rigen
    pendientes: list[BeneficioSalida]  # esperan aprobación
    rechazados: list[BeneficioSalida]  # la última propuesta, si fue rechazada


class PropuestaPendiente(BaseModel):
    comercio_id: int
    comercio: str
    solicitado_en: datetime
    beneficios: list[BeneficioSalida]
    vigentes: list[BeneficioSalida]


class Revision(BaseModel):
    comentario: str = Field(min_length=1, max_length=1000)


class ComercioAdmin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    rubro: str
    rut: str
    direccion: str
    slug: str
    estado: EstadoComercio
    alta_en: datetime
    es_demo: bool


class ComercioNuevo(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    rubro: str = Field(min_length=1, max_length=60)
    rut: str = Field(min_length=9, max_length=12)
    direccion: str = Field(min_length=1, max_length=200)


class ComercioCambio(BaseModel):
    estado: EstadoComercio
