import { cn } from '@/lib/utils'

type Props = {
  /** "oscuro": sobre verde barrio. "claro": sobre crema o blanco. */
  tono?: 'oscuro' | 'claro'
  className?: string
}

/** Marca propia de Red Vecina: dos casas que se tocan, más el nombre. */
export function Logo({ tono = 'claro', className }: Props) {
  const texto = tono === 'oscuro' ? 'text-crema' : 'text-tinta'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="12" fill="var(--mango)" />
        <path d="M8 30V19l7-6 7 6v11z" fill="var(--barrio)" />
        <path d="M19 30V21l7-6 7 6v9z" fill="var(--vecina)" />
        <rect x="13" y="24" width="4" height="6" rx="1" fill="var(--mango)" />
      </svg>
      <span className={cn('text-xl font-extrabold tracking-tight whitespace-nowrap', texto)}>
        Red Vecina
      </span>
    </span>
  )
}
