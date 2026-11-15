"""Cupo semanal por comercio y ofertas que alimentan el filtro de beneficios."""

from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auditoria import auditar
from app.core.tiempo import inicio_dia_utc, semana_de
from app.modulos.boletas import servicio as boletas
from app.modulos.canjes import servicio as canjes
from app.modulos.comercios import servicio as comercios
from app.modulos.comercios.modelos import Comercio
from app.modulos.equilibrio import reglas
from app.modulos.equilibrio.modelos import CupoSemanal
from app.modulos.parametros.reglas import Parametros, nivel

UNA_SEMANA = timedelta(days=reglas.DIAS_SEMANA)


def semana_actual(ahora: datetime, p: Parametros) -> date:
    return semana_de(ahora, p.P17.dia_inicio)


def obtener(sesion: Session, comercio_id: int, semana: date) -> CupoSemanal | None:
    return sesion.scalar(
        select(CupoSemanal).where(
            CupoSemanal.comercio_id == comercio_id, CupoSemanal.semana == semana
        )
    )


def asegurar_cupo(
    sesion: Session, comercio: Comercio, semana: date, ahora: datetime, p: Parametros
) -> CupoSemanal:
    """Calcula el cupo de la semana si no existe. Idempotente: nunca recalcula una semana."""
    existente = obtener(sesion, comercio.id, semana)
    if existente:
        return existente
    inicio = inicio_dia_utc(semana)
    ventas = boletas.ventas(sesion, comercio.id, inicio - timedelta(days=p.P15.dias_ventas), inicio)
    dias_historia = max((inicio - comercio.alta_en).days, 0)
    base = reglas.calcular_base(ventas, dias_historia, p)
    arrastre = 0
    anterior = obtener(sesion, comercio.id, semana - UNA_SEMANA)
    if anterior:
        consumido = canjes.consumo_al_cierre(sesion, comercio.id, anterior.semana, inicio)
        arrastre = reglas.arrastre_siguiente(
            anterior.base, anterior.extra, anterior.arrastre, consumido
        )
    cupo = CupoSemanal(
        comercio_id=comercio.id,
        semana=semana,
        base=base.base,
        arrastre=arrastre,
        ventas_ventana=base.ventas or 0,
        dias_historia=dias_historia,
        en_piso=base.en_piso,
        calculado_en=ahora,
    )
    sesion.add(cupo)
    sesion.flush()
    return cupo


def recalcular_cupos(sesion: Session, ahora: datetime, p: Parametros) -> dict[str, int]:
    """Tarea del lunes (P17): asegura el cupo de la semana de cada comercio activo."""
    semana = semana_actual(ahora, p)
    creados = 0
    for comercio in comercios.activos(sesion):
        if obtener(sesion, comercio.id, semana) is None:
            asegurar_cupo(sesion, comercio, semana, ahora, p)
            creados += 1
    return {"creados": creados}


def cupo_vigente(sesion: Session, comercio_id: int, ahora: datetime, p: Parametros) -> CupoSemanal:
    comercio = comercios.obtener(sesion, comercio_id)
    if comercio is None:
        raise ValueError("No encontramos ese comercio.")
    return asegurar_cupo(sesion, comercio, semana_actual(ahora, p), ahora, p)


def _marcar_umbral(cupo: CupoSemanal, ahora: datetime, p: Parametros) -> None:
    if cupo.umbral_alto_en is None and cupo.total > 0:
        consumido = cupo.usado + cupo.reservado
        if reglas.porcentaje_usado(consumido, cupo.total) >= p.U1.porcentaje:
            cupo.umbral_alto_en = ahora


def reservar(sesion: Session, comercio_id: int, valor: int, ahora: datetime, p: Parametros) -> date:
    """B11: al emitir un código se reserva su valor. Devuelve la semana del cupo."""
    cupo = cupo_vigente(sesion, comercio_id, ahora, p)
    if cupo.libre < valor:
        raise ValueError("Este comercio ya no tiene cupo esta semana.")
    cupo.reservado += valor
    _marcar_umbral(cupo, ahora, p)
    sesion.flush()
    return cupo.semana


def consumir(sesion: Session, comercio_id: int, semana: date, valor: int) -> None:
    """Al usar el código, lo reservado pasa a usado en la semana en que se emitió (A.6)."""
    cupo = obtener(sesion, comercio_id, semana)
    if cupo:
        cupo.reservado -= valor
        cupo.usado += valor
        sesion.flush()


def liberar(sesion: Session, comercio_id: int, semana: date, valor: int) -> None:
    """Al vencer el código se libera la reserva. Si la semana ya cerró, su arrastre ya se
    calculó contándolo como usado, así que el cupo no vuelve a ninguna semana (A.6)."""
    cupo = obtener(sesion, comercio_id, semana)
    if cupo:
        cupo.reservado -= valor
        sesion.flush()


def agregar_extra(
    sesion: Session,
    comercio_id: int,
    monto: int,
    ahora: datetime,
    p: Parametros,
    usuario_id: int | None = None,
) -> CupoSemanal:
    """El dueño agrega cupo solo para esta semana; no se arrastra (A.5). No puede bajarlo."""
    if monto <= 0:
        raise ValueError("El cupo extra debe ser mayor a $0. El cupo no se puede bajar.")
    cupo = cupo_vigente(sesion, comercio_id, ahora, p)
    cupo.extra += monto
    auditar(sesion, "cupo_extra", "comercio", comercio_id, usuario_id, {"monto": monto}, ahora)
    sesion.flush()
    return cupo


def ofertas(sesion: Session, ahora: datetime, p: Parametros) -> list[reglas.ComercioOferta]:
    """Comercios activos con su cupo de la semana y sus beneficios vigentes."""
    semana = semana_actual(ahora, p)
    resultado = []
    for comercio in comercios.activos(sesion):
        cupo = asegurar_cupo(sesion, comercio, semana, ahora, p)
        beneficios = []
        for b in comercios.beneficios_vigentes(sesion, comercio.id, ahora):
            n = nivel(p, b.nivel)
            beneficios.append(
                reglas.BeneficioOferta(
                    beneficio_id=b.id,
                    nivel=b.nivel,
                    puntos=n.puntos,
                    valor_pesos=n.valor_pesos,
                    compra_minima=b.compra_minima,
                    texto=b.texto,
                    dias_permitidos=b.dias_permitidos,
                )
            )
        resultado.append(
            reglas.ComercioOferta(
                comercio_id=comercio.id,
                nombre=comercio.nombre,
                cupo_total=cupo.total,
                cupo_libre=cupo.libre,
                canjes_semana=canjes.contar_semana(sesion, comercio.id, semana),
                beneficios=beneficios,
            )
        )
    return resultado
