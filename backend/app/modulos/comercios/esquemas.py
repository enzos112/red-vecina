import enum
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EstadoComercio(enum.StrEnum):
    ACTIVO = "activo"
    SUSPENDIDO = "suspendido"
    RETIRADO = "retirado"


class EstadoSolicitud(enum.StrEnum):
    NUEVA = "nueva"
    CONTACTADA = "contactada"
    INCORPORADA = "incorporada"  # ya es comercio de la red
    DESCARTADA = "descartada"


class TipoSancion(enum.StrEnum):
    """Sección 9: advertencia escrita, suspensión de beneficios o salida de la red."""

    ADVERTENCIA = "advertencia"
    SUSPENSION = "suspension"
    SALIDA = "salida"


class CausaSancion(enum.StrEnum):
    NEGO_CODIGO = "nego_codigo"  # se negó a respetar un código válido (sección 8, U20)
    FRAUDE = "fraude"  # compras inventadas, boletas de clientes, etc. (sección 9)
    OTRA = "otra"


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
    estado: EstadoSolicitud
    nota: str | None
    comercio_id: int | None
    atendida_en: datetime | None


class SolicitudCambio(BaseModel):
    estado: EstadoSolicitud
    nota: str | None = Field(default=None, max_length=2000)
    comercio_id: int | None = None  # al incorporarla, el comercio que se creó


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


class Aprobacion(BaseModel):
    comentario: str | None = Field(default=None, max_length=1000)


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
    suspendido_hasta: datetime | None = None
    es_demo: bool


class ComercioNuevo(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    rubro: str = Field(min_length=1, max_length=60)
    rut: str = Field(min_length=9, max_length=12)
    direccion: str = Field(min_length=1, max_length=200)


class ComercioCambio(BaseModel):
    """Edición del comercio. El slug no cambia: es la dirección del QR ya impreso."""

    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    rubro: str | None = Field(default=None, min_length=1, max_length=60)
    rut: str | None = Field(default=None, min_length=9, max_length=12)
    direccion: str | None = Field(default=None, min_length=1, max_length=200)
    estado: EstadoComercio | None = None


class SancionNueva(BaseModel):
    tipo: TipoSancion
    causa: CausaSancion
    motivo: str = Field(min_length=1, max_length=1000)
    evidencia: str = Field(min_length=1, max_length=2000)


class SancionSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: TipoSancion
    causa: CausaSancion
    motivo: str
    evidencia: str
    hasta: datetime | None
    decidida_por: int | None
    decidida_en: datetime


class SugerenciaSancion(BaseModel):
    tipo: TipoSancion
    razon: str
    semanas_suspension: int  # U21


class UsuarioDeComercio(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    nombre: str
    activo: bool
    creado_en: datetime


class ComercioDetalle(BaseModel):
    comercio: ComercioAdmin
    usuarios: list[UsuarioDeComercio]
    vigentes: list[BeneficioSalida]
    proximos: list[BeneficioSalida]
    pendientes: list[BeneficioSalida]
    sanciones: list[SancionSalida]
    sugerencias: dict[CausaSancion, SugerenciaSancion]  # qué tocaría según la sección 9
