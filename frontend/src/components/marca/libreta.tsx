/**
 * Piezas de la libreta del almacén: la hoja con su margen, el círculo que encierra un total
 * y el aviso de que un bloque entró en pantalla (para escribir la cuenta en orden).
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Una hoja cuadriculada a todo el ancho con su margen doble. En pantallas grandes el margen
 * queda a 8 rem y deja una columna para fechas; en el celular, a 1,5 rem del borde.
 */
export function Hoja({
  children,
  className,
  margen,
  id,
  etiqueta,
}: {
  children: ReactNode
  className?: string
  /** Lo que va escrito en la columna del margen (fechas, folios). Solo en pantallas grandes. */
  margen?: ReactNode
  id?: string
  etiqueta?: string
}) {
  return (
    <section id={id} aria-labelledby={etiqueta} className={cn('hoja relative scroll-mt-4', className)}>
      <div className="relative mx-auto max-w-[90rem]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-6 w-1.5 border-x-2 border-tapa lg:left-32"
        />
        {margen && (
          <div aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-32 pr-4 text-right lg:block">
            {margen}
          </div>
        )}
        <div className="pr-4 pl-12 sm:pr-8 lg:pl-44">{children}</div>
      </div>
    </section>
  )
}

/** Encierra una cifra en un círculo trazado a mano alzada, que se dibuja al aparecer. */
export function Circulo({
  children,
  activo = true,
  retraso = 0,
  className,
}: {
  children: ReactNode
  activo?: boolean
  retraso?: number
  className?: string
}) {
  return (
    <span className={cn('relative inline-block px-[0.3em]', className)}>
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -top-[0.3em] -left-[0.3em] h-[calc(100%+0.6em)] w-[calc(100%+0.6em)] overflow-visible"
      >
        <path
          d="M22 54 C 16 14, 180 6, 188 46 C 194 90, 34 98, 12 62 C 4 44, 36 16, 96 12"
          fill="none"
          stroke="var(--tinta-azul)"
          strokeWidth="3.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: activo ? undefined : 1,
            ['--largo' as string]: 1,
            animation: activo ? `trazar 700ms cubic-bezier(0.45, 0, 0.2, 1) ${retraso}ms both` : undefined,
          }}
        />
      </svg>
    </span>
  )
}
