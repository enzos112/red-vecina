from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auditoria import auditar
from app.core.seguridad import cifrar_contrasena, verificar_contrasena
from app.modulos.comercios import servicio as comercios
from app.modulos.cuentas.esquemas import Rol
from app.modulos.cuentas.modelos import Usuario

LARGO_MINIMO_CONTRASENA = 10  # política de seguridad, no regla de negocio


def crear_usuario(
    sesion: Session,
    email: str,
    nombre: str,
    contrasena: str,
    rol: Rol,
    comercio_id: int | None = None,
    es_demo: bool = False,
) -> Usuario:
    email = email.strip().lower()
    if len(contrasena) < LARGO_MINIMO_CONTRASENA:
        raise ValueError(f"La contraseña debe tener al menos {LARGO_MINIMO_CONTRASENA} caracteres.")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise ValueError("Escribe un correo válido.")
    if (rol == Rol.COMERCIO) != (comercio_id is not None):
        raise ValueError("Solo los usuarios de comercio van asociados a un comercio.")
    if comercio_id is not None and comercios.obtener(sesion, comercio_id) is None:
        raise ValueError("No encontramos ese comercio.")
    if sesion.scalar(select(Usuario.id).where(Usuario.email == email)):
        raise ValueError(f"Ya existe un usuario con el correo {email}.")
    usuario = Usuario(
        email=email,
        nombre=nombre,
        contrasena_cifrada=cifrar_contrasena(contrasena),
        rol=rol,
        comercio_id=comercio_id,
        es_demo=es_demo,
    )
    sesion.add(usuario)
    sesion.flush()
    return usuario


def autenticar(sesion: Session, email: str, contrasena: str) -> Usuario | None:
    """El usuario si el correo y la contraseña calzan y la cuenta está activa.

    Verifica la contraseña aunque el correo no exista, para no revelar qué correos tienen
    cuenta por el tiempo de respuesta.
    """
    usuario = sesion.scalar(select(Usuario).where(Usuario.email == email.strip().lower()))
    ok = verificar_contrasena(contrasena, usuario.contrasena_cifrada if usuario else None)
    if not ok or usuario is None or not usuario.activo:
        return None
    return usuario


def listar(sesion: Session) -> list[Usuario]:
    return list(sesion.scalars(select(Usuario).order_by(Usuario.rol, Usuario.email)))


def obtener(sesion: Session, usuario_id: int) -> Usuario | None:
    return sesion.get(Usuario, usuario_id)


def cambiar_activo(
    sesion: Session, usuario_id: int, activo: bool, ahora: datetime, admin_id: int
) -> Usuario:
    usuario = obtener(sesion, usuario_id)
    if usuario is None:
        raise ValueError("No encontramos ese usuario.")
    if usuario.id == admin_id and not activo:
        raise ValueError("No puedes desactivar tu propia cuenta.")
    usuario.activo = activo
    auditar(sesion, "activar_usuario", "usuario", usuario_id, admin_id, {"activo": activo}, ahora)
    sesion.flush()
    return usuario
