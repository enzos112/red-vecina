import { LoaderCircle } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Logo } from '@/components/marca/Logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { mensajeError, useEntrar, useYo } from './consultas'

/** /admin/entrar — acceso del operador y del administrador. */
export function PaginaEntrar() {
  const id = useId()
  const navigate = useNavigate()
  const { state } = useLocation()
  const yo = useYo()
  const entrar = useEntrar()
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const destino = typeof state?.desde === 'string' ? state.desde : '/admin/boletas'

  if (yo.data && yo.data.rol !== 'comercio') return <Navigate to={destino} replace />

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    entrar.mutate(
      { email: email.trim(), contrasena },
      {
        onSuccess: (u) => {
          if (u.rol !== 'comercio') navigate(destino, { replace: true })
        },
      },
    )
  }

  const esComercio = entrar.data?.rol === 'comercio'

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <Card className="aparecer w-full max-w-md">
        <CardHeader>
          <div className="mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Entrar al panel</CardTitle>
          <CardDescription>Para el equipo de Red Vecina.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${id}-email`}>Correo</FieldLabel>
                <Input
                  id={`${id}-email`}
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-clave`}>Contraseña</FieldLabel>
                <Input
                  id={`${id}-clave`}
                  type="password"
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                />
              </Field>
              {entrar.isError && (
                <Alert variant="destructive">
                  <AlertDescription>{mensajeError(entrar.error)}</AlertDescription>
                </Alert>
              )}
              {esComercio && (
                <Alert>
                  <AlertDescription>Esta cuenta es de un comercio. Entra desde el portal del comercio.</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={entrar.isPending || !email || !contrasena}>
                {entrar.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                Entrar
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
