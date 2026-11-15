/** Consultas y acciones del panel del equipo (operador y admin). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ErrorApi, type DatosBoleta, type EstadoBoleta, type EstadoCanje, type Rechazo } from '@/lib/api'

const MEDIO_MINUTO = 30 * 1000

/** Quién está conectado. Un 401 significa que hay que iniciar sesión. */
export function useYo() {
  return useQuery({ queryKey: ['yo'], queryFn: api.cuentas.yo, retry: false, staleTime: Infinity })
}

export function sinSesion(error: unknown): boolean {
  return error instanceof ErrorApi && (error.estado === 401 || error.estado === 403)
}

export function useEntrar() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: api.cuentas.login,
    onSuccess: (yo) => cliente.setQueryData(['yo'], yo),
  })
}

export function useSalir() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: api.cuentas.logout,
    onSettled: () => cliente.clear(),
  })
}

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

/** Mensaje de error de una acción, listo para mostrar. */
export function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Algo falló. Intenta otra vez.'
}
