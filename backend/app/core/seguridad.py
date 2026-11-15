"""Contraseñas cifradas y tokens aleatorios."""

import secrets

from pwdlib import PasswordHash

_hasher = PasswordHash.recommended()


def cifrar_contrasena(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def verificar_contrasena(contrasena: str, cifrada: str) -> bool:
    return _hasher.verify(contrasena, cifrada)


def token_vecino() -> str:
    """Token largo y aleatorio para el enlace personal /t/<token>."""
    return secrets.token_urlsafe(32)
