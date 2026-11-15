"""Errores de la API: siempre {"detail": "<mensaje en español listo para mostrar>"}.

- Los servicios lanzan ValueError con un mensaje para el usuario: se responde 400.
- Los datos mal formados (validación de FastAPI) se responden 422 con el primer problema.
- Lo inesperado se registra y se responde 500 con un mensaje genérico.
"""

import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.validacion import mensaje_validacion

log = logging.getLogger("red_vecina")

MENSAJE_INTERNO = "Algo falló de nuestro lado. Intenta de nuevo en un momento."

# Mensajes para los códigos que Starlette responde con su frase en inglés.
MENSAJES_HTTP = {
    401: "Inicia sesión para continuar.",
    403: "No tienes permiso para hacer esto.",
    404: "No encontramos lo que buscas.",
    405: "Esta acción no está permitida.",
    413: "El archivo es demasiado grande.",
    429: "Demasiados intentos. Espera un momento y vuelve a intentar.",
}


def instalar(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http(_: Request, error: StarletteHTTPException) -> JSONResponse:
        detalle = error.detail
        if not isinstance(detalle, str) or detalle == HTTPStatus(error.status_code).phrase:
            detalle = MENSAJES_HTTP.get(error.status_code, MENSAJE_INTERNO)
        return JSONResponse(
            {"detail": detalle}, status_code=error.status_code, headers=error.headers
        )

    @app.exception_handler(RequestValidationError)
    async def validacion(_: Request, error: RequestValidationError) -> JSONResponse:
        return JSONResponse({"detail": mensaje_validacion(list(error.errors()))}, status_code=422)

    @app.exception_handler(ValueError)
    async def regla(request: Request, error: ValueError) -> JSONResponse:
        if isinstance(error, ValidationError):
            # Un modelo interno mal armado no es culpa del usuario.
            log.exception("Validación interna en %s", request.url.path, exc_info=error)
            return JSONResponse({"detail": MENSAJE_INTERNO}, status_code=500)
        return JSONResponse({"detail": str(error)}, status_code=400)

    @app.exception_handler(Exception)
    async def inesperado(request: Request, error: Exception) -> JSONResponse:
        log.exception("Error inesperado en %s", request.url.path, exc_info=error)
        return JSONResponse({"detail": MENSAJE_INTERNO}, status_code=500)
