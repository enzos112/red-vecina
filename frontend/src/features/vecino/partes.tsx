/** Piezas compartidas por las pantallas del vecino: encabezados, estados vacíos y de error. */
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Título de una pantalla secundaria, con la vuelta a la tarjeta. */
export function Encabezado({ token, titulo, children }: { token: string; titulo: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <Link
        to={`/t/${token}`}
        className="-ml-2 inline-flex min-h-12 items-center gap-2 rounded-full px-2 font-semibold text-vecina hover:text-vecina-oscuro"
      >
        Volver a mi tarjeta
      </Link>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">{titulo}</h1>
      {children && <div className="mt-2 text-lg text-muted-foreground">{children}</div>}
    </header>
  )
}

/** Mensaje amable cuando un bloque no tiene nada que mostrar. */
export function Vacio({
  titulo,
  children,
  className,
}: {
  titulo: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-start gap-2 rounded-2xl border-2 border-dashed border-border p-6', className)}>
      <p className="text-xl font-extrabold">{titulo}</p>
      {children && <div className="text-base text-muted-foreground">{children}</div>}
    </div>
  )
}

/** Error de un bloque con su botón para reintentar. */
export function ErrorBloque({
  titulo,
  error,
  reintentar,
}: {
  titulo: string
  error: Error
  reintentar?: () => void
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {reintentar && (
          <Button variant="secondary" size="sm" className="mt-1" onClick={reintentar}>
            Intentar de nuevo
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function TarjetaNoEncontrada() {
  return (
    <Card className="aparecer">
      <CardContent className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-extrabold">No encontramos tu tarjeta</h1>
        <p className="text-lg text-muted-foreground">
          Revisa que el enlace esté completo. Si lo perdiste, pídele uno nuevo al equipo de Red Vecina por WhatsApp.
        </p>
        <Button asChild variant="secondary">
          <Link to="/">Ir al inicio</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/** Esqueleto de una lista de tarjetas mientras carga. */
export function CargandoLista({ filas = 3, etiqueta }: { filas?: number; etiqueta: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label={etiqueta}>
      {Array.from({ length: filas }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  )
}
