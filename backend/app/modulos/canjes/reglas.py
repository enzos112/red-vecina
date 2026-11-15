"""Ciclo del código de canje y límites por vecino (B10 a B16, P11 a P14, P19, P20).

Funciones puras: reciben datos y parámetros, no tocan la base de datos.
"""

from datetime import date, datetime, timedelta

from pydantic import BaseModel, ConfigDict

from app.core.formato import fecha_hora, lista_dias, miles, pesos
from app.core.tiempo import dia_local, dias_locales_entre, semana_de
from app.modulos.canjes.esquemas import EstadoCanje, ResultadoCaja
from app.modulos.parametros.reglas import Parametros


class CanjeResumen(BaseModel):
    """Lo que las reglas necesitan saber de un código ya emitido."""

    model_config = ConfigDict(frozen=True)

    comercio_id: int
    estado: EstadoCanje
    emitido_en: datetime
    vence_en: datetime
    usado_en: datetime | None = None
    vencido_en: datetime | None = None
    cuenta_para_p19: bool = True


def estado_efectivo(c: CanjeResumen, ahora: datetime) -> EstadoCanje:
    """Un código activo cuyo plazo pasó ya está vencido, aunque la tarea no haya corrido."""
    if c.estado == EstadoCanje.ACTIVO and c.vence_en <= ahora:
        return EstadoCanje.VENCIDO
    return c.estado


def _cuentan(canjes: list[CanjeResumen], ahora: datetime) -> list[CanjeResumen]:
    """Anexo A.2: cuentan los emitidos que no vencieron (activos y usados)."""
    return [c for c in canjes if estado_efectivo(c, ahora) != EstadoCanje.VENCIDO]


def pausa_p19_hasta(canjes: list[CanjeResumen], ahora: datetime, p: Parametros) -> datetime | None:
    """Anexo A.10: la pausa dura P19 días desde el vencimiento que deja P19 vencidos en la
    ventana; cada vencimiento nuevo en esa situación la reinicia."""
    eventos = sorted(
        c.vencido_en or c.vence_en
        for c in canjes
        if estado_efectivo(c, ahora) == EstadoCanje.VENCIDO and c.cuenta_para_p19
    )
    ventana = timedelta(days=p.P19.dias)
    hasta: datetime | None = None
    for i, evento in enumerate(eventos):
        en_ventana = sum(1 for e in eventos[: i + 1] if e > evento - ventana)
        if en_ventana >= p.P19.vencidos:
            hasta = evento + timedelta(days=p.P19.pausa_dias)
    return hasta


class Motivo(BaseModel):
    model_config = ConfigDict(frozen=True)

    clave: str
    mensaje: str


class Elegibilidad(BaseModel):
    model_config = ConfigDict(frozen=True)

    motivos: list[Motivo]

    @property
    def puede(self) -> bool:
        return not self.motivos


def revisar_vecino(
    activo: bool,
    boletas_validadas: int,
    canjes: list[CanjeResumen],
    ahora: datetime,
    p: Parametros,
) -> Elegibilidad:
    """Paso 1 de la sección 6.2: ¿puede este vecino pedir un código ahora?"""
    motivos: list[Motivo] = []

    def no(clave: str, mensaje: str) -> None:
        motivos.append(Motivo(clave=clave, mensaje=mensaje))

    if not activo:
        no("suspendido", "Tu cuenta está suspendida. Escríbenos para revisarla.")
    if boletas_validadas < p.P20.boletas_validadas:
        no(
            "sin_boletas",
            f"Para canjear necesitas {miles(p.P20.boletas_validadas)} boleta validada. "
            "Sube la de tu próxima compra.",
        )
    activos = [c for c in canjes if estado_efectivo(c, ahora) == EstadoCanje.ACTIVO]
    if len(activos) >= p.P14.codigos:
        no("codigo_activo", "Ya tienes un código activo. Úsalo o espera a que venza.")
    cuentan = _cuentan(canjes, ahora)
    hoy = dia_local(ahora)
    if sum(1 for c in cuentan if dia_local(c.emitido_en) == hoy) >= p.P13.por_dia:
        no("canje_hoy", "Ya pediste un canje hoy. Mañana puedes pedir otro.")
    desde = ahora - timedelta(days=p.P13.dias)
    if sum(1 for c in cuentan if c.emitido_en > desde) >= p.P13.canjes:
        no(
            "canjes_ventana",
            f"Ya llevas {p.P13.canjes} canjes en {p.P13.dias} días. Pronto podrás pedir otro.",
        )
    pausa = pausa_p19_hasta(canjes, ahora, p)
    if pausa and pausa > ahora:
        no(
            "pausa_vencidos",
            f"Se te vencieron {p.P19.vencidos} códigos sin usar. "
            f"Puedes volver a pedir el {fecha_hora(pausa)}.",
        )
    return Elegibilidad(motivos=motivos)


def comercios_bloqueados_p12(
    canjes: list[CanjeResumen], ahora: datetime, p: Parametros
) -> set[int]:
    """P12: comercios donde el vecino ya canjeó lo permitido en la ventana."""
    desde = ahora - timedelta(days=p.P12.dias)
    conteo: dict[int, int] = {}
    for c in _cuentan(canjes, ahora):
        if c.emitido_en > desde:
            conteo[c.comercio_id] = conteo.get(c.comercio_id, 0) + 1
    return {comercio for comercio, n in conteo.items() if n >= p.P12.canjes}


# --- Vigencia del código y días permitidos (Anexo A.7) ---


def vence_en(emitido_en: datetime, p: Parametros) -> datetime:
    return emitido_en + timedelta(hours=p.P11.horas)


def alcanza_dia_permitido(
    dias_permitidos: list[int] | None, desde: datetime, hasta: datetime
) -> bool:
    if dias_permitidos is None:
        return True
    return any(d.weekday() in dias_permitidos for d in dias_locales_entre(desde, hasta))


def cupo_vuelve_al_vencer(semana_cupo: date, vencido_en: datetime, p: Parametros) -> bool:
    """Anexo A.6: el cupo vuelve solo si el código vence en la semana en que se emitió."""
    return semana_de(vencido_en, p.P17.dia_inicio) == semana_cupo


# --- Validación en la caja (B13, B14, sección 8, Anexo A.7) ---


class CodigoEnCaja(BaseModel):
    model_config = ConfigDict(frozen=True)

    comercio_id: int
    estado: EstadoCanje
    vence_en: datetime
    usado_en: datetime | None
    valor_pesos: int
    compra_minima: int
    dias_permitidos: list[int] | None


class Validacion(BaseModel):
    model_config = ConfigDict(frozen=True)

    resultado: ResultadoCaja
    mensaje: str

    @property
    def se_puede_usar(self) -> bool:
        return self.resultado == ResultadoCaja.VALIDO


def validar_en_caja(
    codigo: CodigoEnCaja | None,
    comercio_id: int,
    ahora: datetime,
    monto_compra: int | None = None,
) -> Validacion:
    """Respuesta del validador. `monto_compra` es el total antes del descuento, si se informa."""

    def r(resultado: ResultadoCaja, mensaje: str) -> Validacion:
        return Validacion(resultado=resultado, mensaje=mensaje)

    if codigo is None:
        return r(ResultadoCaja.NO_EXISTE, "Este código no existe. Revisa los 6 dígitos.")
    if codigo.comercio_id != comercio_id:
        return r(ResultadoCaja.OTRO_LOCAL, "Este código no corresponde a este local.")
    if codigo.estado == EstadoCanje.USADO:
        cuando = fecha_hora(codigo.usado_en) if codigo.usado_en else "antes"
        return r(ResultadoCaja.USADO, f"Este código ya fue usado el {cuando}.")
    if codigo.estado == EstadoCanje.VENCIDO or codigo.vence_en <= ahora:
        return r(ResultadoCaja.VENCIDO, "Este código está vencido. El vecino puede pedir otro.")
    if codigo.dias_permitidos is not None and dia_local(ahora).weekday() not in (
        codigo.dias_permitidos
    ):
        return r(
            ResultadoCaja.DIA_NO_PERMITIDO,
            f"Válido solo {lista_dias(codigo.dias_permitidos)}.",
        )
    if monto_compra is not None and monto_compra < codigo.compra_minima:
        return r(
            ResultadoCaja.BAJO_MINIMO,
            f"La compra no llega a {pesos(codigo.compra_minima)}. "
            "El código sigue vigente hasta su vencimiento.",
        )
    return r(
        ResultadoCaja.VALIDO,
        f"Válido: {pesos(codigo.valor_pesos)} de descuento, "
        f"compra mínima {pesos(codigo.compra_minima)}.",
    )
