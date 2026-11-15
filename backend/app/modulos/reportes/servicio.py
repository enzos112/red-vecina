"""Indicadores de la sección 10 calculados con los datos de la base.

Se miran los lunes al recalcular cupos (sección 10), así que el uso del cupo se evalúa
sobre semanas cerradas: la semana en curso todavía no dice nada.
"""

import csv
import io
from datetime import date, datetime, timedelta

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.formato import MESES
from app.core.tiempo import a_local, dia_local, inicio_dia_utc
from app.modulos.boletas import servicio as boletas
from app.modulos.canjes import servicio as canjes
from app.modulos.comercios import servicio as comercios
from app.modulos.equilibrio import servicio as equilibrio
from app.modulos.equilibrio.servicio import UNA_SEMANA
from app.modulos.parametros.reglas import Parametros
from app.modulos.puntos import servicio as puntos
from app.modulos.reportes import reglas
from app.modulos.vecinos import servicio as vecinos


class ReporteComercio(BaseModel):
    comercio_id: int
    comercio: str
    desde: datetime
    hasta: datetime
    vecinos_inscritos: int  # vecinos con este comercio de origen
    ventas: int  # ventas registradas en la ventana de P15
    canjes_recibidos: int
    canjes_pesos: int
    clientes_derivados_total: int  # desde el inicio, una vez por par vecino-comercio
    indicadores: list[reglas.Indicador]


class ReporteMensual(BaseModel):
    nombre_mes: str
    mes_desde: datetime
    anterior_desde: datetime
    anterior_hasta: datetime
    mes: reglas.CifrasMes
    mes_anterior: reglas.CifrasMes
    resumen: str


class IndicadoresRed(BaseModel):
    red: list[reglas.Indicador]
    comercios: list[ReporteComercio]


def reporte_comercio(
    sesion: Session, comercio_id: int, ahora: datetime, p: Parametros
) -> ReporteComercio:
    comercio = comercios.obtener(sesion, comercio_id)
    if comercio is None:
        raise ValueError("No encontramos ese comercio.")
    desde = ahora - timedelta(days=p.P15.dias_ventas)
    ventas = boletas.ventas(sesion, comercio_id, desde, ahora)
    recibidos = canjes.recibidos(sesion, comercio_id, desde, ahora)
    canjes_pesos = sum(r.valor_pesos for r in recibidos)
    actual = equilibrio.cupo_vigente(sesion, comercio_id, ahora, p)
    cantidad = max(p.U1.semanas_seguidas, p.U2.semanas_seguidas)
    cerradas = equilibrio.semanas(sesion, comercio_id, actual.semana - UNA_SEMANA, cantidad)
    derivados = vecinos.derivados(sesion, comercio_id, p)
    indicadores = [
        reglas.costo_canjes_sobre_ventas(canjes_pesos, ventas, actual.en_piso, p),
        reglas.uso_cupo_semanal(
            [
                reglas.SemanaUso(
                    semana=s.semana,
                    total=s.total,
                    usado=s.usado,
                    umbral_alto_en=s.umbral_alto_en,
                )
                for s in cerradas
            ],
            p,
        ),
        reglas.ticket_promedio(
            [(r.monto_ticket, r.compra_minima) for r in recibidos if r.monto_ticket is not None],
            p,
        ),
        reglas.clientes_derivados([d.primera_compra for d in derivados], ahora, p),
        reglas.recompra_sin_canje([(d.primera_compra, d.recompra) for d in derivados], ahora, p),
    ]
    return ReporteComercio(
        comercio_id=comercio_id,
        comercio=comercio.nombre,
        desde=desde,
        hasta=ahora,
        vecinos_inscritos=vecinos.contar_por_origen(sesion, comercio_id),
        ventas=ventas,
        canjes_recibidos=len(recibidos),
        canjes_pesos=canjes_pesos,
        clientes_derivados_total=len(derivados),
        indicadores=indicadores,
    )


def indicadores_red(sesion: Session, ahora: datetime, p: Parametros) -> IndicadoresRed:
    equilibrio.recalcular_cupos(sesion, ahora, p)  # idempotente: asegura la semana en curso
    semana = equilibrio.semana_actual(ahora, p)
    # Cobertura (P18): semanas cerradas de la ventana contra los puntos emitidos en ella.
    desde = semana - timedelta(days=p.P18.dias)
    cupos = equilibrio.cupos_entre(sesion, desde, semana - UNA_SEMANA)
    emitidos = boletas.puntos_emitidos(sesion, inicio_dia_utc(desde), inicio_dia_utc(semana))
    red = [
        reglas.cobertura_red(cupos, emitidos, p),
        reglas.puntos_sin_canjear(
            puntos.disponible_red(sesion), equilibrio.total_red(sesion, semana), p
        ),
    ]
    return IndicadoresRed(
        red=red,
        comercios=[reporte_comercio(sesion, c.id, ahora, p) for c in comercios.activos(sesion)],
    )


def _cifras(
    sesion: Session,
    comercio_id: int,
    desde: datetime,
    hasta: datetime,
    derivados: list[vecinos.Derivado],
) -> reglas.CifrasMes:
    recibidos = canjes.recibidos(sesion, comercio_id, desde, hasta)
    del_tramo = [d for d in derivados if desde <= d.primera_compra < hasta]
    return reglas.CifrasMes(
        inscritos=vecinos.contar_por_origen(sesion, comercio_id, desde, hasta),
        derivados=len(del_tramo),
        recompras=sum(1 for d in del_tramo if d.recompra),
        canjes=len(recibidos),
        canjes_pesos=sum(r.valor_pesos for r in recibidos),
        ventas=boletas.ventas(sesion, comercio_id, desde, hasta),
    )


def reporte_mensual(
    sesion: Session, comercio_id: int, ahora: datetime, p: Parametros
) -> ReporteMensual:
    """El mes en curso (hora de Santiago) contra el mismo tramo del mes anterior, para que
    la comparación sea justa aunque el mes vaya a la mitad."""
    hoy = dia_local(ahora)
    inicio = hoy.replace(day=1)
    inicio_anterior = (inicio - timedelta(days=1)).replace(day=1)
    mes_desde = inicio_dia_utc(inicio)
    anterior_desde = inicio_dia_utc(inicio_anterior)
    anterior_hasta = min(anterior_desde + (ahora - mes_desde), mes_desde)
    derivados = vecinos.derivados(sesion, comercio_id, p)
    actual = _cifras(sesion, comercio_id, mes_desde, ahora, derivados)
    anterior = _cifras(sesion, comercio_id, anterior_desde, anterior_hasta, derivados)
    nombre = MESES[inicio.month - 1]
    return ReporteMensual(
        nombre_mes=nombre,
        mes_desde=mes_desde,
        anterior_desde=anterior_desde,
        anterior_hasta=anterior_hasta,
        mes=actual,
        mes_anterior=anterior,
        resumen=reglas.resumen_mes(nombre, actual, anterior),
    )


# --- Alertas de fraude (sección 9) ---

UNA_SEMANA_DIAS = 7


def alertas_fraude(sesion: Session, ahora: datetime, p: Parametros) -> list[reglas.AlertaFraude]:
    """Concentración de boletas (U12) y horarios superpuestos (U13) en los últimos 7 días;
    salto de ventas (U14) entre las dos últimas semanas cerradas."""
    desde = ahora - timedelta(days=UNA_SEMANA_DIAS)
    filas = boletas.compras_para_fraude(sesion, desde, ahora)
    nombres_v = vecinos.nombres(sesion, {v for v, _, _ in filas})
    nombres_c = comercios.nombres(sesion, {c for _, c, _ in filas})
    compras = [
        reglas.CompraVecino(
            vecino_id=v,
            vecino=nombres_v.get(v, f"Vecino {v}"),
            comercio_id=c,
            comercio=nombres_c.get(c, f"Comercio {c}"),
            momento=f,
        )
        for v, c, f in filas
    ]
    alertas = reglas.concentracion_boletas(compras, p) + reglas.horarios_superpuestos(compras, p)

    semana = equilibrio.semana_actual(ahora, p)
    cerrada = inicio_dia_utc(semana - UNA_SEMANA)
    anterior = inicio_dia_utc(semana - 2 * UNA_SEMANA)
    fin = inicio_dia_utc(semana)
    for c in comercios.activos(sesion):
        alerta = reglas.alza_ventas(
            c.id,
            c.nombre,
            boletas.ventas(sesion, c.id, anterior, cerrada),
            boletas.ventas(sesion, c.id, cerrada, fin),
            boletas.vecinos_con_compras(sesion, c.id, anterior, cerrada),
            boletas.vecinos_con_compras(sesion, c.id, cerrada, fin),
            p,
        )
        if alerta:
            alertas.append(alerta)
    return alertas


# --- Revisión del lunes (sección 10) ---


class CupoComparado(BaseModel):
    comercio_id: int
    comercio: str
    estado: str
    en_piso: bool
    base: int
    arrastre: int
    extra: int
    total: int
    usado: int
    reservado: int
    total_anterior: int | None  # semana anterior; None si el comercio no existía
    usado_anterior: int | None


class AlertaActiva(BaseModel):
    comercio_id: int | None
    comercio: str | None
    indicador: reglas.Indicador


class RevisionSemanal(BaseModel):
    semana: date
    semana_anterior: date
    cupos: list[CupoComparado]
    red: list[reglas.Indicador]
    alertas: list[AlertaActiva]
    fraude: list[reglas.AlertaFraude]


def revision_semanal(sesion: Session, ahora: datetime, p: Parametros) -> RevisionSemanal:
    ind = indicadores_red(sesion, ahora, p)  # también asegura los cupos de la semana
    semana = equilibrio.semana_actual(ahora, p)
    previa = semana - UNA_SEMANA
    cupos = []
    for c in comercios.todos(sesion):
        if not comercios.en_red(c):
            continue
        actual = equilibrio.obtener(sesion, c.id, semana)
        if actual is None:
            continue
        antes = equilibrio.obtener(sesion, c.id, previa)
        cupos.append(
            CupoComparado(
                comercio_id=c.id,
                comercio=c.nombre,
                estado=c.estado,
                en_piso=actual.en_piso,
                base=actual.base,
                arrastre=actual.arrastre,
                extra=actual.extra,
                total=actual.total,
                usado=actual.usado,
                reservado=actual.reservado,
                total_anterior=antes.total if antes else None,
                usado_anterior=antes.usado if antes else None,
            )
        )
    alertas = [
        AlertaActiva(comercio_id=None, comercio=None, indicador=i) for i in ind.red if i.alerta
    ]
    for r in ind.comercios:
        alertas += [
            AlertaActiva(comercio_id=r.comercio_id, comercio=r.comercio, indicador=i)
            for i in r.indicadores
            if i.alerta
        ]
    return RevisionSemanal(
        semana=semana,
        semana_anterior=previa,
        cupos=cupos,
        red=ind.red,
        alertas=alertas,
        fraude=alertas_fraude(sesion, ahora, p),
    )


# --- Exportar a CSV ---
#
# Punto y coma y BOM: Excel en español lo abre directo con columnas y tildes.


def _csv(encabezado: list[str], filas: list[list]) -> str:
    salida = io.StringIO()
    escritor = csv.writer(salida, delimiter=";", lineterminator="\r\n")
    escritor.writerow(encabezado)
    escritor.writerows(filas)
    return "\ufeff" + salida.getvalue()


def _local(momento: datetime | None) -> str:
    return a_local(momento).strftime("%Y-%m-%d %H:%M") if momento else ""


def _vacio(valor) -> object:
    return "" if valor is None else valor


def _dec(valor) -> str:
    """Decimales con coma, como los espera Excel en Chile."""
    if valor is None:
        return ""
    return f"{float(valor):.1f}".replace(".", ",")


def _si(valor: bool) -> str:
    return "sí" if valor else "no"


ENCABEZADO_BOLETAS = [
    "id",
    "recibida",
    "fecha_compra",
    "comercio",
    "vecino_id",
    "origen",
    "folio",
    "monto_total",
    "monto_valido",
    "puntos",
    "estado",
    "motivo",
    "revisada",
]


def csv_boletas(sesion: Session, desde: datetime | None, hasta: datetime | None) -> str:
    lista = boletas.para_exportar(sesion, desde, hasta)
    nombres = comercios.nombres(sesion, {b.comercio_id for b in lista if b.comercio_id})
    filas = [
        [
            b.id,
            _local(b.recibida_en),
            _local(b.fecha_compra),
            nombres.get(b.comercio_id or 0, ""),
            b.vecino_id,
            b.origen,
            _vacio(b.folio),
            _vacio(b.monto_total),
            _vacio(b.monto_valido),
            _vacio(b.puntos),
            b.estado,
            _vacio(b.motivo),
            _local(b.revisada_en),
        ]
        for b in lista
    ]
    return _csv(ENCABEZADO_BOLETAS, filas)


ENCABEZADO_CANJES = [
    "id",
    "emitido",
    "comercio",
    "vecino_id",
    "nivel",
    "puntos",
    "valor_pesos",
    "compra_minima",
    "estado",
    "vence",
    "usado",
    "monto_ticket",
    "sin_internet",
    "vencido",
    "cuenta_p19",
]


def csv_canjes(sesion: Session, desde: datetime | None, hasta: datetime | None) -> str:
    lista = canjes.para_exportar(sesion, desde, hasta)
    nombres = comercios.nombres(sesion, {c.comercio_id for c in lista})
    filas = [
        [
            c.id,
            _local(c.emitido_en),
            nombres.get(c.comercio_id, ""),
            c.vecino_id,
            c.nivel,
            c.puntos,
            c.valor_pesos,
            c.compra_minima,
            c.estado,
            _local(c.vence_en),
            _local(c.usado_en),
            _vacio(c.monto_ticket),
            _si(c.ingreso_diferido),
            _local(c.vencido_en),
            _si(c.cuenta_para_p19),
        ]
        for c in lista
    ]
    return _csv(ENCABEZADO_CANJES, filas)


ENCABEZADO_COMERCIOS = [
    "comercio",
    "desde",
    "hasta",
    "vecinos_inscritos",
    "ventas_registradas",
    "canjes_recibidos",
    "canjes_pesos",
    "clientes_derivados",
    "cupo_semana",
    "cupo_usado",
    "cupo_reservado",
    "en_piso",
]


def csv_comercios(sesion: Session, ahora: datetime, p: Parametros) -> str:
    ind = indicadores_red(sesion, ahora, p)
    claves = [i.clave for i in ind.comercios[0].indicadores] if ind.comercios else []
    filas = []
    for r in ind.comercios:
        cupo = equilibrio.cupo_vigente(sesion, r.comercio_id, ahora, p)
        por_clave = {i.clave: i for i in r.indicadores}
        fila = [
            r.comercio,
            _local(r.desde),
            _local(r.hasta),
            r.vecinos_inscritos,
            r.ventas,
            r.canjes_recibidos,
            r.canjes_pesos,
            r.clientes_derivados_total,
            cupo.total,
            cupo.usado,
            cupo.reservado,
            _si(cupo.en_piso),
        ]
        for clave in claves:
            i = por_clave.get(clave)
            fila += [_dec(i.valor) if i else "", _si(bool(i and i.alerta))]
        filas.append(fila)
    encabezado = list(ENCABEZADO_COMERCIOS)
    for clave in claves:
        encabezado += [clave, f"{clave}_alerta"]
    return _csv(encabezado, filas)
