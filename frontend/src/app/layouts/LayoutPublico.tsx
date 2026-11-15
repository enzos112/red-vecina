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

const enlaceNav =
  'inline-flex min-h-12 items-center px-3 text-[1.0625rem] font-semibold text-tinta underline-offset-[6px] decoration-2 decoration-tinta-azul transition-colors duration-200 hover:text-tinta-azul hover:underline'

/** Cabecera de la hoja: papel, con el renglón de la tapa marcado abajo. */
function Encabezado() {
  const { pathname } = useLocation()
  const enComercios = pathname.startsWith('/comercios')
  return (
    <header className="relative z-10 border-b-2 border-tapa bg-papel">
      <div className="mx-auto flex h-20 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-8 lg:pl-[calc(8rem+2px)]">
        <Link to="/" aria-label="Red Vecina, inicio" className="inline-flex min-h-12 items-center">
          <Logo libreta />
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1">
          {!enComercios && (
            <ul className="mr-3 hidden items-center lg:flex">
              {NAV_VECINOS.map((item) => (
                <li key={item.a}>
                  <Link to={item.a} className={enlaceNav}>
                    {item.texto}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="libreta-secundario" size="sm" className="px-3.5 sm:px-5">
            {enComercios ? <Link to="/">Para vecinos</Link> : <Link to="/comercios">Tengo un negocio</Link>}
          </Button>
        </nav>
      </div>
    </header>
  )
}

const enlacePie =
  'inline-flex min-h-12 items-center text-papel underline-offset-[6px] decoration-2 decoration-mango hover:underline'

function ColumnaPie({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="border-b border-tapa-texto/40 pb-2 text-base font-bold text-tapa-texto">{titulo}</h2>
      <ul className="mt-2 flex flex-col">{children}</ul>
    </div>
  )
}

/** Contratapa: el cierre de la libreta, en azul noche. */
function Pie() {
  return (
    <footer className="sobre-tapa bg-tapa text-papel">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-16 sm:grid-cols-3 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:pl-[calc(8rem+2px)]">
        <div className="max-w-xs sm:col-span-3 lg:col-span-1">
          <Logo libreta tono="oscuro" />
          <p className="mt-4 text-tapa-texto">Un programa de puntos compartido entre los comercios de tu barrio.</p>
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
        <ColumnaPie titulo="Más">
          <li>
            <Link to="/condiciones" className={enlacePie}>
              Condiciones y datos
            </Link>
          </li>
          <li>
            <Link to="/acceso" className={enlacePie}>
              Entrar (comercios y equipo)
            </Link>
          </li>
        </ColumnaPie>
      </div>
      <div className="border-t border-tapa-texto/30">
        <p className="mx-auto max-w-[90rem] px-4 py-6 text-[0.9375rem] text-tapa-texto sm:px-8 lg:pl-[calc(8rem+2px)]">
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
    <div className="libreta flex min-h-svh flex-col">
      <a
        href="#contenido"
        className="sr-only z-50 bg-mango px-5 py-3 font-bold text-tapa focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
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
