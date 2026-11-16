import { Link, Navigate, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { CambiarMiClave } from '@/components/marca/CambiarMiClave'
import { ConfirmarSalida } from '@/components/marca/ConfirmarSalida'
import { Logo } from '@/components/marca/Logo'
import { Button } from '@/components/ui/button'
import { Info } from '@/components/marca/Info'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SidebarFooter,
  SidebarMenuBadge,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { sinSesion, useResumenCola, useYo } from '@/features/admin/consultas'
import { numero } from '@/lib/formato'

type Seccion = { a: string; texto: string; descripcion: string }

/** Lo del día a día: revisar boletas y atender vecinos. */
const SECCIONES_TRABAJO: Seccion[] = [
  {
    a: '/admin/boletas',
    texto: 'Boletas',
    descripcion: 'Cola de boletas con lectura automática para aprobar o rechazar.',
  },
  {
    a: '/admin/vecinos',
    texto: 'Vecinos',
    descripcion: 'Busca por nombre o teléfono, revisa movimientos y reenvía enlaces.',
  },
  {
    a: '/admin/canjes',
    texto: 'Canjes',
    descripcion: 'Códigos emitidos, usados y vencidos.',
  },
]

/** Seguimiento de la red: se mira menos seguido que la cola. */
const SECCIONES_RED: Seccion[] = [
  // A.15 y secciones 9 y 10: el operador aprueba beneficios, registra sanciones y hace la
  // revisión del lunes. Lo que es solo del admin queda oculto dentro de cada pantalla.
  {
    a: '/admin/comercios',
    texto: 'Comercios',
    descripcion: 'Alta y edición, beneficios por aprobar, sanciones y solicitudes.',
  },
  {
    a: '/admin/red',
    texto: 'Red',
    descripcion: 'Revisión del lunes, indicadores y alertas de fraude.',
  },
]

const SECCIONES_ADMIN: Seccion[] = [
  {
    a: '/admin/parametros',
    texto: 'Parámetros',
    descripcion: 'Parámetros de la red, editables y con registro de cambios.',
  },
  {
    a: '/admin/mensajes',
    texto: 'Mensajes',
    descripcion: 'Plantillas de los mensajes al vecino.',
  },
  {
    a: '/admin/sistema',
    texto: 'Equipo y tareas',
    descripcion: 'Crea las cuentas del equipo, corre las tareas del día y exporta datos a CSV.',
  },
]

/** Pendientes de la cola, siempre a la vista en el menú. */
function ContadorPendientes() {
  const resumen = useResumenCola()
  const n = resumen.data?.pendientes
  if (!n) return null
  return (
    <SidebarMenuBadge
      aria-label={`${n} pendientes`}
      className="top-1/2 right-3 h-7 min-w-8 -translate-y-1/2 rounded-none border-2 border-tapa bg-mango px-1.5 text-[0.9375rem] font-extrabold text-tapa peer-data-[active=true]/menu-button:border-mango peer-data-[active=true]/menu-button:text-tapa"
    >
      {numero(n)}
    </SidebarMenuBadge>
  )
}

function Grupo({ titulo, secciones }: { titulo: string; secciones: Seccion[] }) {
  const { pathname } = useLocation()
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="h-10 text-[0.9375rem] font-semibold tracking-normal text-lapiz normal-case">
        {titulo}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {secciones.map(({ a, texto }) => (
            <SidebarMenuItem key={a}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(a)}
                className="h-12 rounded-none border-l-[6px] border-transparent px-4 text-base font-semibold hover:bg-mango-50 data-[active=true]:border-mango data-[active=true]:bg-tapa data-[active=true]:font-bold data-[active=true]:text-papel"
              >
                <NavLink to={a}>
                  <span>{texto}</span>
                </NavLink>
              </SidebarMenuButton>
              {a === '/admin/boletas' && <ContadorPendientes />}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/** Zona del equipo (operador y admin): computador, con menú lateral. */
export function LayoutAdmin() {
  const { pathname } = useLocation()
  const yo = useYo()
  const actual = [...SECCIONES_TRABAJO, ...SECCIONES_RED, ...SECCIONES_ADMIN].find((s) => pathname.startsWith(s.a))

  if (yo.isPending) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if ((yo.isError && sinSesion(yo.error)) || yo.data?.rol === 'comercio') {
    return <Navigate to="/admin/entrar" replace state={{ desde: pathname }} />
  }
  if (yo.isError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-lg">
        <p className="mb-4">{yo.error.message}</p>
        <Button variant="libreta" onClick={() => yo.refetch()}>Reintentar</Button>
      </div>
    )
  }
  const esAdmin = yo.data.rol === 'admin'

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="h-18 justify-center border-b-2 border-tapa px-4">
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <Grupo titulo="Tu trabajo" secciones={SECCIONES_TRABAJO} />
            <Grupo titulo="Seguimiento" secciones={SECCIONES_RED} />
            {esAdmin && <Grupo titulo="Administración" secciones={SECCIONES_ADMIN} />}
          </SidebarContent>
          <SidebarFooter className="gap-3 border-t-2 border-cuadricula p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-tapa">{yo.data.nombre}</p>
              <p className="truncate text-[0.9375rem] text-lapiz">
                {esAdmin ? 'Administrador' : 'Operador'} · {yo.data.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4">
              <CambiarMiClave>
                <button
                  type="button"
                  className="inline-flex min-h-10 cursor-pointer items-center text-[0.9375rem] font-semibold text-tinta-azul underline decoration-2 underline-offset-4 hover:text-tapa"
                >
                  Cambiar mi clave
                </button>
              </CambiarMiClave>
              <Link
                to="/"
                className="inline-flex min-h-10 items-center text-[0.9375rem] font-semibold text-tinta-azul underline decoration-2 underline-offset-4 hover:text-tapa"
              >
                Ver el sitio público
              </Link>
            </div>
            <ConfirmarSalida destino="/admin/entrar">
              <Button variant="libreta-secundario" size="sm" className="w-full">
                Cerrar sesión
              </Button>
            </ConfirmarSalida>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="libreta min-w-0 bg-papel">
          <header className="flex min-h-18 items-center gap-3 border-b-2 border-tapa bg-papel px-4 py-3 lg:px-8">
            <SidebarTrigger className="md:hidden" />
            <div className="flex min-w-0 items-center gap-3 border-l-[6px] border-mango pl-4">
              <h1 className="rotulo text-3xl leading-tight text-tapa">{actual?.texto ?? 'Panel'}</h1>
              {actual?.descripcion && <Info etiqueta={`Qué hay en ${actual.texto}`}>{actual.descripcion}</Info>}
            </div>
          </header>
          <div className="w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">
            <Outlet context={actual} />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <ScrollRestoration />
    </TooltipProvider>
  )
}
