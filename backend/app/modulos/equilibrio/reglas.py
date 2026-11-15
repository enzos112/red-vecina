"""Algoritmo de equilibrio: cupo semanal (6.1) y qué beneficios ve el vecino (6.2).

Funciones puras: reciben datos y parámetros, no tocan la base de datos.
"""

from datetime import date, datetime, timedelta
from decimal import ROUND_FLOOR, Decimal

from pydantic import BaseModel, ConfigDict

from app.core.formato import DIAS, fecha, pesos
from app.core.tiempo import dia_local, inicio_semana
from app.modulos.canjes.reglas import alcanza_dia_permitido, vence_en
from app.modulos.equilibrio.esquemas import Semaforo
from app.modulos.parametros.reglas import Parametros

DIAS_SEMANA = 7  # calendario, no es un número de negocio
CIEN = Decimal(100)


def _piso_entero(valor: Decimal) -> int:
    return int(valor.to_integral_value(rounding=ROUND_FLOOR))


# --- 6.1 Cupo semanal ---


def ventas_proyectadas(ventas_ventana: int, dias_historia: int, p: Parametros) -> int | None:
    """Anexo A.4: proyecta V a la ventana de P15 días. None si la historia no alcanza U22."""
    if dias_historia < p.U22.dias:
        return None
    dias = min(dias_historia, p.P15.dias_ventas)
    return _piso_entero(Decimal(ventas_ventana) * p.P15.dias_ventas / dias)


class Base(BaseModel):
    model_config = ConfigDict(frozen=True)

    base: int
    ventas: int | None  # V proyectada; None si quedó en el piso por historia
    en_piso: bool


def calcular_base(ventas_ventana: int, dias_historia: int, p: Parametros) -> Base:
    """Base_i = max(piso, P15 × V / semanas de la ventana)."""
    v = ventas_proyectadas(ventas_ventana, dias_historia, p)
    if v is None:
        return Base(base=p.P16.pesos_semana, ventas=None, en_piso=True)
    semanas = Decimal(p.P15.dias_ventas) / DIAS_SEMANA
    calculada = _piso_entero(p.P15.porcentaje / CIEN * v / semanas)
    return Base(
        base=max(p.P16.pesos_semana, calculada),
        ventas=v,
        en_piso=calculada <= p.P16.pesos_semana,
    )


class Consumo(BaseModel):
    """Cómo se consumió el cupo de una semana (Anexo A.5: arrastre, base, extra)."""

    model_config = ConfigDict(frozen=True)

    de_arrastre: int
    de_base: int
    de_extra: int


def desglosar_consumo(base: int, extra: int, arrastre: int, consumido: int) -> Consumo:
    de_arrastre = min(consumido, arrastre)
    de_base = min(consumido - de_arrastre, base)
    de_extra = min(consumido - de_arrastre - de_base, extra)
    return Consumo(de_arrastre=de_arrastre, de_base=de_base, de_extra=de_extra)


def arrastre_siguiente(base: int, extra: int, arrastre: int, consumido_al_cierre: int) -> int:
    """Anexo A.5 y A.6: pasa solo la base no usada, con tope de la base anterior.

    `consumido_al_cierre` incluye lo usado y lo que seguía reservado al terminar la semana.
    """
    consumo = desglosar_consumo(base, extra, arrastre, consumido_al_cierre)
    return min(base - consumo.de_base, base)


def porcentaje_usado(consumido: int, total: int) -> Decimal:
    return CIEN if total <= 0 else Decimal(consumido) * CIEN / total


def semaforo(consumido: int, total: int, p: Parametros) -> Semaforo:
    """U7. `consumido` = usado + reservado: lo que ya no está libre."""
    pct = porcentaje_usado(consumido, total)
    if pct >= p.U7.rojo_desde:
        return Semaforo.ROJO
    if pct >= p.U7.ambar_desde:
        return Semaforo.AMBAR
    return Semaforo.VERDE


# --- 6.2 Qué beneficios ve el vecino ---


class BeneficioOferta(BaseModel):
    model_config = ConfigDict(frozen=True)

    beneficio_id: int
    nivel: int
    puntos: int
    valor_pesos: int
    compra_minima: int
    texto: str
    dias_permitidos: list[int] | None = None


class ComercioOferta(BaseModel):
    """Un comercio activo con su cupo de la semana y sus beneficios vigentes."""

    model_config = ConfigDict(frozen=True)

    comercio_id: int
    nombre: str
    cupo_total: int
    cupo_libre: int
    canjes_semana: int
    beneficios: list[BeneficioOferta]

    @property
    def pct_libre(self) -> Decimal:
        if self.cupo_total <= 0:
            return Decimal(0)
        return Decimal(max(self.cupo_libre, 0)) * CIEN / self.cupo_total


class Opcion(BaseModel):
    model_config = ConfigDict(frozen=True)

    comercio_id: int
    comercio: str
    beneficio_id: int
    nivel: int
    puntos: int
    valor_pesos: int
    compra_minima: int
    texto: str
    nunca_compro: bool


class Opciones(BaseModel):
    model_config = ConfigDict(frozen=True)

    destacadas: list[Opcion]  # máximo U8, una por comercio (Anexo A.8)
    todas: list[Opcion]  # todos los niveles
    agotados: list[str]  # "Cupo de la semana agotado, vuelve el lunes"
    proxima_liberacion: date
    mensaje_sin_opciones: str | None


def proximo_inicio_semana(ahora: datetime, p: Parametros) -> date:
    return inicio_semana(dia_local(ahora), p.P17.dia_inicio) + timedelta(days=DIAS_SEMANA)


def opciones_canje(
    saldo: int,
    comercios: list[ComercioOferta],
    compro_en: set[int],
    bloqueados_p12: set[int],
    ahora: datetime,
    p: Parametros,
) -> Opciones:
    """Pasos 2 y 3 de la sección 6.2. El paso 1 (revisar al vecino) va antes, aparte."""
    hasta = vence_en(ahora, p)

    def clave(c: ComercioOferta) -> tuple:
        # Anexo A.8: nunca compró, mayor % libre, menos canjes esta semana, id.
        return (c.comercio_id in compro_en, -c.pct_libre, c.canjes_semana, c.comercio_id)

    por_comercio: list[tuple[ComercioOferta, list[Opcion]]] = []
    agotados: list[str] = []
    for c in sorted(comercios, key=clave):
        if c.comercio_id in bloqueados_p12:
            continue
        vigentes = [
            b for b in c.beneficios if alcanza_dia_permitido(b.dias_permitidos, ahora, hasta)
        ]
        if not vigentes:
            continue
        if c.cupo_libre < min(b.valor_pesos for b in vigentes):
            agotados.append(c.nombre)
            continue
        opciones = [
            Opcion(
                comercio_id=c.comercio_id,
                comercio=c.nombre,
                beneficio_id=b.beneficio_id,
                nivel=b.nivel,
                puntos=b.puntos,
                valor_pesos=b.valor_pesos,
                compra_minima=b.compra_minima,
                texto=b.texto,
                nunca_compro=c.comercio_id not in compro_en,
            )
            for b in sorted(vigentes, key=lambda b: -b.nivel)
            if saldo >= b.puntos and c.cupo_libre >= b.valor_pesos
        ]
        if opciones:
            por_comercio.append((c, opciones))

    destacadas = [opciones[0] for _, opciones in por_comercio][: p.U8.cantidad]
    todas = [o for _, opciones in por_comercio for o in opciones]
    proxima = proximo_inicio_semana(ahora, p)
    mensaje = None
    if not todas:
        mensaje = (
            "Hoy no hay beneficios disponibles para tu saldo. "
            f"El {fecha(proxima)} se libera cupo nuevo."
        )
    return Opciones(
        destacadas=destacadas,
        todas=todas,
        agotados=agotados,
        proxima_liberacion=proxima,
        mensaje_sin_opciones=mensaje,
    )


def explicacion_cupo(en_piso: bool, dias_historia: int, p: Parametros) -> str:
    """Cómo se calcula el cupo, en una frase para el dueño (sección 6.1)."""
    dias = p.P15.dias_ventas
    semanas = Decimal(dias) / DIAS_SEMANA
    semanas_txt = str(int(semanas)) if semanas == int(semanas) else str(semanas).replace(".", ",")
    frase = (
        f"Cada {DIAS[p.P17.dia_inicio]} se calcula como el {p.P15.porcentaje}% de tus ventas "
        f"registradas de los últimos {dias} días repartido en {semanas_txt} semanas, "
        f"con un piso de {pesos(p.P16.pesos_semana)}, más lo que no usaste la semana pasada "
        "y el extra que agregues."
    )
    if dias_historia < dias:
        frase += " Mientras juntas historia, tus ventas se proyectan con los días que llevas."
    if en_piso:
        frase += " Hoy estás en el piso."
    return frase
