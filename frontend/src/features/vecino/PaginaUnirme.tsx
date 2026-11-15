import { Cargando } from '@/components/marca/Cargando'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ErrorApi, type ComercioPublico } from '@/lib/api'
import { pesos, puntos } from '@/lib/formato'
import { tarjetaRecordada } from './consultas'
import type { AvisoTarjeta } from './PaginaTarjeta'

type Campos = { nombre: string; telefono: string; acepta: boolean }
type Errores = Partial<Record<keyof Campos, string>>

/** Mismo formato que acepta la API: celular chileno de 9 dígitos que empieza con 9. */
function celularValido(texto: string): boolean {
  let digitos = texto.replace(/\D/g, '')
  if (digitos.startsWith('56')) digitos = digitos.slice(2)
  return /^9\d{8}$/.test(digitos)
}

function validar(c: Campos): Errores {
  const e: Errores = {}
  if (!c.nombre.trim()) e.nombre = 'Escribe tu nombre.'
  if (!celularValido(c.telefono)) e.telefono = 'Escribe tu celular de 9 dígitos, por ejemplo 9 1234 5678.'
  if (!c.acepta) e.acepta = 'Para inscribirte debes aceptar las condiciones.'
  return e
}

function Presentacion({ comercio }: { comercio: ComercioPublico }) {
  const b = comercio.destacado
  return (
    <section className="sobre-tapa border-2 border-tapa bg-tapa p-5 text-papel">
      <p className="text-base font-semibold text-tapa-texto">
        Te invita {comercio.nombre}
      </p>
      <h1 className="rotulo mt-2 text-4xl leading-tight">Únete a Red Vecina</h1>
      <p className="mt-3 text-lg">
        Sube tus boletas, junta puntos y canjéalos por descuentos en los locales del barrio.
      </p>
      {b && (
        <p className="mt-4 border-2 border-tapa-texto/50 p-4 text-base">
          En {comercio.nombre}: <strong className="text-papel">{pesos(b.valor_pesos)} de descuento</strong> con{' '}
          {puntos(b.puntos)}.
        </p>
      )}
      {comercio.direccion && (
        <p className="mt-4 text-base text-tapa-texto">
          {comercio.direccion}
        </p>
      )}
    </section>
  )
}

function Formulario({ comercio }: { comercio: ComercioPublico }) {
  const id = useId()
  const navigate = useNavigate()
  const [campos, setCampos] = useState<Campos>({ nombre: '', telefono: '', acepta: false })
  const [errores, setErrores] = useState<Errores>({})
  const inscribir = useMutation({ mutationFn: api.vecinos.inscribir })

  function cambiar<K extends keyof Campos>(campo: K, valor: Campos[K]) {
    setCampos((actual) => ({ ...actual, [campo]: valor }))
    if (errores[campo]) setErrores((actual) => ({ ...actual, [campo]: undefined }))
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const encontrados = validar(campos)
    setErrores(encontrados)
    const primero = Object.keys(encontrados)[0]
    if (primero) {
      document.getElementById(`${id}-${primero}`)?.focus()
      return
    }
    inscribir.mutate(
      {
        nombre: campos.nombre.trim(),
        telefono: campos.telefono.trim(),
        comercio: comercio.slug,
        acepta_condiciones: campos.acepta,
      },
      {
        onSuccess: (inscrito) => {
          const aviso: AvisoTarjeta = { bienvenida: true }
          navigate(`/t/${inscrito.token}`, { replace: true, state: aviso })
        },
      },
    )
  }

  return (
    <Card>
      <CardContent>
        <form noValidate onSubmit={alEnviar} aria-label="Crear mi tarjeta">
          <FieldGroup>
            <Field data-invalid={errores.nombre ? true : undefined}>
              <FieldLabel htmlFor={`${id}-nombre`}>Tu nombre</FieldLabel>
              <Input
                id={`${id}-nombre`}
                autoComplete="name"
                maxLength={120}
                value={campos.nombre}
                onChange={(e) => cambiar('nombre', e.target.value)}
                aria-invalid={errores.nombre ? true : undefined}
                aria-describedby={errores.nombre ? `${id}-nombre-error` : undefined}
              />
              {errores.nombre && <FieldError id={`${id}-nombre-error`}>{errores.nombre}</FieldError>}
            </Field>

            <Field data-invalid={errores.telefono ? true : undefined}>
              <FieldLabel htmlFor={`${id}-telefono`}>Tu WhatsApp</FieldLabel>
              <Input
                id={`${id}-telefono`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="9 1234 5678"
                maxLength={20}
                value={campos.telefono}
                onChange={(e) => cambiar('telefono', e.target.value)}
                aria-invalid={errores.telefono ? true : undefined}
                aria-describedby={errores.telefono ? `${id}-telefono-error` : `${id}-telefono-ayuda`}
              />
              {errores.telefono ? (
                <FieldError id={`${id}-telefono-error`}>{errores.telefono}</FieldError>
              ) : (
                <FieldDescription id={`${id}-telefono-ayuda`}>Una cuenta por número. Ahí guardas tu tarjeta.</FieldDescription>
              )}
            </Field>

            <Field data-invalid={errores.acepta ? true : undefined}>
              <div className="flex items-start gap-4">
                <Checkbox
                  id={`${id}-acepta`}
                  className="mt-0.5"
                  checked={campos.acepta}
                  onCheckedChange={(v) => cambiar('acepta', v === true)}
                  aria-invalid={errores.acepta ? true : undefined}
                  aria-describedby={errores.acepta ? `${id}-acepta-error` : undefined}
                />
                <FieldLabel htmlFor={`${id}-acepta`} className="font-normal">
                  Tengo 18 años o más y acepto las condiciones del programa y el uso de mis datos.
                </FieldLabel>
              </div>
              <Link
                to="/condiciones"
                target="_blank"
                className="ml-11 inline-flex min-h-12 items-center font-semibold text-vecina underline underline-offset-4 hover:text-vecina-oscuro"
              >
                Leer las condiciones
              </Link>
              {errores.acepta && <FieldError id={`${id}-acepta-error`}>{errores.acepta}</FieldError>}
            </Field>

            {inscribir.isError && (
              <Alert variant="destructive">
                <AlertTitle>No pudimos crear tu tarjeta</AlertTitle>
                <AlertDescription>{inscribir.error.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={inscribir.isPending}>
              {inscribir.isPending ? (
                <Cargando />
              ) : null}
              {inscribir.isPending ? 'Creando tu tarjeta…' : 'Crear mi tarjeta'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

/** Si este teléfono ya abrió una tarjeta, se ofrece volver a ella. */
function YaTengoTarjeta() {
  const token = tarjetaRecordada()
  if (!token) return null
  return (
    <Alert>
      <AlertTitle>¿Ya tienes tu tarjeta?</AlertTitle>
      <AlertDescription>
        <p>En este teléfono ya abriste una tarjeta de Red Vecina.</p>
        <Button asChild variant="secondary" size="sm" className="mt-1">
          <Link to={`/t/${token}`}>Ver mi tarjeta</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/** /unirme/:comercio — inscripción al escanear el QR del local. */
export function PaginaUnirme() {
  const { comercio: slug = '' } = useParams()
  const comercio = useQuery({
    queryKey: ['red', 'comercios', slug],
    queryFn: () => api.comercios.comercioPublico(slug),
    retry: (intentos, error) => !(error instanceof ErrorApi && error.estado === 404) && intentos < 1,
  })

  if (comercio.isPending) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (comercio.isError) {
    const noExiste = comercio.error instanceof ErrorApi && comercio.error.estado === 404
    return (
      <Card className="aparecer">
        <CardContent className="flex flex-col items-start gap-4">
          <h1 className="text-3xl font-extrabold">{noExiste ? 'No encontramos este local' : 'No pudimos cargar la página'}</h1>
          <p className="text-lg text-muted-foreground">
            {noExiste
              ? 'Puede que el código QR esté incompleto o que el local ya no esté en la red. Pide ayuda en la caja.'
              : comercio.error.message}
          </p>
          {noExiste ? (
            <Button asChild variant="secondary">
              <Link to="/">Conocer Red Vecina</Link>
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => void comercio.refetch()}>
              Intentar de nuevo
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="aparecer flex flex-col gap-5">
      <Presentacion comercio={comercio.data} />
      <YaTengoTarjeta />
      <h2 className="text-2xl font-extrabold">Crea tu tarjeta en un minuto</h2>
      <Formulario comercio={comercio.data} />
    </div>
  )
}
