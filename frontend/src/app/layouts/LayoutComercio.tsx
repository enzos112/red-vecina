import { BarChart3, Gauge, Gift, ScanLine } from 'lucide-react'
import { NavLink, Outlet, ScrollRestoration } from 'react-router'
import { Logo } from '@/components/marca/Logo'
import { cn } from '@/lib/utils'

const SECCIONES = [
  { a: '/comercio', texto: 'Validar', icono: ScanLine, exacta: true },
  { a: '/comercio/cupo', texto: 'Cupo', icono: Gauge, exacta: false },
  { a: '/comercio/beneficios', texto: 'Beneficios', icono: Gift, exacta: false },
  { a: '/comercio/reporte', texto: 'Reporte', icono: BarChart3, exacta: false },
]

/** Zona del comercio: celular, con las secciones siempre visibles abajo (sin menú oculto). */
export function LayoutComercio() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sobre-oscuro bg-barrio">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <Logo tono="oscuro" />
          <span className="text-sm font-semibold text-crema/85">Comercio</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-32">
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
