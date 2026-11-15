import { Link, Outlet, ScrollRestoration } from 'react-router'
import { Logo } from '@/components/marca/Logo'

/** Zona del vecino: una columna pensada para el celular. */
export function LayoutVecino() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-md items-center px-4">
          <Logo />
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-md px-4 pb-8">
        <Link
          to="/condiciones"
          className="inline-flex min-h-12 items-center text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Condiciones y uso de datos
        </Link>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
