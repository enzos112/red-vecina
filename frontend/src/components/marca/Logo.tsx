import { cn } from '@/lib/utils'

type Props = {
  /** "oscuro": sobre azul noche. "claro": sobre crema o blanco. */
  tono?: 'oscuro' | 'claro'
  /** Versión de la libreta: cuadrado de esquinas casi rectas y rótulo en Archivo. */
  libreta?: boolean
  className?: string
}

/**
 * Marca de Red Vecina: una R trazada en un cuadrado y el punto naranja (el punto que juntas).
 * Es la misma forma del favicon.
 */
export function Logo({ tono = 'claro', libreta = true, className }: Props) {
  const oscuro = tono === 'oscuro'
  const fondo = libreta ? (oscuro ? 'var(--papel)' : 'var(--tapa)') : oscuro ? 'var(--crema)' : 'var(--barrio)'
  const trazo = libreta ? (oscuro ? 'var(--tapa)' : 'var(--papel)') : oscuro ? 'var(--barrio)' : 'var(--crema)'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 64 64" className="size-10 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx={libreta ? 4 : 14} fill={fondo} />
        <path d="M18 46V18h13.5a9 9 0 0 1 0 18H18" fill="none" stroke={trazo} strokeWidth="6" strokeLinejoin="round" />
        <circle cx="44" cy="44" r="7" fill="var(--mango)" />
      </svg>
      <span
        className={cn(
          'whitespace-nowrap',
          libreta ? 'rotulo text-xl sm:text-2xl' : 'text-xl font-extrabold tracking-tight',
          oscuro ? (libreta ? 'text-papel' : 'text-crema') : libreta ? 'text-tapa' : 'text-tinta',
        )}
      >
        Red Vecina{!libreta && <span className="text-mango">.</span>}
      </span>
    </span>
  )
}
