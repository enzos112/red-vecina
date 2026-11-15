import { useEffect, type ReactNode } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { Logo } from '@/components/marca/Logo'
import { Button } from '@/components/ui/button'

const NAV_VECINOS = [
  { a: '/#como-funciona', texto: 'Cómo funciona' },
  { a: '/#comercios', texto: 'Comercios' },
  { a: '/#preguntas', texto: 'Preguntas' },
]

/** Lleva a la sección del ancla (#comercios) al navegar entre páginas. */
function useIrAlAncla() {
  const { hash, pathname } = useLocation()
  useEffect(() => {
    if (!hash) return
    const destino = document.getElementById(decodeURIComponent(hash.slice(1)))
    destino?.scrollIntoView()
  }, [hash, pathname])
}

const enlaceOscuro =
  'inline-flex min-h-12 items-center rounded-full px-4 text-base font-semibold text-crema transition-colors duration-200 hover:bg-barrio-claro'

function Encabezado() {
  const { pathname } = useLocation()
  const enComercios = pathname.startsWith('/comercios')
  return (
    <header className="sobre-oscuro bg-barrio">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Red Vecina, inicio" className="inline-flex min-h-12 items-center rounded-lg">
          <Logo tono="oscuro" />
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1">
          {!enComercios && (
            <ul className="mr-2 hidden items-center gap-1 lg:flex">
              {NAV_VECINOS.map((item) => (
                <li key={item.a}>
                  <Link to={item.a} className={enlaceOscuro}>
                    {item.texto}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="oscuro-secundario" size="sm">
            {enComercios ? (
              <Link to="/">Para vecinos</Link>
            ) : (
              <Link to="/comercios">Para comercios</Link>
            )}
          </Button>
        </nav>
      </div>
    </header>
  )
}

const enlacePie =
  'inline-flex min-h-12 items-center text-crema/90 underline-offset-4 hover:text-mango hover:underline'

function ColumnaPie({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold tracking-wide text-mango uppercase">{titulo}</h2>
      <ul className="mt-3 flex flex-col">{children}</ul>
    </div>
  )
}

function Pie() {
  return (
    <footer className="sobre-oscuro bg-barrio text-crema">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:grid-cols-3 sm:px-6 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-xs sm:col-span-3 lg:col-span-1">
          <Logo tono="oscuro" />
          <p className="mt-4 text-crema/85">
            Un programa de puntos compartido entre los comercios de tu barrio.
          </p>
        </div>
        <ColumnaPie titulo="Vecinos">
          {NAV_VECINOS.map((item) => (
            <li key={item.a}>
              <Link to={item.a} className={enlacePie}>
                {item.texto}
              </Link>
            </li>
          ))}
        </ColumnaPie>
        <ColumnaPie titulo="Comercios">
          <li>
            <Link to="/comercios" className={enlacePie}>
              Cómo funciona
            </Link>
          </li>
          <li>
            <Link to="/comercios#unirme" className={enlacePie}>
              Unirme al piloto
            </Link>
          </li>
        </ColumnaPie>
        <ColumnaPie titulo="Legal">
          <li>
            <Link to="/condiciones" className={enlacePie}>
              Condiciones y datos
            </Link>
          </li>
        </ColumnaPie>
      </div>
      <div className="border-t border-barrio-claro">
        <p className="mx-auto max-w-7xl px-4 py-6 text-sm text-crema/80 sm:px-6 lg:px-8">
          Red Vecina · Piloto de barrio
        </p>
      </div>
    </footer>
  )
}

/** Zona pública: landing de vecinos, de comercios y condiciones. */
export function LayoutPublico() {
  useIrAlAncla()
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-full bg-mango px-5 py-3 font-bold text-barrio focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Ir al contenido
      </a>
      <Encabezado />
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      <Pie />
      <ScrollRestoration />
    </div>
  )
}
