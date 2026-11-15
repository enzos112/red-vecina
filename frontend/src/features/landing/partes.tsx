import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Ancho y márgenes comunes de las páginas públicas que no usan la hoja con margen. */
export function Contenedor({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-[90rem] px-4 sm:px-8', className)}>{children}</div>
}

type Encabezado = {
  titulo: ReactNode
  bajada?: ReactNode
  id?: string
  oscuro?: boolean
  className?: string
}

/** Titular de sección en rótulo de libreta, con una frase de apoyo. */
export function EncabezadoSeccion({ titulo, bajada, id, oscuro, className }: Encabezado) {
  return (
    <div className={cn('max-w-3xl', className)}>
      <h2
        id={id}
        className={cn(
          'rotulo max-w-[16ch] text-[2.5rem] leading-[1.05] tracking-[-0.035em] sm:text-6xl',
          oscuro ? 'text-papel' : 'text-tapa',
        )}
      >
        {titulo}
      </h2>
      {bajada && (
        <p className={cn('mt-6 max-w-[38rem] text-xl leading-8', oscuro ? 'text-tapa-texto' : 'text-tinta')}>{bajada}</p>
      )}
    </div>
  )
}

type Paso = { numero: number; titulo: string; texto: ReactNode }

/**
 * Pasos como renglones de la libreta: el número en la columna izquierda, cada paso separado por
 * una línea de tapa. El orden importa, por eso va numerado.
 */
export function Pasos({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="mt-12 border-t-2 border-tapa">
      {pasos.map((paso) => (
        <li
          key={paso.numero}
          className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b-2 border-tapa py-7 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-6"
        >
          <span aria-hidden="true" className="rotulo text-4xl leading-none text-tapa sm:text-5xl">
            {paso.numero}
          </span>
          <div>
            <h3 className="rotulo text-[1.75rem] leading-tight text-tapa">
              <span className="sr-only">Paso {paso.numero}: </span>
              {paso.titulo}
            </h3>
            <p className="mt-2 max-w-[38rem] text-lg leading-8">{paso.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
