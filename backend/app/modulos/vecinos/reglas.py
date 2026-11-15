"""Primera compra, cliente derivado y recompra sin canje (A2, sección 7.3, Anexo A.9).

Funciones puras: reciben datos y parámetros, no tocan la base de datos.
"""

import re
from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict

from app.core.tiempo import dia_local
from app.modulos.parametros.reglas import Parametros


class Compra(BaseModel):
    """Una compra del vecino en un comercio: boleta aprobada o canje usado."""

    model_config = ConfigDict(frozen=True)

    comercio_id: int
    momento: datetime
    con_canje: bool  # True si es un canje usado


def primeras_compras(compras: list[Compra]) -> dict[int, datetime]:
    """Primera compra por comercio: la primera boleta aprobada o el primer canje usado."""
    primeras: dict[int, datetime] = {}
    for c in compras:
        if c.comercio_id not in primeras or c.momento < primeras[c.comercio_id]:
            primeras[c.comercio_id] = c.momento
    return primeras


def es_cliente_derivado(comercio_id: int, comercio_origen_id: int | None, compro: bool) -> bool:
    """Se cuenta una vez por par vecino-comercio, para siempre."""
    return compro and comercio_origen_id is not None and comercio_id != comercio_origen_id


def boleta_asociada_a_canje(fecha_boleta: datetime, canjes_usados: list[datetime]) -> bool:
    """Misma tienda y mismo día calendario que un canje usado (se filtra por comercio antes)."""
    dia = dia_local(fecha_boleta)
    return any(dia_local(u) == dia for u in canjes_usados)


def hubo_recompra_sin_canje(
    primera_compra: datetime,
    boletas: list[datetime],
    canjes_usados: list[datetime],
    p: Parametros,
) -> bool:
    """Una boleta aprobada en un día posterior, dentro de U5 días, sin canje asociado.

    `boletas` y `canjes_usados` son del mismo vecino en el mismo comercio.
    """
    limite = primera_compra + timedelta(days=p.U5.dias)
    dia_primera = dia_local(primera_compra)
    return any(
        dia_local(b) > dia_primera and b <= limite and not boleta_asociada_a_canje(b, canjes_usados)
        for b in boletas
    )


def normalizar_telefono(texto: str) -> str:
    """Celular chileno a formato +569XXXXXXXX. Lanza ValueError si no lo es."""
    digitos = re.sub(r"\D", "", texto)
    if digitos.startswith("56"):
        digitos = digitos[2:]
    if not re.fullmatch(r"9\d{8}", digitos):
        raise ValueError("Escribe un celular chileno de 9 dígitos, por ejemplo 9 1234 5678.")
    return "+56" + digitos
