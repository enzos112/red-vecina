"""Punto de entrada: crea la app, monta la API bajo /api y sirve el frontend."""

from fastapi import APIRouter, FastAPI

from app.core.config import Configuracion, obtener_configuracion
from app.core.frontend import montar_frontend


def crear_app(config: Configuracion | None = None) -> FastAPI:
    config = config or obtener_configuracion()
    app = FastAPI(
        title="Red Vecina",
        version="0.1.0",
        docs_url="/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )

    api = APIRouter(prefix="/api")

    @api.get("/salud", tags=["salud"])
    def salud() -> dict[str, str]:
        # No consulta la base a propósito: el monitor que mantiene despierto el servicio
        # no debe gastar las horas de cómputo de Neon.
        return {"estado": "ok", "entorno": config.ENTORNO}

    app.include_router(api)
    # Va al final: su ruta comodín no debe tapar a la API.
    montar_frontend(app, config.FRONTEND_DIST)
    return app


app = crear_app()
