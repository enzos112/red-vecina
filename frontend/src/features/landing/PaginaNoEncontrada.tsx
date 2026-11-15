import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Hoja } from '@/components/marca/libreta'

export function PaginaNoEncontrada() {
  return (
    <Hoja etiqueta="titulo-404" className="py-20 sm:py-32">
      <h1 id="titulo-404" className="rotulo max-w-2xl text-[3rem] leading-[1.05] tracking-[-0.035em] text-tapa sm:text-7xl">
        No encontramos esta página.
      </h1>
      <p className="mt-6 max-w-xl text-xl leading-8">
        Puede que el enlace esté incompleto. Vuelve al inicio y sigue desde ahí.
      </p>
      <Button asChild variant="libreta" size="lg" className="mt-10">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </Hoja>
  )
}
