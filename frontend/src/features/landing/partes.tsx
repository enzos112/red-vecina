import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Ancho y márgenes comunes de las secciones públicas. */
export function Contenedor({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

type Encabezado = {
  antetitulo?: string
  titulo: ReactNode
  bajada?: ReactNode
  id?: string
  oscuro?: boolean
  className?: string
}

/** Titular grande de sección con una frase de apoyo. */
export function EncabezadoSeccion({ antetitulo, titulo, bajada, id, oscuro, className }: Encabezado) {
  return (
    <div className={cn('max-w-3xl', className)}>
      {antetitulo && (
        <p className={cn('text-sm font-bold tracking-wide uppercase', oscuro ? 'text-mango' : 'text-vecina')}>
          {antetitulo}
        </p>
      )}
      <h2
        id={id}
        className={cn(
          'mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl',
          oscuro ? 'text-crema' : 'text-tinta',
        )}
      >
        {titulo}
      </h2>
      {bajada && (
        <p className={cn('mt-5 text-lg sm:text-xl', oscuro ? 'text-crema/85' : 'text-muted-foreground')}>
          {bajada}
        </p>
      )}
    </div>
  )
}

type Paso = { numero: number; titulo: string; texto: ReactNode }

/** Barra superior de cada paso: el recorrido va del azul al naranja. */
const BARRAS = ['bg-vecina', 'bg-barrio', 'bg-mango']

/**
 * Pasos numerados ("cómo funciona"). Sin íconos: el número grande es la imagen, y una línea
 * une los pasos como un recorrido.
 */
export function Pasos({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
      {pasos.map((paso, i) => (
        <li key={paso.numero} className="relative flex flex-col bg-card p-7 sm:p-9">
          <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1.5', BARRAS[i % BARRAS.length])} />
          <span
            aria-hidden="true"
            className="text-7xl leading-none font-extrabold tracking-tighter text-barrio tabular-nums"
          >
            {String(paso.numero).padStart(2, '0')}
          </span>
          <h3 className="mt-10 text-2xl font-extrabold">
            <span className="sr-only">Paso {paso.numero}: </span>
            {paso.titulo}
          </h3>
          <p className="mt-3 text-muted-foreground">{paso.texto}</p>
        </li>
      ))}
    </ol>
  )
}
