"""Cálculo de puntos y controles de una boleta (A3 a A10, P3 a P7, Anexo A.3).

Funciones puras: reciben datos y parámetros, no tocan la base de datos.
"""

import enum
from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict

from app.core.formato import miles, pesos
from app.modulos.parametros.reglas import Parametros


class Color(enum.StrEnum):
    VERDE = "verde"
    AMBAR = "ambar"
    ROJO = "rojo"


class Control(BaseModel):
    model_config = ConfigDict(frozen=True)

    clave: str
    color: Color
    mensaje: str


class EntradaBoleta(BaseModel):
    """Datos de la boleta y del contexto del vecino que el servicio reúne desde la base."""

    model_config = ConfigDict(frozen=True)

    monto_total: int  # lo pagado (A7: ya descontado el canje, si hubo)
    monto_excluido: int = 0  # cigarros, recargas y similares (A12, A13, A15)
    fecha_compra: datetime
    recibida_en: datetime
    comercio_en_red: bool = True
    vecino_trabaja_ahi: bool = False  # A3
    folio_ya_registrado: bool = False  # A9
    boletas_dia_comercio: int = 0  # aprobadas del vecino ese día en ese comercio (P5)
    puntos_dia: int = 0  # acreditados al vecino ese día en toda la red (P6)


class ResultadoBoleta(BaseModel):
    model_config = ConfigDict(frozen=True)

    monto_valido: int
    puntos_calculados: int  # antes de topes
    puntos: int  # a acreditar; 0 si hay rechazo
    controles: list[Control]

    @property
    def rechazo_sugerido(self) -> bool:
        return any(c.color == Color.ROJO for c in self.controles)


def puntos_por_monto(monto: int, p: Parametros) -> int:
    """A6: 1 punto por cada P1 pesos, redondeando hacia abajo."""
    return max(monto, 0) // p.P1.pesos_por_punto


def evaluar_boleta(e: EntradaBoleta, p: Parametros) -> ResultadoBoleta:
    controles: list[Control] = []

    def agregar(clave: str, color: Color, mensaje: str) -> None:
        controles.append(Control(clave=clave, color=color, mensaje=mensaje))

    # Controles que no dependen del monto.
    if not e.comercio_en_red:
        agregar("comercio", Color.ROJO, "El emisor no es un comercio de la red.")
    if e.vecino_trabaja_ahi:
        agregar("empleado", Color.ROJO, "El vecino trabaja en este comercio (A3).")
    if e.folio_ya_registrado:
        agregar("folio", Color.ROJO, "Esta boleta ya fue registrada (A9).")
    if e.fecha_compra > e.recibida_en:
        agregar("plazo", Color.ROJO, "La fecha de compra es posterior al envío.")
    elif e.recibida_en - e.fecha_compra > timedelta(hours=p.P7.horas):
        agregar("plazo", Color.ROJO, f"Se envió después de {p.P7.horas} horas desde la compra.")
    if e.boletas_dia_comercio >= p.P5.boletas:
        agregar(
            "boletas_dia",
            Color.ROJO,
            f"Ya suma {p.P5.boletas} boletas hoy en este comercio (P5).",
        )

    # Orden del Anexo A.3: exclusiones, P3, P4, P6.
    monto_valido = max(e.monto_total - max(e.monto_excluido, 0), 0)
    if e.monto_excluido > 0:
        agregar(
            "excluidos",
            Color.AMBAR,
            f"Se descontaron {pesos(e.monto_excluido)} en productos que no suman.",
        )

    calculados = puntos_por_monto(monto_valido, p)
    puntos = calculados
    if monto_valido < p.P3.pesos:
        agregar(
            "monto_minimo",
            Color.ROJO,
            f"El monto válido es menor a {pesos(p.P3.pesos)} (P3).",
        )
        puntos = 0
    else:
        if puntos > p.P4.puntos:
            agregar(
                "tope_boleta",
                Color.AMBAR,
                f"Supera el tope por boleta: se acreditan {miles(p.P4.puntos)} puntos (P4).",
            )
            puntos = p.P4.puntos
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

    resultado = ResultadoBoleta(
        monto_valido=monto_valido,
        puntos_calculados=calculados,
        puntos=puntos,
        controles=controles,
    )
    if resultado.rechazo_sugerido:
        return resultado.model_copy(update={"puntos": 0})
    return resultado
