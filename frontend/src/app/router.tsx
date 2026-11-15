import { createBrowserRouter } from 'react-router'
import { LayoutPublico } from '@/app/layouts/LayoutPublico'
import { PaginaComercios } from '@/features/landing/PaginaComercios'
import { PaginaCondiciones } from '@/features/landing/PaginaCondiciones'
import { PaginaInicio } from '@/features/landing/PaginaInicio'
import { PaginaNoEncontrada } from '@/features/landing/PaginaNoEncontrada'

// La zona pública va en el paquete principal; las demás zonas se cargan al entrar.
export const router = createBrowserRouter([
  {
    Component: LayoutPublico,
    children: [
      { path: '/', Component: PaginaInicio },
      { path: '/comercios', Component: PaginaComercios },
      { path: '/condiciones', Component: PaginaCondiciones },
      { path: '*', Component: PaginaNoEncontrada },
    ],
  },
  {
    path: '/estilos',
    lazy: async () => ({ Component: (await import('@/features/estilos/PaginaEstilos')).PaginaEstilos }),
  },
  {
    path: '/t/:token',
    lazy: async () => ({ Component: (await import('@/app/layouts/LayoutVecino')).LayoutVecino }),
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/features/vecino/PaginaTarjeta')).PaginaTarjeta }),
      },
    ],
  },
  {
    path: '/comercio',
    lazy: async () => ({ Component: (await import('@/app/layouts/LayoutComercio')).LayoutComercio }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import('@/features/comercio/PaginasComercio')).PaginaValidar }) },
      { path: 'cupo', lazy: async () => ({ Component: (await import('@/features/comercio/PaginasComercio')).PaginaCupo }) },
      {
        path: 'beneficios',
        lazy: async () => ({ Component: (await import('@/features/comercio/PaginasComercio')).PaginaBeneficios }),
      },
      { path: 'reporte', lazy: async () => ({ Component: (await import('@/features/comercio/PaginasComercio')).PaginaReporte }) },
    ],
  },
  {
    path: '/admin',
    lazy: async () => ({ Component: (await import('@/app/layouts/LayoutAdmin')).LayoutAdmin }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import('@/features/admin/PaginaSeccion')).IrAlInicioAdmin }) },
      { path: ':seccion', lazy: async () => ({ Component: (await import('@/features/admin/PaginaSeccion')).PaginaSeccion }) },
    ],
  },
])
