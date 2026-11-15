import re
from datetime import datetime

from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.auditoria import auditar
from app.core.seguridad import token_vecino
from app.modulos.boletas import servicio as boletas
from app.modulos.canjes import servicio as canjes
from app.modulos.parametros.reglas import Parametros
from app.modulos.vecinos import reglas
from app.modulos.vecinos.esquemas import EstadoVecino
from app.modulos.vecinos.modelos import Vecino, VecinoEmpleo


def inscribir(
    sesion: Session,
    nombre: str,
    telefono: str,
    comercio_origen_id: int | None,
    ahora: datetime,
    es_demo: bool = False,
) -> Vecino:
    if not nombre.strip():
        raise ValueError("Escribe tu nombre.")
    telefono = reglas.normalizar_telefono(telefono)
    if sesion.scalar(select(Vecino.id).where(Vecino.telefono == telefono)):
        raise ValueError("Ese número ya está inscrito en Red Vecina.")
    vecino = Vecino(
        nombre=nombre.strip(),
        telefono=telefono,
        token=token_vecino(),
        comercio_origen_id=comercio_origen_id,
        consentimiento_en=ahora,
        es_demo=es_demo,
        creado_en=ahora,
    )
    sesion.add(vecino)
    sesion.flush()
    return vecino


def trabaja_en(sesion: Session, vecino_id: int, comercio_id: int) -> bool:
    return bool(
        sesion.scalar(
            select(VecinoEmpleo.id).where(
                VecinoEmpleo.vecino_id == vecino_id, VecinoEmpleo.comercio_id == comercio_id
            )
        )
    )


def boletas_validadas(sesion: Session, vecino_id: int) -> int:
    return boletas.contar_aprobadas(sesion, vecino_id)


def compras(sesion: Session, vecino_id: int) -> list[reglas.Compra]:
    """Boletas aprobadas y canjes usados del vecino (Anexo A.9)."""
    return [
        reglas.Compra(comercio_id=c, momento=f, con_canje=False)
        for c, f in boletas.compras_aprobadas(sesion, vecino_id)
    ] + [
        reglas.Compra(comercio_id=c, momento=u, con_canje=True)
        for c, u in canjes.usados(sesion, vecino_id)
    ]


def comercios_donde_compro(sesion: Session, vecino_id: int) -> set[int]:
    return set(reglas.primeras_compras(compras(sesion, vecino_id)))


def obtener(sesion: Session, vecino_id: int) -> Vecino | None:
    return sesion.get(Vecino, vecino_id)


def por_token(sesion: Session, token: str) -> Vecino | None:
    """El vecino del enlace personal. Una cuenta cerrada no tiene enlace válido."""
    if not token or len(token) > 64:
        return None
    vecino = sesion.scalar(select(Vecino).where(Vecino.token == token))
    if vecino is None or vecino.estado == EstadoVecino.CERRADO:
        return None
    return vecino


def regenerar_token(sesion: Session, vecino_id: int, ahora: datetime, usuario_id: int) -> Vecino:
    """El operador entrega un enlace nuevo; el anterior deja de funcionar (sección 3)."""
    vecino = obtener(sesion, vecino_id)
    if vecino is None:
        raise ValueError("No encontramos a este vecino.")
    vecino.token = token_vecino()
    auditar(sesion, "regenerar_enlace", "vecino", vecino_id, usuario_id, {}, ahora)
    sesion.flush()
    return vecino


def buscar(sesion: Session, texto: str, limite: int) -> list[Vecino]:
    """Por nombre o teléfono. Sin texto, los inscritos más recientes."""
    consulta = select(Vecino).order_by(Vecino.creado_en.desc()).limit(limite)
    texto = texto.strip()
    if texto:
        digitos = re.sub(r"\D", "", texto)
        filtros = [Vecino.nombre.ilike(f"%{texto}%")]
        if len(digitos) >= 4:
            filtros.append(Vecino.telefono.contains(digitos))
        consulta = consulta.where(or_(*filtros))
    return list(sesion.scalars(consulta))


def contar_por_origen(sesion: Session, comercio_id: int) -> int:
    return (
        sesion.scalar(select(func.count(Vecino.id)).where(Vecino.comercio_origen_id == comercio_id))
        or 0
    )


class Derivado(BaseModel):
    vecino_id: int
    primera_compra: datetime
    recompra: bool


def derivados(sesion: Session, comercio_id: int, p: Parametros) -> list[Derivado]:
    """Clientes derivados de un comercio con su primera compra y si volvieron sin canje
    (sección 7.3 y Anexo A.9)."""
    boletas_por_vecino: dict[int, list[datetime]] = {}
    for vecino_id, fecha in boletas.compras_en_comercio(sesion, comercio_id):
        boletas_por_vecino.setdefault(vecino_id, []).append(fecha)
    canjes_por_vecino: dict[int, list[datetime]] = {}
    for vecino_id, usado in canjes.usados_en_comercio(sesion, comercio_id):
        canjes_por_vecino.setdefault(vecino_id, []).append(usado)
    ids = set(boletas_por_vecino) | set(canjes_por_vecino)
    if not ids:
        return []
    filas = sesion.execute(
        select(Vecino.id, Vecino.comercio_origen_id).where(Vecino.id.in_(ids))
    ).all()
    origenes = {vecino_id: origen for vecino_id, origen in filas}
    resultado = []
    for vecino_id in sorted(ids):
        propias = boletas_por_vecino.get(vecino_id, [])
        usados = canjes_por_vecino.get(vecino_id, [])
        primera = min(propias + usados)
        if not reglas.es_cliente_derivado(comercio_id, origenes.get(vecino_id), True):
            continue
        resultado.append(
            Derivado(
                vecino_id=vecino_id,
                primera_compra=primera,
                recompra=reglas.hubo_recompra_sin_canje(primera, propias, usados, p),
            )
        )
    return resultado


def registrar_empleo(sesion: Session, vecino_id: int, comercio_id: int) -> None:
    """A3: el vecino trabaja en ese comercio y no suma puntos ahí."""
    if not trabaja_en(sesion, vecino_id, comercio_id):
        sesion.add(VecinoEmpleo(vecino_id=vecino_id, comercio_id=comercio_id))
        sesion.flush()
