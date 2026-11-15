/** Cliente mínimo de la API. Todas las rutas del backend viven bajo /api (mismo dominio). */

export class ErrorApi extends Error {
  readonly estado: number

  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

export async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`/api${ruta}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...init?.headers },
    ...init,
  })
  if (!respuesta.ok) {
    let mensaje = 'No pudimos conectar con Red Vecina. Intenta de nuevo.'
    try {
      const cuerpo = await respuesta.json()
      if (typeof cuerpo?.detail === 'string') mensaje = cuerpo.detail
    } catch {
      // Respuesta sin JSON: se usa el mensaje genérico.
    }
    throw new ErrorApi(respuesta.status, mensaje)
  }
  return respuesta.json() as Promise<T>
}

export type Salud = { estado: string; entorno: string }

export const api = {
  salud: () => pedir<Salud>('/salud'),
}
