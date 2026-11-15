import { Navigate, useOutletContext } from 'react-router'
import { EnConstruccion } from '@/components/EnConstruccion'

type Seccion = { texto: string; descripcion: string } | undefined

/** Pantallas del equipo: llegan en las fases 5 y 7. */
export function PaginaSeccion() {
  const seccion = useOutletContext<Seccion>()
  return <EnConstruccion titulo={seccion?.texto ?? 'Panel'} descripcion={seccion?.descripcion ?? ''} />
}

/** /admin lleva a la cola de boletas. */
export function IrAlInicioAdmin() {
  return <Navigate to="/admin/boletas" replace />
}
