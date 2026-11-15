from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.seguridad import cifrar_contrasena
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
    if (rol == Rol.COMERCIO) != (comercio_id is not None):
        raise ValueError("Solo los usuarios de comercio van asociados a un comercio.")
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
