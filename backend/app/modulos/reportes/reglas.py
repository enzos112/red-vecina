"""Indicadores de la sección 10, con su señal de alerta y la acción sugerida.

Funciones puras: reciben datos y parámetros, no tocan la base de datos.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.core.formato import miles, pesos
from app.core.tiempo import inicio_dia_utc
from app.modulos.parametros.reglas import Parametros

CIEN = Decimal(100)


class Indicador(BaseModel):
    model_config = ConfigDict(frozen=True)

    clave: str
    nombre: str
    valor: Decimal | int | None  # None: sin datos suficientes
    alerta: bool = False
    senal: str | None = None
    accion: str | None = None


def _pct(parte: int, total: int) -> Decimal | None:
    return None if total <= 0 else Decimal(parte) * CIEN / total


def costo_canjes_sobre_ventas(
    canjes_pesos: int, ventas: int, en_piso: bool, p: Parametros
) -> Indicador:
    """Canjes recibidos ÷ ventas registradas, en la ventana de P15."""
    valor = _pct(canjes_pesos, ventas)
    alerta = valor is not None and valor > p.P15.porcentaje and not en_piso
    return Indicador(
        clave="costo_canjes",
        nombre="Costo de canjes sobre ventas",
        valor=valor,
        alerta=alerta,
        senal=f"Sobre {p.P15.porcentaje}% en un comercio que no está en el piso"
        if alerta
        else None,
        accion="Revisar el cálculo del cupo: no debería ocurrir." if alerta else None,
    )


class SemanaUso(BaseModel):
    model_config = ConfigDict(frozen=True)

    semana: date
    total: int
    usado: int
    umbral_alto_en: datetime | None = None  # cuando el consumo llegó al porcentaje de U1


def uso_cupo_semanal(semanas: list[SemanaUso], p: Parametros) -> Indicador:
    """Cupo usado ÷ cupo de la semana. `semanas` va de la más antigua a la más reciente."""
    if not semanas:
        return Indicador(clave="uso_cupo", nombre="Uso del cupo semanal", valor=None)
    actual = semanas[-1]
    valor = _pct(actual.usado, actual.total)

    def alto(s: SemanaUso) -> bool:
        limite = inicio_dia_utc(s.semana + timedelta(days=p.U1.antes_de_dia))
        return s.umbral_alto_en is not None and s.umbral_alto_en < limite

    def bajo(s: SemanaUso) -> bool:
        pct = _pct(s.usado, s.total)
        return pct is not None and pct < p.U2.porcentaje

    ultimas_alto = semanas[-p.U1.semanas_seguidas :]
    ultimas_bajo = semanas[-p.U2.semanas_seguidas :]
    if len(ultimas_alto) == p.U1.semanas_seguidas and all(alto(s) for s in ultimas_alto):
        return Indicador(
            clave="uso_cupo",
            nombre="Uso del cupo semanal",
            valor=valor,
            alerta=True,
            senal=f"Llegó a {p.U1.porcentaje}% antes de tiempo {p.U1.semanas_seguidas} "
            "semanas seguidas",
            accion="Ofrecer cupo extra voluntario: el beneficio atrae más de lo que el local "
            "puede absorber.",
        )
    if len(ultimas_bajo) == p.U2.semanas_seguidas and all(bajo(s) for s in ultimas_bajo):
        return Indicador(
            clave="uso_cupo",
            nombre="Uso del cupo semanal",
            valor=valor,
            alerta=True,
            senal=f"Bajo {p.U2.porcentaje}% {p.U2.semanas_seguidas} semanas seguidas",
            accion="El beneficio no atrae: mejorarlo o destacarlo en el mensaje semanal.",
        )
    return Indicador(clave="uso_cupo", nombre="Uso del cupo semanal", valor=valor)


def ticket_promedio(tickets: list[tuple[int, int]], p: Parametros) -> Indicador:
    """Suma de tickets con código ÷ canjes. `tickets`: (monto del ticket, compra mínima)."""
    if not tickets:
        return Indicador(clave="ticket_promedio", nombre="Ticket promedio con canje", valor=None)
    promedio = sum(t for t, _ in tickets) // len(tickets)
    minimo = Decimal(sum(m for _, m in tickets)) / len(tickets)
    margen = p.U3.porcentaje_sobre_minimo
    alerta = margen is not None and promedio <= minimo * (1 + margen / CIEN)
    return Indicador(
        clave="ticket_promedio",
        nombre="Ticket promedio con canje",
        valor=promedio,
        alerta=alerta,
        senal="Muy cerca de la compra mínima" if alerta else None,
        accion="Normal al inicio; si persiste, el vecino solo viene por el descuento."
        if alerta
        else None,
    )


def clientes_derivados(
    primeras_compras: list[datetime], ahora: datetime, p: Parametros
) -> Indicador:
    """Vecinos de otro comercio de origen con primera compra en el local, en las últimas U4
    semanas."""
    desde = ahora - timedelta(weeks=p.U4.semanas)
    valor = sum(1 for f in primeras_compras if desde < f <= ahora)
    alerta = valor == 0
    return Indicador(
        clave="clientes_derivados",
        nombre="Clientes derivados",
        valor=valor,
        alerta=alerta,
        senal=f"0 en {p.U4.semanas} semanas" if alerta else None,
        accion="Destacar el local; revisar su beneficio." if alerta else None,
    )


def recompra_sin_canje(
    derivados: list[tuple[datetime, bool]], ahora: datetime, p: Parametros
) -> Indicador:
    """Derivados que vuelven a comprar sin código en U5 días.

    `derivados`: (primera compra, hubo recompra). Solo cuentan los que ya cumplieron la
    ventana completa, para no castigar a los recién llegados.
    """
    maduros = [r for f, r in derivados if f + timedelta(days=p.U5.dias) <= ahora]
    valor = _pct(sum(maduros), len(maduros))
    alerta = valor is not None and valor < p.U5.porcentaje
    return Indicador(
        clave="recompra",
        nombre="Recompra sin canje",
        valor=valor,
        alerta=alerta,
        senal=f"Bajo {p.U5.porcentaje}%" if alerta else None,
        accion="Es el indicador que justifica el costo: conversar con el dueño."
        if alerta
        else None,
    )


def cobertura_red(cupos_ventana: int, puntos_emitidos: int, p: Parametros) -> Indicador:
    """Suma de cupos (base + extra) ÷ valor de los puntos emitidos, en la ventana de P18."""
    valor = _pct(cupos_ventana, puntos_emitidos * p.P2.pesos)
    alerta = valor is not None and valor < p.P18.porcentaje
    return Indicador(
        clave="cobertura",
        nombre="Cobertura de la red",
        valor=valor,
        alerta=alerta,
        senal=f"Bajo {p.P18.porcentaje}%" if alerta else None,
        accion="Subir la tasa de cupo para todos por igual o pedir cupo extra voluntario "
        "(sección 6.5)."
        if alerta
        else None,
    )


def puntos_sin_canjear(saldo_red: int, cupo_semanal_red: int, p: Parametros) -> Indicador:
    """Saldo total de la red × P2, comparado con U6 semanas de cupo total."""
    valor = saldo_red * p.P2.pesos
    alerta = valor > cupo_semanal_red * p.U6.semanas_cupo
    return Indicador(
        clave="puntos_sin_canjear",
        nombre="Puntos vigentes sin canjear",
        valor=valor,
        alerta=alerta,
        senal=f"Más de {p.U6.semanas_cupo} semanas de cupo total" if alerta else None,
        accion="Semana de canje con mensaje a todos los vecinos." if alerta else None,
    )


# --- Reporte mensual del comercio (sección 10, último párrafo) ---


class CifrasMes(BaseModel):
    """Lo que pasó en el comercio en un tramo de un mes."""

    model_config = ConfigDict(frozen=True)

    inscritos: int  # vecinos que se inscribieron con el QR del local
    derivados: int  # clientes de otro comercio de origen con su primera compra aquí
    recompras: int  # de esos derivados, los que volvieron a comprar sin código
    canjes: int
    canjes_pesos: int
    ventas: int  # ventas registradas (boletas aprobadas)

    @property
    def costo_pct(self) -> Decimal | None:
        return _pct(self.canjes_pesos, self.ventas)


def variacion_pct(actual: int, anterior: int) -> Decimal | None:
    """Cambio porcentual frente al mes anterior. None si antes no hubo nada."""
    return None if anterior <= 0 else (Decimal(actual) - anterior) * CIEN / anterior


def _entero(valor: Decimal) -> str:
    return str(int(valor.to_integral_value()))


def resumen_mes(nombre_mes: str, actual: CifrasMes, anterior: CifrasMes) -> str:
    """Una frase para el dueño: ventas, comparación, costo de canjes y clientes nuevos."""
    if actual.ventas == 0 and actual.canjes == 0 and actual.derivados == 0:
        return (
            f"En {nombre_mes} aún no hay ventas registradas con Red Vecina. "
            "Invita a tus clientes a sumarse con el afiche de la caja."
        )
    frases = [f"En {nombre_mes} llevas {pesos(actual.ventas)} en ventas registradas"]
    cambio = variacion_pct(actual.ventas, anterior.ventas)
    if cambio is None or cambio == 0:
        frases[0] += "."
    elif cambio > 0:
        frases[0] += f", {_entero(cambio)}% más que a esta altura del mes pasado."
    else:
        frases[0] += f", {_entero(-cambio)}% menos que a esta altura del mes pasado."
    if actual.canjes:
        costo = actual.costo_pct
        detalle = f" ({_entero(costo)}% de esas ventas)" if costo is not None else ""
        canjes = (
            "el canje que recibiste costó"
            if actual.canjes == 1
            else (f"los {miles(actual.canjes)} canjes que recibiste costaron")
        )
        frases.append(f"{canjes[0].upper()}{canjes[1:]} {pesos(actual.canjes_pesos)}{detalle}.")
    if actual.derivados:
        clientes = "cliente nuevo" if actual.derivados == 1 else "clientes nuevos"
        frases.append(f"Llegaron {miles(actual.derivados)} {clientes} desde otros locales.")
    return " ".join(frases)
