"""Beneficios de un comercio (B1 a B8) y cuándo rige un cambio (sección 5, U23).

Funciones puras: reciben datos y parámetros, no tocan la base de datos.
"""

import re
from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict

from app.core.formato import pesos
from app.core.tiempo import dia_local, inicio_dia_utc, inicio_semana
from app.modulos.comercios.esquemas import TipoBeneficio
from app.modulos.parametros.reglas import Parametros, niveles

DIAS_SEMANA = 7


class BeneficioPropuesto(BaseModel):
    model_config = ConfigDict(frozen=True)

    nivel: int
    tipo: TipoBeneficio
    texto: str
    restriccion: str | None = None
    dias_permitidos: list[int] | None = None
    compra_minima: int


def validar_beneficios(propuestos: list[BeneficioPropuesto], p: Parametros) -> list[str]:
    """Devuelve los errores en español; lista vacía si el conjunto es válido."""
    errores: list[str] = []
    todos = {n.numero: n for n in niveles(p)}
    if not 1 <= len(propuestos) <= p.U10.maximo:
        errores.append(f"Cada comercio publica entre 1 y {p.U10.maximo} beneficios.")
    usados = [b.nivel for b in propuestos]
    if len(usados) != len(set(usados)):
        errores.append("Solo puede haber un beneficio por nivel.")
    obligatorio = todos.get(p.P9.obligatorio)
    if obligatorio and obligatorio.numero not in usados:
        errores.append(f"El nivel {obligatorio.nombre.lower()} es obligatorio.")
    for b in propuestos:
        nivel = todos.get(b.nivel)
        if nivel is None:
            errores.append(f"El nivel {b.nivel} no existe.")
            continue
        if not b.texto.strip():
            errores.append(f"Falta el texto del beneficio {nivel.nombre.lower()}.")
        if b.compra_minima <= 0 or b.compra_minima > nivel.compra_minima_tope:
            errores.append(
                f"La compra mínima del nivel {nivel.nombre.lower()} debe ser mayor a $0 y "
                f"no superar {pesos(nivel.compra_minima_tope)}."
            )
        if b.dias_permitidos is not None:
            dias = set(b.dias_permitidos)
            if not dias <= set(range(DIAS_SEMANA)):
                errores.append("Los días permitidos van de 0 (lunes) a 6 (domingo).")
            elif len(dias) < p.U9.dias_minimos:
                errores.append(
                    f"El beneficio {nivel.nombre.lower()} debe valer al menos "
                    f"{p.U9.dias_minimos} días a la semana."
                )
    return errores


def rige_desde(solicitado_en: datetime, p: Parametros) -> datetime:
    """Primer inicio de semana (P17) que esté a U23 días o más de la solicitud (Anexo A.14)."""
    minimo = dia_local(solicitado_en + timedelta(days=p.U23.dias))
    semana = inicio_semana(minimo, p.P17.dia_inicio)
    if semana < minimo:
        semana += timedelta(days=DIAS_SEMANA)
    return inicio_dia_utc(semana)


def rige_desde_aprobacion(
    solicitado_en: datetime, aprobado_en: datetime, primeros: bool, p: Parametros
) -> datetime:
    """Desde cuándo rige un conjunto de beneficios aprobado (Anexo A.14 y A.15).

    - Los primeros beneficios de un comercio rigen al aprobarse: no hay nada que avisar.
    - Un cambio rige desde el primer inicio de semana a U23 días de la solicitud; si al
      aprobarlo esa fecha ya pasó, rige desde el próximo inicio de semana.
    """
    if primeros:
        return aprobado_en
    desde = rige_desde(solicitado_en, p)
    if desde < aprobado_en:
        semana = inicio_semana(dia_local(aprobado_en), p.P17.dia_inicio)
        desde = inicio_dia_utc(semana + timedelta(days=DIAS_SEMANA))
    return desde


def slug(nombre: str) -> str:
    reemplazos = str.maketrans("áéíóúüñ", "aeiouun")
    base = nombre.lower().translate(reemplazos)
    return re.sub(r"[^a-z0-9]+", "-", base).strip("-")


def rut_valido(rut: str) -> bool:
    """RUT chileno en formato 12345678-9 (sin puntos) con dígito verificador correcto."""
    m = re.fullmatch(r"(\d{7,8})-([\dkK])", rut)
    if not m:
        return False
    return digito_verificador(int(m.group(1))) == m.group(2).upper()


def digito_verificador(numero: int) -> str:
    suma, factor = 0, 2
    while numero:
        suma += (numero % 10) * factor
        numero //= 10
        factor = 2 if factor == 7 else factor + 1
    resto = 11 - suma % 11
    return {11: "0", 10: "K"}.get(resto, str(resto))
