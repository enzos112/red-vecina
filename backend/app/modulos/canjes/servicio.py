"""Ciclo del código de canje: emitir (reserva), usar (consume), vencer (libera)."""

import secrets
from collections.abc import Callable
from datetime import date, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.auditoria import auditar
from app.core.tiempo import dia_local, inicio_dia_utc
from app.modulos.canjes import reglas
from app.modulos.canjes.esquemas import EstadoCanje
from app.modulos.canjes.modelos import Canje
from app.modulos.comercios import servicio as comercios
from app.modulos.equilibrio import reglas as reglas_equilibrio
from app.modulos.equilibrio import servicio as equilibrio
from app.modulos.parametros.reglas import Parametros
from app.modulos.puntos import servicio as puntos
from app.modulos.puntos.esquemas import TipoMovimiento
from app.modulos.vecinos import servicio as vecinos
from app.modulos.vecinos.esquemas import EstadoVecino

DIGITOS_CODIGO = 6  # B10: formato del código, no regla de negocio ajustable


# --- Consultas para otros módulos ---


def usados(sesion: Session, vecino_id: int) -> list[tuple[int, datetime]]:
    filas = sesion.execute(
        select(Canje.comercio_id, Canje.usado_en).where(
            Canje.vecino_id == vecino_id, Canje.estado == EstadoCanje.USADO
        )
    ).all()
    return [(c, u) for c, u in filas]


def usado_el_mismo_dia(
    sesion: Session, vecino_id: int, comercio_id: int, momento: datetime
) -> int | None:
    """Anexo A.9: la boleta del mismo comercio y día que un canje usado queda asociada."""
    dia = dia_local(momento)
    return sesion.scalar(
        select(Canje.id).where(
            Canje.vecino_id == vecino_id,
            Canje.comercio_id == comercio_id,
            Canje.estado == EstadoCanje.USADO,
            Canje.usado_en >= inicio_dia_utc(dia),
            Canje.usado_en < inicio_dia_utc(dia + timedelta(days=1)),
        )
    )


def contar_semana(sesion: Session, comercio_id: int, semana: date) -> int:
    """Canjes recibidos por el comercio esta semana (activos y usados)."""
    return (
        sesion.scalar(
            select(func.count(Canje.id)).where(
                Canje.comercio_id == comercio_id,
                Canje.semana_cupo == semana,
                Canje.estado != EstadoCanje.VENCIDO,
            )
        )
        or 0
    )


def consumo_al_cierre(sesion: Session, comercio_id: int, semana: date, fin: datetime) -> int:
    """Anexo A.6: lo usado más lo que seguía reservado al terminar la semana.

    Se calcula desde los códigos y no desde los contadores, para que dé lo mismo cuándo
    corrió la tarea que libera los vencidos.
    """
    return (
        sesion.scalar(
            select(func.coalesce(func.sum(Canje.valor_pesos), 0)).where(
                Canje.comercio_id == comercio_id,
                Canje.semana_cupo == semana,
                or_(
                    Canje.estado != EstadoCanje.VENCIDO,
                    Canje.vencido_en >= fin,
                ),
            )
        )
        or 0
    )


def resumenes(sesion: Session, vecino_id: int) -> list[reglas.CanjeResumen]:
    filas = sesion.scalars(select(Canje).where(Canje.vecino_id == vecino_id)).all()
    return [
        reglas.CanjeResumen(
            comercio_id=c.comercio_id,
            estado=c.estado,
            emitido_en=c.emitido_en,
            vence_en=c.vence_en,
            usado_en=c.usado_en,
            vencido_en=c.vencido_en,
            cuenta_para_p19=c.cuenta_para_p19,
        )
        for c in filas
    ]


# --- Pedir un código (sección 6.2) ---


def opciones(
    sesion: Session, vecino_id: int, ahora: datetime, p: Parametros
) -> tuple[reglas.Elegibilidad, reglas_equilibrio.Opciones | None]:
    liberar_vencidos(sesion, ahora, p)
    puntos.vencer_vecino(sesion, vecino_id, ahora)
    vecino = vecinos.obtener(sesion, vecino_id)
    if vecino is None:
        raise ValueError("No encontramos a este vecino.")
    historial = resumenes(sesion, vecino_id)
    elegibilidad = reglas.revisar_vecino(
        vecino.estado == EstadoVecino.ACTIVO,
        vecinos.boletas_validadas(sesion, vecino_id),
        historial,
        ahora,
        p,
    )
    if not elegibilidad.puede:
        return elegibilidad, None
    resultado = reglas_equilibrio.opciones_canje(
        saldo=puntos.saldos(sesion, vecino_id).disponible,
        comercios=equilibrio.ofertas(sesion, ahora, p),
        compro_en=vecinos.comercios_donde_compro(sesion, vecino_id),
        bloqueados_p12=reglas.comercios_bloqueados_p12(historial, ahora, p),
        ahora=ahora,
        p=p,
    )
    return elegibilidad, resultado


def _generar_codigo(sesion: Session, azar: Callable[[int], int]) -> str:
    while True:
        codigo = str(azar(10**DIGITOS_CODIGO)).zfill(DIGITOS_CODIGO)
        if not sesion.scalar(select(Canje.id).where(Canje.codigo == codigo)):
            return codigo


def emitir(
    sesion: Session,
    vecino_id: int,
    beneficio_id: int,
    ahora: datetime,
    p: Parametros,
    azar: Callable[[int], int] = secrets.randbelow,
) -> Canje:
    """B11: emite el código, retiene los puntos y reserva el cupo del comercio."""
    elegibilidad, resultado = opciones(sesion, vecino_id, ahora, p)
    if not elegibilidad.puede:
        raise ValueError(elegibilidad.motivos[0].mensaje)
    assert resultado is not None
    opcion = next((o for o in resultado.todas if o.beneficio_id == beneficio_id), None)
    if opcion is None:
        raise ValueError("Este beneficio ya no está disponible para ti. Elige otro.")
    semana = equilibrio.reservar(sesion, opcion.comercio_id, opcion.valor_pesos, ahora, p)
    canje = Canje(
        codigo=_generar_codigo(sesion, azar),
        vecino_id=vecino_id,
        comercio_id=opcion.comercio_id,
        beneficio_id=beneficio_id,
        nivel=opcion.nivel,
        puntos=opcion.puntos,
        valor_pesos=opcion.valor_pesos,
        compra_minima=opcion.compra_minima,
        emitido_en=ahora,
        vence_en=reglas.vence_en(ahora, p),
        semana_cupo=semana,
    )
    sesion.add(canje)
    sesion.flush()
    puntos.registrar(
        sesion, vecino_id, TipoMovimiento.RETIENE, opcion.puntos, ahora, canje_id=canje.id
    )
    auditar(sesion, "emitir_codigo", "canje", canje.id, None, {"vecino": vecino_id}, ahora)
    return canje


# --- En la caja ---


def _por_codigo(sesion: Session, codigo: str) -> Canje | None:
    return sesion.scalar(select(Canje).where(Canje.codigo == codigo.strip()))


def consultar(
    sesion: Session, codigo: str, comercio_id: int, ahora: datetime, monto_compra: int | None = None
) -> reglas.Validacion:
    canje = _por_codigo(sesion, codigo)
    en_caja = None
    if canje:
        beneficio = comercios.obtener_beneficio(sesion, canje.beneficio_id)
        en_caja = reglas.CodigoEnCaja(
            comercio_id=canje.comercio_id,
            estado=canje.estado,
            vence_en=canje.vence_en,
            usado_en=canje.usado_en,
            valor_pesos=canje.valor_pesos,
            compra_minima=canje.compra_minima,
            dias_permitidos=beneficio.dias_permitidos if beneficio else None,
        )
    return reglas.validar_en_caja(en_caja, comercio_id, ahora, monto_compra)


def usar(
    sesion: Session,
    codigo: str,
    comercio_id: int,
    ahora: datetime,
    p: Parametros,
    monto_compra: int | None = None,
    usuario_id: int | None = None,
) -> reglas.Validacion:
    """B13: el comercio usa el código. Quema los puntos y consume el cupo reservado."""
    validacion = consultar(sesion, codigo, comercio_id, ahora, monto_compra)
    if not validacion.se_puede_usar:
        return validacion
    canje = _por_codigo(sesion, codigo)
    assert canje is not None
    canje.estado = EstadoCanje.USADO
    canje.usado_en = ahora
    canje.monto_ticket = monto_compra
    canje.validado_por = usuario_id
    puntos.registrar(
        sesion, canje.vecino_id, TipoMovimiento.CANJEA, canje.puntos, ahora, canje_id=canje.id
    )
    equilibrio.consumir(sesion, canje.comercio_id, canje.semana_cupo, canje.valor_pesos)
    auditar(sesion, "usar_codigo", "canje", canje.id, usuario_id, {"monto": monto_compra}, ahora)
    sesion.flush()
    return validacion


def liberar_vencidos(sesion: Session, ahora: datetime, p: Parametros) -> dict[str, int]:
    """Tarea: vence los códigos activos con plazo cumplido. Idempotente."""
    vencidos = sesion.scalars(
        select(Canje).where(Canje.estado == EstadoCanje.ACTIVO, Canje.vence_en <= ahora)
    ).all()
    for canje in vencidos:
        canje.estado = EstadoCanje.VENCIDO
        canje.vencido_en = canje.vence_en
        puntos.registrar(
            sesion,
            canje.vecino_id,
            TipoMovimiento.LIBERA,
            canje.puntos,
            canje.vence_en,
            canje_id=canje.id,
        )
        equilibrio.liberar(sesion, canje.comercio_id, canje.semana_cupo, canje.valor_pesos)
    sesion.flush()
    return {"codigos": len(vencidos)}


def marcar_local_cerrado(
    sesion: Session, canje_id: int, ahora: datetime, usuario_id: int | None = None
) -> Canje:
    """Sección 8: el local estuvo cerrado; el vencimiento no cuenta para P19."""
    canje = sesion.get(Canje, canje_id)
    if canje is None or canje.estado != EstadoCanje.VENCIDO:
        raise ValueError("Solo se puede marcar un código vencido.")
    canje.cuenta_para_p19 = False
    auditar(sesion, "local_cerrado", "canje", canje.id, usuario_id, {}, ahora)
    sesion.flush()
    return canje


def obtener(sesion: Session, canje_id: int) -> Canje | None:
    return sesion.get(Canje, canje_id)
