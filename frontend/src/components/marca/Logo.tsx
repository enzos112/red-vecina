import { cn } from '@/lib/utils'
import { MARCO, TRAZO_PUNTA, TRAZO_R, VISTA_MARCA } from './forma'

type Props = {
  /** "oscuro": sobre la tapa azul noche. "claro": sobre papel. */
  tono?: 'oscuro' | 'claro'
  /** Se mantiene por compatibilidad: la marca es una sola. */
  libreta?: boolean
  /** Solo el símbolo, sin el nombre (el nombre queda para lectores de pantalla). */
  soloSimbolo?: boolean
  className?: string
}

/**
 * Marca oficial de Red Vecina: la R en un cuadrado azul noche con su punta naranja (logo.png
 * del proyecto). Sobre la tapa se invierte: cuadrado de papel y R azul noche.
 */
export function Logo({ tono = 'claro', soloSimbolo, className }: Props) {
  const oscuro = tono === 'oscuro'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Simbolo invertido={oscuro} className="size-10 shrink-0" />
      <span
        className={cn('rotulo text-xl whitespace-nowrap sm:text-2xl', oscuro ? 'text-papel' : 'text-tapa', soloSimbolo && 'sr-only')}
      >
        Red Vecina
      </span>
    </span>
  )
}

/** El símbolo solo, a cualquier tamaño. `invertido` para ponerlo sobre la tapa. */
export function Simbolo({ invertido, className }: { invertido?: boolean; className?: string }) {
  return (
    <svg viewBox={VISTA_MARCA} className={className} aria-hidden="true">
      <rect x={MARCO.x} y={MARCO.y} width={MARCO.lado} height={MARCO.lado} fill={invertido ? 'var(--papel)' : 'var(--tapa)'} />
      <path d={TRAZO_R} fill={invertido ? 'var(--tapa)' : 'var(--papel)'} />
      <path d={TRAZO_PUNTA} fill="var(--mango)" />
    </svg>
  )
}
