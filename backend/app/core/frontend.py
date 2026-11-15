"""Servir el frontend compilado (frontend/dist) desde FastAPI en producción.

Toda ruta que no empiece con /api devuelve el archivo pedido si existe, o index.html
para que React Router resuelva la ruta en el navegador.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse


def montar_frontend(app: FastAPI, dist: Path) -> None:
    dist = dist.resolve()
    indice = dist / "index.html"
    if not indice.is_file():
        return

    @app.get("/{ruta:path}", include_in_schema=False)
    def servir_frontend(ruta: str) -> FileResponse:
        if ruta == "api" or ruta.startswith("api/"):
            raise HTTPException(status_code=404, detail="No encontramos esta ruta de la API.")
        if ruta:
            archivo = (dist / ruta).resolve()
            if archivo.is_relative_to(dist) and archivo.is_file():
                return FileResponse(archivo)
        return FileResponse(indice)
