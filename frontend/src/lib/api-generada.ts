// Archivo generado por `python -m app.cli cliente-ts` desde el OpenAPI del backend.
// No lo edites a mano: cambia las rutas o los esquemas y vuelve a generarlo.

export type Pedir = <T>(
  metodo: string,
  ruta: string,
  opciones?: { json?: unknown; form?: FormData; consulta?: Record<string, unknown> },
) => Promise<T>

export type Ajuste = {
  /** Positivo suma, negativo resta. */
  puntos: number
  motivo: string
}

export type BeneficioNuevo = {
  nivel: number
  tipo: TipoBeneficio
  texto: string
  restriccion?: string | null
  dias_permitidos?: number[] | null
  compra_minima: number
}

export type BeneficioSalida = {
  id: number
  nivel: number
  nombre_nivel: string
  puntos: number
  valor_pesos: number
  tipo: TipoBeneficio
  texto: string
  restriccion: string | null
  dias_permitidos: number[] | null
  compra_minima: number
  estado: EstadoBeneficio
  vigente_desde: string | null
  comentario_revision: string | null
}

export type BeneficiosComercio = {
  niveles: NivelSalida[]
  vigentes: BeneficioSalida[]
  proximos: BeneficioSalida[]
  pendientes: BeneficioSalida[]
  rechazados: BeneficioSalida[]
}

export type Body_boletas__subir = {
  /** Foto de la boleta (JPG, PNG o WEBP). */
  foto: string
}

export type BoletaDetalle = {
  id: number
  estado: EstadoBoleta
  origen: OrigenBoleta
  recibida_en: string
  tiene_imagen: boolean
  comercio_id: number | null
  comercio: string | null
  folio: string | null
  fecha_compra: string | null
  monto_total: number | null
  monto_valido: number | null
  puntos: number | null
  motivo: string | null
  revisada_en: string | null
  vecino: VecinoDeBoleta
  revisar_antes_de: string
  lectura: Record<string, unknown> | null
  controles: ControlSalida[] | null
}

export type BoletaEnCola = {
  id: number
  estado: EstadoBoleta
  origen: OrigenBoleta
  recibida_en: string
  tiene_imagen: boolean
  comercio_id: number | null
  comercio: string | null
  folio: string | null
  fecha_compra: string | null
  monto_total: number | null
  monto_valido: number | null
  puntos: number | null
  motivo: string | null
  revisada_en: string | null
  vecino: VecinoDeBoleta
  revisar_antes_de: string
}

export type BoletaSalida = {
  id: number
  estado: EstadoBoleta
  origen: OrigenBoleta
  recibida_en: string
  tiene_imagen: boolean
  comercio_id: number | null
  comercio: string | null
  folio: string | null
  fecha_compra: string | null
  monto_total: number | null
  monto_valido: number | null
  puntos: number | null
  motivo: string | null
  revisada_en: string | null
}

export type CambioParametroNuevo = {
  valor: Record<string, unknown>
  motivo: string
}

export type CambioParametroSalida = {
  id: number
  codigo: string
  valor_anterior: Record<string, unknown> | null
  valor_nuevo: Record<string, unknown>
  motivo: string
  usuario_id: number | null
  cambiado_en: string
}

export type CanjeSalida = {
  id: number
  codigo: string
  vecino_id: number
  vecino: string
  comercio_id: number
  comercio: string
  nivel: number
  puntos: number
  valor_pesos: number
  compra_minima: number
  estado: EstadoCanje
  emitido_en: string
  vence_en: string
  usado_en: string | null
  monto_ticket: number | null
  vencido_en: string | null
  cuenta_para_p19: boolean
}

export type CodigoEnCaja = {
  /** Acepta espacios: 482 913. */
  codigo: string
}

/** Un código del vecino: lo que muestra en la caja. */
export type CodigoSalida = {
  codigo: string
  comercio_id: number
  comercio: string
  texto: string
  nivel: number
  puntos: number
  valor_pesos: number
  compra_minima: number
  emitido_en: string
  vence_en: string
}

export type ColorControl = 'verde' | 'ambar' | 'rojo'

export type ComercioAdmin = {
  id: number
  nombre: string
  rubro: string
  rut: string
  direccion: string
  slug: string
  estado: EstadoComercio
  alta_en: string
  es_demo: boolean
}

export type ComercioCambio = {
  estado: EstadoComercio
}

export type ComercioDeUsuario = {
  id: number
  nombre: string
  slug: string
}

export type ComercioNuevo = {
  nombre: string
  rubro: string
  rut: string
  direccion: string
}

export type ComercioPublico = {
  nombre: string
  slug: string
  rubro: string
  direccion: string
  destacado: BeneficioSalida | null
}

export type ControlSalida = {
  clave: string
  color: ColorControl
  mensaje: string
}

export type CupoExtra = {
  /** Pesos que se suman al cupo de esta semana. */
  monto: number
}

export type CupoSalida = {
  semana: string
  base: number
  extra: number
  arrastre: number
  total: number
  reservado: number
  usado: number
  libre: number
  semaforo: Semaforo
  en_piso: boolean
  ventas_ventana: number
  dias_historia: number
  proxima_liberacion: string
}

/** Lo que el operador confirma o corrige al revisar la boleta. */
export type DatosBoleta = {
  comercio_id: number
  folio: string
  fecha_compra: string
  /** Pesos pagados (A7: ya descontado el canje). */
  monto_total: number
  /** Cigarros, recargas y similares. */
  monto_excluido?: number
}

export type EjecutarTareas = {
  forzar?: boolean
}

export type EnlaceNuevo = {
  enlace: string
}

export type EstadoBeneficio = 'pendiente' | 'aprobado' | 'rechazado' | 'reemplazado'

export type EstadoBoleta = 'pendiente' | 'aprobada' | 'rechazada'

export type EstadoCanje = 'activo' | 'usado' | 'vencido'

export type EstadoComercio = 'activo' | 'suspendido' | 'retirado'

export type EstadoVecino = 'activo' | 'suspendido' | 'cerrado'

export type Evaluacion = {
  monto_valido: number
  puntos_calculados: number
  puntos: number
  rechazo_sugerido: boolean
  controles: ControlSalida[]
}

export type GrupoParametro = 'red' | 'umbral'

export type IndicadorSalida = {
  clave: string
  nombre: string
  valor: number | null
  alerta: boolean
  senal: string | null
  accion: string | null
}

export type IndicadoresRedSalida = {
  red: IndicadorSalida[]
  comercios: ReporteComercioSalida[]
}

export type Inscripcion = {
  nombre: string
  telefono: string
  /** Slug del comercio cuyo QR escaneó (A2). */
  comercio?: string | null
  /** Aceptó las condiciones y el uso de datos (A1). */
  acepta_condiciones: boolean
}

export type Inscrito = {
  nombre: string
  token: string
  enlace: string
}

export type Login = {
  email: string
  contrasena: string
}

export type MotivoSalida = {
  clave: string
  mensaje: string
}

export type MovimientoSalida = {
  id: number
  tipo: TipoMovimiento
  puntos: number
  creado_en: string
  vence_en: string | null
  boleta_id: number | null
  canje_id: number | null
  motivo: string | null
}

/** Un nivel de P9 con su descuento (P2) y su compra mínima tope (P10). */
export type NivelSalida = {
  numero: number
  nombre: string
  puntos: number
  valor_pesos: number
  compra_minima_tope: number
}

export type OpcionSalida = {
  comercio_id: number
  comercio: string
  beneficio_id: number
  nivel: number
  puntos: number
  valor_pesos: number
  compra_minima: number
  texto: string
  nunca_compro: boolean
}

export type OpcionesSalida = {
  puede: boolean
  motivos: MotivoSalida[]
  destacadas: OpcionSalida[]
  todas: OpcionSalida[]
  agotados: string[]
  proxima_liberacion: string | null
  mensaje_sin_opciones: string | null
  codigo_activo: CodigoSalida | null
}

export type OrigenBoleta = 'vecino' | 'operador' | 'demo'

export type ParametroSalida = {
  codigo: string
  grupo: GrupoParametro
  orden: number
  nombre: string
  descripcion: string
  valor: Record<string, unknown>
  actualizado_en: string
  actualizado_por: number | null
}

export type PedirCodigo = {
  beneficio_id: number
}

export type PendientesSalida = {
  boletas: number
}

export type PropuestaBeneficios = {
  beneficios: BeneficioNuevo[]
}

export type PropuestaPendiente = {
  comercio_id: number
  comercio: string
  solicitado_en: string
  beneficios: BeneficioSalida[]
  vigentes: BeneficioSalida[]
}

export type ProximoNivel = {
  nombre: string
  puntos: number
  valor_pesos: number
  faltan: number
}

export type Rechazo = {
  motivo: string
}

export type ReporteComercioSalida = {
  comercio_id: number
  comercio: string
  desde: string
  hasta: string
  vecinos_inscritos: number
  ventas: number
  canjes_recibidos: number
  canjes_pesos: number
  clientes_derivados_total: number
  indicadores: IndicadorSalida[]
}

export type ResultadoCaja = 'valido' | 'no_existe' | 'otro_local' | 'vencido' | 'usado' | 'dia_no_permitido' | 'bajo_minimo'

export type ResultadoCajaSalida = {
  resultado: ResultadoCaja
  mensaje: string
  se_puede_usar: boolean
  usado?: boolean
  valor_pesos?: number | null
  compra_minima?: number | null
  texto?: string | null
  vence_en?: string | null
}

export type ResultadoTareas = {
  resultados: Record<string, Record<string, unknown>>
}

export type Revision = {
  comentario: string
}

export type Rol = 'admin' | 'operador' | 'comercio'

export type SaldoSalida = {
  disponible: number
  retenido: number
}

export type Semaforo = 'verde' | 'ambar' | 'rojo'

export type SolicitudNueva = {
  comercio: string
  rubro: string
  contacto: string
  telefono: string
  email?: string | null
  direccion?: string | null
  mensaje?: string | null
}

export type SolicitudRecibida = {
  id: number
  mensaje: string
}

export type SolicitudSalida = {
  id: number
  comercio: string
  rubro: string
  contacto: string
  telefono: string
  email: string | null
  direccion: string | null
  mensaje: string | null
  creado_en: string
}

export type Tarjeta = {
  nombre: string
  comercio_origen: string | null
  estado: EstadoVecino
  saldo: SaldoSalida
  pendientes: PendientesSalida
  por_vencer: VencimientoSalida[]
  proximo_nivel: ProximoNivel | null
  codigo_activo: CodigoSalida | null
  boletas: BoletaSalida[]
  movimientos: MovimientoSalida[]
}

export type TipoBeneficio = 'descuento' | 'producto'

export type TipoMovimiento = 'gana' | 'retiene' | 'libera' | 'canjea' | 'vence' | 'ajusta'

export type UsoEnCaja = {
  /** Acepta espacios: 482 913. */
  codigo: string
  /** Total de la compra antes del descuento. */
  monto_compra: number
}

export type UsuarioCambio = {
  activo: boolean
}

export type UsuarioNuevo = {
  email: string
  nombre: string
  contrasena: string
  rol: Rol
  comercio_id?: number | null
}

export type UsuarioSalida = {
  id: number
  email: string
  nombre: string
  rol: Rol
  comercio_id: number | null
  activo: boolean
  creado_en: string
}

export type VecinoDeBoleta = {
  id: number
  nombre: string
  telefono: string
}

export type VecinoDetalle = {
  id: number
  nombre: string
  telefono: string
  estado: EstadoVecino
  comercio_origen_id: number | null
  comercio_origen: string | null
  creado_en: string
  es_demo: boolean
  enlace: string
  consentimiento_en: string
  saldo: SaldoSalida
  por_vencer: VencimientoSalida[]
  movimientos: MovimientoSalida[]
  boletas: BoletaSalida[]
  canjes: CanjeSalida[]
}

export type VecinoResumen = {
  id: number
  nombre: string
  telefono: string
  estado: EstadoVecino
  comercio_origen_id: number | null
  comercio_origen: string | null
  creado_en: string
  es_demo: boolean
}

export type VencimientoSalida = {
  fecha: string
  puntos: number
}

export type Yo = {
  id: number
  email: string
  nombre: string
  rol: Rol
  comercio?: ComercioDeUsuario | null
}

/** Una función por ruta de la API, agrupadas por módulo del backend. */
export function crearApi(pedir: Pedir) {
  return {
    general: {
      /** Estado del servicio */
      salud: () =>
        pedir<Record<string, string>>('GET', `/salud`),
    },
    cuentas: {
      /** Iniciar sesión (admin, operador o comercio) */
      login: (cuerpo: Login) =>
        pedir<Yo>('POST', `/acceso/login`, { json: cuerpo }),
      /** Cerrar sesión */
      logout: () =>
        pedir<void>('POST', `/acceso/logout`),
      /** Quién soy */
      yo: () =>
        pedir<Yo>('GET', `/acceso/yo`),
      /** Usuarios del equipo y de los comercios */
      usuarios: () =>
        pedir<UsuarioSalida[]>('GET', `/admin/usuarios`),
      /** Crear un usuario */
      crearUsuario: (cuerpo: UsuarioNuevo) =>
        pedir<UsuarioSalida>('POST', `/admin/usuarios`, { json: cuerpo }),
      /** Activar o desactivar un usuario */
      cambiarUsuario: (usuarioId: number, cuerpo: UsuarioCambio) =>
        pedir<UsuarioSalida>('PATCH', `/admin/usuarios/${encodeURIComponent(String(usuarioId))}`, { json: cuerpo }),
    },
    comercios: {
      /** Comercios de la red con su beneficio destacado */
      red: () =>
        pedir<ComercioPublico[]>('GET', `/red/comercios`),
      /** Un comercio de la red (página de inscripción) */
      comercioPublico: (slug: string) =>
        pedir<ComercioPublico>('GET', `/red/comercios/${encodeURIComponent(String(slug))}`),
      /** Un comercio quiere unirse al piloto */
      solicitar: (cuerpo: SolicitudNueva) =>
        pedir<SolicitudRecibida>('POST', `/red/solicitudes`, { json: cuerpo }),
      /** Mis beneficios: vigentes, próximos y pendientes */
      misBeneficios: () =>
        pedir<BeneficiosComercio>('GET', `/comercio/beneficios`),
      /** Proponer beneficios (quedan pendientes y rigen desde un lunes) */
      proponer: (cuerpo: PropuestaBeneficios) =>
        pedir<BeneficiosComercio>('POST', `/comercio/beneficios`, { json: cuerpo }),
      /** Todos los comercios */
      comercios: () =>
        pedir<ComercioAdmin[]>('GET', `/admin/comercios`),
      /** Dar de alta un comercio (solo admin) */
      crear: (cuerpo: ComercioNuevo) =>
        pedir<ComercioAdmin>('POST', `/admin/comercios`, { json: cuerpo }),
      /** Suspender, reactivar o retirar un comercio (solo admin) */
      cambiar: (comercioId: number, cuerpo: ComercioCambio) =>
        pedir<ComercioAdmin>('PATCH', `/admin/comercios/${encodeURIComponent(String(comercioId))}`, { json: cuerpo }),
      /** Beneficios por aprobar (B7) */
      porAprobar: () =>
        pedir<PropuestaPendiente[]>('GET', `/admin/beneficios/pendientes`),
      /** Aprobar la propuesta de beneficios de un comercio */
      aprobar: (comercioId: number) =>
        pedir<BeneficioSalida[]>('POST', `/admin/comercios/${encodeURIComponent(String(comercioId))}/beneficios/aprobar`),
      /** Rechazar la propuesta de beneficios con un comentario */
      rechazar: (comercioId: number, cuerpo: Revision) =>
        pedir<BeneficioSalida[]>('POST', `/admin/comercios/${encodeURIComponent(String(comercioId))}/beneficios/rechazar`, { json: cuerpo }),
      /** Comercios interesados en unirse */
      solicitudes: () =>
        pedir<SolicitudSalida[]>('GET', `/admin/solicitudes`),
    },
    vecinos: {
      /** Inscribir a un vecino (al escanear el QR de un comercio) */
      inscribir: (cuerpo: Inscripcion) =>
        pedir<Inscrito>('POST', `/red/inscripcion`, { json: cuerpo }),
      /** Tarjeta: saldo, pendientes, por vencer e historial */
      tarjeta: (token: string) =>
        pedir<Tarjeta>('GET', `/t/${encodeURIComponent(String(token))}`),
      /** Buscar vecinos por nombre o teléfono */
      buscar: (consulta?: { q?: string }) =>
        pedir<VecinoResumen[]>('GET', `/admin/vecinos`, { consulta }),
      /** Un vecino con sus movimientos */
      detalle: (vecinoId: number) =>
        pedir<VecinoDetalle>('GET', `/admin/vecinos/${encodeURIComponent(String(vecinoId))}`),
      /** Ajustar el saldo con un motivo */
      ajustar: (vecinoId: number, cuerpo: Ajuste) =>
        pedir<VecinoDetalle>('POST', `/admin/vecinos/${encodeURIComponent(String(vecinoId))}/ajustes`, { json: cuerpo }),
      /** Generar un enlace nuevo (el anterior deja de funcionar) */
      nuevoEnlace: (vecinoId: number) =>
        pedir<EnlaceNuevo>('POST', `/admin/vecinos/${encodeURIComponent(String(vecinoId))}/enlace`),
    },
    boletas: {
      /** Subir la foto de una boleta (queda pendiente) */
      subir: (token: string, formulario: FormData) =>
        pedir<BoletaSalida>('POST', `/t/${encodeURIComponent(String(token))}/boletas`, { form: formulario }),
      /** Cola de boletas (por defecto, las pendientes) */
      cola: (consulta?: { estado?: EstadoBoleta | null }) =>
        pedir<BoletaEnCola[]>('GET', `/admin/boletas`, { consulta }),
      /** Una boleta con su lectura y controles */
      detalle: (boletaId: number) =>
        pedir<BoletaDetalle>('GET', `/admin/boletas/${encodeURIComponent(String(boletaId))}`),
      /** Foto de la boleta */
      imagen: (boletaId: number): string =>
        `/api/admin/boletas/${encodeURIComponent(String(boletaId))}/imagen`,
      /** Vista previa de controles y puntos con los datos corregidos */
      evaluar: (boletaId: number, cuerpo: DatosBoleta) =>
        pedir<Evaluacion>('POST', `/admin/boletas/${encodeURIComponent(String(boletaId))}/evaluar`, { json: cuerpo }),
      /** Aprobar, con ajustes si hace falta */
      aprobar: (boletaId: number, cuerpo: DatosBoleta) =>
        pedir<BoletaDetalle>('POST', `/admin/boletas/${encodeURIComponent(String(boletaId))}/aprobar`, { json: cuerpo }),
      /** Rechazar con un motivo */
      rechazar: (boletaId: number, cuerpo: Rechazo) =>
        pedir<BoletaDetalle>('POST', `/admin/boletas/${encodeURIComponent(String(boletaId))}/rechazar`, { json: cuerpo }),
    },
    canjes: {
      /** Beneficios que puede canjear, en el orden de 6.2 */
      opciones: (token: string) =>
        pedir<OpcionesSalida>('GET', `/t/${encodeURIComponent(String(token))}/opciones`),
      /** Pedir un código de canje (retiene puntos y reserva cupo) */
      pedir: (token: string, cuerpo: PedirCodigo) =>
        pedir<CodigoSalida>('POST', `/t/${encodeURIComponent(String(token))}/canjes`, { json: cuerpo }),
      /** Paso 1: ver si un código es válido aquí */
      consultar: (cuerpo: CodigoEnCaja) =>
        pedir<ResultadoCajaSalida>('POST', `/comercio/codigos/consultar`, { json: cuerpo }),
      /** Paso 2: usar el código con el monto de la compra */
      usar: (cuerpo: UsoEnCaja) =>
        pedir<ResultadoCajaSalida>('POST', `/comercio/codigos/usar`, { json: cuerpo }),
      /** Códigos emitidos, usados y vencidos */
      listar: (consulta?: { estado?: EstadoCanje | null; comercio_id?: number | null; vecino_id?: number | null }) =>
        pedir<CanjeSalida[]>('GET', `/admin/canjes`, { consulta }),
      /** El local estuvo cerrado: el vencimiento no cuenta para P19 */
      localCerrado: (canjeId: number) =>
        pedir<CanjeSalida>('POST', `/admin/canjes/${encodeURIComponent(String(canjeId))}/local-cerrado`),
    },
    equilibrio: {
      /** Mi cupo de la semana: usado, reservado y libre */
      cupo: () =>
        pedir<CupoSalida>('GET', `/comercio/cupo`),
      /** Agregar cupo extra a esta semana (no se arrastra) */
      extra: (cuerpo: CupoExtra) =>
        pedir<CupoSalida>('POST', `/comercio/cupo/extra`, { json: cuerpo }),
    },
    reportes: {
      /** Mi reporte: inscritos, derivados, recompra y costo de canjes */
      reporte: () =>
        pedir<ReporteComercioSalida>('GET', `/comercio/reporte`),
      /** Indicadores de la sección 10, con alertas */
      indicadores: () =>
        pedir<IndicadoresRedSalida>('GET', `/admin/indicadores`),
    },
    parametros: {
      /** P1 a P20 y umbrales, con su valor vigente */
      listar: () =>
        pedir<ParametroSalida[]>('GET', `/admin/parametros`),
      /** Cambiar un parámetro (solo admin) */
      cambiar: (codigo: string, cuerpo: CambioParametroNuevo) =>
        pedir<ParametroSalida>('PUT', `/admin/parametros/${encodeURIComponent(String(codigo))}`, { json: cuerpo }),
      /** Historial de cambios de un parámetro */
      cambios: (codigo: string) =>
        pedir<CambioParametroSalida[]>('GET', `/admin/parametros/${encodeURIComponent(String(codigo))}/cambios`),
    },
    tareas: {
      /** Correr las tareas del día: códigos vencidos, puntos vencidos y cupos (solo admin) */
      ejecutar: (cuerpo: EjecutarTareas) =>
        pedir<ResultadoTareas>('POST', `/admin/tareas`, { json: cuerpo }),
    },
  }
}
