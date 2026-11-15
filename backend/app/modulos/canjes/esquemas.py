import enum
import re
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class EstadoCanje(enum.StrEnum):
    ACTIVO = "activo"
    USADO = "usado"
    VENCIDO = "vencido"


class ResultadoCaja(enum.StrEnum):
    VALIDO = "valido"
    NO_EXISTE = "no_existe"
    OTRO_LOCAL = "otro_local"
    VENCIDO = "vencido"
    USADO = "usado"
    DIA_NO_PERMITIDO = "dia_no_permitido"
    BAJO_MINIMO = "bajo_minimo"


# --- API ---


class CodigoSalida(BaseModel):
    """Un código del vecino: lo que muestra en la caja."""

    codigo: str
    comercio_id: int
    comercio: str
    texto: str
    nivel: int
    puntos: int
    valor_pesos: int
    compra_minima: int
    emitido_en: datetime
    vence_en: datetime


class MotivoSalida(BaseModel):
    clave: str
    mensaje: str


class OpcionSalida(BaseModel):
    comercio_id: int
    comercio: str
    beneficio_id: int
    nivel: int
    puntos: int
    valor_pesos: int
    compra_minima: int
    texto: str
    nunca_compro: bool


class OpcionesSalida(BaseModel):
    puede: bool
    motivos: list[MotivoSalida]
    destacadas: list[OpcionSalida]
    todas: list[OpcionSalida]
    agotados: list[str]  # "Cupo de la semana agotado, vuelve el lunes"
    proxima_liberacion: date | None
    mensaje_sin_opciones: str | None
    codigo_activo: CodigoSalida | None


class PedirCodigo(BaseModel):
    beneficio_id: int


def _limpiar_codigo(valor: str) -> str:
    codigo = re.sub(r"[\s-]", "", valor)
    if not codigo.isdigit():
        raise ValueError("El código tiene solo números.")
    return codigo


class CodigoEnCaja(BaseModel):
    codigo: str = Field(min_length=1, max_length=20, description="Acepta espacios: 482 913.")

    _limpio = field_validator("codigo")(_limpiar_codigo)


class UsoEnCaja(CodigoEnCaja):
    monto_compra: int | None = Field(
        default=None, ge=0, description="Total de la compra antes del descuento (opcional)."
    )


class IngresoDiferidoNuevo(UsoEnCaja):
    """Sección 8: código ya aplicado sin internet, ingresado ese mismo día."""

    aplicado_en: datetime | None = Field(
        default=None, description="Cuándo se aplicó en caja. Si falta, ahora."
    )


class IngresoDiferidoSalida(BaseModel):
    id: int
    comercio_id: int
    comercio: str
    codigo: str
    monto_compra: int | None
    aplicado_en: datetime
    registrado_en: datetime
    resultado: ResultadoCaja
    mensaje: str
    descontado: bool  # True si el código era válido y se descontó del cupo
    valor_pesos: int | None
    revisado_en: datetime | None
    nota_revision: str | None


class RevisionDiferido(BaseModel):
    nota: str | None = Field(default=None, max_length=500)


class ResultadoCajaSalida(BaseModel):
    resultado: ResultadoCaja
    mensaje: str
    se_puede_usar: bool
    usado: bool = False  # True solo cuando el código quedó quemado en esta petición
    # Detalle del beneficio, solo si el código es de este local.
    valor_pesos: int | None = None
    compra_minima: int | None = None
    texto: str | None = None
    vence_en: datetime | None = None


class CanjeSalida(BaseModel):
    id: int
    codigo: str
    vecino_id: int
    vecino: str
    comercio_id: int
    comercio: str
    nivel: int
    puntos: int
    valor_pesos: int
    compra_minima: int
    estado: EstadoCanje
    emitido_en: datetime
    vence_en: datetime
    usado_en: datetime | None
    monto_ticket: int | None
    vencido_en: datetime | None
    cuenta_para_p19: bool
