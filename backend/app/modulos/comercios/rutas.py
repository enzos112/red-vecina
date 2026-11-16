from fastapi import APIRouter, HTTPException, Request, status

from app.core.dependencias import (
    Admin,
    Ahora,
    ComercioActual,
    Config,
    Equipo,
    Params,
    SesionDB,
    UsuarioComercio,
    ip,
    limitador,
)
from app.modulos.comercios import reglas, servicio
from app.modulos.comercios.esquemas import (
    Aprobacion,
    BeneficioSalida,
    BeneficiosComercio,
    CausaSancion,
    ComercioAdmin,
    ComercioCambio,
    ComercioDetalle,
    ComercioNuevo,
    ComercioPublico,
    NivelSalida,
    PropuestaBeneficios,
    PropuestaPendiente,
    Revision,
    SancionNueva,
    SancionSalida,
    SolicitudCambio,
    SolicitudNueva,
    SolicitudRecibida,
    SolicitudSalida,
    SugerenciaSancion,
    UsuarioDeComercio,
)
from app.modulos.comercios.modelos import Beneficio
from app.modulos.cuentas import servicio as cuentas
from app.modulos.parametros.reglas import Parametros, nivel, niveles
from app.modulos.vecinos import reglas as reglas_vecinos

router = APIRouter(tags=["Comercios"])


def beneficio_salida(b: Beneficio, p: Parametros) -> BeneficioSalida:
    n = nivel(p, b.nivel)
    return BeneficioSalida(
        id=b.id,
        nivel=b.nivel,
        nombre_nivel=n.nombre,
        puntos=n.puntos,
        valor_pesos=n.valor_pesos,
        tipo=b.tipo,
        texto=b.texto,
        restriccion=b.restriccion,
        dias_permitidos=b.dias_permitidos,
        compra_minima=b.compra_minima,
        estado=b.estado,
        vigente_desde=b.vigente_desde,
        comentario_revision=b.comentario_revision,
    )


# --- Público ---


@router.get("/red/comercios", summary="Comercios de la red con su beneficio destacado")
def red(sesion: SesionDB, ahora: Ahora, p: Params, config: Config) -> list[ComercioPublico]:
    """En producción la página pública no muestra comercios de demostración: solo los reales.
    En desarrollo sí, para poder probarla."""
    resultado = []
    for c in servicio.activos(sesion):
        if c.es_demo and config.es_produccion:
            continue
        destacado = servicio.beneficio_destacado(sesion, c.id, ahora, p)
        resultado.append(
            ComercioPublico(
                nombre=c.nombre,
                slug=c.slug,
                rubro=c.rubro,
                direccion=c.direccion,
                destacado=beneficio_salida(destacado, p) if destacado else None,
            )
        )
    return resultado


@router.get("/red/comercios/{slug}", summary="Un comercio de la red (página de inscripción)")
def comercio_publico(slug: str, sesion: SesionDB, ahora: Ahora, p: Params) -> ComercioPublico:
    c = servicio.por_slug(sesion, slug)
    if c is None or not servicio.en_red(c):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No encontramos ese comercio en la red.")
    destacado = servicio.beneficio_destacado(sesion, c.id, ahora, p)
    return ComercioPublico(
        nombre=c.nombre,
        slug=c.slug,
        rubro=c.rubro,
        direccion=c.direccion,
        destacado=beneficio_salida(destacado, p) if destacado else None,
    )


@router.post(
    "/red/solicitudes",
    status_code=status.HTTP_201_CREATED,
    summary="Un comercio quiere unirse al piloto",
)
def solicitar(
    datos: SolicitudNueva, request: Request, sesion: SesionDB, ahora: Ahora
) -> SolicitudRecibida:
    limite = limitador(request, "inscripcion")
    limite.exigir(ip(request))
    solicitud = servicio.registrar_solicitud(
        sesion,
        comercio=datos.comercio,
        rubro=datos.rubro,
        contacto=datos.contacto,
        telefono=reglas_vecinos.normalizar_telefono(datos.telefono),
        email=datos.email,
        direccion=datos.direccion,
        mensaje=datos.mensaje,
        ahora=ahora,
    )
    limite.fallo(ip(request))  # cuenta cada envío, no solo los fallidos
    return SolicitudRecibida(
        id=solicitud.id,
        mensaje="Recibimos tus datos. Te contactaremos por WhatsApp para conversar.",
    )


# --- Portal del comercio ---


def _beneficios_comercio(sesion, comercio_id: int, ahora, p: Parametros) -> BeneficiosComercio:
    def lista(bs: list[Beneficio]) -> list[BeneficioSalida]:
        return [beneficio_salida(b, p) for b in bs]

    return BeneficiosComercio(
        niveles=[
            NivelSalida(**n.model_dump(), obligatorio=n.numero == p.P9.obligatorio)
            for n in niveles(p)
        ],
        dias_minimos=p.U9.dias_minimos,
        rige_si_pides_hoy=reglas.rige_desde(ahora, p),
        vigentes=lista(servicio.beneficios_vigentes(sesion, comercio_id, ahora)),
        proximos=lista(servicio.beneficios_proximos(sesion, comercio_id, ahora)),
        pendientes=lista(servicio.pendientes(sesion, comercio_id)),
        rechazados=lista(servicio.ultimo_rechazo(sesion, comercio_id)),
    )


@router.get("/comercio/beneficios", summary="Mis beneficios: vigentes, próximos y pendientes")
def mis_beneficios(
    comercio: ComercioActual, sesion: SesionDB, ahora: Ahora, p: Params
) -> BeneficiosComercio:
    return _beneficios_comercio(sesion, comercio.id, ahora, p)


@router.post(
    "/comercio/beneficios",
    summary="Proponer beneficios (quedan pendientes y rigen desde un lunes)",
)
def proponer(
    datos: PropuestaBeneficios,
    comercio: ComercioActual,
    usuario: UsuarioComercio,
    sesion: SesionDB,
    ahora: Ahora,
    p: Params,
) -> BeneficiosComercio:
    propuestos = [reglas.BeneficioPropuesto(**b.model_dump()) for b in datos.beneficios]
    servicio.proponer_beneficios(sesion, comercio.id, propuestos, p, ahora, usuario.id)
    return _beneficios_comercio(sesion, comercio.id, ahora, p)


# --- Equipo (operador y admin) ---


@router.get("/admin/comercios", summary="Todos los comercios")
def comercios(_: Equipo, sesion: SesionDB) -> list[ComercioAdmin]:
    return [ComercioAdmin.model_validate(c) for c in servicio.todos(sesion)]


@router.post(
    "/admin/comercios",
    status_code=status.HTTP_201_CREATED,
    summary="Dar de alta un comercio (solo admin)",
)
def crear(datos: ComercioNuevo, admin: Admin, sesion: SesionDB, ahora: Ahora) -> ComercioAdmin:
    comercio = servicio.crear_comercio(
        sesion,
        datos.nombre,
        datos.rubro,
        datos.rut,
        datos.direccion,
        alta_en=ahora,
        usuario_id=admin.id,
    )
    return ComercioAdmin.model_validate(comercio)


@router.patch(
    "/admin/comercios/{comercio_id}",
    summary="Editar, suspender, reactivar o retirar un comercio (solo admin)",
)
def cambiar(
    comercio_id: int, datos: ComercioCambio, admin: Admin, sesion: SesionDB, ahora: Ahora
) -> ComercioAdmin:
    comercio = servicio.editar(
        sesion,
        comercio_id,
        nombre=datos.nombre,
        rubro=datos.rubro,
        rut=datos.rut,
        direccion=datos.direccion,
        ahora=ahora,
        usuario_id=admin.id,
    )
    if datos.estado is not None and datos.estado != comercio.estado:
        comercio = servicio.cambiar_estado(sesion, comercio_id, datos.estado, ahora, admin.id)
    return ComercioAdmin.model_validate(comercio)


def _detalle(sesion, comercio_id: int, ahora, p: Parametros) -> ComercioDetalle:
    comercio = servicio.obtener(sesion, comercio_id)
    if comercio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No encontramos ese comercio.")

    def lista(bs: list[Beneficio]) -> list[BeneficioSalida]:
        return [beneficio_salida(b, p) for b in bs]

    sugerencias = {}
    for causa in CausaSancion:
        s = servicio.sugerencia_sancion(sesion, comercio_id, causa, ahora, p)
        sugerencias[causa] = SugerenciaSancion(
            tipo=s.tipo, razon=s.razon, semanas_suspension=p.U21.semanas_suspension
        )
    return ComercioDetalle(
        comercio=ComercioAdmin.model_validate(comercio),
        usuarios=[
            UsuarioDeComercio.model_validate(u)
            for u in cuentas.listar(sesion)
            if u.comercio_id == comercio_id
        ],
        vigentes=lista(servicio.beneficios_vigentes(sesion, comercio_id, ahora)),
        proximos=lista(servicio.beneficios_proximos(sesion, comercio_id, ahora)),
        pendientes=lista(servicio.pendientes(sesion, comercio_id)),
        sanciones=[
            SancionSalida.model_validate(x) for x in servicio.sanciones(sesion, comercio_id)
        ],
        sugerencias=sugerencias,
    )


@router.get(
    "/admin/comercios/{comercio_id}", summary="Un comercio con usuarios, beneficios y sanciones"
)
def detalle(
    comercio_id: int, _: Equipo, sesion: SesionDB, ahora: Ahora, p: Params
) -> ComercioDetalle:
    return _detalle(sesion, comercio_id, ahora, p)


@router.post(
    "/admin/comercios/{comercio_id}/sanciones",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una sanción con su evidencia (sección 9)",
)
def sancionar(
    comercio_id: int,
    datos: SancionNueva,
    usuario: Equipo,
    sesion: SesionDB,
    ahora: Ahora,
    p: Params,
) -> ComercioDetalle:
    servicio.sancionar(
        sesion,
        comercio_id,
        tipo=datos.tipo,
        causa=datos.causa,
        motivo=datos.motivo,
        evidencia=datos.evidencia,
        ahora=ahora,
        p=p,
        usuario_id=usuario.id,
    )
    return _detalle(sesion, comercio_id, ahora, p)


@router.get("/admin/beneficios/pendientes", summary="Beneficios por aprobar (B7)")
def por_aprobar(_: Equipo, sesion: SesionDB, ahora: Ahora, p: Params) -> list[PropuestaPendiente]:
    resultado = []
    for comercio_id in servicio.comercios_con_pendientes(sesion):
        comercio = servicio.obtener(sesion, comercio_id)
        conjunto = servicio.pendientes(sesion, comercio_id)
        resultado.append(
            PropuestaPendiente(
                comercio_id=comercio_id,
                comercio=comercio.nombre if comercio else "",
                solicitado_en=min(b.creado_en for b in conjunto),
                beneficios=[beneficio_salida(b, p) for b in conjunto],
                vigentes=[
                    beneficio_salida(b, p)
                    for b in servicio.beneficios_vigentes(sesion, comercio_id, ahora)
                ],
            )
        )
    return resultado


@router.post(
    "/admin/comercios/{comercio_id}/beneficios/aprobar",
    summary="Aprobar la propuesta de beneficios de un comercio",
)
def aprobar(
    comercio_id: int,
    usuario: Equipo,
    sesion: SesionDB,
    ahora: Ahora,
    p: Params,
    datos: Aprobacion | None = None,
) -> list[BeneficioSalida]:
    comentario = datos.comentario if datos else None
    conjunto = servicio.aprobar_propuesta(sesion, comercio_id, p, ahora, usuario.id, comentario)
    return [beneficio_salida(b, p) for b in conjunto]


@router.post(
    "/admin/comercios/{comercio_id}/beneficios/rechazar",
    summary="Rechazar la propuesta de beneficios con un comentario",
)
def rechazar(
    comercio_id: int,
    datos: Revision,
    usuario: Equipo,
    sesion: SesionDB,
    ahora: Ahora,
    p: Params,
) -> list[BeneficioSalida]:
    conjunto = servicio.rechazar_propuesta(sesion, comercio_id, datos.comentario, ahora, usuario.id)
    return [beneficio_salida(b, p) for b in conjunto]


@router.get("/admin/solicitudes", summary="Comercios interesados en unirse")
def solicitudes(_: Equipo, sesion: SesionDB) -> list[SolicitudSalida]:
    return [SolicitudSalida.model_validate(s) for s in servicio.solicitudes(sesion)]


@router.patch("/admin/solicitudes/{solicitud_id}", summary="Marcar una solicitud como atendida")
def atender(
    solicitud_id: int, datos: SolicitudCambio, usuario: Equipo, sesion: SesionDB, ahora: Ahora
) -> SolicitudSalida:
    solicitud = servicio.atender_solicitud(
        sesion,
        solicitud_id,
        estado=datos.estado,
        nota=datos.nota,
        comercio_id=datos.comercio_id,
        ahora=ahora,
        usuario_id=usuario.id,
    )
    return SolicitudSalida.model_validate(solicitud)
