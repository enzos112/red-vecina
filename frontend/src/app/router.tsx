import { createBrowserRouter } from 'react-router'
import { PaginaProvisional } from '@/features/landing/PaginaProvisional'

// Las rutas por zona (pública, vecino, comercio, admin) se agregan en las fases siguientes.
export const router = createBrowserRouter([
  { path: '*', element: <PaginaProvisional /> },
])
