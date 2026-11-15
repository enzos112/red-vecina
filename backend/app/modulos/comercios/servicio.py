from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auditoria import auditar
from app.modulos.comercios import reglas
from app.modulos.comercios.esquemas import EstadoBeneficio, EstadoComercio
from app.modulos.comercios.modelos import Beneficio, Comercio, SolicitudComercio
from app.modulos.parametros.reglas import Parametros


def crear_comercio(
    sesion: Session,
    nombre: str,
    rubro: str,
    rut: str,
    direccion: str,
    alta_en: datetime,
    es_demo: bool = False,
    usuario_id: int | None = None,
) -> Comercio:
    nombre, rut = nombre.strip(), rut.strip().upper()
    if not nombre:
        raise ValueError("Escribe el nombre del comercio.")
    if not reglas.rut_valido(rut):
        raise ValueError("El RUT no es válido. Escríbelo sin puntos y con guion: 76543210-3.")
    if por_rut(sesion, rut):
        raise ValueError("Ya hay un comercio con ese RUT.")
    slug = reglas.slug(nombre)
    if por_slug(sesion, slug):
        raise ValueError("Ya hay un comercio con ese nombre.")
    comercio = Comercio(
        nombre=nombre,
        rubro=rubro.strip(),
        rut=rut,
        direccion=direccion.strip(),
        slug=slug,
        alta_en=alta_en,
        es_demo=es_demo,
        creado_en=alta_en,
    )
    sesion.add(comercio)
    sesion.flush()
    if usuario_id is not None:
        auditar(sesion, "crear_comercio", "comercio", comercio.id, usuario_id, {}, alta_en)
    return comercio


def obtener(sesion: Session, comercio_id: int) -> Comercio | None:
    return sesion.get(Comercio, comercio_id)


def en_red(comercio: Comercio) -> bool:
    """Un comercio suspendido sigue en la red: sus boletas suman (solo se suspenden sus
    beneficios). Uno retirado ya no."""
    return comercio.estado != EstadoComercio.RETIRADO


def activos(sesion: Session) -> list[Comercio]:
    return list(
        sesion.scalars(
            select(Comercio).where(Comercio.estado == EstadoComercio.ACTIVO).order_by(Comercio.id)
        )
    )


def todos(sesion: Session) -> list[Comercio]:
    return list(sesion.scalars(select(Comercio).order_by(Comercio.nombre)))


def por_rut(sesion: Session, rut: str) -> Comercio | None:
    return sesion.scalar(select(Comercio).where(Comercio.rut == rut.upper()))


def por_slug(sesion: Session, slug: str) -> Comercio | None:
    return sesion.scalar(select(Comercio).where(Comercio.slug == slug))


def nombres(sesion: Session, ids: set[int]) -> dict[int, str]:
    if not ids:
        return {}
    filas = sesion.execute(select(Comercio.id, Comercio.nombre).where(Comercio.id.in_(ids)))
    return {i: n for i, n in filas}


def cambiar_estado(
    sesion: Session, comercio_id: int, estado: EstadoComercio, ahora: datetime, usuario_id: int
) -> Comercio:
    comercio = obtener(sesion, comercio_id)
    if comercio is None:
        raise ValueError("No encontramos ese comercio.")
    anterior = comercio.estado
    comercio.estado = estado
    auditar(
        sesion,
        "estado_comercio",
        "comercio",
        comercio_id,
        usuario_id,
        {"antes": anterior, "despues": estado},
        ahora,
    )
    sesion.flush()
    return comercio


# --- Beneficios ---
#
# Cada publicación es un conjunto completo (1 a U10 beneficios, B1). Rige el conjunto
# aprobado con la fecha de vigencia más reciente que ya llegó.


def _crear_conjunto(
    sesion: Session,
    comercio_id: int,
    propuestos: list[reglas.BeneficioPropuesto],
    p: Parametros,
    ahora: datetime,
) -> list[Beneficio]:
    errores = reglas.validar_beneficios(propuestos, p)
    if errores:
        raise ValueError(" ".join(errores))
    creados = [
        Beneficio(
            comercio_id=comercio_id,
            nivel=b.nivel,
            tipo=b.tipo,
            texto=b.texto.strip(),
            restriccion=(b.restriccion or "").strip() or None,
            dias_permitidos=sorted(set(b.dias_permitidos)) if b.dias_permitidos else None,
            compra_minima=b.compra_minima,
            estado=EstadoBeneficio.PENDIENTE,
            creado_en=ahora,
        )
        for b in propuestos
    ]
    sesion.add_all(creados)
    sesion.flush()
    return creados


def _aprobar(
    sesion: Session,
    comercio_id: int,
    conjunto: list[Beneficio],
    desde: datetime,
    revisor_id: int | None,
    ahora: datetime,
) -> None:
    # Otro conjunto aprobado que entraría el mismo día queda reemplazado por este.
    for b in sesion.scalars(
        select(Beneficio).where(
            Beneficio.comercio_id == comercio_id,
            Beneficio.estado == EstadoBeneficio.APROBADO,
            Beneficio.vigente_desde == desde,
        )
    ):
        b.estado = EstadoBeneficio.REEMPLAZADO
    for b in conjunto:
        b.estado = EstadoBeneficio.APROBADO
        b.vigente_desde = desde
        b.revisado_por = revisor_id
        b.revisado_en = ahora
    sesion.flush()


def publicar_beneficios(
    sesion: Session,
    comercio_id: int,
    propuestos: list[reglas.BeneficioPropuesto],
    p: Parametros,
    ahora: datetime,
    aprobado_por: int | None = None,
    vigente_desde: datetime | None = None,
) -> list[Beneficio]:
    """Registra un conjunto ya aprobado (carga inicial y datos de demostración).

    Rige desde `vigente_desde` o, si no se indica, desde el primer inicio de semana con
    U23 días de aviso. Sin `aprobado_por` queda pendiente, como una propuesta.
    """
    if aprobado_por is None:
        return proponer_beneficios(sesion, comercio_id, propuestos, p, ahora)
    creados = _crear_conjunto(sesion, comercio_id, propuestos, p, ahora)
    desde = vigente_desde or reglas.rige_desde(ahora, p)
    _aprobar(sesion, comercio_id, creados, desde, aprobado_por, ahora)
    auditar(
        sesion,
        "publicar_beneficios",
        "comercio",
        comercio_id,
        aprobado_por,
        {"beneficios": [b.id for b in creados]},
        ahora,
    )
    return creados


def proponer_beneficios(
    sesion: Session,
    comercio_id: int,
    propuestos: list[reglas.BeneficioPropuesto],
    p: Parametros,
    ahora: datetime,
    usuario_id: int | None = None,
) -> list[Beneficio]:
    """El comercio propone un conjunto nuevo. Queda pendiente y reemplaza a la propuesta
    pendiente anterior, si había."""
    for b in pendientes(sesion, comercio_id):
        b.estado = EstadoBeneficio.REEMPLAZADO
    creados = _crear_conjunto(sesion, comercio_id, propuestos, p, ahora)
    auditar(
        sesion,
        "proponer_beneficios",
        "comercio",
        comercio_id,
        usuario_id,
        {"beneficios": [b.id for b in creados]},
        ahora,
    )
    return creados


def pendientes(sesion: Session, comercio_id: int) -> list[Beneficio]:
    return list(
        sesion.scalars(
            select(Beneficio)
            .where(
                Beneficio.comercio_id == comercio_id,
                Beneficio.estado == EstadoBeneficio.PENDIENTE,
            )
            .order_by(Beneficio.nivel)
        )
    )


def comercios_con_pendientes(sesion: Session) -> list[int]:
    return list(
        sesion.scalars(
            select(Beneficio.comercio_id)
            .where(Beneficio.estado == EstadoBeneficio.PENDIENTE)
            .distinct()
            .order_by(Beneficio.comercio_id)
        )
    )


def aprobar_propuesta(
    sesion: Session, comercio_id: int, p: Parametros, ahora: datetime, revisor_id: int
) -> list[Beneficio]:
    """B7: el equipo aprueba la propuesta pendiente. Decide desde cuándo rige (A.15)."""
    conjunto = pendientes(sesion, comercio_id)
    if not conjunto:
        raise ValueError("Este comercio no tiene beneficios pendientes de aprobación.")
    primeros = not sesion.scalar(
        select(Beneficio.id).where(
            Beneficio.comercio_id == comercio_id, Beneficio.estado == EstadoBeneficio.APROBADO
        )
    )
    solicitado = min(b.creado_en for b in conjunto)
    desde = reglas.rige_desde_aprobacion(solicitado, ahora, primeros, p)
    _aprobar(sesion, comercio_id, conjunto, desde, revisor_id, ahora)
    auditar(
        sesion,
        "aprobar_beneficios",
        "comercio",
        comercio_id,
        revisor_id,
        {"beneficios": [b.id for b in conjunto], "vigente_desde": desde.isoformat()},
        ahora,
    )
    return conjunto


def rechazar_propuesta(
    sesion: Session, comercio_id: int, comentario: str, ahora: datetime, revisor_id: int
) -> list[Beneficio]:
    if not comentario.strip():
        raise ValueError("Explica al comercio por qué no se aprueban sus beneficios.")
    conjunto = pendientes(sesion, comercio_id)
    if not conjunto:
        raise ValueError("Este comercio no tiene beneficios pendientes de aprobación.")
    for b in conjunto:
        b.estado = EstadoBeneficio.RECHAZADO
        b.comentario_revision = comentario.strip()
        b.revisado_por = revisor_id
        b.revisado_en = ahora
    auditar(
        sesion,
        "rechazar_beneficios",
        "comercio",
        comercio_id,
        revisor_id,
        {"comentario": comentario},
        ahora,
    )
    sesion.flush()
    return conjunto


def ultimo_rechazo(sesion: Session, comercio_id: int) -> list[Beneficio]:
    """El último conjunto rechazado, si es más nuevo que cualquier otra propuesta."""
    ultimo = sesion.scalar(
        select(Beneficio)
        .where(Beneficio.comercio_id == comercio_id)
        .order_by(Beneficio.creado_en.desc(), Beneficio.id.desc())
        .limit(1)
    )
    if ultimo is None or ultimo.estado != EstadoBeneficio.RECHAZADO:
        return []
    return list(
        sesion.scalars(
            select(Beneficio)
            .where(
                Beneficio.comercio_id == comercio_id,
                Beneficio.estado == EstadoBeneficio.RECHAZADO,
                Beneficio.creado_en == ultimo.creado_en,
            )
            .order_by(Beneficio.nivel)
        )
    )


def beneficios_vigentes(sesion: Session, comercio_id: int, ahora: datetime) -> list[Beneficio]:
    """El conjunto aprobado más reciente que ya rige, ordenado por nivel."""
    desde = sesion.scalar(
        select(func.max(Beneficio.vigente_desde)).where(
            Beneficio.comercio_id == comercio_id,
            Beneficio.estado == EstadoBeneficio.APROBADO,
            Beneficio.vigente_desde <= ahora,
        )
    )
    if desde is None:
        return []
    return list(
        sesion.scalars(
            select(Beneficio)
            .where(
                Beneficio.comercio_id == comercio_id,
                Beneficio.estado == EstadoBeneficio.APROBADO,
                Beneficio.vigente_desde == desde,
            )
            .order_by(Beneficio.nivel)
        )
    )


def beneficios_proximos(sesion: Session, comercio_id: int, ahora: datetime) -> list[Beneficio]:
    """Conjuntos aprobados que todavía no rigen (cambios avisados)."""
    return list(
        sesion.scalars(
            select(Beneficio)
            .where(
                Beneficio.comercio_id == comercio_id,
                Beneficio.estado == EstadoBeneficio.APROBADO,
                Beneficio.vigente_desde > ahora,
            )
            .order_by(Beneficio.vigente_desde, Beneficio.nivel)
        )
    )


def beneficio_destacado(
    sesion: Session, comercio_id: int, ahora: datetime, p: Parametros
) -> Beneficio | None:
    """A.15: en la landing se destaca el beneficio del nivel obligatorio (P9)."""
    vigentes = beneficios_vigentes(sesion, comercio_id, ahora)
    return next((b for b in vigentes if b.nivel == p.P9.obligatorio), None) or (
        vigentes[0] if vigentes else None
    )


def obtener_beneficio(sesion: Session, beneficio_id: int) -> Beneficio | None:
    return sesion.get(Beneficio, beneficio_id)


# --- Comercios interesados en unirse (landing para dueños) ---


def registrar_solicitud(
    sesion: Session,
    *,
    comercio: str,
    rubro: str,
    contacto: str,
    telefono: str,
    email: str | None,
    direccion: str | None,
    mensaje: str | None,
    ahora: datetime,
) -> SolicitudComercio:
    if not comercio.strip() or not contacto.strip():
        raise ValueError("Escribe el nombre del comercio y el de la persona de contacto.")
    solicitud = SolicitudComercio(
        comercio=comercio.strip(),
        rubro=rubro.strip(),
        contacto=contacto.strip(),
        telefono=telefono,
        email=(email or "").strip().lower() or None,
        direccion=(direccion or "").strip() or None,
        mensaje=(mensaje or "").strip() or None,
        creado_en=ahora,
    )
    sesion.add(solicitud)
    sesion.flush()
    return solicitud


def solicitudes(sesion: Session) -> list[SolicitudComercio]:
    return list(
        sesion.scalars(select(SolicitudComercio).order_by(SolicitudComercio.creado_en.desc()))
    )
