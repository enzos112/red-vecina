import { Link, NavLink, Outlet, ScrollRestoration, useParams } from 'react-router'
import { Logo } from '@/components/marca/Logo'
import { cn } from '@/lib/utils'

/**
 * Zona del vecino: su hoja de la libreta. En el celular es una columna; en el computador la
 * hoja se ensancha, el margen se corre y la cabecera suma los accesos a cada parte de la tarjeta.
 */
export function LayoutVecino() {
  const { token } = useParams()
  const enlaces = token
    ? [
        { a: `/t/${token}`, texto: 'Mi tarjeta', fin: true },
        { a: `/t/${token}/beneficios`, texto: 'Mis beneficios', fin: false },
        { a: `/t/${token}/historial`, texto: 'Mi historial', fin: false },
      ]
    : []
  return (
    <div className="libreta hoja flex min-h-svh flex-col">
      <header className="sobre-tapa bg-tapa">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between gap-6 px-4 lg:h-20 lg:max-w-6xl lg:px-8">
          <Logo libreta tono="oscuro" />
          {enlaces.length > 0 && (
            <nav aria-label="Tu tarjeta" className="hidden lg:block">
              <ul className="flex items-stretch gap-1">
                {enlaces.map((e) => (
                  <li key={e.a}>
                    <NavLink
                      to={e.a}
                      end={e.fin}
                      className={({ isActive }) =>
                        cn(
                          'flex h-20 items-center border-b-4 px-4 pt-1 text-[1.0625rem] font-semibold transition-colors duration-200',
                          isActive
                            ? 'border-mango text-papel'
                            : 'border-transparent text-tapa-texto hover:border-mango/50 hover:text-papel',
                        )
                      }
                    >
                      {e.texto}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </header>
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-6xl">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-4 w-1.5 border-x-2 border-tapa lg:left-8"
        />
        <main className="flex-1 py-8 pr-4 pl-10 lg:py-12 lg:pr-8 lg:pl-20">
          <Outlet />
        </main>
        <footer className="pr-4 pb-8 pl-10 lg:pr-8 lg:pl-20">
          <Link
            to="/condiciones"
            className="inline-flex min-h-12 items-center text-tinta underline decoration-mango decoration-2 underline-offset-[6px] hover:text-tinta-azul"
          >
            Condiciones y uso de datos
          </Link>
        </footer>
      </div>
      <ScrollRestoration />
    </div>
  )
}
