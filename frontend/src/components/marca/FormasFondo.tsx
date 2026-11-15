import { cn } from '@/lib/utils'

type Props = {
  variante?: 'hero' | 'bloque'
  /** Fondo sobre el que van: azul noche (por defecto) o azul vecina. */
  sobre?: 'barrio' | 'vecina'
  className?: string
}

/**
 * Formas geométricas planas para los fondos azules: círculos, medias lunas y
 * cuadrados en un azul apenas más claro. Decorativas; sin degradados.
 */
export function FormasFondo({ variante = 'hero', sobre = 'barrio', className }: Props) {
  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1280 800"
      fill={sobre === 'barrio' ? 'var(--barrio-claro)' : 'var(--vecina-forma)'}
    >
      {variante === 'hero' ? (
        <>
          <circle cx="1180" cy="120" r="210" />
          <path d="M0 800V560a240 240 0 0 1 240 240z" />
          <rect x="560" y="660" width="180" height="180" rx="36" transform="rotate(18 650 750)" />
          <path d="M1280 800H980a150 150 0 0 1 300 0z" />
          <circle cx="430" cy="70" r="46" />
        </>
      ) : (
        <>
          <circle cx="1220" cy="700" r="260" />
          <path d="M0 0h260a260 260 0 0 1-260 260z" />
          <rect x="980" y="40" width="120" height="120" rx="28" transform="rotate(-14 1040 100)" />
        </>
      )}
    </svg>
  )
}
