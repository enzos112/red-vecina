from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.dependencias import (
    Ahora,
    ComercioActual,
    Equipo,
    Params,
    SesionDB,
    UsuarioComercio,
    VecinoToken,
    ip,
    limitador,
)
from app.modulos.canjes import servicio
from app.modulos.canjes.esquemas import (
    CanjeSalida,
    CodigoEnCaja,
    CodigoSalida,
    EstadoCanje,
    MotivoSalida,
    OpcionesSalida,
    OpcionSalida,
    PedirCodigo,
    ResultadoCaja,
    ResultadoCajaSalida,
    UsoEnCaja,
)
from app.modulos.canjes.modelos import Canje
from app.modulos.canjes.reglas import Validacion
from app.modulos.comercios import servicio as comercios
from app.modulos.cuentas.modelos import Usuario
from app.modulos.vecinos import servicio as vecinos

router = APIRouter(tags=["Canjes"])

LIMITE_LISTA = 200  # tamaño de página, no regla de negocio
# Respuestas que delatan un intento de adivinar códigos: cuentan para el límite.
SOSPECHOSAS = {ResultadoCaja.NO_EXISTE, ResultadoCaja.OTRO_LOCAL}


def codigo_salida(sesion: Session, c: Canje) -> CodigoSalida:
    beneficio = comercios.obtener_beneficio(sesion, c.beneficio_id)
    comercio = comercios.obtener(sesion, c.comercio_id)
    return CodigoSalida(
        codigo=c.codigo,
        comercio_id=c.comercio_id,
        comercio=comercio.nombre if comercio else "",
        texto=beneficio.texto if beneficio else "",
        nivel=c.nivel,
        puntos=c.puntos,
        valor_pesos=c.valor_pesos,
        compra_minima=c.compra_minima,
        emitido_en=c.emitido_en,
        vence_en=c.vence_en,
    )


def canjes_salida(sesion: Session, lista: list[Canje]) -> list[CanjeSalida]:
    nombres = comercios.nombres(sesion, {c.comercio_id for c in lista})
    personas: dict[int, str] = {}
    for vecino_id in {c.vecino_id for c in lista}:
        vecino = vecinos.obtener(sesion, vecino_id)
        personas[vecino_id] = vecino.nombre if vecino else ""
    return [
        CanjeSalida(
            id=c.id,
            codigo=c.codigo,
            vecino_id=c.vecino_id,
            vecino=personas[c.vecino_id],
            comercio_id=c.comercio_id,
            comercio=nombres.get(c.comercio_id, ""),
            nivel=c.nivel,
            puntos=c.puntos,
            valor_pesos=c.valor_pesos,
            compra_minima=c.compra_minima,
            estado=c.estado,
            emitido_en=c.emitido_en,
            vence_en=c.vence_en,
            usado_en=c.usado_en,
            monto_ticket=c.monto_ticket,
            vencido_en=c.vencido_en,
            cuenta_para_p19=c.cuenta_para_p19,
        )
        for c in lista
    ]


# --- Vecino ---


@router.get("/t/{token}/opciones", summary="Beneficios que puede canjear, en el orden de 6.2")
def opciones(vecino: VecinoToken, sesion: SesionDB, ahora: Ahora, p: Params) -> OpcionesSalida:
    elegibilidad, resultado = servicio.opciones(sesion, vecino.id, ahora, p)
    activo = servicio.activo_de(sesion, vecino.id, ahora)
    return OpcionesSalida(
        puede=elegibilidad.puede,
        motivos=[MotivoSalida(**m.model_dump()) for m in elegibilidad.motivos],
        destacadas=[OpcionSalida(**o.model_dump()) for o in resultado.destacadas]
        if resultado
        else [],
        todas=[OpcionSalida(**o.model_dump()) for o in resultado.todas] if resultado else [],
        agotados=resultado.agotados if resultado else [],
        proxima_liberacion=resultado.proxima_liberacion if resultado else None,
        mensaje_sin_opciones=resultado.mensaje_sin_opciones if resultado else None,
        codigo_activo=codigo_salida(sesion, activo) if activo else None,
    )


@router.post(
    "/t/{token}/canjes",
    status_code=status.HTTP_201_CREATED,
    summary="Pedir un código de canje (retiene puntos y reserva cupo)",
)
def pedir(
    datos: PedirCodigo, vecino: VecinoToken, sesion: SesionDB, ahora: Ahora, p: Params
) -> CodigoSalida:
    canje = servicio.emitir(sesion, vecino.id, datos.beneficio_id, ahora, p)
    return codigo_salida(sesion, canje)


# --- Validador del comercio (B13): consultar y luego usar ---


def _en_caja(
    request: Request,
    usuario: Usuario,
    comercio_id: int,
    sesion: Session,
    codigo: str,
    validar,
) -> ResultadoCajaSalida:
    limite = limitador(request, "codigo")
    claves = (f"usuario:{usuario.id}", f"ip:{ip(request)}")
    limite.exigir(*claves)
    validacion: Validacion = validar()
    if validacion.resultado in SOSPECHOSAS:
        limite.fallo(*claves)
    salida = ResultadoCajaSalida(
        resultado=validacion.resultado,
        mensaje=validacion.mensaje,
        se_puede_usar=validacion.se_puede_usar,
    )
    canje = servicio.del_comercio(sesion, codigo, comercio_id)
    if canje is not None:
        beneficio = comercios.obtener_beneficio(sesion, canje.beneficio_id)
        salida.valor_pesos = canje.valor_pesos
        salida.compra_minima = canje.compra_minima
        salida.texto = beneficio.texto if beneficio else None
        salida.vence_en = canje.vence_en
    return salida


@router.post("/comercio/codigos/consultar", summary="Paso 1: ver si un código es válido aquí")
def consultar(
    datos: CodigoEnCaja,
    request: Request,
    usuario: UsuarioComercio,
    comercio: ComercioActual,
    sesion: SesionDB,
    ahora: Ahora,
) -> ResultadoCajaSalida:
    return _en_caja(
        request,
        usuario,
        comercio.id,
        sesion,
        datos.codigo,
        lambda: servicio.consultar(sesion, datos.codigo, comercio.id, ahora),
    )


@router.post("/comercio/codigos/usar", summary="Paso 2: usar el código con el monto de la compra")
def usar(
    datos: UsoEnCaja,
    request: Request,
    usuario: UsuarioComercio,
    comercio: ComercioActual,
    sesion: SesionDB,
    ahora: Ahora,
    p: Params,
) -> ResultadoCajaSalida:
    salida = _en_caja(
        request,
        usuario,
        comercio.id,
        sesion,
        datos.codigo,
        lambda: servicio.usar(
            sesion, datos.codigo, comercio.id, ahora, p, datos.monto_compra, usuario.id
        ),
    )
    salida.usado = salida.se_puede_usar
    if salida.usado:
        salida.se_puede_usar = False
        salida.mensaje = "Listo: código usado. Aplica el descuento en la caja."
    return salida


# --- Equipo (operador y admin) ---


@router.get("/admin/canjes", summary="Códigos emitidos, usados y vencidos")
def listar(
    _: Equipo,
    sesion: SesionDB,
    estado: EstadoCanje | None = None,
    comercio_id: int | None = None,
    vecino_id: int | None = None,
) -> list[CanjeSalida]:
    lista = servicio.listar(
        sesion, estado=estado, comercio_id=comercio_id, vecino_id=vecino_id, limite=LIMITE_LISTA
    )
    return canjes_salida(sesion, lista)


@router.post(
    "/admin/canjes/{canje_id}/local-cerrado",
    summary="El local estuvo cerrado: el vencimiento no cuenta para P19",
)
def local_cerrado(canje_id: int, usuario: Equipo, sesion: SesionDB, ahora: Ahora) -> CanjeSalida:
    if servicio.obtener(sesion, canje_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No encontramos ese código.")
    canje = servicio.marcar_local_cerrado(sesion, canje_id, ahora, usuario.id)
    return canjes_salida(sesion, [canje])[0]
