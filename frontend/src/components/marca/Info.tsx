import type { ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Explicación a pedido: una "i" en un cuadrito que abre la nota. Para el texto que ayuda la
 * primera vez pero no hace falta leer en cada visita. Se abre con clic o teclado, también en
 * pantallas táctiles (por eso es un popover y no un tooltip).
 */
export function Info({
  children,
  etiqueta = 'Más información',
  className,
  lado = 'bottom',
}: {
  children: ReactNode
  /** Nombre accesible del botón: dice de qué es la nota. */
  etiqueta?: string
  className?: string
  lado?: 'top' | 'bottom' | 'left' | 'right'
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={etiqueta}
          className={cn(
            'inline-grid size-7 shrink-0 cursor-pointer place-items-center border-2 border-tapa/40 bg-papel align-middle text-[0.9375rem] font-extrabold text-tapa transition-colors duration-150 hover:border-mango hover:bg-mango-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:border-mango data-[state=open]:bg-mango-50',
            className,
          )}
        >
          i
        </button>
      </PopoverTrigger>
      <PopoverContent side={lado} align="start" className="max-w-[min(22rem,calc(100vw-2rem))]">
        {children}
      </PopoverContent>
    </Popover>
  )
}
