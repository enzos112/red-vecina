"""Punto de entrada: crea la app, monta la API bajo /api y sirve el frontend."""

from fastapi import APIRouter, Depends, FastAPI
from fastapi.routing import APIRoute
from sqlalchemy.orm import Session, sessionmaker

from app.core import errores
from app.core.config import Configuracion, obtener_configuracion
from app.core.dependencias import tareas_del_dia
from app.core.frontend import montar_frontend
from app.core.limites import Limitador
from app.modulos.boletas.rutas import router as boletas
from app.modulos.canjes.rutas import router as canjes
from app.modulos.comercios.rutas import router as comercios
from app.modulos.cuentas.rutas import router as cuentas
from app.modulos.equilibrio.rutas import router as cupos
from app.modulos.mensajes.rutas import router as mensajes
from app.modulos.parametros.rutas import router as parametros
from app.modulos.reportes.rutas import router as reportes
from app.modulos.vecinos.rutas import router as vecinos
from app.servicios.lector import crear_lector
from app.tareas.rutas import router as tareas

# Orden de los módulos en /docs.
ETIQUETAS = [
    {"name": "Acceso y usuarios", "description": "Login con cookie y usuarios del equipo."},
    {"name": "Comercios", "description": "Red pública, beneficios y alta de comercios."},
    {"name": "Vecinos", "description": "Inscripción, tarjeta personal y búsqueda."},
    {"name": "Boletas", "description": "Subida de fotos y revisión del operador."},
    {"name": "Canjes", "description": "Opciones, códigos y validador en la caja."},
    {"name": "Cupos", "description": "Cupo semanal del comercio (algoritmo de equilibrio)."},
    {"name": "Reportes", "description": "Indicadores de la sección 10."},
    {"name": "Parámetros", "description": "P1 a P20 y umbrales, con historial."},
    {"name": "Tareas", "description": "Tareas del día, a pedido del administrador."},
    {"name": "Salud", "description": "Monitor del servicio. No consulta la base."},
]

MODULOS = [
    cuentas,
    comercios,
    vecinos,
    boletas,
    canjes,
    cupos,
    reportes,
    parametros,
    mensajes,
    tareas,
]


def id_operacion(ruta: APIRoute) -> str:
    """ "<modulo>__<funcion>": el cliente del frontend agrupa por módulo (api.boletas.aprobar)."""
    partes = ruta.endpoint.__module__.split(".")
    grupo = partes[-2] if partes[-1] == "rutas" else "general"
    return f"{grupo}__{ruta.name}"


def crear_limites(config: Configuracion) -> dict[str, Limitador]:
    return {
        "login": Limitador(config.LOGIN_INTENTOS, config.LOGIN_VENTANA_SEGUNDOS),
        "token": Limitador(config.TOKEN_INTENTOS, config.TOKEN_VENTANA_SEGUNDOS),
        "codigo": Limitador(config.CODIGO_INTENTOS, config.CODIGO_VENTANA_SEGUNDOS),
        "inscripcion": Limitador(config.INSCRIPCION_INTENTOS, config.INSCRIPCION_VENTANA_SEGUNDOS),
        "subidas": Limitador(config.SUBIDAS_POR_HORA, 60 * 60),
    }


def crear_app(
    config: Configuracion | None = None,
    fabrica_sesiones: sessionmaker[Session] | None = None,
) -> FastAPI:
    config = config or obtener_configuracion()
    if fabrica_sesiones is None:
        from app.core.db import SesionLocal

        fabrica_sesiones = SesionLocal

    app = FastAPI(
        title="Red Vecina",
        version="0.2.0",
        summary="API del programa de puntos compartido entre comercios de barrio.",
        docs_url="/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
        openapi_tags=ETIQUETAS,
        generate_unique_id_function=id_operacion,
        separate_input_output_schemas=False,
    )
    app.state.config = config
    app.state.fabrica_sesiones = fabrica_sesiones
    app.state.limites = crear_limites(config)
    app.state.tareas_dia = None
    # Proveedor elegido por LECTOR_PROVEEDOR; las pruebas lo reemplazan por uno simulado.
    app.state.lector = crear_lector(config)
    errores.instalar(app)

    api = APIRouter(prefix="/api")

    @api.get("/salud", tags=["Salud"], summary="Estado del servicio")
    def salud() -> dict[str, str]:
        # No consulta la base a propósito: el monitor que mantiene despierto el servicio
        # no debe gastar las horas de cómputo de Neon.
        return {"estado": "ok", "entorno": config.ENTORNO}

    for modulo in MODULOS:
        api.include_router(modulo, dependencies=[Depends(tareas_del_dia)])

    app.include_router(api)
    # Va al final: su ruta comodín no debe tapar a la API.
    montar_frontend(app, config.FRONTEND_DIST)
    return app


app = crear_app()
