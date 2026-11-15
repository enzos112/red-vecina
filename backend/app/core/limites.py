"""Límite de intentos fallidos por ventana de tiempo, en memoria.

Basta para el MVP: un solo proceso en Render. Con varios procesos cada uno llevaría su
propia cuenta y habría que moverlo a la base o a Redis.
"""

import math
import threading
import time
from collections import deque
from collections.abc import Callable

from fastapi import HTTPException, status


class Limitador:
    def __init__(
        self, intentos: int, ventana_segundos: int, reloj: Callable[[], float] = time.monotonic
    ):
        self.intentos = intentos
        self.ventana = ventana_segundos
        self.reloj = reloj
        self._fallos: dict[str, deque[float]] = {}
        self._candado = threading.Lock()

    def _vigentes(self, clave: str) -> deque[float]:
        fallos = self._fallos.setdefault(clave, deque())
        limite = self.reloj() - self.ventana
        while fallos and fallos[0] <= limite:
            fallos.popleft()
        return fallos

    def espera(self, *claves: str) -> int:
        """Segundos que faltan para poder intentar de nuevo; 0 si no hay bloqueo."""
        with self._candado:
            peor = 0.0
            for clave in claves:
                fallos = self._vigentes(clave)
                if len(fallos) >= self.intentos:
                    peor = max(peor, fallos[0] + self.ventana - self.reloj())
            return math.ceil(peor)

    def exigir(self, *claves: str) -> None:
        """Lanza 429 con un mensaje en español si alguna clave está bloqueada."""
        segundos = self.espera(*claves)
        if segundos:
            minutos = max(1, math.ceil(segundos / 60))
            unidad = "minuto" if minutos == 1 else "minutos"
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos. Espera {minutos} {unidad} y vuelve a intentar.",
                headers={"Retry-After": str(segundos)},
            )

    def fallo(self, *claves: str) -> None:
        with self._candado:
            ahora = self.reloj()
            for clave in claves:
                self._vigentes(clave).append(ahora)

    def limpiar(self, *claves: str) -> None:
        with self._candado:
            for clave in claves:
                self._fallos.pop(clave, None)
