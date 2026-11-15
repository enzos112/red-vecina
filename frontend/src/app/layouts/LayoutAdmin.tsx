import { Inbox, LogOut, MessageSquareText, Settings2, Store, Ticket, TrendingUp, Users, Wrench, type LucideIcon } from 'lucide-react'
import { Navigate, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { Logo } from '@/components/marca/Logo'
import { Button } from '@/components/ui/button'
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
import { sinSesion, useResumenCola, useSalir, useYo } from '@/features/admin/consultas'
import { numero } from '@/lib/formato'

type Seccion = { a: string; texto: string; icono: LucideIcon; descripcion: string }

const SECCIONES_OPERADOR: Seccion[] = [
  {
    a: '/admin/boletas',
    texto: 'Boletas',
    icono: Inbox,
    descripcion: 'Cola de boletas con lectura automática para aprobar o rechazar.',
  },
  {
    a: '/admin/vecinos',
    texto: 'Vecinos',
    icono: Users,
    descripcion: 'Busca por nombre o teléfono, revisa movimientos y reenvía enlaces.',
  },
  {
    a: '/admin/canjes',
    texto: 'Canjes',
    icono: Ticket,
    descripcion: 'Códigos emitidos, usados y vencidos.',
  },
  // A.15 y secciones 9 y 10: el operador aprueba beneficios, registra sanciones y hace la
  // revisión del lunes. Lo que es solo del admin queda oculto dentro de cada pantalla.
  {
    a: '/admin/comercios',
    texto: 'Comercios',
    icono: Store,
    descripcion: 'Alta y edición, beneficios por aprobar, sanciones y solicitudes.',
  },
  {
    a: '/admin/red',
    texto: 'Red',
    icono: TrendingUp,
    descripcion: 'Revisión del lunes, indicadores y alertas de fraude.',
  },
]

const SECCIONES_ADMIN: Seccion[] = [
  {
    a: '/admin/parametros',
    texto: 'Parámetros',
    icono: Settings2,
    descripcion: 'Parámetros de la red, editables y con registro de cambios.',
  },
  {
    a: '/admin/mensajes',
    texto: 'Mensajes',
    icono: MessageSquareText,
    descripcion: 'Plantillas de los mensajes al vecino.',
  },
  {
    a: '/admin/sistema',
    texto: 'Tareas, datos y equipo',
    icono: Wrench,
    descripcion: 'Tareas programadas, exportación a CSV y cuentas del equipo.',
  },
]

/** Pendientes de la cola, siempre a la vista en el menú. */
function ContadorPendientes() {
  const resumen = useResumenCola()
  const n = resumen.data?.pendientes
  if (!n) return null
  return <SidebarMenuBadge aria-label={`${n} pendientes`}>{numero(n)}</SidebarMenuBadge>
}

function Grupo({ titulo, secciones }: { titulo: string; secciones: Seccion[] }) {
  const { pathname } = useLocation()
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{titulo}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {secciones.map(({ a, texto, icono: Icono }) => (
            <SidebarMenuItem key={a}>
              <SidebarMenuButton asChild isActive={pathname.startsWith(a)}>
                <NavLink to={a}>
                  <Icono aria-hidden="true" />
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
  const navigate = useNavigate()
  const yo = useYo()
  const salir = useSalir()
  const actual = [...SECCIONES_OPERADOR, ...SECCIONES_ADMIN].find((s) => pathname.startsWith(s.a))

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
        <Button onClick={() => yo.refetch()}>Reintentar</Button>
      </div>
    )
  }
  const esAdmin = yo.data.rol === 'admin'

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="h-18 justify-center px-4">
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <Grupo titulo="Operación" secciones={SECCIONES_OPERADOR} />
            {esAdmin && <Grupo titulo="Administración" secciones={SECCIONES_ADMIN} />}
          </SidebarContent>
          <SidebarFooter className="gap-2 p-4">
            <p className="truncate text-sm text-muted-foreground">
              {yo.data.nombre} · {esAdmin ? 'Administración' : 'Operación'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => salir.mutate(undefined, { onSettled: () => navigate('/admin/entrar', { replace: true }) })}
            >
              <LogOut aria-hidden="true" />
              Salir
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="bg-background">
          <header className="flex h-18 items-center gap-3 border-b border-border bg-card px-4 lg:px-8">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-2xl font-extrabold">{actual?.texto ?? 'Panel'}</h1>
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
