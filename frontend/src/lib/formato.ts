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

/** Arma un Date a mediodía UTC para una fecha sin hora ("2026-11-23"): así no cambia de día. */
function aFecha(valor: string | Date): Date {
  if (typeof valor !== 'string') return valor
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (soloFecha) return new Date(Date.UTC(+soloFecha[1], +soloFecha[2] - 1, +soloFecha[3], 12))
  return new Date(valor)
}

/** "2026-11-23" o una fecha UTC → "lunes 23" en hora de Santiago. */
export function dia(valor: string | Date): string {
  const partes = new Intl.DateTimeFormat('es-CL', {
    timeZone: ZONA,
    weekday: 'long',
    day: 'numeric',
  }).formatToParts(aFecha(valor))
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value
  return `${parte('weekday')} ${parte('day')}`
}

/** "2026-11-23" o una fecha UTC → "lunes" en hora de Santiago. */
export function diaSemana(valor: string | Date): string {
  return new Intl.DateTimeFormat('es-CL', { timeZone: ZONA, weekday: 'long' }).format(aFecha(valor))
}

/** "482913" → "482 913", más fácil de leer en voz alta en la caja. */
export function codigo(valor: string): string {
  return valor.length === 6 ? `${valor.slice(0, 3)} ${valor.slice(3)}` : valor
}

/** Milisegundos → "47 h 05 min" (o "4 min 09 s" en la última hora). */
export function cuentaRegresiva(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segundos = total % 60
  const dos = (n: number) => n.toString().padStart(2, '0')
  if (horas > 0) return `${horas} h ${dos(minutos)} min`
  return `${minutos} min ${dos(segundos)} s`
}

function partesSantiago(fecha: Date): Record<string, number> {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha)
  return Object.fromEntries(partes.filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]))
}

/** Fecha UTC de la API → "2026-11-18T09:12" en hora de Santiago, para un <input type="datetime-local">. */
export function aCampoFechaHora(iso: string): string {
  const p = partesSantiago(new Date(iso))
  const dos = (n: number) => n.toString().padStart(2, '0')
  return `${p.year}-${dos(p.month)}-${dos(p.day)}T${dos(p.hour)}:${dos(p.minute)}`
}

/** "2026-11-18T09:12" en hora de Santiago → fecha UTC en ISO. null si el texto no es válido. */
export function desdeCampoFechaHora(valor: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor)
  if (!m) return null
  const comoUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
  // Diferencia entre Santiago y UTC en ese momento (cambia con el horario de verano).
  const p = partesSantiago(new Date(comoUtc))
  const desfase = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - comoUtc
  return new Date(comoUtc - desfase).toISOString()
}
