import { Link, Navigate, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { Logo } from '@/components/marca/Logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { sinSesion, useSalir, useYo } from '@/lib/sesion'
import { dia } from '@/lib/formato'
import { cn } from '@/lib/utils'

const SECCIONES = [
  { a: '/comercio', texto: 'Validar', exacta: true },
  { a: '/comercio/cupo', texto: 'Cupo', exacta: false },
  { a: '/comercio/beneficios', texto: 'Beneficios', exacta: false },
  { a: '/comercio/reporte', texto: 'Reporte', exacta: false },
]

/** Zona del comercio: celular, con las secciones siempre visibles abajo (sin menú oculto). */
export function LayoutComercio() {
  const yo = useYo()
  const salir = useSalir()
  const navigate = useNavigate()
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
        <Button onClick={() => yo.refetch()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sobre-oscuro bg-barrio">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between gap-2 px-4">
          <Logo tono="oscuro" />
          <div className="flex min-w-0 items-center gap-4">
            <span className="hidden truncate text-sm font-semibold text-crema/85 min-[400px]:block">
              {yo.data.comercio?.nombre ?? 'Comercio'}
            </span>
            <Link
              to="/comercio/afiche"
              className="text-sm font-bold text-crema underline-offset-4 hover:underline"
              aria-label="Afiche y tarjeta para la caja"
            >
              Afiche
            </Link>
            <button
              type="button"
              className="cursor-pointer text-sm font-bold text-mango underline-offset-4 hover:underline"
              onClick={() => salir.mutate(undefined, { onSettled: () => navigate('/comercio/login', { replace: true }) })}
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-32">
        {yo.data.comercio?.estado === 'suspendido' && (
          <p className="mb-6 rounded-lg border-2 border-l-4 border-border border-l-alerta bg-alerta-fondo px-4 py-3">
            Tus beneficios están suspendidos
            {yo.data.comercio.suspendido_hasta ? ` hasta el ${dia(yo.data.comercio.suspendido_hasta)}` : ''}: los vecinos
            no los ven. Los códigos ya emitidos se respetan y tus boletas siguen sumando.
          </p>
        )}
        {yo.data.comercio?.estado === 'retirado' && (
          <p className="mb-6 rounded-lg border-2 border-l-4 border-border border-l-alerta bg-alerta-fondo px-4 py-3">
            Tu comercio salió de la red. Puedes validar los códigos que ya se emitieron hasta que venzan.
          </p>
        )}
        <Outlet />
      </main>
      <nav
        aria-label="Secciones del comercio"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
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
                    'before:absolute before:inset-x-3 before:top-0 before:h-1 before:rounded-b-full before:transition-colors',
                    isActive
                      ? 'text-barrio before:bg-mango'
                      : 'text-muted-foreground before:bg-transparent hover:text-foreground',
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
