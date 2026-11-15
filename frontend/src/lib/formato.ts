/** Formato de montos, números y fechas para pantalla (español de Chile, hora de Santiago). */

const ZONA = 'America/Santiago'

/** 7850 → "7.850". Siempre con punto de miles, también en números de 4 cifras. */
export function numero(valor: number): string {
  const signo = valor < 0 ? '-' : ''
  const entero = Math.trunc(Math.abs(valor)).toString()
  return signo + entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** 7850 → "$7.850". */
export function pesos(valor: number): string {
  return (valor < 0 ? '-$' : '$') + numero(Math.abs(valor))
}

/** 1 → "1 punto", 250 → "250 puntos". */
export function puntos(valor: number): string {
  return `${numero(valor)} ${valor === 1 ? 'punto' : 'puntos'}`
}

/** Une una lista en español: [15, 3] → "15 y 3". */
export function lista(items: (string | number)[]): string {
  const textos = items.map(String)
  if (textos.length <= 1) return textos.join('')
  return `${textos.slice(0, -1).join(', ')} y ${textos.at(-1)}`
}

/** Fecha UTC de la API → "viernes 20, 18:30" en hora de Santiago. */
export function fechaHora(iso: string | Date): string {
  const fecha = typeof iso === 'string' ? new Date(iso) : iso
  const partes = new Intl.DateTimeFormat('es-CL', {
    timeZone: ZONA,
    weekday: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(fecha)
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value
  return `${valor('weekday')} ${valor('day')}, ${valor('hour')}:${valor('minute')}`
}
