"""Mensajes en español para los errores de validación de Pydantic. Sin dependencias web."""

MENSAJES_VALIDACION = {
    "missing": "es obligatorio",
    "extra_forbidden": "no corresponde",
    "int_parsing": "debe ser un número entero",
    "int_type": "debe ser un número entero",
    "int_from_float": "debe ser un número entero",
    "float_parsing": "debe ser un número",
    "decimal_parsing": "debe ser un número",
    "bool_parsing": "debe ser sí o no",
    "string_type": "debe ser un texto",
    "string_too_short": "es demasiado corto",
    "string_too_long": "es demasiado largo",
    "greater_than": "debe ser mayor",
    "greater_than_equal": "es demasiado bajo",
    "less_than": "es demasiado alto",
    "less_than_equal": "es demasiado alto",
    "datetime_parsing": "no es una fecha válida",
    "datetime_from_date_parsing": "no es una fecha válida",
    "timezone_aware": "debe incluir la zona horaria",
    "enum": "no es una opción válida",
    "literal_error": "no es una opción válida",
    "json_invalid": "no es un JSON válido",
    "model_attributes_type": "tiene un formato inválido",
    "model_type": "tiene un formato inválido",
    "dict_type": "tiene un formato inválido",
    "list_type": "debe ser una lista",
    "tuple_type": "debe ser una lista",
}

_UBICACIONES = ("body", "query", "path", "header", "cookie")


def _campo(loc: tuple) -> str:
    partes = [str(p) for p in loc if p not in _UBICACIONES]
    return ".".join(partes) or "dato"


def mensaje_validacion(errores: list) -> str:
    """El primer problema, en una frase: "Revisa los datos: el campo X es obligatorio."."""
    if not errores:
        return "Revisa los datos enviados."
    primero = errores[0]
    tipo = primero.get("type", "")
    if tipo == "value_error":
        # Validadores propios: el mensaje ya viene en español ("Value error, <mensaje>").
        texto = str(primero.get("msg", "")).removeprefix("Value error, ")
        return texto or "Revisa los datos enviados."
    problema = MENSAJES_VALIDACION.get(tipo, "no es válido")
    return f"Revisa los datos: el campo {_campo(tuple(primero.get('loc', ())))} {problema}."
