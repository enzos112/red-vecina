from fastapi import APIRouter, HTTPException, Request, Response, status

from app.core.auditoria import auditar
from app.core.dependencias import (
    NOMBRE_COOKIE,
    Admin,
    Ahora,
    Config,
    SesionDB,
    UsuarioActual,
    ip,
    limitador,
)
from app.core.seguridad import firmar_sesion
from app.modulos.comercios import servicio as comercios
from app.modulos.cuentas import servicio
from app.modulos.cuentas.esquemas import (
    ComercioDeUsuario,
    Login,
    MiContrasena,
    UsuarioCambio,
    UsuarioNuevo,
    UsuarioSalida,
    Yo,
)
from app.modulos.cuentas.modelos import Usuario

router = APIRouter(tags=["Acceso y usuarios"])


def _yo(sesion, usuario: Usuario) -> Yo:
    comercio = comercios.obtener(sesion, usuario.comercio_id) if usuario.comercio_id else None
    return Yo(
        id=usuario.id,
        email=usuario.email,
        nombre=usuario.nombre,
        rol=usuario.rol,
        comercio=ComercioDeUsuario.model_validate(comercio) if comercio else None,
    )


def _poner_sesion(response: Response, usuario: Usuario, ahora, config) -> None:
    response.set_cookie(
        NOMBRE_COOKIE,
        firmar_sesion(
            config.SECRET_KEY, usuario.id, usuario.contrasena_cifrada, ahora, config.SESION_HORAS
        ),
        max_age=config.SESION_HORAS * 3600,
        httponly=True,
        samesite="lax",
        secure=config.es_produccion,
        path="/api",
    )


@router.post("/acceso/login", summary="Iniciar sesión (admin, operador o comercio)")
def login(
    datos: Login,
    request: Request,
    response: Response,
    sesion: SesionDB,
    ahora: Ahora,
    config: Config,
) -> Yo:
    limite = limitador(request, "login")
    claves = (f"ip:{ip(request)}", f"email:{datos.email.strip().lower()}")
    limite.exigir(*claves)
    usuario = servicio.autenticar(sesion, datos.email, datos.contrasena)
    if usuario is None:
        limite.fallo(*claves)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    limite.limpiar(claves[1])
    _poner_sesion(response, usuario, ahora, config)
    return _yo(sesion, usuario)


@router.post("/acceso/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Cerrar sesión")
def logout(response: Response) -> None:
    response.delete_cookie(NOMBRE_COOKIE, path="/api")


@router.post(
    "/acceso/contrasena",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cambiar mi contraseña (pide la actual; las otras sesiones se cierran)",
)
def cambiar_mi_contrasena(
    datos: MiContrasena,
    usuario: UsuarioActual,
    request: Request,
    response: Response,
    sesion: SesionDB,
    ahora: Ahora,
    config: Config,
) -> None:
    limite = limitador(request, "login")
    clave = f"contrasena:{usuario.id}"
    limite.exigir(clave)
    try:
        servicio.cambiar_mi_contrasena(sesion, usuario, datos.actual, datos.nueva, ahora)
    except ValueError:
        limite.fallo(clave)
        raise
    limite.limpiar(clave)
    # La sesión actual sigue abierta con una firma nueva; las demás quedan cerradas.
    _poner_sesion(response, usuario, ahora, config)


@router.get("/acceso/yo", summary="Quién soy")
def yo(usuario: UsuarioActual, sesion: SesionDB) -> Yo:
    return _yo(sesion, usuario)


@router.get("/admin/usuarios", summary="Usuarios del equipo y de los comercios")
def usuarios(_: Admin, sesion: SesionDB) -> list[UsuarioSalida]:
    return [UsuarioSalida.model_validate(u) for u in servicio.listar(sesion)]


@router.post("/admin/usuarios", status_code=status.HTTP_201_CREATED, summary="Crear un usuario")
def crear_usuario(
    datos: UsuarioNuevo, admin: Admin, sesion: SesionDB, ahora: Ahora
) -> UsuarioSalida:
    usuario = servicio.crear_usuario(
        sesion, datos.email, datos.nombre, datos.contrasena, datos.rol, datos.comercio_id
    )
    auditar(sesion, "crear_usuario", "usuario", usuario.id, admin.id, {"rol": datos.rol}, ahora)
    return UsuarioSalida.model_validate(usuario)


@router.patch(
    "/admin/usuarios/{usuario_id}",
    summary="Editar nombre o contraseña, activar o desactivar un usuario",
)
def cambiar_usuario(
    usuario_id: int, datos: UsuarioCambio, admin: Admin, sesion: SesionDB, ahora: Ahora
) -> UsuarioSalida:
    usuario = servicio.editar(
        sesion,
        usuario_id,
        nombre=datos.nombre,
        contrasena=datos.contrasena,
        ahora=ahora,
        admin_id=admin.id,
    )
    if datos.activo is not None and datos.activo != usuario.activo:
        usuario = servicio.cambiar_activo(sesion, usuario_id, datos.activo, ahora, admin.id)
    return UsuarioSalida.model_validate(usuario)
