"""Imágenes de boletas de ejemplo para la cola del operador (solo demostración)."""

import io
import unicodedata
from datetime import datetime

from PIL import Image, ImageDraw, ImageFont

from app.core.formato import pesos
from app.core.tiempo import a_local

ANCHO = 420
MARGEN = 24
INTERLINEA = 26


def _sin_tildes(texto: str) -> str:
    """Como en una boleta térmica (y la fuente por defecto no trae tildes)."""
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()


def boleta_jpeg(
    comercio: str,
    rut: str,
    direccion: str,
    folio: str,
    fecha: datetime,
    lineas: list[tuple[str, int]],
) -> bytes:
    fuente = ImageFont.load_default(size=17)
    titulo = ImageFont.load_default(size=21)
    alto = MARGEN * 2 + INTERLINEA * (len(lineas) + 12)
    imagen = Image.new("RGB", (ANCHO, alto), (250, 248, 240))
    d = ImageDraw.Draw(imagen)
    y = MARGEN

    def texto(t: str, f=fuente, x: int = MARGEN, derecha: bool = False) -> None:
        nonlocal y
        t = _sin_tildes(t)
        if derecha:
            x = ANCHO - MARGEN - int(d.textlength(t, font=f))
        d.text((x, y), t, fill=(40, 40, 40), font=f)

    def salto(n: float = 1) -> None:
        nonlocal y
        y += int(INTERLINEA * n)

    numero, dv = rut.split("-")
    texto(comercio.upper(), titulo)
    salto(1.2)
    texto(f"R.U.T.: {int(numero):,}-{dv}".replace(",", "."))
    salto()
    texto(direccion)
    salto()
    texto(f"BOLETA ELECTRÓNICA Nro. {folio}")
    salto()
    texto(f"{a_local(fecha):%d-%m-%Y %H:%M}")
    salto(1.5)
    for nombre, precio in lineas:
        texto(nombre)
        texto(pesos(precio), derecha=True)
        salto()
    salto(0.5)
    d.line((MARGEN, y, ANCHO - MARGEN, y), fill=(120, 120, 120), width=1)
    salto(0.5)
    texto("TOTAL", titulo)
    texto(pesos(sum(p for _, p in lineas)), titulo, derecha=True)
    salto(2)
    texto("Boleta de ejemplo - demostración Red Vecina")
    salida = io.BytesIO()
    imagen.rotate(1.5, expand=True, fillcolor=(90, 90, 90)).save(salida, "JPEG", quality=80)
    return salida.getvalue()
