import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Contenedor } from './partes'

export function PaginaNoEncontrada() {
  return (
    <Contenedor className="py-24 sm:py-32">
      <p className="text-sm font-bold tracking-wide text-vecina uppercase">Página no encontrada</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-6xl">
        No encontramos esta página.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">
        Puede que el enlace esté incompleto. Vuelve al inicio y sigue desde ahí.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </Contenedor>
  )
}
