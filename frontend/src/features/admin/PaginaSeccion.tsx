import { Navigate } from 'react-router'

/** /admin (y cualquier ruta desconocida del panel) lleva a la cola de boletas. */
export function IrAlInicioAdmin() {
  return <Navigate to="/admin/boletas" replace />
}
