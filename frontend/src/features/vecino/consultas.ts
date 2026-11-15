/** Consultas y acciones de la zona del vecino (todas con su token personal). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { api, ErrorApi } from '@/lib/api'

const MEDIO_MINUTO = 30 * 1000

export const claves = {
  todo: (token: string) => ['vecino', token] as const,
  tarjeta: (token: string) => ['vecino', token, 'tarjeta'] as const,
  opciones: (token: string) => ['vecino', token, 'opciones'] as const,
}

/** El enlace no corresponde a una tarjeta (o la cuenta ya no existe). */
export function esTarjetaInexistente(error: Error): boolean {
  return error instanceof ErrorApi && error.estado === 404
}

/** Token de la ruta /t/:token. */
export function useToken(): string {
  return useParams().token ?? ''
}

export function useTarjeta(token: string) {
  return useQuery({
    queryKey: claves.tarjeta(token),
    queryFn: () => api.vecinos.tarjeta(token),
    staleTime: MEDIO_MINUTO,
  })
}

export function useOpciones(token: string) {
  return useQuery({
    queryKey: claves.opciones(token),
    queryFn: () => api.canjes.opciones(token),
    staleTime: MEDIO_MINUTO,
  })
}

/** Tras subir una boleta o pedir un código, la tarjeta y las opciones cambian. */
function useRefrescar(token: string) {
  const cliente = useQueryClient()
  return () => cliente.invalidateQueries({ queryKey: claves.todo(token) })
}

export function useSubirBoleta(token: string) {
  const refrescar = useRefrescar(token)
  return useMutation({
    mutationFn: (foto: Blob) => {
      const formulario = new FormData()
      formulario.append('foto', foto, 'boleta.jpg')
      return api.boletas.subir(token, formulario)
    },
    onSuccess: refrescar,
  })
}

export function usePedirCodigo(token: string) {
  const refrescar = useRefrescar(token)
  return useMutation({
    mutationFn: (beneficioId: number) => api.canjes.pedir(token, { beneficio_id: beneficioId }),
    onSuccess: refrescar,
  })
}

// --- Recordar la tarjeta en este teléfono ---

const CLAVE_TOKEN = 'red-vecina:tarjeta'

/** Guarda el token para ofrecer "Ver mi tarjeta" si vuelve a escanear un QR. */
export function recordarTarjeta(token: string) {
  try {
    localStorage.setItem(CLAVE_TOKEN, token)
  } catch {
    // Navegación privada o almacenamiento bloqueado: no es imprescindible.
  }
}

export function tarjetaRecordada(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

/** Enlace wa.me al chat del propio vecino, con su enlace personal ya escrito. */
export function enlaceWhatsapp(numero: string, mensaje: string, token: string): string {
  const tarjeta = `${window.location.origin}/t/${token}`
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje.replaceAll('{enlace}', tarjeta))}`
}
