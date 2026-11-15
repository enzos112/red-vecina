"""Formato para textos que ve el usuario: pesos con punto de miles y fechas en español."""

from datetime import date, datetime

from app.core.tiempo import a_local

DIAS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
MESES = (
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)


def miles(numero: int) -> str:
    signo = "-" if numero < 0 else ""
    return signo + f"{abs(numero):,}".replace(",", ".")


def pesos(monto: int) -> str:
    """7850 → "$7.850"."""
    signo = "-" if monto < 0 else ""
    return f"{signo}${miles(abs(monto))}"


def fecha_hora(momento: datetime) -> str:
    """En hora de Santiago: "viernes 20, 18:30"."""
    local = a_local(momento)
    return f"{DIAS[local.weekday()]} {local.day}, {local:%H:%M}"


def fecha(dia: date) -> str:
    """ "lunes 16 de noviembre"."""
    return f"{DIAS[dia.weekday()]} {dia.day} de {MESES[dia.month - 1]}"


def lista_dias(dias: list[int]) -> str:
    """[0, 1, 2, 3] → "lunes a jueves"; [1, 3, 5] → "martes, jueves y sábado"."""
    orden = sorted(set(dias))
    if len(orden) > 2 and orden == list(range(orden[0], orden[-1] + 1)):
        return f"{DIAS[orden[0]]} a {DIAS[orden[-1]]}"
    nombres = [DIAS[d] for d in orden]
    return nombres[0] if len(nombres) == 1 else ", ".join(nombres[:-1]) + " y " + nombres[-1]
