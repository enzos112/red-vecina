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
from app.core.tiempo import dia_local, inicio_dia_utc
from app.modulos.canjes import servicio
from app.modulos.canjes.esquemas import (
    CanjeSalida,
    CodigoEnCaja,
    CodigoSalida,
    EstadoCanje,
    IngresoDiferidoNuevo,
    IngresoDiferidoSalida,
    MotivoSalida,
    OpcionesSalida,
    OpcionSalida,
    PedirCodigo,
    ResultadoCaja,
    ResultadoCajaSalida,
    RevisionDiferido,
    UsoEnCaja,
)
from app.modulos.canjes.modelos import Canje, IngresoDiferido
from app.modulos.canjes.reglas import Validacion
from app.modulos.comercios import servicio as comercios
from app.modulos.cuentas.modelos import Usuario
from app.modulos.vecinos import servicio as vecinos

router = APIRouter(tags=["Canjes"])

LIMITE_LISTA = 200  # tamaño de página, no regla de negocio
# Respuestas que delatan un intento de adivinar códigos: cuentan para el límite.
SOSPECHOSAS = {ResultadoCaja.NO_EXISTE, ResultadoCaja.OTRO_LOCAL}


def diferidos_salida(sesion: Session, lista: list[IngresoDiferido]) -> list[IngresoDiferidoSalida]:
    nombres = comercios.nombres(sesion, {d.comercio_id for d in lista})
    salida = []
    for d in lista:
        canje = servicio.obtener(sesion, d.canje_id) if d.canje_id else None
        salida.append(
            IngresoDiferidoSalida(
                id=d.id,
                comercio_id=d.comercio_id,
                comercio=nombres.get(d.comercio_id, ""),
                codigo=d.codigo,
                monto_compra=d.monto_compra,
                aplicado_en=d.aplicado_en,
                registrado_en=d.registrado_en,
                resultado=ResultadoCaja(d.resultado),
                mensaje=d.mensaje,
                descontado=canje is not None,
                valor_pesos=canje.valor_pesos if canje else None,
                revisado_en=d.revisado_en,
                nota_revision=d.nota_revision,
            )
        )
    return salida


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


@router.post(
    "/comercio/codigos/diferido",
    status_code=status.HTTP_201_CREATED,
    summary="Ingresar un código que se aplicó sin internet (queda para revisión)",
)
def diferido(
    datos: IngresoDiferidoNuevo,
    request: Request,
    usuario: UsuarioComercio,
    comercio: ComercioActual,
    sesion: SesionDB,
    ahora: Ahora,
    p: Params,
) -> IngresoDiferidoSalida:
    limite = limitador(request, "codigo")
    claves = (f"usuario:{usuario.id}", f"ip:{ip(request)}")
    limite.exigir(*claves)
    ingreso = servicio.registrar_diferido(
        sesion,
        datos.codigo,
        comercio.id,
        datos.aplicado_en or ahora,
        datos.monto_compra,
        ahora,
        p,
        usuario.id,
    )
    if ResultadoCaja(ingreso.resultado) in SOSPECHOSAS:
        limite.fallo(*claves)
    return diferidos_salida(sesion, [ingreso])[0]


@router.get("/comercio/codigos/diferidos", summary="Códigos que ingresé sin internet hoy")
def mis_diferidos(
    comercio: ComercioActual, sesion: SesionDB, ahora: Ahora
) -> list[IngresoDiferidoSalida]:
    lista = servicio.diferidos(
        sesion, comercio_id=comercio.id, desde=inicio_dia_utc(dia_local(ahora)), limite=LIMITE_LISTA
    )
    return diferidos_salida(sesion, lista)


# --- Equipo (operador y admin) ---


@router.get("/admin/canjes/diferidos", summary="Códigos ingresados sin internet, por revisar")
def diferidos_por_revisar(
    _: Equipo, sesion: SesionDB, pendientes: bool = True
) -> list[IngresoDiferidoSalida]:
    return diferidos_salida(
        sesion, servicio.diferidos(sesion, pendientes=pendientes, limite=LIMITE_LISTA)
    )


@router.post("/admin/canjes/diferidos/{ingreso_id}/revisado", summary="Marcar un ingreso revisado")
def marcar_revisado(
    ingreso_id: int, datos: RevisionDiferido, usuario: Equipo, sesion: SesionDB, ahora: Ahora
) -> IngresoDiferidoSalida:
    ingreso = servicio.revisar_diferido(sesion, ingreso_id, datos.nota, ahora, usuario.id)
    return diferidos_salida(sesion, [ingreso])[0]


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
