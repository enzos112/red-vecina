import { Link, Navigate, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { ConfirmarSalida } from '@/components/marca/ConfirmarSalida'
import { Logo } from '@/components/marca/Logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { sinSesion, useYo } from '@/lib/sesion'
import { dia } from '@/lib/formato'
import { cn } from '@/lib/utils'

const SECCIONES = [
  { a: '/comercio', texto: 'Validar', exacta: true },
  { a: '/comercio/cupo', texto: 'Cupo', exacta: false },
  { a: '/comercio/beneficios', texto: 'Beneficios', exacta: false },
  { a: '/comercio/reporte', texto: 'Reporte', exacta: false },
]

/**
 * Zona del comercio. En el celular de la caja, las secciones van siempre visibles abajo (sin
 * menú oculto); en el computador suben a la cabecera y la hoja se ensancha.
 */
export function LayoutComercio() {
  const yo = useYo()
  const { pathname } = useLocation()

  if (yo.isPending) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if ((yo.isError && sinSesion(yo.error)) || (yo.data && yo.data.rol !== 'comercio')) {
    return <Navigate to="/comercio/login" replace state={{ desde: pathname }} />
  }
  if (yo.isError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-lg">
        <p className="mb-4">{yo.error.message}</p>
        <Button variant="libreta" onClick={() => yo.refetch()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="libreta hoja flex min-h-svh flex-col">
      <header className="sobre-tapa bg-tapa">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between gap-2 px-4 lg:h-20 lg:max-w-6xl lg:gap-8 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Logo tono="oscuro" />
            <span className="hidden truncate border-l-2 border-tapa-texto/40 pl-4 text-[0.9375rem] font-semibold text-tapa-texto min-[400px]:block lg:text-lg lg:text-papel">
              {yo.data.comercio?.nombre ?? 'Comercio'}
            </span>
          </div>
          <nav aria-label="Secciones del comercio" className="hidden flex-1 justify-center lg:flex">
            <ul className="flex items-stretch gap-1">
              {SECCIONES.map(({ a, texto, exacta }) => (
                <li key={a}>
                  <NavLink
                    to={a}
                    end={exacta}
                    className={({ isActive }) =>
                      cn(
                        'flex h-20 items-center border-b-4 px-4 pt-1 text-[1.0625rem] font-semibold transition-colors duration-200',
                        isActive
                          ? 'border-mango text-papel'
                          : 'border-transparent text-tapa-texto hover:border-mango/50 hover:text-papel',
                      )
                    }
                  >
                    {texto}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex shrink-0 items-center gap-4">
            <Link
              to="/comercio/afiche"
              className="inline-flex min-h-12 items-center text-base font-bold text-papel underline decoration-tapa-texto decoration-2 underline-offset-[6px] hover:decoration-papel"
              aria-label="Afiche y tarjeta para la caja"
            >
              Afiche
            </Link>
            <ConfirmarSalida destino="/comercio/login" aviso="En el celular de la caja conviene dejarla abierta.">
              <button
                type="button"
                className="inline-flex min-h-12 cursor-pointer items-center text-base font-bold text-papel underline decoration-tapa-texto decoration-2 underline-offset-[6px] hover:decoration-papel"
              >
                Salir
              </button>
            </ConfirmarSalida>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-32 lg:max-w-6xl lg:px-8 lg:pt-12 lg:pb-16">
        {yo.data.comercio?.estado === 'suspendido' && (
          <p className="mb-6 border-2 border-alerta bg-alerta-fondo px-4 py-3">
            Tus beneficios están suspendidos
            {yo.data.comercio.suspendido_hasta ? ` hasta el ${dia(yo.data.comercio.suspendido_hasta)}` : ''}: los vecinos
            no los ven. Los códigos ya emitidos se respetan y tus boletas siguen sumando.
          </p>
        )}
        {yo.data.comercio?.estado === 'retirado' && (
          <p className="mb-6 border-2 border-alerta bg-alerta-fondo px-4 py-3">
            Tu comercio salió de la red. Puedes validar los códigos que ya se emitieron hasta que venzan.
          </p>
        )}
        <Outlet />
      </main>
      <nav
        aria-label="Secciones del comercio"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-tapa bg-papel pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {SECCIONES.map(({ a, texto, exacta }) => (
            <li key={a}>
              <NavLink
                to={a}
                end={exacta}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-16 items-center justify-center text-base font-bold transition-colors duration-200',
                    'before:absolute before:inset-x-0 before:top-0 before:h-1 before:transition-colors',
                    isActive
                      ? 'bg-mango-50 text-tapa before:bg-mango'
                      : 'text-lapiz before:bg-transparent hover:text-tapa',
                  )
                }
              >
                {texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <ScrollRestoration />
    </div>
  )
}
