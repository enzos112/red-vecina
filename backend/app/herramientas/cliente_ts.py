"""Genera el cliente tipado del frontend (frontend/src/lib/api-generada.ts) desde el OpenAPI.

Por cada esquema produce un tipo de TypeScript y por cada ruta una función, agrupadas por
módulo: `api.boletas.aprobar(boletaId, cuerpo)`. Una prueba compara el archivo del
repositorio con lo que genera este módulo, así el frontend no se desincroniza de la API.

Uso: python -m app.cli cliente-ts
"""

import re
from pathlib import Path
from typing import Any

from app.core.config import RAIZ_REPO

DESTINO = RAIZ_REPO / "frontend" / "src" / "lib" / "api-generada.ts"
OMITIR = {"HTTPValidationError", "ValidationError"}

ENCABEZADO = """\
// Archivo generado por `python -m app.cli cliente-ts` desde el OpenAPI del backend.
// No lo edites a mano: cambia las rutas o los esquemas y vuelve a generarlo.
"""


def camel(nombre: str) -> str:
    primera, *resto = nombre.split("_")
    return primera + "".join(p[:1].upper() + p[1:] for p in resto)


def nombre_tipo(ref: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]", "", ref.rsplit("/", 1)[-1])


def tipo(esquema: dict[str, Any], sangria: str = "") -> str:
    if "$ref" in esquema:
        return nombre_tipo(esquema["$ref"])
    if "anyOf" in esquema or "oneOf" in esquema:
        opciones = [tipo(e, sangria) for e in esquema.get("anyOf", esquema.get("oneOf"))]
        return " | ".join(dict.fromkeys(opciones))
    if "enum" in esquema:
        return " | ".join(f"'{v}'" if isinstance(v, str) else str(v) for v in esquema["enum"])
    if "const" in esquema:
        v = esquema["const"]
        return f"'{v}'" if isinstance(v, str) else str(v)
    t = esquema.get("type")
    if isinstance(t, list):
        return " | ".join(tipo({**esquema, "type": x}, sangria) for x in t)
    match t:
        case "string":
            return "string"
        case "integer" | "number":
            return "number"
        case "boolean":
            return "boolean"
        case "null":
            return "null"
        case "array":
            interno = tipo(esquema.get("items", {}), sangria)
            return f"({interno})[]" if "|" in interno else f"{interno}[]"
        case "object":
            return objeto(esquema, sangria)
    return "unknown"


def objeto(esquema: dict[str, Any], sangria: str = "") -> str:
    propiedades: dict[str, Any] = esquema.get("properties", {})
    if not propiedades:
        extra = esquema.get("additionalProperties")
        valor = tipo(extra, sangria) if isinstance(extra, dict) and extra else "unknown"
        return f"Record<string, {valor}>"
    requeridos = set(esquema.get("required", []))
    adentro = sangria + "  "
    lineas = ["{"]
    for nombre, prop in propiedades.items():
        if prop.get("description"):
            lineas.append(f"{adentro}/** {prop['description']} */")
        opcional = "" if nombre in requeridos else "?"
        lineas.append(f"{adentro}{nombre}{opcional}: {tipo(prop, adentro)}")
    lineas.append(sangria + "}")
    return "\n".join(lineas)


def _contenido_json(cuerpo: dict[str, Any]) -> dict[str, Any] | None:
    return cuerpo.get("content", {}).get("application/json", {}).get("schema")


def _respuesta(operacion: dict[str, Any]) -> tuple[str, bool]:
    """(tipo de la respuesta, es_json). Las respuestas que no son JSON se exponen como URL."""
    for codigo in ("200", "201", "204"):
        r = operacion.get("responses", {}).get(codigo)
        if r is None:
            continue
        if codigo == "204":
            return "void", True
        esquema = _contenido_json(r)
        if esquema is not None:
            return tipo(esquema, "    "), True
        return "string", False
    return "unknown", True


def funcion(metodo: str, ruta: str, operacion: dict[str, Any]) -> tuple[str, str, str]:
    """(grupo, nombre, código TS) de una operación."""
    grupo, nombre = operacion["operationId"].split("__", 1)
    parametros = operacion.get("parameters", [])
    de_ruta = [p for p in parametros if p["in"] == "path"]
    de_consulta = [p for p in parametros if p["in"] == "query"]
    argumentos: list[str] = [f"{camel(p['name'])}: {tipo(p['schema'])}" for p in de_ruta]
    opciones: list[str] = []

    cuerpo = operacion.get("requestBody")
    if cuerpo:
        contenido = cuerpo["content"]
        if "multipart/form-data" in contenido:
            argumentos.append("formulario: FormData")
            opciones.append("form: formulario")
        else:
            argumentos.append(f"cuerpo: {tipo(contenido['application/json']['schema'], '    ')}")
            opciones.append("json: cuerpo")
    if de_consulta:
        campos = "; ".join(
            f"{p['name']}{'' if p.get('required') else '?'}: {tipo(p['schema'])}"
            for p in de_consulta
        )
        opcional = "" if any(p.get("required") for p in de_consulta) else "?"
        argumentos.append(f"consulta{opcional}: {{ {campos} }}")
        opciones.append("consulta")

    plantilla = ruta.removeprefix("/api")
    for p in de_ruta:
        plantilla = plantilla.replace(
            "{" + p["name"] + "}", "${encodeURIComponent(String(" + camel(p["name"]) + "))}"
        )
    respuesta, es_json = _respuesta(operacion)
    comentario = f"  /** {operacion['summary']} */\n" if operacion.get("summary") else ""
    if not es_json:
        enlace = f"`/api{plantilla}`"
        if de_consulta:
            enlace = f"conConsulta({enlace}, consulta)"
        codigo = (
            f"{comentario}  {camel(nombre)}: ({', '.join(argumentos)}): string =>\n    {enlace},"
        )
    else:
        extra = f", {{ {', '.join(opciones)} }}" if opciones else ""
        codigo = (
            f"{comentario}  {camel(nombre)}: ({', '.join(argumentos)}) =>\n"
            f"    pedir<{respuesta}>('{metodo.upper()}', `{plantilla}`{extra}),"
        )
    return grupo, camel(nombre), codigo


def generar(esquema: dict[str, Any]) -> str:
    partes = [ENCABEZADO]
    partes.append(
        "export type Pedir = <T>(\n"
        "  metodo: string,\n"
        "  ruta: string,\n"
        "  opciones?: { json?: unknown; form?: FormData; consulta?: Record<string, unknown> },\n"
        ") => Promise<T>\n"
    )
    partes.append(
        "/** Agrega la consulta a una ruta (enlaces de descarga). Omite los valores vacíos. */\n"
        "export function conConsulta(ruta: string, consulta?: Record<string, unknown>): string {\n"
        "  const params = new URLSearchParams()\n"
        "  for (const [clave, valor] of Object.entries(consulta ?? {})) {\n"
        "    if (valor === null || valor === undefined || valor === '') continue\n"
        "    params.set(clave, String(valor))\n"
        "  }\n"
        "  const texto = params.toString()\n"
        "  return texto ? `${ruta}?${texto}` : ruta\n"
        "}\n"
    )
    for nombre, definicion in esquema.get("components", {}).get("schemas", {}).items():
        if nombre in OMITIR:
            continue
        doc = definicion.get("description", "").strip().replace("\n", " ")
        comentario = f"/** {doc} */\n" if doc else ""
        cuerpo = tipo(definicion) if definicion.get("type") != "object" else objeto(definicion)
        partes.append(f"{comentario}export type {nombre_tipo(nombre)} = {cuerpo}\n")

    grupos: dict[str, list[str]] = {}
    for ruta, operaciones in esquema.get("paths", {}).items():
        for metodo, operacion in operaciones.items():
            grupo, _, codigo = funcion(metodo, ruta, operacion)
            grupos.setdefault(grupo, []).append(codigo)
    bloques = []
    for grupo, funciones in grupos.items():
        bloques.append(f"{grupo}: {{\n" + "\n".join(funciones) + "\n},")
    partes.append(
        "/** Una función por ruta de la API, agrupadas por módulo del backend. */\n"
        "export function crearApi(pedir: Pedir) {\n"
        "  return {\n" + _sangrar("\n".join(bloques), "    ") + "\n  }\n}\n"
    )
    return "\n".join(partes)


def _sangrar(texto: str, sangria: str) -> str:
    return "\n".join(sangria + linea if linea else linea for linea in texto.split("\n"))


def escribir(esquema: dict[str, Any], destino: Path = DESTINO) -> Path:
    destino.write_text(generar(esquema), encoding="utf-8", newline="\n")
    return destino
