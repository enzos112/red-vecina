"""Cálculo de puntos y controles de una boleta (A3 a A10, P3 a P7, Anexo A.3).

Funciones puras: reciben datos y parámetros, no tocan la base de datos.
"""

import json
import re
import unicodedata
from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from app.core.formato import miles, pesos
from app.core.tiempo import ZONA_LOCAL
from app.modulos.boletas.esquemas import ColorControl as Color
from app.modulos.parametros.reglas import Parametros


class Control(BaseModel):
    model_config = ConfigDict(frozen=True)

    clave: str
    color: Color
    mensaje: str
    campos: tuple[str, ...] = ()  # campos del formulario que el operador debe mirar


class EntradaBoleta(BaseModel):
    """Datos de la boleta y del contexto del vecino que el servicio reúne desde la base."""

    model_config = ConfigDict(frozen=True)

    monto_total: int  # lo pagado (A7: ya descontado el canje, si hubo)
    monto_excluido: int = 0  # cigarros, recargas y similares (A12, A13, A15)
    fecha_compra: datetime
    recibida_en: datetime
    comercio_en_red: bool = True
    comercio: str | None = None  # nombre del comercio elegido, para los mensajes
    rut_comercio: str | None = None  # RUT registrado del comercio elegido
    rut_leido: str | None = None  # RUT que trae la boleta (lector), ya normalizado
    vecino_trabaja_ahi: bool = False  # A3
    folio_ya_registrado: bool = False  # A9
    folio_registrado_por: str | None = None  # quién y cuándo, para mostrarlo
    boletas_dia_comercio: int = 0  # aprobadas del vecino ese día en ese comercio (P5)
    puntos_dia: int = 0  # acreditados al vecino ese día en toda la red (P6)
    productos_excluidos: tuple[str, ...] = ()  # líneas leídas que no suman (A12, A13)


class ResultadoBoleta(BaseModel):
    model_config = ConfigDict(frozen=True)

    monto_valido: int
    puntos_calculados: int  # antes de topes
    puntos: int  # a acreditar; 0 si hay rechazo
    controles: list[Control]

    @property
    def rechazo_sugerido(self) -> bool:
        return any(c.color == Color.ROJO for c in self.controles)

    @property
    def observados(self) -> list[Control]:
        """Los controles que no salieron en verde."""
        return [c for c in self.controles if c.color != Color.VERDE]


def puntos_por_monto(monto: int, p: Parametros) -> int:
    """A6: 1 punto por cada P1 pesos, redondeando hacia abajo."""
    return max(monto, 0) // p.P1.pesos_por_punto


def evaluar_boleta(e: EntradaBoleta, p: Parametros) -> ResultadoBoleta:
    """Aplica los controles de la sección 4 de construccion.md. Cada control queda con su
    color: verde si pasa, ámbar si hay que mirarlo, rojo si sugiere rechazo."""
    controles: list[Control] = []

    def agregar(clave: str, color: Color, mensaje: str, *campos: str) -> None:
        controles.append(Control(clave=clave, color=color, mensaje=mensaje, campos=campos))

    # El emisor es un comercio de la red: RUT de la boleta contra el registrado.
    if not e.comercio_en_red:
        rut = f" (RUT {e.rut_leido})" if e.rut_leido and not e.comercio else ""
        agregar(
            "comercio", Color.ROJO, f"El emisor{rut} no es un comercio de la red.", "comercio_id"
        )
    elif e.rut_leido and e.rut_comercio and e.rut_leido != e.rut_comercio:
        agregar(
            "comercio",
            Color.AMBAR,
            f"La boleta dice RUT {e.rut_leido} y {e.comercio} tiene {e.rut_comercio}. "
            "Revisa el emisor en la foto.",
            "comercio_id",
        )
    else:
        agregar("comercio", Color.VERDE, f"Emisor de la red: {e.comercio or 'comercio'}.")

    # A3
    if e.vecino_trabaja_ahi:
        agregar("empleado", Color.ROJO, "El vecino trabaja en este comercio (A3).")
    else:
        agregar("empleado", Color.VERDE, "El vecino no trabaja en este comercio.")

    # A9
    if e.folio_ya_registrado:
        quien = f" Ya la registró {e.folio_registrado_por}." if e.folio_registrado_por else ""
        agregar("folio", Color.ROJO, f"Esta boleta ya fue registrada (A9).{quien}", "folio")
    else:
        agregar("folio", Color.VERDE, "Folio no registrado antes.")

    # P7
    if e.fecha_compra > e.recibida_en:
        agregar("plazo", Color.ROJO, "La fecha de compra es posterior al envío.", "fecha_compra")
    elif e.recibida_en - e.fecha_compra > timedelta(hours=p.P7.horas):
        agregar(
            "plazo",
            Color.ROJO,
            f"Se envió después de {p.P7.horas} horas desde la compra.",
            "fecha_compra",
        )
    else:
        agregar("plazo", Color.VERDE, f"Enviada dentro de {p.P7.horas} horas.")

    # P5
    if e.boletas_dia_comercio >= p.P5.boletas:
        agregar(
            "boletas_dia",
            Color.ROJO,
            f"Ya suma {p.P5.boletas} boletas hoy en este comercio (P5).",
        )
    else:
        agregar(
            "boletas_dia",
            Color.VERDE,
            f"{e.boletas_dia_comercio} de {p.P5.boletas} boletas del día en este comercio.",
        )

    # Orden del Anexo A.3: exclusiones, P3, P4, P6.
    monto_valido = max(e.monto_total - max(e.monto_excluido, 0), 0)
    productos = ", ".join(e.productos_excluidos)
    if e.monto_excluido > 0:
        detalle = f": {productos}" if productos else ""
        agregar(
            "excluidos",
            Color.AMBAR,
            f"Se descontaron {pesos(e.monto_excluido)} en productos que no suman{detalle}.",
            "monto_excluido",
        )
    elif productos:
        agregar(
            "excluidos",
            Color.AMBAR,
            f"Hay productos que no suman ({productos}). Descuenta su monto.",
            "monto_excluido",
        )
    else:
        agregar("excluidos", Color.VERDE, "Sin productos excluidos.")

    calculados = puntos_por_monto(monto_valido, p)
    puntos = calculados
    if monto_valido < p.P3.pesos:
        agregar(
            "monto_minimo",
            Color.ROJO,
            f"El monto válido es menor a {pesos(p.P3.pesos)} (P3).",
            "monto_total",
        )
        puntos = 0
    else:
        agregar("monto_minimo", Color.VERDE, f"Monto válido desde {pesos(p.P3.pesos)}.")
        if puntos > p.P4.puntos:
            agregar(
                "tope_boleta",
                Color.AMBAR,
                f"Supera el tope por boleta: se acreditan {miles(p.P4.puntos)} puntos (P4).",
                "monto_total",
            )
            puntos = p.P4.puntos
        else:
            agregar("tope_boleta", Color.VERDE, f"Bajo el tope de {miles(p.P4.puntos)} por boleta.")
        restante = max(p.P6.puntos - e.puntos_dia, 0)
        if puntos > restante:
            if restante == 0:
                agregar(
                    "tope_dia",
                    Color.ROJO,
                    f"El vecino ya sumó {miles(p.P6.puntos)} puntos ese día (P6).",
                )
            else:
                agregar(
                    "tope_dia",
                    Color.AMBAR,
                    f"Llega al tope diario: se acreditan {miles(restante)} puntos (P6).",
                )
            puntos = restante
        else:
            agregar("tope_dia", Color.VERDE, f"Bajo el tope de {miles(p.P6.puntos)} al día.")

    resultado = ResultadoBoleta(
        monto_valido=monto_valido,
        puntos_calculados=calculados,
        puntos=puntos,
        controles=controles,
    )
    if resultado.rechazo_sugerido:
        return resultado.model_copy(update={"puntos": 0})
    return resultado


# --- Lectura automática ---

# Campos cuya confianza baja se marca como "lectura dudosa" (sección 4), con el campo del
# formulario que se resalta.
CAMPOS_CLAVE = {"total": "monto_total", "folio": "folio", "fecha": "fecha_compra"}


def control_lectura(
    proveedor: str | None,
    error: str | None,
    datos: dict | None,
    confianza_minima: float,
) -> Control:
    """Ámbar si no hubo lectura o si total, folio o fecha se leyeron con poca confianza;
    verde si la lectura es clara. `datos` es la salida del lector."""
    if datos is None:
        if error:
            mensaje = f"El lector falló ({error}). Digita los campos mirando la foto."
        elif proveedor == "manual":
            mensaje = "No se leyó automáticamente: usa «Leer ahora» o digita los campos."
        else:
            mensaje = "Aún no hay lectura automática: digita los campos o vuelve a leer."
        return Control(
            clave="lectura",
            color=Color.AMBAR,
            mensaje=mensaje,
            campos=tuple(CAMPOS_CLAVE.values()),
        )
    if all(datos.get(c) is None for c in ("rut_emisor", "folio", "fecha", "total")):
        return Control(
            clave="lectura",
            color=Color.AMBAR,
            mensaje="La imagen no parece una boleta: no se ve RUT, folio, fecha ni total. "
            "Pide una foto nueva o recházala.",
            campos=tuple(CAMPOS_CLAVE.values()),
        )
    confianza = datos.get("confianza") or {}
    dudosos = [
        campo
        for campo in CAMPOS_CLAVE
        if datos.get(campo) is None or float(confianza.get(campo) or 0) < confianza_minima
    ]
    if dudosos:
        return Control(
            clave="lectura",
            color=Color.AMBAR,
            mensaje=f"Lectura dudosa en {', '.join(dudosos)}: compáralo con la foto.",
            campos=tuple(CAMPOS_CLAVE[c] for c in dudosos),
        )
    return Control(
        clave="lectura", color=Color.VERDE, mensaje="Lectura clara de total, folio y fecha."
    )


def _sin_tildes(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()


def productos_excluidos(
    lineas: list[dict], palabras: list[str]
) -> tuple[int, tuple[str, ...], bool]:
    """A12 y A13: busca cigarros, recargas y similares en las líneas leídas.

    Devuelve (monto a descontar, descripciones encontradas, si a alguna le falta el monto).
    `palabras` viene de excluidos.json (datos, no código).
    """
    if not palabras:
        return 0, (), False
    patron = re.compile(r"\b(" + "|".join(re.escape(_sin_tildes(x)) for x in palabras) + r")\b")
    monto, encontrados, sin_monto = 0, [], False
    for linea in lineas:
        descripcion = str(linea.get("descripcion") or "").strip()
        if descripcion and patron.search(_sin_tildes(descripcion)):
            encontrados.append(descripcion)
            if linea.get("monto") is None:
                sin_monto = True
            else:
                monto += max(int(linea["monto"]), 0)
    return monto, tuple(encontrados), sin_monto


# --- Datos: palabras excluidas y motivos de rechazo ---

RUTA_EXCLUIDOS = Path(__file__).with_name("excluidos.json")
RUTA_MOTIVOS = Path(__file__).with_name("motivos.json")


def palabras_excluidas() -> list[str]:
    return json.loads(RUTA_EXCLUIDOS.read_text(encoding="utf-8"))["palabras"]


class Motivo(BaseModel):
    clave: str
    titulo: str
    motivo: str
    como_resolver: str


def motivos() -> list[Motivo]:
    datos = json.loads(RUTA_MOTIVOS.read_text(encoding="utf-8"))
    return [Motivo(**m) for m in datos]


def variables_motivo(p: Parametros) -> dict[str, str]:
    """Los plazos y montos que mencionan los motivos salen de los parámetros."""
    return {
        "plazo_horas": str(p.P7.horas),
        "compra_minima": pesos(p.P3.pesos),
        "boletas_dia": str(p.P5.boletas),
    }


def armar_motivo(clave: str, nota: str | None, p: Parametros) -> Motivo:
    """El motivo elegido con sus variables reemplazadas. "otro" exige una nota."""
    elegido = next((m for m in motivos() if m.clave == clave), None)
    if elegido is None:
        raise ValueError("Elige un motivo de la lista.")
    nota = (nota or "").strip()
    if "{nota}" in elegido.motivo + elegido.como_resolver and not nota:
        raise ValueError("Escribe el motivo del rechazo.")
    datos = {**variables_motivo(p), "nota": nota}

    def armar(texto: str) -> str:
        return re.sub(r"\{(\w+)\}", lambda m: datos.get(m.group(1), m.group(0)), texto)

    return Motivo(
        clave=elegido.clave,
        titulo=armar(elegido.titulo),
        motivo=armar(elegido.motivo),
        como_resolver=armar(elegido.como_resolver),
    )


def fecha_leida(fecha: str | None, hora: str | None) -> datetime | None:
    """ "2026-11-18" y "09:30" (hora de Santiago, como en la boleta) → datetime en UTC.
    Sin hora se asume mediodía: el operador la ve resaltada si la lectura es dudosa."""
    if not fecha:
        return None
    try:
        dia = date.fromisoformat(fecha.strip())
        hh, mm = (int(x) for x in (hora or "12:00").strip()[:5].split(":"))
        return datetime.combine(dia, time(hh, mm), tzinfo=ZONA_LOCAL).astimezone(UTC)
    except ValueError:
        return None
