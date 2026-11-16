import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Cargando } from '@/components/marca/Cargando'
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { mensajeError } from '@/lib/sesion'

/** Política de seguridad del backend (LARGO_MINIMO_CONTRASENA), no regla de negocio. */
const LARGO_CLAVE = 10

/** Cambiar la propia clave: pide la actual y deja esta sesión abierta. */
export function CambiarMiClave({ children }: { children: ReactNode }) {
  const id = useId()
  const [abierto, setAbierto] = useState(false)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [listo, setListo] = useState(false)
  const cambiar = useMutation({ mutationFn: api.cuentas.cambiarMiContrasena })
  const distintas = repetida.length > 0 && repetida !== nueva

  function limpiar() {
    setActual('')
    setNueva('')
    setRepetida('')
    cambiar.reset()
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (distintas) return
    cambiar.mutate(
      { actual, nueva },
      {
        onSuccess: () => {
          limpiar()
          setListo(true)
        },
      },
    )
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v)
        if (!v) {
          limpiar()
          setListo(false)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={false}>
        {listo ? (
          <>
            <DialogHeader>
              <DialogTitle>Clave cambiada</DialogTitle>
              <DialogDescription>
                Sigues conectado aquí. En otros equipos tendrás que entrar de nuevo con la clave nueva.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="libreta" onClick={() => setAbierto(false)}>
                Listo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>Cambiar mi clave</DialogTitle>
              <DialogDescription>Escribe tu clave actual y luego la nueva dos veces.</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${id}-actual`}>Clave actual</FieldLabel>
                <Input
                  id={`${id}-actual`}
                  type="password"
                  autoComplete="current-password"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-nueva`}>Clave nueva</FieldLabel>
                <Input
                  id={`${id}-nueva`}
                  type="password"
                  autoComplete="new-password"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                />
                <FieldDescription>Al menos {LARGO_CLAVE} caracteres.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-repetida`}>Repite la clave nueva</FieldLabel>
                <Input
                  id={`${id}-repetida`}
                  type="password"
                  autoComplete="new-password"
                  value={repetida}
                  onChange={(e) => setRepetida(e.target.value)}
                  aria-invalid={distintas || undefined}
                />
                {distintas && <FieldDescription className="text-peligro-texto">No coincide con la nueva.</FieldDescription>}
              </Field>
            </FieldGroup>
            {cambiar.isError && <p className="font-semibold text-peligro-texto">{mensajeError(cambiar.error)}</p>}
            <DialogFooter>
              <Button type="button" variant="libreta-secundario" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="libreta"
                disabled={!actual || nueva.length < LARGO_CLAVE || nueva !== repetida || cambiar.isPending}
              >
                {cambiar.isPending && <Cargando />}
                Cambiar clave
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
