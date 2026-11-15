import { LoaderCircle } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Logo } from '@/components/marca/Logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { mensajeError, useEntrar, useYo } from '@/lib/sesion'

/** /comercio/login — el celular de la caja queda con la sesión abierta por semanas. */
export function PaginaEntrar() {
  const id = useId()
  const navigate = useNavigate()
  const yo = useYo()
  const entrar = useEntrar()
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')

  if (yo.data?.rol === 'comercio') return <Navigate to="/comercio" replace />

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    entrar.mutate(
      { email: email.trim(), contrasena },
      {
        onSuccess: (u) => {
          if (u.rol === 'comercio') navigate('/comercio', { replace: true })
        },
      },
    )
  }

  const noEsComercio = entrar.data && entrar.data.rol !== 'comercio'

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sobre-oscuro bg-barrio">
        <div className="mx-auto flex h-16 max-w-md items-center px-4">
          <Logo tono="oscuro" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <h1 className="mb-2 text-4xl font-extrabold">Entra a tu local</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Con el correo y la clave que te dio Red Vecina. Quedas conectado en este celular.
        </p>
        <form onSubmit={enviar} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-email`}>Correo</FieldLabel>
              <Input
                id={`${id}-email`}
                type="email"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-clave`}>Clave</FieldLabel>
              <Input
                id={`${id}-clave`}
                type="password"
                autoComplete="current-password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />
            </Field>
            {entrar.isError && (
              <Alert variant="destructive">
                <AlertDescription>{mensajeError(entrar.error)}</AlertDescription>
              </Alert>
            )}
            {noEsComercio && (
              <Alert>
                <AlertDescription>Esta cuenta es del equipo de Red Vecina. Entra por el panel.</AlertDescription>
              </Alert>
            )}
            <Button type="submit" size="lg" disabled={entrar.isPending || !email || !contrasena}>
              {entrar.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Entrar
            </Button>
          </FieldGroup>
        </form>
      </main>
    </div>
  )
}
