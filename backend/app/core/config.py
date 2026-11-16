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
    # Modelos de visión (sección 4 de construccion.md). Se cambian sin tocar el código.
    LECTOR_GEMINI_MODELO: str = "gemini-3.5-flash"
    LECTOR_ANTHROPIC_MODELO: str = "claude-opus-5-5"
    # Si el proveedor tarda más, la boleta queda para digitación manual.
    LECTOR_TIMEOUT_SEGUNDOS: float = 30
    # Bajo esta confianza (0 a 1) un campo leído se marca en ámbar para que el operador lo
    # mire. Es una calibración del lector, no una regla de negocio.
    LECTOR_CONFIANZA_MINIMA: float = 0.8

    FRONTEND_DIST: Path = RAIZ_REPO / "frontend" / "dist"

    # WhatsApp del equipo de Red Vecina, impreso en la tarjeta de la caja (sección 8).
    CONTACTO_WHATSAPP: str | None = None

    # Dirección pública del sitio (https://red-vecina.onrender.com). Con ella se arman el QR del
    # afiche y los enlaces que se mandan por WhatsApp, aunque se generen desde otro equipo.
    # Si falta, se usa RENDER_EXTERNAL_URL, que Render define solo en cada servicio.
    URL_PUBLICA: str | None = None
    RENDER_EXTERNAL_URL: str | None = None

    # Primer administrador y contraseñas iniciales de los comandos de carga (app/cli.py).
    ADMIN_EMAIL: str | None = None
    ADMIN_PASSWORD: SecretStr | None = None
    OPERADOR_PASSWORD: SecretStr | None = None
    COMERCIO_PASSWORD: SecretStr | None = None

    # Seguridad técnica (no son reglas de negocio): duración de la sesión y límites de
    # intentos fallidos por ventana de tiempo, para frenar la adivinación de claves,
    # enlaces de vecino y códigos de canje.
    SESION_HORAS: int = 24 * 14
    LOGIN_INTENTOS: int = 5
    LOGIN_VENTANA_SEGUNDOS: int = 15 * 60
    TOKEN_INTENTOS: int = 20
    TOKEN_VENTANA_SEGUNDOS: int = 10 * 60
    CODIGO_INTENTOS: int = 10
    CODIGO_VENTANA_SEGUNDOS: int = 10 * 60
    INSCRIPCION_INTENTOS: int = 10
    INSCRIPCION_VENTANA_SEGUNDOS: int = 60 * 60
    SUBIDAS_POR_HORA: int = 10
    BOLETA_MAX_BYTES: int = 3 * 1024 * 1024
    # Tope a cualquier cuerpo de petición: una foto más el resto del formulario.
    CUERPO_MAX_BYTES: int = 4 * 1024 * 1024
    # Espera máxima al conectar con Postgres: Neon tarda unos segundos en despertar.
    DB_TIMEOUT_SEGUNDOS: int = 15
    # Ejecutar las tareas del día con la primera petición (sección 5). Se apaga en pruebas.
    TAREAS_PEREZOSAS: bool = True

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
    def url_publica(self) -> str | None:
        url = self.URL_PUBLICA or self.RENDER_EXTERNAL_URL
        return url.rstrip("/") if url else None

    @property
    def es_produccion(self) -> bool:
        return self.ENTORNO == "produccion"


@lru_cache
def obtener_configuracion() -> Configuracion:
    return Configuracion()
