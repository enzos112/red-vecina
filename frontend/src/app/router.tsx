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
    // Zona del vecino: inscripción desde el QR y su tarjeta personal.
    lazy: async () => ({ Component: (await import('@/app/layouts/LayoutVecino')).LayoutVecino }),
    children: [
      {
        path: '/unirme/:comercio',
        lazy: async () => ({ Component: (await import('@/features/vecino/PaginaUnirme')).PaginaUnirme }),
      },
      {
        path: '/t/:token',
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/features/vecino/PaginaTarjeta')).PaginaTarjeta }),
          },
          {
            path: 'boleta',
            lazy: async () => ({ Component: (await import('@/features/vecino/PaginaBoleta')).PaginaBoleta }),
          },
          {
            path: 'beneficios',
            lazy: async () => ({ Component: (await import('@/features/vecino/PaginaBeneficios')).PaginaBeneficios }),
          },
          {
            path: 'historial',
            lazy: async () => ({ Component: (await import('@/features/vecino/PaginaHistorial')).PaginaHistorial }),
          },
        ],
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
    path: '/admin/entrar',
    lazy: async () => ({ Component: (await import('@/features/admin/PaginaEntrar')).PaginaEntrar }),
  },
  {
    path: '/admin',
    lazy: async () => ({ Component: (await import('@/app/layouts/LayoutAdmin')).LayoutAdmin }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import('@/features/admin/PaginaSeccion')).IrAlInicioAdmin }) },
      { path: 'boletas', lazy: async () => ({ Component: (await import('@/features/admin/boletas/PaginaCola')).PaginaCola }) },
      {
        path: 'boletas/:id',
        lazy: async () => ({ Component: (await import('@/features/admin/boletas/PaginaRevision')).PaginaRevision }),
      },
      { path: 'vecinos', lazy: async () => ({ Component: (await import('@/features/admin/vecinos/PaginaVecinos')).PaginaVecinos }) },
      {
        path: 'vecinos/:id',
        lazy: async () => ({ Component: (await import('@/features/admin/vecinos/PaginaVecino')).PaginaVecino }),
      },
      { path: 'canjes', lazy: async () => ({ Component: (await import('@/features/admin/canjes/PaginaCanjes')).PaginaCanjes }) },
      // Comercios, red y parámetros llegan en la fase 7.
      { path: ':seccion', lazy: async () => ({ Component: (await import('@/features/admin/PaginaSeccion')).PaginaSeccion }) },
    ],
  },
])
