import { useState, type ReactNode } from 'react'
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

/**
 * Pide confirmación antes de una acción difícil de deshacer. El botón que la abre va como hijo;
 * la acción se ejecuta al confirmar y el diálogo se cierra solo.
 */
export function Confirmar({
  titulo,
  descripcion,
  confirmar,
  cancelar = 'Cancelar',
  peligro,
  onConfirmar,
  children,
}: {
  titulo: string
  descripcion: ReactNode
  /** Texto del botón que confirma, dicho como acción ("Sí, desactivar"). */
  confirmar: string
  cancelar?: string
  /** La acción borra o corta algo: el botón va en rojo. */
  peligro?: boolean
  onConfirmar: () => void
  children: ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription asChild>
            <div>{descripcion}</div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="libreta-secundario" onClick={() => setAbierto(false)}>
            {cancelar}
          </Button>
          <Button
            variant={peligro ? 'destructive' : 'libreta'}
            onClick={() => {
              onConfirmar()
              setAbierto(false)
            }}
          >
            {confirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
