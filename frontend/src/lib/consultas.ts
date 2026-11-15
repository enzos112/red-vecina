/** Consultas públicas compartidas por las páginas de la landing. */
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const CINCO_MINUTOS = 5 * 60 * 1000

/** Valores vigentes del programa (P1 a P20 y umbrales públicos). */
export function useCondiciones() {
  return useQuery({
    queryKey: ['red', 'condiciones'],
    queryFn: api.parametros.condiciones,
    staleTime: CINCO_MINUTOS,
  })
}

/** Comercios de la red con su beneficio destacado. */
export function useComerciosRed() {
  return useQuery({
    queryKey: ['red', 'comercios'],
    queryFn: api.comercios.red,
    staleTime: CINCO_MINUTOS,
  })
}
