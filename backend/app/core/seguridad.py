"""Contraseñas cifradas, tokens aleatorios y la cookie firmada de sesión."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from pwdlib import PasswordHash

_hasher = PasswordHash.recommended()
# Hash de relleno: si el correo no existe se verifica igual, para no revelar por el tiempo
# de respuesta qué correos tienen cuenta.
_HASH_RELLENO = _hasher.hash(secrets.token_urlsafe(16))


def cifrar_contrasena(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def verificar_contrasena(contrasena: str, cifrada: str | None) -> bool:
    if cifrada is None:
        _hasher.verify(contrasena, _HASH_RELLENO)
        return False
    return _hasher.verify(contrasena, cifrada)


def token_vecino() -> str:
    """Token largo y aleatorio para el enlace personal /t/<token>."""
    return secrets.token_urlsafe(32)


# --- Sesión en cookie ---
#
# Valor: "<usuario_id>.<expira (epoch)>.<firma>". La firma usa SECRET_KEY y un trozo del
# hash de la contraseña: al cambiar la contraseña, las sesiones anteriores dejan de valer.


def _firma(clave: str, usuario_id: int, expira: int, sello: str) -> str:
    mensaje = f"{usuario_id}.{expira}.{sello}".encode()
    return hmac.new(clave.encode(), mensaje, hashlib.sha256).hexdigest()


def sello_contrasena(cifrada: str) -> str:
    return hashlib.sha256(cifrada.encode()).hexdigest()[:16]


def firmar_sesion(clave: str, usuario_id: int, cifrada: str, ahora: datetime, horas: int) -> str:
    expira = int((ahora + timedelta(hours=horas)).timestamp())
    return f"{usuario_id}.{expira}.{_firma(clave, usuario_id, expira, sello_contrasena(cifrada))}"


def leer_sesion(valor: str, ahora: datetime) -> tuple[int, int, str] | None:
    """Separa la cookie en (usuario_id, expira, firma) si tiene forma válida y no expiró."""
    partes = valor.split(".")
    if len(partes) != 3 or not partes[0].isdigit() or not partes[1].isdigit():
        return None
    usuario_id, expira = int(partes[0]), int(partes[1])
    if expira < ahora.timestamp():
        return None
    return usuario_id, expira, partes[2]


def firma_valida(clave: str, usuario_id: int, expira: int, firma: str, cifrada: str) -> bool:
    esperada = _firma(clave, usuario_id, expira, sello_contrasena(cifrada))
    return hmac.compare_digest(esperada, firma)
