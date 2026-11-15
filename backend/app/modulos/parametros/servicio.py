from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auditoria import auditar
from app.core.tiempo import ahora_utc
from app.modulos.parametros import reglas
from app.modulos.parametros.modelos import CambioParametro, Parametro
from app.modulos.parametros.reglas import Parametros


def inicializar(sesion: Session) -> int:
    """Carga los parámetros que falten con su valor inicial. No pisa valores existentes."""
    existentes = set(sesion.scalars(select(Parametro.codigo)))
    nuevos = 0
    for orden, item in enumerate(reglas.leer_catalogo()):
        if item["codigo"] in existentes:
            continue
        valor = reglas.validar_valor(item["codigo"], item["valor"])
        sesion.add(
            Parametro(
                codigo=item["codigo"],
                grupo=item["grupo"],
                orden=orden,
                nombre=item["nombre"],
                descripcion=item["descripcion"],
                valor=valor,
            )
        )
        sesion.add(
            CambioParametro(
                codigo=item["codigo"],
                valor_anterior=None,
                valor_nuevo=valor,
                motivo="Valor inicial",
            )
        )
        nuevos += 1
    sesion.flush()
    return nuevos


def cargar(sesion: Session) -> Parametros:
    filas = sesion.scalars(select(Parametro)).all()
    return reglas.construir_parametros({f.codigo: f.valor for f in filas})


def listar(sesion: Session) -> list[Parametro]:
    return list(sesion.scalars(select(Parametro).order_by(Parametro.orden)))


def historial(sesion: Session, codigo: str) -> list[CambioParametro]:
    if sesion.get(Parametro, codigo) is None:
        raise ValueError(f"No existe el parámetro {codigo}.")
    return list(
        sesion.scalars(
            select(CambioParametro)
            .where(CambioParametro.codigo == codigo)
            .order_by(CambioParametro.cambiado_en.desc(), CambioParametro.id.desc())
        )
    )


def cambiar(
    sesion: Session,
    codigo: str,
    valor: dict[str, Any],
    motivo: str,
    usuario_id: int | None,
    ahora: datetime | None = None,
) -> Parametro:
    if not motivo.strip():
        raise ValueError("Indica el motivo del cambio.")
    fila = sesion.get(Parametro, codigo)
    if fila is None:
        raise ValueError(f"No existe el parámetro {codigo}.")
    nuevo = reglas.validar_valor(codigo, valor)
    actuales = {f.codigo: f.valor for f in sesion.scalars(select(Parametro))}
    reglas.construir_parametros({**actuales, codigo: nuevo})  # valida el conjunto completo
    ahora = ahora or ahora_utc()
    sesion.add(
        CambioParametro(
            codigo=codigo,
            valor_anterior=fila.valor,
            valor_nuevo=nuevo,
            motivo=motivo,
            usuario_id=usuario_id,
            cambiado_en=ahora,
        )
    )
    fila.valor = nuevo
    fila.actualizado_en = ahora
    fila.actualizado_por = usuario_id
    auditar(sesion, "cambiar_parametro", "parametro", None, usuario_id, {"codigo": codigo}, ahora)
    sesion.flush()
    return fila
