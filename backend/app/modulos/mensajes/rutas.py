from fastapi import APIRouter

from app.core.dependencias import Admin, Ahora, Params, SesionDB
from app.modulos.cuentas import servicio as cuentas
from app.modulos.mensajes import reglas, servicio
from app.modulos.mensajes.esquemas import (
    PlantillaCambio,
    PlantillaSalida,
    VistaPrevia,
    VistaPreviaSalida,
)
from app.modulos.parametros.reglas import Parametros

router = APIRouter(tags=["Mensajes"])


def _salida(base: dict[str, str], guardada, ejemplo: dict[str, str], nombres) -> PlantillaSalida:
    texto = guardada.texto if guardada else base["texto"]
    return PlantillaSalida(
        clave=base["clave"],
        momento=base["momento"],
        texto=texto,
        texto_base=base["texto"],
        variables=sorted(servicio.permitidas(base["clave"])),
        ejemplo={k: v for k, v in ejemplo.items() if k in servicio.permitidas(base["clave"])},
        vista_previa=reglas.armar(texto, ejemplo),
        editada=texto != base["texto"],
        actualizado_en=guardada.actualizado_en if guardada else None,
        actualizado_por=nombres.get(guardada.actualizado_por) if guardada else None,
    )


def _ejemplo(p: Parametros) -> dict[str, str]:
    return servicio.ejemplo(p.U11.horas)


@router.get("/admin/plantillas", summary="Plantillas de mensajes con vista previa (solo admin)")
def listar(_: Admin, sesion: SesionDB, p: Params) -> list[PlantillaSalida]:
    nombres = {u.id: u.nombre for u in cuentas.listar(sesion)}
    ejemplo = _ejemplo(p)
    return [_salida(b, g, ejemplo, nombres) for b, g in servicio.listar(sesion)]


@router.post(
    "/admin/plantillas/{clave}/vista-previa",
    summary="Cómo se vería un texto con datos de ejemplo, sin guardarlo",
)
def vista_previa(clave: str, datos: VistaPrevia, _: Admin, p: Params) -> VistaPreviaSalida:
    try:
        texto = reglas.validar_texto(datos.texto, servicio.permitidas(clave))
    except ValueError as error:
        return VistaPreviaSalida(texto="", error=str(error))
    return VistaPreviaSalida(texto=reglas.armar(texto, _ejemplo(p)))


@router.put("/admin/plantillas/{clave}", summary="Cambiar el texto de una plantilla")
def editar(
    clave: str, datos: PlantillaCambio, admin: Admin, sesion: SesionDB, ahora: Ahora, p: Params
) -> PlantillaSalida:
    servicio.editar(sesion, clave, datos.texto, ahora, admin.id)
    nombres = {u.id: u.nombre for u in cuentas.listar(sesion)}
    base, guardada = next((b, g) for b, g in servicio.listar(sesion) if b["clave"] == clave)
    return _salida(base, guardada, _ejemplo(p), nombres)
