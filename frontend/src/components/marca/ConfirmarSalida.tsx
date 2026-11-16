import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { mensajeError, useSalir } from '@/lib/sesion'

/**
 * Cerrar sesión pide confirmación: en la caja o en el panel un toque equivocado obliga a volver
 * a escribir la clave. `destino` es adónde se va al salir.
 */
export function ConfirmarSalida({
  destino,
  children,
  aviso,
}: {
  destino: string
  /** El botón que abre la confirmación (se usa con asChild). */
  children: ReactNode
  /** Una frase extra, por ejemplo qué pasa con la sesión en ese equipo. */
  aviso?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const salir = useSalir()
  const navigate = useNavigate()
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>¿Cerrar sesión?</DialogTitle>
          <DialogDescription>
            Para volver a entrar necesitarás tu correo y tu contraseña.{aviso ? ` ${aviso}` : ''}
          </DialogDescription>
        </DialogHeader>
        {salir.isError && <p className="font-semibold text-peligro-texto">{mensajeError(salir.error)}</p>}
        <DialogFooter>
          <Button variant="libreta-secundario" onClick={() => setAbierto(false)} disabled={salir.isPending}>
            Seguir conectado
          </Button>
          <Button
            variant="libreta"
            disabled={salir.isPending}
            onClick={() =>
              salir.mutate(undefined, {
                onSuccess: () => navigate(destino, { replace: true }),
              })
            }
          >
            {salir.isPending ? 'Cerrando…' : 'Sí, cerrar sesión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
