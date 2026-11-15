"""Dependencias de FastAPI compartidas por las rutas de todos los módulos.

- `SesionDB`: una sesión por petición; confirma al terminar la ruta (antes de responder)
  y deshace si hubo error.
- `Ahora`: el reloj de la petición. Los servicios nunca leen el reloj por su cuenta.
- `Params`: los parámetros vigentes (P1 a P20 y umbrales).
- `requiere(...)`: exige sesión de usuario con alguno de los roles indicados.
- `ComercioActual`: el comercio del usuario con sesión; cada comercio ve solo lo suyo.
- `VecinoToken`: el vecino del enlace personal /t/<token>.
"""

import threading
from collections.abc import Iterator
from datetime import date, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import Configuracion
from app.core.limites import Limitador
from app.core.seguridad import firma_valida, leer_sesion
from app.core.tiempo import ahora_utc, dia_local
from app.modulos.comercios.modelos import Comercio
from app.modulos.cuentas.esquemas import Rol
from app.modulos.cuentas.modelos import Usuario
from app.modulos.parametros.reglas import Parametros
from app.modulos.vecinos.modelos import Vecino

NOMBRE_COOKIE = "rv_sesion"
ENLACE_INVALIDO = "Este enlace no es válido. Pide uno nuevo a Red Vecina."


def obtener_ahora() -> datetime:
    return ahora_utc()


Ahora = Annotated[datetime, Depends(obtener_ahora)]


def obtener_config(request: Request) -> Configuracion:
    return request.app.state.config


Config = Annotated[Configuracion, Depends(obtener_config)]


def sesion_db(request: Request) -> Iterator[Session]:
    sesion: Session = request.app.state.fabrica_sesiones()
    try:
        yield sesion
        sesion.commit()
    except BaseException:
        sesion.rollback()
        raise
    finally:
        sesion.close()


SesionDB = Annotated[Session, Depends(sesion_db, scope="function")]


def parametros_vigentes(sesion: SesionDB) -> Parametros:
    from app.modulos.parametros import servicio as parametros

    return parametros.cargar(sesion)


Params = Annotated[Parametros, Depends(parametros_vigentes)]


def ip(request: Request) -> str:
    return request.client.host if request.client else "desconocida"


def limitador(request: Request, nombre: str) -> Limitador:
    return request.app.state.limites[nombre]


# --- Tareas perezosas (sección 5): la primera petición del día corre lo pendiente ---

_candado_tareas = threading.Lock()


def tareas_del_dia(request: Request, ahora: Ahora) -> None:
    estado = request.app.state
    if not estado.config.TAREAS_PEREZOSAS:
        return
    hoy: date = dia_local(ahora)
    if estado.tareas_dia == hoy:
        return
    with _candado_tareas:
        if estado.tareas_dia == hoy:
            return
        from app.tareas import servicio as tareas

        sesion: Session = estado.fabrica_sesiones()
        try:
            tareas.ejecutar(sesion, ahora)
            sesion.commit()
            estado.tareas_dia = hoy
        except Exception:
            sesion.rollback()
            raise
        finally:
            sesion.close()


# --- Usuarios con contraseña (admin, operador, comercio) ---


def usuario_actual(request: Request, sesion: SesionDB, ahora: Ahora, config: Config) -> Usuario:
    no_autenticado = HTTPException(status.HTTP_401_UNAUTHORIZED, "Inicia sesión para continuar.")
    valor = request.cookies.get(NOMBRE_COOKIE)
    datos = leer_sesion(valor, ahora) if valor else None
    if datos is None:
        raise no_autenticado
    usuario_id, expira, firma = datos
    usuario = sesion.get(Usuario, usuario_id)
    if (
        usuario is None
        or not usuario.activo
        or not firma_valida(
            config.SECRET_KEY, usuario_id, expira, firma, usuario.contrasena_cifrada
        )
    ):
        raise no_autenticado
    return usuario


UsuarioActual = Annotated[Usuario, Depends(usuario_actual)]


def requiere(*roles: Rol):
    """Dependencia que exige alguno de los roles. Uso: Depends(requiere(Rol.ADMIN))."""

    def verificar(usuario: UsuarioActual) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para hacer esto.")
        return usuario

    return verificar


Equipo = Annotated[Usuario, Depends(requiere(Rol.ADMIN, Rol.OPERADOR))]
Admin = Annotated[Usuario, Depends(requiere(Rol.ADMIN))]
UsuarioComercio = Annotated[Usuario, Depends(requiere(Rol.COMERCIO))]


def comercio_actual(usuario: UsuarioComercio, sesion: SesionDB, ahora: Ahora) -> Comercio:
    """El comercio del usuario. Las rutas del comercio nunca reciben un comercio_id: así un
    comercio no puede pedir datos de otro.

    Un comercio que salió de la red conserva el portal mientras tenga códigos vigentes: la
    salida respeta los códigos ya emitidos (sección 5).
    """
    from app.modulos.canjes import servicio as canjes
    from app.modulos.comercios import servicio as comercios

    comercio = comercios.obtener(sesion, usuario.comercio_id) if usuario.comercio_id else None
    if comercio is None or (
        not comercios.en_red(comercio) and not canjes.tiene_activos(sesion, comercio.id, ahora)
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu comercio ya no está en la red.")
    return comercio


ComercioActual = Annotated[Comercio, Depends(comercio_actual)]


# --- Vecino con su enlace personal ---


def vecino_por_token(token: str, request: Request, sesion: SesionDB) -> Vecino:
    """Un token inválido y uno de una cuenta cerrada responden igual: no revela si existe."""
    from app.modulos.vecinos import servicio as vecinos

    limite = limitador(request, "token")
    limite.exigir(ip(request))
    vecino = vecinos.por_token(sesion, token)
    if vecino is None:
        limite.fallo(ip(request))
        raise HTTPException(status.HTTP_404_NOT_FOUND, ENLACE_INVALIDO)
    return vecino


VecinoToken = Annotated[Vecino, Depends(vecino_por_token)]
