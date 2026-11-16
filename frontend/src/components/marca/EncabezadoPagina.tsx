import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Encabezado de una pantalla de trabajo (comercio y equipo): el título con la pestaña naranja
 * del margen, una frase que dice de qué trata la pantalla y, a la derecha, su acción.
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  className,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-x-8 gap-y-4', className)}>
      <div className="min-w-0 border-l-[6px] border-mango pl-4 lg:pl-5">
        <h1 className="rotulo text-4xl leading-tight text-tapa lg:text-5xl lg:tracking-[-0.03em]">{titulo}</h1>
        {descripcion && <p className="mt-2 max-w-[44rem] text-lg leading-7 text-tinta">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-3">{acciones}</div>}
    </header>
  )
}
