import { cn } from '@/lib/utils'

type Props = {
  /** "oscuro": sobre azul noche. "claro": sobre crema o blanco. */
  tono?: 'oscuro' | 'claro'
  className?: string
}

/**
 * Marca de Red Vecina: una R trazada en un cuadrado y el punto naranja (el punto que juntas).
 * Es la misma forma del favicon.
 */
export function Logo({ tono = 'claro', className }: Props) {
  const oscuro = tono === 'oscuro'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 64 64" className="size-10 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill={oscuro ? 'var(--crema)' : 'var(--barrio)'} />
        <path
          d="M18 46V18h13.5a9 9 0 0 1 0 18H18"
          fill="none"
          stroke={oscuro ? 'var(--barrio)' : 'var(--crema)'}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <circle cx="44" cy="44" r="7" fill="var(--mango)" />
      </svg>
      <span
        className={cn(
          'text-xl font-extrabold tracking-tight whitespace-nowrap',
          oscuro ? 'text-crema' : 'text-tinta',
        )}
      >
        Red Vecina<span className="text-mango">.</span>
      </span>
    </span>
  )
}
