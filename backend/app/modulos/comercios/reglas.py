"""Beneficios de un comercio (B1 a B8), cuándo rige un cambio (sección 5, U23) y sanciones
(sección 9).

Funciones puras: reciben datos y parámetros, no tocan la base de datos.
"""

import re
from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict

from app.core.formato import pesos
from app.core.tiempo import dia_local, inicio_dia_utc, inicio_semana
from app.modulos.comercios.esquemas import CausaSancion, TipoBeneficio, TipoSancion
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


def normalizar_rut(texto: str | None) -> str | None:
    """ "76.100.001-2", "761000012" o "76100001 - 2" → "76100001-2". None si no parece RUT."""
    if not texto:
        return None
    limpio = re.sub(r"[^\dkK]", "", texto).upper()
    if not 8 <= len(limpio) <= 9:
        return None
    return f"{limpio[:-1]}-{limpio[-1]}"


# --- Sanciones (sección 9) ---


class SancionPrevia(BaseModel):
    model_config = ConfigDict(frozen=True)

    tipo: TipoSancion
    causa: CausaSancion
    decidida_en: datetime


class Sugerencia(BaseModel):
    model_config = ConfigDict(frozen=True)

    tipo: TipoSancion
    razon: str


ORDEN_SANCIONES = (TipoSancion.ADVERTENCIA, TipoSancion.SUSPENSION, TipoSancion.SALIDA)


def sancion_sugerida(
    previas: list[SancionPrevia], causa: CausaSancion, ahora: datetime, p: Parametros
) -> Sugerencia:
    """Qué sanción toca a un comercio según la sección 9. Solo sugiere: decide el operador.

    Primera vez, advertencia escrita. Segunda vez dentro de U21 días, suspensión de los
    beneficios por U21 semanas. Tercera vez dentro de esa ventana, salida de la red. Si el
    comercio ya se negó a respetar códigos U20 veces en U20 días contando esta, corresponde
    al menos la suspensión (sección 8).
    """
    ventana = [s for s in previas if s.decidida_en > ahora - timedelta(days=p.U21.dias)]
    n = len(ventana)
    tipo = ORDEN_SANCIONES[min(n, len(ORDEN_SANCIONES) - 1)]
    if n == 0:
        razon = "Es la primera sanción: corresponde una advertencia escrita."
    elif n == 1:
        razon = (
            f"Ya tuvo una sanción en los últimos {p.U21.dias} días: corresponde suspender "
            f"sus beneficios por {p.U21.semanas_suspension} semanas."
        )
    else:
        razon = f"Es la tercera sanción en {p.U21.dias} días: corresponde la salida de la red."

    if causa == CausaSancion.NEGO_CODIGO:
        casos = 1 + sum(
            1
            for s in previas
            if s.causa == CausaSancion.NEGO_CODIGO
            and s.decidida_en > ahora - timedelta(days=p.U20.dias)
        )
        if casos >= p.U20.casos and ORDEN_SANCIONES.index(tipo) < 1:
            tipo = TipoSancion.SUSPENSION
            razon = (
                f"Con este son {casos} casos en {p.U20.dias} días de negarse a respetar un "
                f"código válido: corresponde suspender sus beneficios por "
                f"{p.U21.semanas_suspension} semanas."
            )
    return Sugerencia(tipo=tipo, razon=razon)


def fin_suspension(ahora: datetime, p: Parametros) -> datetime:
    return ahora + timedelta(weeks=p.U21.semanas_suspension)
