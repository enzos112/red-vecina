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

type Paso = { numero: number; titulo: string; texto: ReactNode; icono: ReactNode }

/** Lista de pasos numerados ("cómo funciona"). */
export function Pasos({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="mt-12 grid gap-5 md:grid-cols-3">
      {pasos.map((paso) => (
        <li key={paso.numero} className="flex flex-col rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <span className="text-6xl leading-none font-extrabold text-vecina" aria-hidden="true">
              {paso.numero}
            </span>
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-vecina [&_svg]:size-7">
              {paso.icono}
            </span>
          </div>
          <h3 className="mt-8 text-2xl font-extrabold">
            <span className="sr-only">Paso {paso.numero}: </span>
            {paso.titulo}
          </h3>
          <p className="mt-3 text-muted-foreground">{paso.texto}</p>
        </li>
      ))}
    </ol>
  )
}
