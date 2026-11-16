"""Proveedores del lector: manual (no lee), Gemini y Claude (Anthropic).

Las claves llegan desde la configuración (variables de entorno), nunca escritas aquí.
Formato de cada API revisado en su documentación oficial (noviembre de 2026):
- Gemini: `client.models.generate_content` con la imagen como `Part.from_bytes`,
  `response_json_schema` y razonamiento bajo; el texto llega en `respuesta.text`.
- Claude: Messages API con un bloque `image` en base64 y `output_config.format` de tipo
  `json_schema`; respaldo del servidor ante un rechazo (`fallbacks: "default"`).
"""

import base64

from app.servicios.lector.base import INSTRUCCIONES, ErrorLector, Lectura, esquema_json, interpretar


class LectorManual:
    """Sin lectura automática: el operador digita los campos."""

    nombre = "manual"

    def leer(self, imagen: bytes, tipo: str) -> Lectura | None:
        return None


class LectorGemini:
    """Gemini con `generate_content`: la imagen como parte en bytes y la salida forzada al
    esquema JSON. Razonamiento bajo: es una extracción simple y así responde en segundos."""

    nombre = "gemini"

    def __init__(self, clave: str, modelo: str, timeout_segundos: float):
        from google import genai
        from google.genai import types

        self.modelo = modelo
        # HttpOptions.timeout va en milisegundos.
        self.cliente = genai.Client(
            api_key=clave, http_options=types.HttpOptions(timeout=int(timeout_segundos * 1000))
        )
        self.ajustes = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=esquema_json(),
            thinking_config=types.ThinkingConfig(thinking_level="low"),
        )

    def leer(self, imagen: bytes, tipo: str) -> Lectura | None:
        from google.genai import errors, types

        try:
            respuesta = self.cliente.models.generate_content(
                model=self.modelo,
                contents=[types.Part.from_bytes(data=imagen, mime_type=tipo), INSTRUCCIONES],
                config=self.ajustes,
            )
        except errors.ClientError as error:  # 4xx: clave, modelo o pedido inválido
            raise ErrorLector(f"Gemini rechazó la lectura ({error.code}).") from error
        except errors.ServerError as error:  # 5xx
            raise ErrorLector(f"Gemini no respondió bien ({error.code}).") from error
        except errors.APIError as error:
            raise ErrorLector(f"Error de Gemini: {error}") from error
        except Exception as error:  # red, tiempo de espera
            raise ErrorLector(f"No se pudo conectar con Gemini: {error}") from error
        texto = respuesta.text
        if not texto:
            raise ErrorLector("Gemini no devolvió texto.")
        return interpretar(texto)


class LectorClaude:
    nombre = "anthropic"

    def __init__(self, clave: str, modelo: str, timeout_segundos: float):
        import anthropic

        self.modelo = modelo
        # Sin reintentos: si falla, la boleta queda para digitación y se puede volver a leer.
        self.cliente = anthropic.Anthropic(api_key=clave, timeout=timeout_segundos, max_retries=0)

    def leer(self, imagen: bytes, tipo: str) -> Lectura | None:
        import anthropic

        try:
            respuesta = self.cliente.beta.messages.create(
                model=self.modelo,
                max_tokens=4000,
                # Extracción simple: poco razonamiento para responder rápido.
                output_config={
                    "effort": "low",
                    "format": {"type": "json_schema", "schema": esquema_json()},
                },
                # Si el modelo declina, el servidor reintenta con otro modelo en la misma llamada.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": tipo,
                                    "data": base64.standard_b64encode(imagen).decode("ascii"),
                                },
                            },
                            {"type": "text", "text": INSTRUCCIONES},
                        ],
                    }
                ],
            )
        except anthropic.AuthenticationError as error:
            raise ErrorLector("La clave de Anthropic no es válida.") from error
        except anthropic.BadRequestError as error:
            raise ErrorLector(f"Anthropic rechazó la lectura: {error.message}") from error
        except anthropic.RateLimitError as error:
            raise ErrorLector("Anthropic limitó las lecturas por ahora.") from error
        except anthropic.APITimeoutError as error:
            raise ErrorLector("Anthropic tardó demasiado.") from error
        except anthropic.APIStatusError as error:
            raise ErrorLector(f"Anthropic respondió {error.status_code}.") from error
        except anthropic.APIConnectionError as error:
            raise ErrorLector("No se pudo conectar con Anthropic.") from error
        if respuesta.stop_reason == "refusal":
            raise ErrorLector("El modelo no quiso leer esta imagen.")
        if respuesta.stop_reason == "max_tokens":
            raise ErrorLector("La lectura quedó cortada.")
        texto = next((b.text for b in respuesta.content if b.type == "text"), None)
        if not texto:
            raise ErrorLector("Anthropic no devolvió texto.")
        return interpretar(texto)
