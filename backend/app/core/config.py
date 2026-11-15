"""Configuración leída de variables de entorno (y de un archivo .env en desarrollo).

Aquí solo va configuración técnica. Los números de negocio (P1 a P20) viven en la
tabla de parámetros, nunca en este archivo.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ_REPO = Path(__file__).resolve().parents[3]
CLAVE_DESARROLLO = "solo-para-desarrollo-cambiar-en-produccion"


class Configuracion(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(RAIZ_REPO / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENTORNO: Literal["desarrollo", "produccion", "pruebas"] = "desarrollo"
    DATABASE_URL: str = f"sqlite:///{(RAIZ_REPO / 'backend' / 'red_vecina.db').as_posix()}"
    SECRET_KEY: str = CLAVE_DESARROLLO

    LECTOR_PROVEEDOR: Literal["manual", "gemini", "anthropic"] = "manual"
    GEMINI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None

    FRONTEND_DIST: Path = RAIZ_REPO / "frontend" / "dist"

    # Primer administrador y contraseñas iniciales de los comandos de carga (app/cli.py).
    ADMIN_EMAIL: str | None = None
    ADMIN_PASSWORD: SecretStr | None = None
    OPERADOR_PASSWORD: SecretStr | None = None
    COMERCIO_PASSWORD: SecretStr | None = None

    @field_validator("DATABASE_URL")
    @classmethod
    def normalizar_postgres(cls, valor: str) -> str:
        """Neon y Render entregan postgres:// o postgresql://; usamos el driver psycopg 3."""
        for prefijo in ("postgres://", "postgresql://"):
            if valor.startswith(prefijo):
                return "postgresql+psycopg://" + valor[len(prefijo) :]
        return valor

    @model_validator(mode="after")
    def exigir_claves_en_produccion(self) -> "Configuracion":
        if self.ENTORNO == "produccion":
            if self.SECRET_KEY == CLAVE_DESARROLLO:
                raise ValueError("En producción SECRET_KEY debe definirse con un valor propio.")
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError("En producción DATABASE_URL debe apuntar a Postgres.")
        if self.LECTOR_PROVEEDOR == "gemini" and not self.GEMINI_API_KEY:
            raise ValueError("LECTOR_PROVEEDOR=gemini requiere GEMINI_API_KEY.")
        if self.LECTOR_PROVEEDOR == "anthropic" and not self.ANTHROPIC_API_KEY:
            raise ValueError("LECTOR_PROVEEDOR=anthropic requiere ANTHROPIC_API_KEY.")
        return self

    @property
    def es_produccion(self) -> bool:
        return self.ENTORNO == "produccion"


@lru_cache
def obtener_configuracion() -> Configuracion:
    return Configuracion()
