/**
 * Cliente tipado de la API. Todas las rutas del backend viven bajo /api (mismo dominio,
 * cookie httpOnly de sesión, sin CORS).
 *
 * Las funciones y los tipos salen de api-generada.ts, que se genera desde el OpenAPI con
 * `python -m app.cli cliente-ts`. Uso: `api.canjes.consultar({ codigo: '482913' })`.
 */
import { crearApi, type Pedir } from './api-generada'

export type * from './api-generada'

const SIN_CONEXION = 'No pudimos conectar con Red Vecina. Revisa tu internet e intenta de nuevo.'

/** Error de la API con el mensaje en español listo para mostrar. */
export class ErrorApi extends Error {
  readonly estado: number

  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

function conConsulta(ruta: string, consulta?: Record<string, unknown>): string {
  if (!consulta) return ruta
  const parametros = new URLSearchParams()
  for (const [clave, valor] of Object.entries(consulta)) {
    if (valor !== undefined && valor !== null && valor !== '') parametros.set(clave, String(valor))
  }
  const texto = parametros.toString()
  return texto ? `${ruta}?${texto}` : ruta
}

export const pedir: Pedir = async <T>(
  metodo: string,
  ruta: string,
  opciones: Parameters<Pedir>[2] = {},
): Promise<T> => {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: BodyInit | undefined
  if (opciones.form) {
    body = opciones.form // el navegador pone el Content-Type con su separador
  } else if (opciones.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opciones.json)
  }

  let respuesta: Response
  try {
    respuesta = await fetch(`/api${conConsulta(ruta, opciones.consulta)}`, {
      method: metodo,
      credentials: 'same-origin',
      headers,
      body,
    })
  } catch {
    throw new ErrorApi(0, SIN_CONEXION)
  }

  if (!respuesta.ok) {
    let mensaje = SIN_CONEXION
    try {
      const cuerpo = await respuesta.json()
      if (typeof cuerpo?.detail === 'string') mensaje = cuerpo.detail
    } catch {
      // Respuesta sin JSON (por ejemplo, un proxy caído): se usa el mensaje genérico.
    }
    throw new ErrorApi(respuesta.status, mensaje)
  }
  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}

export const api = crearApi(pedir)
