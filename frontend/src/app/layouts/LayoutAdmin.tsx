import { Inbox, Settings2, Store, Ticket, TrendingUp, Users, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { Logo } from '@/components/marca/Logo'
import {
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
]

const SECCIONES_ADMIN: Seccion[] = [
  {
    a: '/admin/comercios',
    texto: 'Comercios',
    icono: Store,
    descripcion: 'Alta de comercios y usuarios, aprobación de beneficios y suspensiones.',
  },
  {
    a: '/admin/red',
    texto: 'Red',
    icono: TrendingUp,
    descripcion: 'Indicadores de la red, con alertas.',
  },
  {
    a: '/admin/parametros',
    texto: 'Parámetros',
    icono: Settings2,
    descripcion: 'Parámetros de la red, editables y con registro de cambios.',
  },
]

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
  const actual = [...SECCIONES_OPERADOR, ...SECCIONES_ADMIN].find((s) => pathname.startsWith(s.a))
  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="h-18 justify-center px-4">
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <Grupo titulo="Operación" secciones={SECCIONES_OPERADOR} />
            <Grupo titulo="Administración" secciones={SECCIONES_ADMIN} />
          </SidebarContent>
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
