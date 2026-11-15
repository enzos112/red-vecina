/** Consultas y acciones del panel del equipo (operador y admin). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  type ComercioCambio,
  type DatosBoleta,
  type EstadoBoleta,
  type EstadoCanje,
  type Rechazo,
  type SancionNueva,
  type SolicitudCambio,
  type UsuarioCambio,
} from '@/lib/api'

const MEDIO_MINUTO = 30 * 1000

export { mensajeError, sinSesion, useEntrar, useSalir, useYo } from '@/lib/sesion'

/** Todos los comercios, para los filtros y el selector de la revisión. */
export function useComercios() {
  return useQuery({ queryKey: ['admin', 'comercios'], queryFn: api.comercios.comercios, staleTime: 5 * 60 * 1000 })
}

// --- Boletas ---

export type FiltroBoletas = { estado: EstadoBoleta | null; comercio_id: number | null; todas?: boolean }

export function useCola(filtro: FiltroBoletas) {
  return useQuery({
    queryKey: ['admin', 'boletas', 'cola', filtro],
    queryFn: () => api.boletas.cola(filtro),
    placeholderData: keepPreviousData,
    // Las boletas de los vecinos llegan solas: la cola se refresca sin recargar.
    refetchInterval: MEDIO_MINUTO,
  })
}

export function useResumenCola() {
  return useQuery({
    queryKey: ['admin', 'boletas', 'resumen'],
    queryFn: api.boletas.resumen,
    refetchInterval: MEDIO_MINUTO,
  })
}

export function useBoleta(id: number) {
  return useQuery({
    queryKey: ['admin', 'boletas', id],
    queryFn: () => api.boletas.detalle(id),
    // Recién subida, la lectura corre en segundo plano: se consulta hasta que llegue.
    refetchInterval: (q) => {
      const b = q.state.data
      return b && b.estado === 'pendiente' && b.tiene_imagen && !b.lectura ? 2000 : false
    },
  })
}

export function useMotivos() {
  return useQuery({ queryKey: ['admin', 'motivos'], queryFn: api.boletas.motivos, staleTime: Infinity })
}

export function useEvaluar(id: number, datos: DatosBoleta | null) {
  return useQuery({
    queryKey: ['admin', 'boletas', id, 'evaluar', datos],
    queryFn: () => api.boletas.evaluar(id, datos as DatosBoleta),
    enabled: datos !== null,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

function useRefrescarBoletas() {
  const cliente = useQueryClient()
  return () => cliente.invalidateQueries({ queryKey: ['admin', 'boletas'] })
}

export function useLeer(id: number) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: () => api.boletas.leer(id),
    onSuccess: (b) => cliente.setQueryData(['admin', 'boletas', id], b),
  })
}

export function useAprobar(id: number) {
  const refrescar = useRefrescarBoletas()
  return useMutation({ mutationFn: (datos: DatosBoleta) => api.boletas.aprobar(id, datos), onSuccess: refrescar })
}

export function useRechazar(id: number) {
  const refrescar = useRefrescarBoletas()
  return useMutation({ mutationFn: (datos: Rechazo) => api.boletas.rechazar(id, datos), onSuccess: refrescar })
}

export function useSubirPorVecino() {
  const refrescar = useRefrescarBoletas()
  return useMutation({
    mutationFn: ({ vecinoId, foto }: { vecinoId: number; foto: Blob }) => {
      const formulario = new FormData()
      formulario.append('vecino_id', String(vecinoId))
      formulario.append('foto', foto, 'boleta.jpg')
      return api.boletas.subirPorVecino(formulario)
    },
    onSuccess: refrescar,
  })
}

// --- Vecinos ---

export function useBuscarVecinos(q: string) {
  return useQuery({
    queryKey: ['admin', 'vecinos', 'buscar', q],
    queryFn: () => api.vecinos.buscar({ q }),
    placeholderData: keepPreviousData,
  })
}

export function useVecino(id: number) {
  return useQuery({ queryKey: ['admin', 'vecinos', id], queryFn: () => api.vecinos.detalle(id) })
}

export function useAjustar(id: number) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: { puntos: number; motivo: string }) => api.vecinos.ajustar(id, datos),
    onSuccess: (v) => cliente.setQueryData(['admin', 'vecinos', id], v),
  })
}

export function useNuevoEnlace(id: number) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: () => api.vecinos.nuevoEnlace(id),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'vecinos', id] }),
  })
}

// --- Canjes ---

export type FiltroCanjes = { estado: EstadoCanje | null; comercio_id: number | null }

export function useCanjes(filtro: FiltroCanjes) {
  return useQuery({
    queryKey: ['admin', 'canjes', filtro],
    queryFn: () => api.canjes.listar(filtro),
    placeholderData: keepPreviousData,
  })
}

export function useLocalCerrado() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: api.canjes.localCerrado,
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'canjes'] }),
  })
}

/** Códigos ingresados sin internet que esperan revisión (sección 8). */
export function useDiferidos() {
  return useQuery({ queryKey: ['admin', 'canjes', 'diferidos'], queryFn: () => api.canjes.diferidosPorRevisar() })
}

export function useRevisarDiferido() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nota }: { id: number; nota: string }) => api.canjes.marcarRevisado(id, { nota: nota || null }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'canjes'] }),
  })
}

// --- Comercios (alta, edición, beneficios, sanciones y solicitudes) ---

function useRefrescar(...claves: unknown[][]) {
  const cliente = useQueryClient()
  return () => Promise.all(claves.map((queryKey) => cliente.invalidateQueries({ queryKey })))
}

export function useComercio(id: number) {
  return useQuery({ queryKey: ['admin', 'comercios', id], queryFn: () => api.comercios.detalle(id) })
}

export function useCrearComercio() {
  const refrescar = useRefrescar(['admin', 'comercios'])
  return useMutation({ mutationFn: api.comercios.crear, onSuccess: refrescar })
}

export function useEditarComercio(id: number) {
  const refrescar = useRefrescar(['admin', 'comercios'])
  return useMutation({ mutationFn: (datos: ComercioCambio) => api.comercios.cambiar(id, datos), onSuccess: refrescar })
}

export function useSancionar(id: number) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: SancionNueva) => api.comercios.sancionar(id, datos),
    onSuccess: (d) => {
      cliente.setQueryData(['admin', 'comercios', id], d)
      return cliente.invalidateQueries({ queryKey: ['admin', 'comercios'], exact: true })
    },
  })
}

export function useCrearUsuario() {
  const refrescar = useRefrescar(['admin', 'comercios'])
  return useMutation({ mutationFn: api.cuentas.crearUsuario, onSuccess: refrescar })
}

export function useEditarUsuario() {
  const refrescar = useRefrescar(['admin', 'comercios'])
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: UsuarioCambio }) => api.cuentas.cambiarUsuario(id, datos),
    onSuccess: refrescar,
  })
}

export function usePorAprobar() {
  return useQuery({ queryKey: ['admin', 'comercios', 'por-aprobar'], queryFn: api.comercios.porAprobar })
}

export function useAprobarBeneficios() {
  const refrescar = useRefrescar(['admin', 'comercios'])
  return useMutation({
    mutationFn: ({ id, comentario }: { id: number; comentario: string }) =>
      api.comercios.aprobar(id, { comentario: comentario.trim() || null }),
    onSuccess: refrescar,
  })
}

export function useRechazarBeneficios() {
  const refrescar = useRefrescar(['admin', 'comercios'])
  return useMutation({
    mutationFn: ({ id, comentario }: { id: number; comentario: string }) => api.comercios.rechazar(id, { comentario }),
    onSuccess: refrescar,
  })
}

export function useSolicitudes() {
  return useQuery({ queryKey: ['admin', 'solicitudes'], queryFn: api.comercios.solicitudes })
}

export function useAtenderSolicitud() {
  const refrescar = useRefrescar(['admin', 'solicitudes'])
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: SolicitudCambio }) => api.comercios.atender(id, datos),
    onSuccess: refrescar,
  })
}

// --- Red: indicadores, revisión del lunes y fraude ---

export function useRevisionSemanal() {
  return useQuery({ queryKey: ['admin', 'red', 'revision'], queryFn: api.reportes.revisionSemanal })
}

export function useIndicadores() {
  return useQuery({ queryKey: ['admin', 'red', 'indicadores'], queryFn: api.reportes.indicadores })
}

export function useFraude() {
  return useQuery({ queryKey: ['admin', 'red', 'fraude'], queryFn: api.reportes.fraude })
}

// --- Parámetros ---

export function useParametros() {
  return useQuery({ queryKey: ['admin', 'parametros'], queryFn: api.parametros.listar })
}

export function useCambiosParametros() {
  return useQuery({ queryKey: ['admin', 'parametros', 'cambios'], queryFn: api.parametros.ultimosCambios })
}

export function useCambiarParametro() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ codigo, valor, motivo }: { codigo: string; valor: Record<string, unknown>; motivo: string }) =>
      api.parametros.cambiar(codigo, { valor, motivo }),
    // Todo depende de los parámetros: se recarga lo que esté en pantalla.
    onSuccess: () => cliente.invalidateQueries(),
  })
}

// --- Plantillas de mensajes ---

export function usePlantillas() {
  return useQuery({ queryKey: ['admin', 'plantillas'], queryFn: api.mensajes.listar })
}

export function useVistaPrevia(clave: string, texto: string, activa: boolean) {
  return useQuery({
    queryKey: ['admin', 'plantillas', clave, 'vista', texto],
    queryFn: () => api.mensajes.vistaPrevia(clave, { texto }),
    enabled: activa,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  })
}

export function useEditarPlantilla() {
  const refrescar = useRefrescar(['admin', 'plantillas'])
  return useMutation({
    mutationFn: ({ clave, texto }: { clave: string; texto: string }) => api.mensajes.editar(clave, { texto }),
    onSuccess: refrescar,
  })
}

// --- Tareas ---

export function useTareas() {
  return useQuery({ queryKey: ['admin', 'tareas'], queryFn: api.tareas.estado })
}

export function useEjecutarTareas() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: () => api.tareas.ejecutar({ forzar: true }),
    onSuccess: () => cliente.invalidateQueries(),
  })
}

// --- Salida de un vecino ---

export function useSalidaVecino(id: number) {
  const refrescar = useRefrescar(['admin', 'vecinos'])
  return useMutation({
    mutationFn: (motivo: string) => api.vecinos.salida(id, { motivo, confirmar: true }),
    onSuccess: refrescar,
  })
}
