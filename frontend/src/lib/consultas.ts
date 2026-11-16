/** Consultas públicas compartidas por las páginas de la landing. */
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const CINCO_MINUTOS = 5 * 60 * 1000

/** Valores vigentes del programa (P1 a P20 y umbrales públicos). */
/**
 * Dirección pública del sitio para QR y enlaces que se comparten. La entrega la API (URL_PUBLICA
 * o la de Render); si no hay, se usa la del navegador.
 */
export function useUrlPublica(): string {
  const condiciones = useCondiciones()
  return condiciones.data?.url_publica ?? window.location.origin
}

/** La dirección apunta al propio computador: un celular no la puede abrir. */
export function esLocal(url: string): boolean {
  return /^https?:\/\/(localhost|127\.|\[::1\])/.test(url)
}

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
