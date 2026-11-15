import enum
from datetime import datetime

from pydantic import BaseModel, Field

from app.modulos.boletas.esquemas import BoletaSalida
from app.modulos.canjes.esquemas import CanjeSalida, CodigoSalida
from app.modulos.puntos.esquemas import MovimientoSalida, SaldoSalida, VencimientoSalida


class EstadoVecino(enum.StrEnum):
    ACTIVO = "activo"
    SUSPENDIDO = "suspendido"
    CERRADO = "cerrado"


# --- API ---


class Inscripcion(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    telefono: str = Field(min_length=8, max_length=20)
    comercio: str | None = Field(
        default=None, max_length=80, description="Slug del comercio cuyo QR escaneó (A2)."
    )
    acepta_condiciones: bool = Field(description="Aceptó las condiciones y el uso de datos (A1).")


class Inscrito(BaseModel):
    nombre: str
    token: str
    enlace: str  # ruta de la tarjeta: /t/<token>


class PendientesSalida(BaseModel):
    boletas: int  # boletas enviadas que esperan revisión (A8)
    puntos: int  # puntos ya calculados de esas boletas; las recién subidas aún no tienen


class GuardarEnWhatsapp(BaseModel):
    """Para que el vecino se mande su enlace a su propio chat de WhatsApp."""

    numero: str = Field(description="Su celular en dígitos, para wa.me.")
    mensaje: str = Field(
        description="Plantilla de bienvenida armada. {enlace} lo completa el navegador, "
        "que conoce la dirección pública de la tarjeta."
    )


class ProximoNivel(BaseModel):
    nombre: str
    puntos: int
    valor_pesos: int
    faltan: int


class Tarjeta(BaseModel):
    nombre: str
    comercio_origen: str | None
    estado: EstadoVecino
    saldo: SaldoSalida
    pendientes: PendientesSalida
    por_vencer: list[VencimientoSalida]  # en los próximos días de aviso (U16)
    proximo_nivel: ProximoNivel | None
    codigo_activo: CodigoSalida | None
    boletas: list[BoletaSalida]
    canjes: list[CanjeSalida]
    movimientos: list[MovimientoSalida]
    whatsapp: GuardarEnWhatsapp


class VecinoResumen(BaseModel):
    id: int
    nombre: str
    telefono: str
    estado: EstadoVecino
    comercio_origen_id: int | None
    comercio_origen: str | None
    creado_en: datetime
    es_demo: bool


class VecinoDetalle(VecinoResumen):
    enlace: str
    consentimiento_en: datetime
    saldo: SaldoSalida
    por_vencer: list[VencimientoSalida]
    movimientos: list[MovimientoSalida]
    boletas: list[BoletaSalida]
    canjes: list[CanjeSalida]
    whatsapp: GuardarEnWhatsapp  # para reenviarle su enlace


class EnlaceNuevo(BaseModel):
    enlace: str
