import { useId, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Cargando } from '@/components/marca/Cargando'
import { Hoja } from '@/components/marca/libreta'
import { Logo } from '@/components/marca/Logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { Yo } from '@/lib/api'
import { mensajeError, useEntrar, useYo } from '@/lib/sesion'

type Zona = 'comercio' | 'equipo'

const TEXTOS: Record<Zona, { titulo: string; bajada: string; caja: string; otra: { a: string; texto: string } }> = {
  comercio: {
    titulo: 'Entra a tu local.',
    bajada: 'Con el correo y la clave que te dio Red Vecina. En el celular de la caja la sesión queda abierta.',
    caja: 'Portal del comercio',
    otra: { a: '/admin/entrar', texto: '¿Eres del equipo? Entra al panel' },
  },
  equipo: {
    titulo: 'Entra al panel.',
    bajada: 'Para el equipo de Red Vecina: boletas, vecinos, comercios y la red.',
    caja: 'Panel del equipo',
    otra: { a: '/comercio/login', texto: '¿Tienes un comercio? Entra a tu local' },
  },
}

/** Adónde va cada cuenta al entrar, sin importar por qué puerta entró. */
function inicioDe(u: Yo, destino: string | null): string {
  if (u.rol === 'comercio') return destino?.startsWith('/comercio') ? destino : '/comercio'
  return destino?.startsWith('/admin') ? destino : '/admin/boletas'
}

/**
 * Acceso del comercio y del equipo: misma hoja, mismo formulario. Si alguien entra por la
 * puerta equivocada, igual llega a su zona.
 */
export function PantallaEntrar({ zona }: { zona: Zona }) {
  const id = useId()
  const navigate = useNavigate()
  const { state } = useLocation()
  const destino = typeof state?.desde === 'string' ? state.desde : null
  const yo = useYo()
  const entrar = useEntrar()
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verClave, setVerClave] = useState(false)
  const t = TEXTOS[zona]

  if (yo.data) return <Navigate to={inicioDe(yo.data, destino)} replace />

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    entrar.mutate(
      { email: email.trim(), contrasena },
      { onSuccess: (u) => navigate(inicioDe(u, destino), { replace: true }) },
    )
  }

  return (
    <div className="libreta flex min-h-svh flex-col">
      <header className="border-b-2 border-tapa bg-papel">
        <div className="mx-auto flex h-20 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-8">
          <Link to="/" aria-label="Red Vecina, ir al inicio">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-12 items-center font-semibold text-tinta underline decoration-mango decoration-2 underline-offset-[6px] hover:text-tinta-azul"
          >
            Volver al inicio
          </Link>
        </div>
      </header>
      <Hoja viva etiqueta={`${id}-titulo`} className="flex-1 py-12 sm:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
          <div>
            <h1
              id={`${id}-titulo`}
              className="rotulo max-w-[12ch] text-[3rem] leading-[1.05] tracking-[-0.035em] text-tapa sm:text-7xl"
            >
              {t.titulo}
            </h1>
            <p className="mt-6 max-w-[30rem] text-xl leading-8">{t.bajada}</p>
          </div>

          <div className="border-2 border-tapa bg-papel">
            <p className="flex h-12 items-center border-b-[6px] border-mango bg-tapa px-5 font-semibold text-papel">
              {t.caja}
            </p>
            <form onSubmit={enviar} noValidate className="p-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${id}-email`}>Correo</FieldLabel>
                  <Input
                    id={`${id}-email`}
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <div className="flex items-end justify-between gap-3">
                    <FieldLabel htmlFor={`${id}-clave`}>Clave</FieldLabel>
                    <button
                      type="button"
                      onClick={() => setVerClave((v) => !v)}
                      aria-controls={`${id}-clave`}
                      aria-pressed={verClave}
                      className="-mb-2 inline-flex min-h-10 cursor-pointer items-center px-1 text-[0.9375rem] font-semibold text-tinta-azul underline decoration-2 underline-offset-4 hover:text-tapa"
                    >
                      {verClave ? 'Ocultar clave' : 'Mostrar clave'}
                    </button>
                  </div>
                  <Input
                    id={`${id}-clave`}
                    type={verClave ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    required
                  />
                </Field>
                {entrar.isError && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{mensajeError(entrar.error)}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  variant="libreta"
                  size="lg"
                  className="w-full"
                  disabled={entrar.isPending || !email || !contrasena}
                >
                  {entrar.isPending && <Cargando />}
                  Entrar
                </Button>
              </FieldGroup>
            </form>
            <div className="border-t-2 border-cuadricula px-5 py-4 text-[0.9375rem] leading-6 text-lapiz">
              ¿Olvidaste tu clave? Pídele una nueva al equipo de Red Vecina por WhatsApp.
            </div>
          </div>
        </div>
        <p className="mt-12">
          <Link
            to={t.otra.a}
            className="inline-flex min-h-12 items-center text-lg font-semibold text-tinta-azul underline decoration-2 underline-offset-[6px] hover:text-tapa"
          >
            {t.otra.texto}
          </Link>
        </p>
      </Hoja>
    </div>
  )
}
