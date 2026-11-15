/** Sesión con cookie httpOnly del equipo y de los comercios (mismo login para ambos). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ErrorApi } from '@/lib/api'

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

/** Mensaje de error de una acción, listo para mostrar. */
export function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Algo falló. Intenta otra vez.'
}
