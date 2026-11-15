import { BarChart3, Gauge, Gift, LogOut, QrCode, ScanLine } from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { Logo } from '@/components/marca/Logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { sinSesion, useSalir, useYo } from '@/lib/sesion'
import { dia } from '@/lib/formato'
import { cn } from '@/lib/utils'

const SECCIONES = [
  { a: '/comercio', texto: 'Validar', icono: ScanLine, exacta: true },
  { a: '/comercio/cupo', texto: 'Cupo', icono: Gauge, exacta: false },
  { a: '/comercio/beneficios', texto: 'Beneficios', icono: Gift, exacta: false },
  { a: '/comercio/reporte', texto: 'Reporte', icono: BarChart3, exacta: false },
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
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate text-sm font-semibold text-crema/85">{yo.data.comercio?.nombre ?? 'Comercio'}</span>
            <Button variant="oscuro-secundario" size="icon" className="border-transparent" asChild>
              <Link to="/comercio/afiche" aria-label="Afiche y tarjeta para la caja">
                <QrCode aria-hidden="true" />
              </Link>
            </Button>
            <Button
              variant="oscuro-secundario"
              size="icon"
              className="border-transparent"
              aria-label="Salir"
              onClick={() => salir.mutate(undefined, { onSettled: () => navigate('/comercio/login', { replace: true }) })}
            >
              <LogOut aria-hidden="true" />
            </Button>
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
          {SECCIONES.map(({ a, texto, icono: Icono, exacta }) => (
            <li key={a}>
              <NavLink
                to={a}
                end={exacta}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-18 flex-col items-center justify-center gap-1 text-sm font-semibold transition-colors duration-200',
                    isActive ? 'text-vecina' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200',
                        isActive && 'bg-secondary',
                      )}
                    >
                      <Icono className="size-5" aria-hidden="true" />
                    </span>
                    {texto}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <ScrollRestoration />
    </div>
  )
}
