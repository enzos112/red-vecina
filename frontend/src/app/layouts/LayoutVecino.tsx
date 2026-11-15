import { Link, Outlet, ScrollRestoration } from 'react-router'
import { Logo } from '@/components/marca/Logo'

/** Zona del vecino: su hoja de la libreta, en una columna pensada para el celular. */
export function LayoutVecino() {
  return (
    <div className="libreta hoja flex min-h-svh flex-col">
      <header className="sobre-tapa bg-tapa">
        <div className="mx-auto flex h-16 max-w-md items-center px-4">
          <Logo libreta tono="oscuro" />
        </div>
      </header>
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-4 w-1.5 border-x-2 border-tapa"
        />
        <main className="flex-1 py-8 pr-4 pl-10">
          <Outlet />
        </main>
        <footer className="pr-4 pb-8 pl-10">
          <Link
            to="/condiciones"
            className="inline-flex min-h-12 items-center text-tinta underline decoration-tinta-azul decoration-2 underline-offset-[6px] hover:text-tinta-azul"
          >
            Condiciones y uso de datos
          </Link>
        </footer>
      </div>
      <ScrollRestoration />
    </div>
  )
}
