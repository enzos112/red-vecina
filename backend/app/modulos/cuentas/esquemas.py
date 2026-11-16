import enum
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Rol(enum.StrEnum):
    ADMIN = "admin"
    OPERADOR = "operador"
    COMERCIO = "comercio"


# --- API ---


class Login(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    contrasena: str = Field(min_length=1, max_length=200)


class ComercioDeUsuario(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    slug: str
    estado: str = "activo"  # activo | suspendido | retirado
    suspendido_hasta: datetime | None = None


class Yo(BaseModel):
    id: int
    email: str
    nombre: str
    rol: Rol
    comercio: ComercioDeUsuario | None = None


class UsuarioSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    nombre: str
    rol: Rol
    comercio_id: int | None
    activo: bool
    creado_en: datetime


class UsuarioNuevo(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    nombre: str = Field(min_length=1, max_length=120)
    contrasena: str = Field(min_length=1, max_length=200)
    rol: Rol
    comercio_id: int | None = None


class UsuarioCambio(BaseModel):
    activo: bool | None = None
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    contrasena: str | None = Field(default=None, min_length=1, max_length=200)  # nueva


class MiContrasena(BaseModel):
    actual: str = Field(min_length=1, max_length=200)
    nueva: str = Field(min_length=1, max_length=200)
