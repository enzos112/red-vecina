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
    path: '/comercio/login',
    lazy: async () => ({ Component: (await import('@/features/comercio/PaginaEntrar')).PaginaEntrar }),
  },
  {
    path: '/comercio',
    lazy: async () => ({ Component: (await import('@/app/layouts/LayoutComercio')).LayoutComercio }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import('@/features/comercio/PaginaValidar')).PaginaValidar }) },
      {
        path: 'sin-internet',
        lazy: async () => ({ Component: (await import('@/features/comercio/PaginaSinInternet')).PaginaSinInternet }),
      },
      { path: 'cupo', lazy: async () => ({ Component: (await import('@/features/comercio/PaginaCupo')).PaginaCupo }) },
      {
        path: 'beneficios',
        lazy: async () => ({ Component: (await import('@/features/comercio/PaginaBeneficios')).PaginaBeneficios }),
      },
      { path: 'reporte', lazy: async () => ({ Component: (await import('@/features/comercio/PaginaReporte')).PaginaReporte }) },
      { path: 'afiche', lazy: async () => ({ Component: (await import('@/features/comercio/PaginaAfiche')).PaginaAfiche }) },
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
      {
        path: 'comercios',
        lazy: async () => ({ Component: (await import('@/features/admin/comercios/PaginaComercios')).PaginaComercios }),
      },
      {
        path: 'comercios/:id',
        lazy: async () => ({ Component: (await import('@/features/admin/comercios/PaginaComercio')).PaginaComercio }),
      },
      { path: 'red', lazy: async () => ({ Component: (await import('@/features/admin/red/PaginaRed')).PaginaRed }) },
      {
        path: 'parametros',
        lazy: async () => ({ Component: (await import('@/features/admin/parametros/PaginaParametros')).PaginaParametros }),
      },
      {
        path: 'mensajes',
        lazy: async () => ({ Component: (await import('@/features/admin/mensajes/PaginaMensajes')).PaginaMensajes }),
      },
      {
        path: 'sistema',
        lazy: async () => ({ Component: (await import('@/features/admin/sistema/PaginaSistema')).PaginaSistema }),
      },
      { path: '*', lazy: async () => ({ Component: (await import('@/features/admin/PaginaSeccion')).IrAlInicioAdmin }) },
    ],
  },
])
