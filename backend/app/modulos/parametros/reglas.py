"""Parámetros de la red (P1 a P20) y umbrales (U1…), tipados y validados.

Sin acceso a la base de datos. Los valores iniciales están en catalogo.json; este archivo
solo define la forma y los rangos válidos de cada parámetro.
"""

import json
from decimal import Decimal
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

RUTA_CATALOGO = Path(__file__).with_name("catalogo.json")


def _a_decimal(valor: Any) -> Any:
    return Decimal(str(valor)) if isinstance(valor, float | int) else valor


class _Valor(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class P1(_Valor):
    pesos_por_punto: int = Field(gt=0)


class P2(_Valor):
    pesos: int = Field(gt=0)


class P3(_Valor):
    pesos: int = Field(ge=0)


class P4(_Valor):
    puntos: int = Field(gt=0)


class P5(_Valor):
    boletas: int = Field(gt=0)


class P6(_Valor):
    puntos: int = Field(gt=0)


class P7(_Valor):
    horas: int = Field(gt=0)


class P8(_Valor):
    dias: int = Field(gt=0)


class P9(_Valor):
    puntos: tuple[int, ...]
    nombres: tuple[str, ...]
    obligatorio: int = Field(gt=0)

    @model_validator(mode="after")
    def _coherente(self) -> "P9":
        if not self.puntos or any(p <= 0 for p in self.puntos):
            raise ValueError("Los niveles deben tener puntos positivos.")
        if list(self.puntos) != sorted(set(self.puntos)):
            raise ValueError("Los niveles deben ir de menor a mayor y sin repetirse.")
        if len(self.nombres) != len(self.puntos):
            raise ValueError("Cada nivel necesita un nombre.")
        if self.obligatorio > len(self.puntos):
            raise ValueError("El nivel obligatorio no existe.")
        return self


class P10(_Valor):
    veces_descuento: int = Field(gt=0)


class P11(_Valor):
    horas: int = Field(gt=0)


class P12(_Valor):
    canjes: int = Field(gt=0)
    dias: int = Field(gt=0)


class P13(_Valor):
    canjes: int = Field(gt=0)
    dias: int = Field(gt=0)
    por_dia: int = Field(gt=0)


class P14(_Valor):
    codigos: int = Field(gt=0)


class P15(_Valor):
    porcentaje: Decimal = Field(gt=0, le=100)
    dias_ventas: int = Field(gt=0)

    _dec = field_validator("porcentaje", mode="before")(_a_decimal)


class P16(_Valor):
    pesos_semana: int = Field(ge=0)


class P17(_Valor):
    dia_inicio: int = Field(ge=0, le=6)


class P18(_Valor):
    porcentaje: Decimal = Field(gt=0, le=100)
    dias: int = Field(gt=0)

    _dec = field_validator("porcentaje", mode="before")(_a_decimal)


class P19(_Valor):
    vencidos: int = Field(gt=0)
    dias: int = Field(gt=0)
    pausa_dias: int = Field(gt=0)


class P20(_Valor):
    boletas_validadas: int = Field(ge=0)


class U1(_Valor):
    porcentaje: Decimal = Field(gt=0, le=100)
    antes_de_dia: int = Field(ge=0, le=6)
    semanas_seguidas: int = Field(gt=0)

    _dec = field_validator("porcentaje", mode="before")(_a_decimal)


class U2(_Valor):
    porcentaje: Decimal = Field(gt=0, le=100)
    semanas_seguidas: int = Field(gt=0)

    _dec = field_validator("porcentaje", mode="before")(_a_decimal)


class U3(_Valor):
    porcentaje_sobre_minimo: Decimal | None = Field(default=None, ge=0)

    _dec = field_validator("porcentaje_sobre_minimo", mode="before")(_a_decimal)


class U4(_Valor):
    semanas: int = Field(gt=0)


class U5(_Valor):
    porcentaje: Decimal = Field(gt=0, le=100)
    dias: int = Field(gt=0)

    _dec = field_validator("porcentaje", mode="before")(_a_decimal)


class U6(_Valor):
    semanas_cupo: int = Field(gt=0)


class U7(_Valor):
    ambar_desde: Decimal = Field(gt=0, le=100)
    rojo_desde: Decimal = Field(gt=0, le=100)

    _dec = field_validator("ambar_desde", "rojo_desde", mode="before")(_a_decimal)

    @model_validator(mode="after")
    def _orden(self) -> "U7":
        if self.ambar_desde >= self.rojo_desde:
            raise ValueError("El ámbar debe empezar antes que el rojo.")
        return self


class U8(_Valor):
    cantidad: int = Field(gt=0)


class U9(_Valor):
    dias_minimos: int = Field(ge=1, le=7)


class U10(_Valor):
    maximo: int = Field(gt=0)


class U11(_Valor):
    horas: int = Field(gt=0)


class U12(_Valor):
    boletas_semana: int = Field(gt=0)


class U13(_Valor):
    minutos: int | None = Field(default=None, gt=0)


class U14(_Valor):
    porcentaje: Decimal = Field(gt=0)

    _dec = field_validator("porcentaje", mode="before")(_a_decimal)


class U15(_Valor):
    porcentaje: Decimal = Field(gt=0, le=100)

    _dec = field_validator("porcentaje", mode="before")(_a_decimal)


class U16(_Valor):
    dias: tuple[int, ...]


class U17(_Valor):
    dias: int = Field(gt=0)


class U18(_Valor):
    dias: int = Field(gt=0)


class U19(_Valor):
    pesos: int = Field(ge=0)
    informativo: bool


class U20(_Valor):
    casos: int = Field(gt=0)
    dias: int = Field(gt=0)


class U21(_Valor):
    dias: int = Field(gt=0)
    semanas_suspension: int = Field(gt=0)


class U22(_Valor):
    dias: int = Field(ge=0)


class U23(_Valor):
    dias: int = Field(ge=0)


class U24(_Valor):
    dias: int = Field(gt=0)


class U25(_Valor):
    dias: int = Field(gt=0)


class Parametros(_Valor):
    """Todos los parámetros vigentes. Las funciones de reglas.py lo reciben como argumento."""

    P1: P1
    P2: P2
    P3: P3
    P4: P4
    P5: P5
    P6: P6
    P7: P7
    P8: P8
    P9: P9
    P10: P10
    P11: P11
    P12: P12
    P13: P13
    P14: P14
    P15: P15
    P16: P16
    P17: P17
    P18: P18
    P19: P19
    P20: P20
    U1: U1
    U2: U2
    U3: U3
    U4: U4
    U5: U5
    U6: U6
    U7: U7
    U8: U8
    U9: U9
    U10: U10
    U11: U11
    U12: U12
    U13: U13
    U14: U14
    U15: U15
    U16: U16
    U17: U17
    U18: U18
    U19: U19
    U20: U20
    U21: U21
    U22: U22
    U23: U23
    U24: U24
    U25: U25


CODIGOS = tuple(Parametros.model_fields)


def leer_catalogo() -> list[dict[str, Any]]:
    return json.loads(RUTA_CATALOGO.read_text(encoding="utf-8"))


def construir_parametros(valores: dict[str, dict[str, Any]]) -> Parametros:
    """Arma Parametros desde {codigo: valor}. Lanza ValueError con un mensaje en español."""
    faltan = [c for c in CODIGOS if c not in valores]
    if faltan:
        raise ValueError(f"Faltan parámetros: {', '.join(faltan)}.")
    try:
        return Parametros.model_validate({c: valores[c] for c in CODIGOS})
    except ValidationError as error:
        raise ValueError(f"Parámetros inválidos: {error}") from error


def validar_valor(codigo: str, valor: dict[str, Any]) -> dict[str, Any]:
    """Valida un valor nuevo para un parámetro y lo devuelve normalizado como JSON."""
    if codigo not in CODIGOS:
        raise ValueError(f"No existe el parámetro {codigo}.")
    modelo: type[_Valor] = Parametros.model_fields[codigo].annotation  # type: ignore[assignment]
    try:
        return modelo.model_validate(valor).model_dump(mode="json")
    except ValidationError as error:
        raise ValueError(f"Valor inválido para {codigo}: {error}") from error


def parametros_iniciales() -> Parametros:
    return construir_parametros({p["codigo"]: p["valor"] for p in leer_catalogo()})


# --- Niveles de beneficio, derivados de P2, P9 y P10 ---


class Nivel(BaseModel):
    model_config = ConfigDict(frozen=True)

    numero: int  # 1 = el primero de P9
    nombre: str
    puntos: int
    valor_pesos: int
    compra_minima_tope: int


def niveles(p: Parametros) -> list[Nivel]:
    return [
        Nivel(
            numero=i + 1,
            nombre=p.P9.nombres[i],
            puntos=puntos,
            valor_pesos=puntos * p.P2.pesos,
            compra_minima_tope=puntos * p.P2.pesos * p.P10.veces_descuento,
        )
        for i, puntos in enumerate(p.P9.puntos)
    ]


def nivel(p: Parametros, numero: int) -> Nivel:
    todos = niveles(p)
    if not 1 <= numero <= len(todos):
        raise ValueError(f"No existe el nivel {numero}.")
    return todos[numero - 1]
