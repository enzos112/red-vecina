from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auditoria import auditar
from app.modulos.comercios import reglas
from app.modulos.comercios.esquemas import EstadoBeneficio, EstadoComercio
from app.modulos.comercios.modelos import Beneficio, Comercio
from app.modulos.parametros.reglas import Parametros


def crear_comercio(
    sesion: Session,
    nombre: str,
    rubro: str,
    rut: str,
    direccion: str,
    alta_en: datetime,
    es_demo: bool = False,
) -> Comercio:
    if not reglas.rut_valido(rut):
        raise ValueError("El RUT no es válido. Escríbelo sin puntos y con guion: 76543210-3.")
    comercio = Comercio(
        nombre=nombre,
        rubro=rubro,
        rut=rut.upper(),
        direccion=direccion,
        slug=reglas.slug(nombre),
        alta_en=alta_en,
        es_demo=es_demo,
        creado_en=alta_en,
    )
    sesion.add(comercio)
    sesion.flush()
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


def por_rut(sesion: Session, rut: str) -> Comercio | None:
    return sesion.scalar(select(Comercio).where(Comercio.rut == rut.upper()))


def publicar_beneficios(
    sesion: Session,
    comercio_id: int,
    propuestos: list[reglas.BeneficioPropuesto],
    p: Parametros,
    ahora: datetime,
    aprobado_por: int | None = None,
    vigente_desde: datetime | None = None,
) -> list[Beneficio]:
    """Registra el conjunto de beneficios de un comercio, validado contra B1 a B6.

    Con `aprobado_por` quedan aprobados; rigen desde `vigente_desde` o, si no se indica,
    desde el primer inicio de semana con U23 días de aviso.
    """
    errores = reglas.validar_beneficios(propuestos, p)
    if errores:
        raise ValueError(" ".join(errores))
    desde = vigente_desde or reglas.rige_desde(ahora, p)
    creados = []
    for b in propuestos:
        beneficio = Beneficio(
            comercio_id=comercio_id,
            nivel=b.nivel,
            tipo=b.tipo,
            texto=b.texto,
            restriccion=b.restriccion,
            dias_permitidos=sorted(set(b.dias_permitidos)) if b.dias_permitidos else None,
            compra_minima=b.compra_minima,
            estado=EstadoBeneficio.APROBADO if aprobado_por else EstadoBeneficio.PENDIENTE,
            vigente_desde=desde,
            revisado_por=aprobado_por,
            revisado_en=ahora if aprobado_por else None,
            creado_en=ahora,
        )
        sesion.add(beneficio)
        creados.append(beneficio)
    sesion.flush()
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


def beneficios_vigentes(sesion: Session, comercio_id: int, ahora: datetime) -> list[Beneficio]:
    """Por cada nivel, el beneficio aprobado más reciente que ya rige."""
    filas = sesion.scalars(
        select(Beneficio)
        .where(
            Beneficio.comercio_id == comercio_id,
            Beneficio.estado == EstadoBeneficio.APROBADO,
            Beneficio.vigente_desde <= ahora,
        )
        .order_by(Beneficio.vigente_desde, Beneficio.id)
    ).all()
    por_nivel: dict[int, Beneficio] = {}
    for b in filas:
        por_nivel[b.nivel] = b
    return [por_nivel[n] for n in sorted(por_nivel)]


def obtener_beneficio(sesion: Session, beneficio_id: int) -> Beneficio | None:
    return sesion.get(Beneficio, beneficio_id)
