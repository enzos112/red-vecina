"""Importa todos los modelos para que queden registrados en Base.metadata (Alembic, pruebas)."""

from app.core.auditoria import RegistroAuditoria
from app.modulos.boletas.modelos import Boleta
from app.modulos.canjes.modelos import Canje
from app.modulos.comercios.modelos import Beneficio, Comercio, SolicitudComercio
from app.modulos.cuentas.modelos import Usuario
from app.modulos.equilibrio.modelos import CupoSemanal
from app.modulos.mensajes.modelos import PlantillaMensaje
from app.modulos.parametros.modelos import CambioParametro, Parametro
from app.modulos.puntos.modelos import MovimientoPuntos
from app.modulos.vecinos.modelos import Vecino, VecinoEmpleo
from app.servicios.archivos.modelos import Archivo
from app.tareas.modelos import EjecucionTarea

__all__ = [
    "Archivo",
    "Beneficio",
    "Boleta",
    "CambioParametro",
    "Canje",
    "Comercio",
    "CupoSemanal",
    "EjecucionTarea",
    "MovimientoPuntos",
    "Parametro",
    "PlantillaMensaje",
    "RegistroAuditoria",
    "SolicitudComercio",
    "Usuario",
    "Vecino",
    "VecinoEmpleo",
]
