"""Almacén de archivos. Interfaz única con un proveedor en la base de datos.

El disco de un servicio gratuito de Render se borra en cada reinicio, por eso el MVP guarda
las fotos (comprimidas) en Postgres. Otro proveedor (S3, R2) implementaría la misma interfaz.
"""

from typing import Protocol

from sqlalchemy.orm import Session

from app.servicios.archivos.modelos import Archivo


class Almacen(Protocol):
    def guardar(self, datos: bytes, tipo_mime: str, nombre: str) -> int: ...

    def leer(self, archivo_id: int) -> tuple[bytes, str] | None: ...


class AlmacenBaseDatos:
    def __init__(self, sesion: Session) -> None:
        self.sesion = sesion

    def guardar(self, datos: bytes, tipo_mime: str, nombre: str) -> int:
        archivo = Archivo(datos=datos, tipo_mime=tipo_mime, nombre=nombre, tamano=len(datos))
        self.sesion.add(archivo)
        self.sesion.flush()
        return archivo.id

    def leer(self, archivo_id: int) -> tuple[bytes, str] | None:
        archivo = self.sesion.get(Archivo, archivo_id)
        return (archivo.datos, archivo.tipo_mime) if archivo else None
