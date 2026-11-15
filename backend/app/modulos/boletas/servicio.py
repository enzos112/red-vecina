"""Boletas: registro, evaluación con las reglas y aprobación con sus puntos."""

from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core import formato
from app.core.auditoria import auditar
from app.core.tiempo import dia_local, inicio_dia_utc
from app.modulos.boletas import reglas
from app.modulos.boletas.esquemas import EstadoBoleta, OrigenBoleta
from app.modulos.boletas.modelos import Boleta
from app.modulos.canjes import servicio as canjes
from app.modulos.comercios import servicio as comercios
from app.modulos.comercios.reglas import normalizar_rut
from app.modulos.mensajes import servicio as mensajes
from app.modulos.parametros.reglas import Parametros, niveles
from app.modulos.puntos import servicio as puntos
from app.modulos.puntos.esquemas import TipoMovimiento
from app.modulos.vecinos import servicio as vecinos
from app.servicios import lector as lectores
from app.servicios.archivos.servicio import AlmacenBaseDatos

_APROBADA = Boleta.estado == EstadoBoleta.APROBADA


def crear(
    sesion: Session,
    vecino_id: int,
    origen: OrigenBoleta,
    recibida_en: datetime,
    archivo_id: int | None = None,
    es_demo: bool = False,
) -> Boleta:
    boleta = Boleta(
        vecino_id=vecino_id,
        origen=origen,
        recibida_en=recibida_en,
        archivo_id=archivo_id,
        es_demo=es_demo,
    )
    sesion.add(boleta)
    sesion.flush()
    return boleta


TIPOS_IMAGEN = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def _tipo_real(datos: bytes) -> str | None:
    """Reconoce la imagen por sus primeros bytes, no por lo que dice el navegador."""
    if datos.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if datos.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if datos[:4] == b"RIFF" and datos[8:12] == b"WEBP":
        return "image/webp"
    return None


def recibir_foto(
    sesion: Session,
    vecino_id: int,
    datos: bytes,
    origen: OrigenBoleta,
    ahora: datetime,
    max_bytes: int,
) -> Boleta:
    """Guarda la foto y deja la boleta pendiente de revisión (A8). La lectura automática
    y los controles se aplican después con `leer`."""
    if not datos:
        raise ValueError("No recibimos la foto. Intenta subirla de nuevo.")
    if len(datos) > max_bytes:
        raise ValueError("La foto es demasiado grande. Prueba con otra más liviana.")
    tipo = _tipo_real(datos)
    if tipo is None:
        raise ValueError("El archivo no es una foto. Sube una imagen JPG, PNG o WEBP.")
    archivo_id = AlmacenBaseDatos(sesion).guardar(
        datos, tipo, f"boleta-{vecino_id}-{int(ahora.timestamp())}.{TIPOS_IMAGEN[tipo]}"
    )
    boleta = crear(sesion, vecino_id, origen, ahora, archivo_id=archivo_id)
    auditar(sesion, "recibir_boleta", "boleta", boleta.id, None, {"origen": origen}, ahora)
    return boleta


def imagen(sesion: Session, boleta: Boleta) -> tuple[bytes, str] | None:
    if boleta.archivo_id is None:
        return None
    return AlmacenBaseDatos(sesion).leer(boleta.archivo_id)


def obtener(sesion: Session, boleta_id: int) -> Boleta | None:
    return sesion.get(Boleta, boleta_id)


def listar(
    sesion: Session,
    *,
    estado: EstadoBoleta | None = None,
    vecino_id: int | None = None,
    comercio_id: int | None = None,
    limite: int,
) -> list[Boleta]:
    """Pendientes de la más antigua a la más nueva (la cola); el resto, las recientes primero."""
    consulta = select(Boleta).limit(limite)
    if estado is not None:
        consulta = consulta.where(Boleta.estado == estado)
    if vecino_id is not None:
        consulta = consulta.where(Boleta.vecino_id == vecino_id)
    if comercio_id is not None:
        consulta = consulta.where(Boleta.comercio_id == comercio_id)
    if estado == EstadoBoleta.PENDIENTE:
        consulta = consulta.order_by(Boleta.recibida_en, Boleta.id)
    else:
        consulta = consulta.order_by(Boleta.recibida_en.desc(), Boleta.id.desc())
    return list(sesion.scalars(consulta))


def contar_pendientes(sesion: Session, vecino_id: int | None = None) -> int:
    consulta = select(func.count(Boleta.id)).where(Boleta.estado == EstadoBoleta.PENDIENTE)
    if vecino_id is not None:
        consulta = consulta.where(Boleta.vecino_id == vecino_id)
    return sesion.scalar(consulta) or 0


def atrasadas(sesion: Session, ahora: datetime, p: Parametros) -> int:
    """Pendientes que ya pasaron el plazo de validación (U11, A8)."""
    limite = ahora - timedelta(hours=p.U11.horas)
    return (
        sesion.scalar(
            select(func.count(Boleta.id)).where(
                Boleta.estado == EstadoBoleta.PENDIENTE, Boleta.recibida_en < limite
            )
        )
        or 0
    )


def puntos_pendientes(sesion: Session, vecino_id: int) -> int:
    """Puntos ya calculados de las boletas pendientes del vecino (A8)."""
    return (
        sesion.scalar(
            select(func.coalesce(func.sum(Boleta.puntos), 0)).where(
                Boleta.estado == EstadoBoleta.PENDIENTE, Boleta.vecino_id == vecino_id
            )
        )
        or 0
    )


def _datos_leidos(boleta: Boleta) -> dict | None:
    return (boleta.lectura or {}).get("datos")


def _excluidos_leidos(boleta: Boleta) -> tuple[int, tuple[str, ...]]:
    """Productos que no suman encontrados en las líneas leídas (A12, A13)."""
    datos = _datos_leidos(boleta)
    if not datos:
        return 0, ()
    monto, productos, _ = reglas.productos_excluidos(
        datos.get("lineas") or [], reglas.palabras_excluidas()
    )
    return monto, productos


def controles(
    boleta: Boleta, resultado: reglas.ResultadoBoleta | None, confianza_minima: float | None
) -> list[reglas.Control]:
    """El control de la lectura (si se pide) seguido de los controles de las reglas."""
    lista: list[reglas.Control] = []
    if confianza_minima is not None:
        lectura = boleta.lectura or {}
        lista.append(
            reglas.control_lectura(
                lectura.get("proveedor"),
                lectura.get("error"),
                lectura.get("datos"),
                confianza_minima,
            )
        )
    return lista + (resultado.controles if resultado else [])


def evaluar(
    sesion: Session,
    boleta_id: int,
    *,
    comercio_id: int | None,
    folio: str | None,
    fecha_compra: datetime,
    monto_total: int,
    monto_excluido: int,
    p: Parametros,
    confianza_minima: float | None = None,
) -> tuple[reglas.ResultadoBoleta, list[reglas.Control]]:
    """Vista previa de los controles y los puntos con los datos que ve el operador."""
    boleta = obtener(sesion, boleta_id)
    if boleta is None:
        raise ValueError("No encontramos esa boleta.")
    resultado = reglas.evaluar_boleta(
        entrada(sesion, boleta, comercio_id, folio, fecha_compra, monto_total, monto_excluido), p
    )
    return resultado, controles(boleta, resultado, confianza_minima)


def _rango_dia(momento: datetime) -> tuple[datetime, datetime]:
    dia = dia_local(momento)
    return inicio_dia_utc(dia), inicio_dia_utc(dia + timedelta(days=1))


def _quien_registro(sesion: Session, boleta: Boleta, previa: Boleta) -> str:
    """ "Rosa el martes 17, 11:00": a quién se le aprobó antes ese folio (A9)."""
    if previa.vecino_id == boleta.vecino_id:
        persona = "este mismo vecino"
    else:
        vecino = vecinos.obtener(sesion, previa.vecino_id)
        persona = f"{vecino.nombre} ({vecino.telefono})" if vecino else "otro vecino"
    momento = previa.revisada_en or previa.recibida_en
    return f"{persona} el {formato.fecha_hora(momento)}"


def entrada(
    sesion: Session,
    boleta: Boleta,
    comercio_id: int | None,
    folio: str | None,
    fecha_compra: datetime,
    monto_total: int,
    monto_excluido: int,
) -> reglas.EntradaBoleta:
    """Reúne desde la base el contexto que necesitan las reglas (A3, A9, P5, P6)."""
    comercio = comercios.obtener(sesion, comercio_id) if comercio_id else None
    desde, hasta = _rango_dia(fecha_compra)
    del_dia = (
        Boleta.vecino_id == boleta.vecino_id,
        _APROBADA,
        Boleta.fecha_compra >= desde,
        Boleta.fecha_compra < hasta,
        Boleta.id != boleta.id,
    )
    puntos_dia = sesion.scalar(select(func.coalesce(func.sum(Boleta.puntos), 0)).where(*del_dia))
    boletas_dia = sesion.scalar(
        select(func.count(Boleta.id)).where(*del_dia, Boleta.comercio_id == comercio_id)
    )
    previa = (
        sesion.scalar(
            select(Boleta)
            .where(
                Boleta.comercio_id == comercio_id,
                Boleta.folio == folio,
                _APROBADA,
                Boleta.id != boleta.id,
            )
            .limit(1)
        )
        if folio
        else None
    )
    datos = _datos_leidos(boleta) or {}
    _, productos = _excluidos_leidos(boleta)
    return reglas.EntradaBoleta(
        monto_total=monto_total,
        monto_excluido=monto_excluido,
        fecha_compra=fecha_compra,
        recibida_en=boleta.recibida_en,
        comercio_en_red=comercio is not None and comercios.en_red(comercio),
        comercio=comercio.nombre if comercio else None,
        rut_comercio=comercio.rut if comercio else None,
        rut_leido=normalizar_rut(datos.get("rut_emisor")),
        vecino_trabaja_ahi=bool(comercio_id)
        and vecinos.trabaja_en(sesion, boleta.vecino_id, comercio_id),
        folio_ya_registrado=previa is not None,
        folio_registrado_por=_quien_registro(sesion, boleta, previa) if previa else None,
        boletas_dia_comercio=boletas_dia or 0,
        puntos_dia=puntos_dia or 0,
        productos_excluidos=productos,
    )


# --- Lectura automática (sección 4) ---


def leer(
    sesion: Session,
    boleta_id: int,
    lector: lectores.Lector,
    p: Parametros,
    confianza_minima: float,
    timeout: float | None = None,
) -> Boleta:
    """Lee la foto con el proveedor configurado, completa los campos de la boleta pendiente
    y guarda sus controles. Si el lector falla, la boleta queda para digitación manual."""
    boleta = obtener(sesion, boleta_id)
    if boleta is None:
        raise ValueError("No encontramos esa boleta.")
    if boleta.estado != EstadoBoleta.PENDIENTE:
        raise ValueError("Esta boleta ya fue revisada.")
    foto = imagen(sesion, boleta)
    if foto is None:
        resultado = lectores.ResultadoLectura(
            proveedor=lector.nombre, lectura=None, error="La boleta no tiene foto."
        )
    else:
        resultado = lectores.leer(lector, *foto, timeout=timeout)
    lectura = resultado.lectura
    boleta.lectura = {
        "proveedor": resultado.proveedor,
        "error": resultado.error,
        "segundos": resultado.segundos,
        "datos": lectura.model_dump(mode="json") if lectura else None,
    }
    if lectura is not None:
        rut = normalizar_rut(lectura.rut_emisor)
        if rut:
            boleta.rut_emisor = rut
            comercio = comercios.por_rut(sesion, rut)
            boleta.comercio_id = comercio.id if comercio else None
        if lectura.folio:
            boleta.folio = lectura.folio.strip()[:40]
        fecha = reglas.fecha_leida(lectura.fecha, lectura.hora)
        if fecha:
            boleta.fecha_compra = fecha
        if lectura.total is not None:
            boleta.monto_total = max(lectura.total, 0)
        boleta.monto_valido = None
    _precalcular(sesion, boleta, p, confianza_minima)
    sesion.flush()
    return boleta


def _precalcular(sesion: Session, boleta: Boleta, p: Parametros, confianza_minima: float) -> None:
    """Con fecha y total ya se pueden correr los controles y estimar los puntos, que el
    vecino ve como pendientes. Sin ellos, solo queda el control de la lectura."""
    if boleta.fecha_compra is None or boleta.monto_total is None:
        boleta.puntos = None
        boleta.controles = [
            c.model_dump(mode="json") for c in controles(boleta, None, confianza_minima)
        ]
        return
    excluido = monto_excluido(boleta)
    resultado = reglas.evaluar_boleta(
        entrada(
            sesion,
            boleta,
            boleta.comercio_id,
            boleta.folio,
            boleta.fecha_compra,
            boleta.monto_total,
            excluido,
        ),
        p,
    )
    boleta.monto_valido = resultado.monto_valido
    boleta.puntos = resultado.puntos
    boleta.controles = [
        c.model_dump(mode="json") for c in controles(boleta, resultado, confianza_minima)
    ]


def monto_excluido(boleta: Boleta) -> int:
    """Lo que no suma: lo que ya fijó el operador o, si no, lo que encontró el lector."""
    if boleta.monto_total is None:
        return 0
    if boleta.monto_valido is not None:
        return max(boleta.monto_total - boleta.monto_valido, 0)
    return min(_excluidos_leidos(boleta)[0], boleta.monto_total)


def aprobar(
    sesion: Session,
    boleta_id: int,
    *,
    comercio_id: int,
    folio: str,
    fecha_compra: datetime,
    monto_total: int,
    p: Parametros,
    ahora: datetime,
    revisor_id: int | None = None,
    monto_excluido: int = 0,
    confianza_minima: float | None = None,
) -> Boleta:
    """Aprueba una boleta con los datos que confirmó el operador y acredita sus puntos."""
    boleta = sesion.get(Boleta, boleta_id)
    if boleta is None:
        raise ValueError("No encontramos esa boleta.")
    if boleta.estado != EstadoBoleta.PENDIENTE:
        raise ValueError("Esta boleta ya fue revisada.")
    folio = folio.strip()
    resultado = reglas.evaluar_boleta(
        entrada(sesion, boleta, comercio_id, folio, fecha_compra, monto_total, monto_excluido), p
    )
    if resultado.rechazo_sugerido:
        rojos = [c.mensaje for c in resultado.controles if c.color == reglas.Color.ROJO]
        raise ValueError(" ".join(rojos))
    comercio = comercios.obtener(sesion, comercio_id)
    boleta.comercio_id = comercio_id
    boleta.rut_emisor = comercio.rut if comercio else None
    boleta.folio = folio
    boleta.fecha_compra = fecha_compra
    boleta.monto_total = monto_total
    boleta.monto_valido = resultado.monto_valido
    boleta.puntos = resultado.puntos
    boleta.controles = [
        c.model_dump(mode="json") for c in controles(boleta, resultado, confianza_minima)
    ]
    boleta.estado = EstadoBoleta.APROBADA
    boleta.revisor_id = revisor_id
    boleta.revisada_en = ahora
    boleta.canje_id = canjes.usado_el_mismo_dia(sesion, boleta.vecino_id, comercio_id, fecha_compra)
    sesion.flush()
    if resultado.puntos:
        puntos.registrar(
            sesion,
            boleta.vecino_id,
            TipoMovimiento.GANA,
            resultado.puntos,
            ahora,
            vence_en=fecha_compra + timedelta(days=p.P8.dias),
            boleta_id=boleta.id,
            usuario_id=revisor_id,
        )
    auditar(
        sesion, "aprobar_boleta", "boleta", boleta.id, revisor_id, {"puntos": boleta.puntos}, ahora
    )
    return boleta


def rechazar(
    sesion: Session, boleta_id: int, motivo: str, ahora: datetime, revisor_id: int | None = None
) -> Boleta:
    boleta = sesion.get(Boleta, boleta_id)
    if boleta is None:
        raise ValueError("No encontramos esa boleta.")
    if boleta.estado != EstadoBoleta.PENDIENTE:
        raise ValueError("Esta boleta ya fue revisada.")
    if not motivo.strip():
        raise ValueError("Indica el motivo del rechazo.")
    boleta.estado = EstadoBoleta.RECHAZADA
    boleta.motivo = motivo
    boleta.puntos = 0
    boleta.revisor_id = revisor_id
    boleta.revisada_en = ahora
    auditar(sesion, "rechazar_boleta", "boleta", boleta.id, revisor_id, {"motivo": motivo}, ahora)
    sesion.flush()
    return boleta


def rechazar_con_motivo(
    sesion: Session,
    boleta_id: int,
    clave: str,
    nota: str | None,
    p: Parametros,
    ahora: datetime,
    revisor_id: int | None = None,
) -> tuple[Boleta, reglas.Motivo]:
    """Rechaza con un motivo de la lista (motivos.json). El vecino ve el texto del motivo."""
    motivo = reglas.armar_motivo(clave, nota, p)
    texto = motivo.motivo[:1].upper() + motivo.motivo[1:]
    boleta = rechazar(sesion, boleta_id, f"{texto}.", ahora, revisor_id)
    return boleta, motivo


# --- Mensajes para el vecino tras cada decisión ---


def _sugerencia(sesion: Session, disponible: int, p: Parametros) -> str:
    todos = niveles(p)
    alcanza = [n for n in todos if n.puntos <= disponible]
    if alcanza:
        return mensajes.armar(
            sesion, "sugerencia_alcanza", {"descuento": formato.pesos(alcanza[-1].valor_pesos)}
        )
    siguiente = todos[0]
    return mensajes.armar(
        sesion,
        "sugerencia_faltan",
        {
            "faltan": formato.miles(siguiente.puntos - max(disponible, 0)),
            "descuento": formato.pesos(siguiente.valor_pesos),
        },
    )


def mensaje_aprobada(sesion: Session, boleta: Boleta, p: Parametros) -> dict:
    vecino = vecinos.obtener(sesion, boleta.vecino_id)
    assert vecino is not None
    disponible = puntos.saldos(sesion, vecino.id).disponible
    return mensajes.para_whatsapp(
        sesion,
        "boleta_aprobada",
        {
            "puntos": formato.miles(boleta.puntos or 0),
            "saldo": formato.miles(disponible),
            "sugerencia_beneficio": _sugerencia(sesion, disponible, p),
        },
        vecino.telefono,
    )


def mensaje_rechazada(sesion: Session, boleta: Boleta, motivo: reglas.Motivo) -> dict:
    vecino = vecinos.obtener(sesion, boleta.vecino_id)
    assert vecino is not None
    comercio = comercios.obtener(sesion, boleta.comercio_id) if boleta.comercio_id else None
    return mensajes.para_whatsapp(
        sesion,
        "boleta_rechazada",
        {
            "comercio": comercio.nombre if comercio else "ese local",
            "motivo": motivo.motivo,
            "como_resolver": motivo.como_resolver,
        },
        vecino.telefono,
    )


# --- Consultas para otros módulos ---


def contar_aprobadas(sesion: Session, vecino_id: int) -> int:
    return (
        sesion.scalar(select(func.count(Boleta.id)).where(Boleta.vecino_id == vecino_id, _APROBADA))
        or 0
    )


def compras_aprobadas(sesion: Session, vecino_id: int) -> list[tuple[int, datetime]]:
    filas = sesion.execute(
        select(Boleta.comercio_id, Boleta.fecha_compra).where(
            Boleta.vecino_id == vecino_id, _APROBADA
        )
    ).all()
    return [(c, f) for c, f in filas]


def compras_en_comercio(sesion: Session, comercio_id: int) -> list[tuple[int, datetime]]:
    """(vecino_id, fecha de compra) de las boletas aprobadas de un comercio."""
    filas = sesion.execute(
        select(Boleta.vecino_id, Boleta.fecha_compra).where(
            Boleta.comercio_id == comercio_id, _APROBADA
        )
    ).all()
    return [(v, f) for v, f in filas]


def ventas(sesion: Session, comercio_id: int, desde: datetime, hasta: datetime) -> int:
    """Anexo A.4: monto válido de las boletas aprobadas por fecha de compra en [desde, hasta)."""
    return (
        sesion.scalar(
            select(func.coalesce(func.sum(Boleta.monto_valido), 0)).where(
                Boleta.comercio_id == comercio_id,
                _APROBADA,
                Boleta.fecha_compra >= desde,
                Boleta.fecha_compra < hasta,
            )
        )
        or 0
    )


def puntos_emitidos(sesion: Session, desde: datetime, hasta: datetime) -> int:
    return (
        sesion.scalar(
            select(func.coalesce(func.sum(Boleta.puntos), 0)).where(
                _APROBADA, Boleta.fecha_compra >= desde, Boleta.fecha_compra < hasta
            )
        )
        or 0
    )


def borrar_datos_vecino(sesion: Session, vecino_id: int, motivo: str, ahora: datetime) -> int:
    """Salida del vecino: las pendientes se cierran sin puntos y se borran las fotos y su
    lectura. Montos, fechas y comercio quedan para los totales anónimos."""
    almacen = AlmacenBaseDatos(sesion)
    lista = sesion.scalars(select(Boleta).where(Boleta.vecino_id == vecino_id)).all()
    for b in lista:
        if b.estado == EstadoBoleta.PENDIENTE:
            b.estado = EstadoBoleta.RECHAZADA
            b.motivo = motivo
            b.revisada_en = ahora
        if b.archivo_id is not None:
            archivo_id = b.archivo_id
            b.archivo_id = None
            sesion.flush()
            almacen.borrar(archivo_id)
        b.lectura = None
        b.controles = None
    sesion.flush()
    return len(lista)


def ultima_compra(sesion: Session, vecino_id: int) -> datetime | None:
    return sesion.scalar(
        select(func.max(Boleta.fecha_compra)).where(Boleta.vecino_id == vecino_id, _APROBADA)
    )


# --- Para alertas de fraude (sección 9) y exportación ---


def compras_para_fraude(
    sesion: Session, desde: datetime, hasta: datetime
) -> list[tuple[int, int, datetime]]:
    """(vecino_id, comercio_id, fecha_compra) de las boletas no rechazadas del periodo."""
    filas = sesion.execute(
        select(Boleta.vecino_id, Boleta.comercio_id, Boleta.fecha_compra).where(
            Boleta.estado != EstadoBoleta.RECHAZADA,
            Boleta.comercio_id.is_not(None),
            Boleta.fecha_compra >= desde,
            Boleta.fecha_compra < hasta,
        )
    ).all()
    return [(v, c, f) for v, c, f in filas]


def vecinos_con_compras(sesion: Session, comercio_id: int, desde: datetime, hasta: datetime) -> int:
    """Vecinos distintos con boletas aprobadas en el comercio, por fecha de compra."""
    return (
        sesion.scalar(
            select(func.count(func.distinct(Boleta.vecino_id))).where(
                Boleta.comercio_id == comercio_id,
                _APROBADA,
                Boleta.fecha_compra >= desde,
                Boleta.fecha_compra < hasta,
            )
        )
        or 0
    )


def para_exportar(sesion: Session, desde: datetime | None, hasta: datetime | None) -> list[Boleta]:
    """Por fecha de recepción."""
    consulta = select(Boleta).order_by(Boleta.recibida_en, Boleta.id)
    if desde is not None:
        consulta = consulta.where(Boleta.recibida_en >= desde)
    if hasta is not None:
        consulta = consulta.where(Boleta.recibida_en < hasta)
    return list(sesion.scalars(consulta))
