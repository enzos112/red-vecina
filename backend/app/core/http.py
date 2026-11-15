"""Middleware HTTP: encabezados de seguridad y tope al tamaño del cuerpo de las peticiones.

Son middleware ASGI puros (sin BaseHTTPMiddleware) para no romper las respuestas en
streaming ni las tareas en segundo plano.
"""

import json

from starlette.types import ASGIApp, Message, Receive, Scope, Send

# El frontend compilado no usa scripts en línea; los estilos en línea sí (gráficos y Radix).
CSP = "; ".join(
    [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ]
)


class EncabezadosSeguridad:
    """Agrega encabezados de seguridad a todas las respuestas. HSTS solo en producción."""

    def __init__(self, app: ASGIApp, hsts: bool) -> None:
        self.app = app
        fijos = {
            "x-content-type-options": "nosniff",
            "x-frame-options": "DENY",
            "referrer-policy": "strict-origin-when-cross-origin",
            "permissions-policy": "camera=(self), microphone=(), geolocation=()",
            "cross-origin-opener-policy": "same-origin",
            "content-security-policy": CSP,
        }
        if hsts:
            fijos["strict-transport-security"] = "max-age=31536000; includeSubDomains"
        self.encabezados = [(k.encode(), v.encode()) for k, v in fijos.items()]

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def enviar(mensaje: Message) -> None:
            if mensaje["type"] == "http.response.start":
                presentes = {k.lower() for k, _ in mensaje.get("headers", [])}
                extra = [(k, v) for k, v in self.encabezados if k not in presentes]
                mensaje["headers"] = list(mensaje.get("headers", [])) + extra
            await send(mensaje)

        await self.app(scope, receive, enviar)


class LimiteCuerpo:
    """Rechaza con 413 las peticiones cuyo cuerpo supera `max_bytes`.

    Mira Content-Length y además cuenta lo que llega, por si el cliente no lo declara.
    El tope por foto lo revisa cada ruta; esto evita que un cuerpo enorme llegue a disco.
    """

    MENSAJE = "El archivo es demasiado grande. Prueba con una foto más liviana."

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def _rechazar(self, send: Send) -> None:
        cuerpo = json.dumps({"detail": self.MENSAJE}, ensure_ascii=False).encode()
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json; charset=utf-8"),
                    (b"content-length", str(len(cuerpo)).encode()),
                ],
            }
        )
        await send({"type": "http.response.body", "body": cuerpo})

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        for clave, valor in scope.get("headers", []):
            if clave == b"content-length":
                try:
                    largo = int(valor)
                except ValueError:
                    largo = 0
                if largo > self.max_bytes:
                    await self._rechazar(send)
                    return

        recibido = 0
        respondio = False
        rechazada = False

        async def enviar(mensaje: Message) -> None:
            nonlocal respondio
            if rechazada:
                return  # ya respondimos 413; lo que intente la app se descarta
            if mensaje["type"] == "http.response.start":
                respondio = True
            await send(mensaje)

        async def recibir() -> Message:
            nonlocal recibido, rechazada
            if rechazada:
                return {"type": "http.disconnect"}
            mensaje = await receive()
            if mensaje["type"] == "http.request":
                recibido += len(mensaje.get("body", b""))
                if recibido > self.max_bytes and not respondio:
                    # Se responde aquí y la app ve al cliente desconectado: deja de leer.
                    await self._rechazar(send)
                    rechazada = True
                    return {"type": "http.disconnect"}
            return mensaje

        try:
            await self.app(scope, recibir, enviar)
        except Exception:
            if not rechazada:
                raise
