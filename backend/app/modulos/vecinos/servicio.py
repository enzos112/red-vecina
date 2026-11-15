from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.seguridad import token_vecino
from app.modulos.boletas import servicio as boletas
from app.modulos.canjes import servicio as canjes
from app.modulos.vecinos import reglas
from app.modulos.vecinos.modelos import Vecino, VecinoEmpleo


def inscribir(
    sesion: Session,
    nombre: str,
    telefono: str,
    comercio_origen_id: int | None,
    ahora: datetime,
    es_demo: bool = False,
) -> Vecino:
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


def registrar_empleo(sesion: Session, vecino_id: int, comercio_id: int) -> None:
    """A3: el vecino trabaja en ese comercio y no suma puntos ahí."""
    if not trabaja_en(sesion, vecino_id, comercio_id):
        sesion.add(VecinoEmpleo(vecino_id=vecino_id, comercio_id=comercio_id))
        sesion.flush()
