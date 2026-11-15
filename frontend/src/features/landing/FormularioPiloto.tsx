import { useMutation } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api, type SolicitudNueva } from '@/lib/api'

type Campos = Required<{ [K in keyof SolicitudNueva]: string }>

const VACIO: Campos = {
  comercio: '',
  rubro: '',
  contacto: '',
  telefono: '',
  email: '',
  direccion: '',
  mensaje: '',
}

type Errores = Partial<Record<keyof Campos, string>>

/** Mismos límites de forma que el esquema SolicitudNueva de la API. */
const DIGITOS_MINIMOS_TELEFONO = 8

function validar(c: Campos): Errores {
  const e: Errores = {}
  if (!c.comercio.trim()) e.comercio = 'Escribe el nombre de tu negocio.'
  if (!c.rubro.trim()) e.rubro = 'Cuéntanos qué vendes.'
  if (!c.contacto.trim()) e.contacto = 'Escribe tu nombre.'
  if (c.telefono.replace(/\D/g, '').length < DIGITOS_MINIMOS_TELEFONO)
    e.telefono = 'Revisa tu WhatsApp. Escríbelo completo, con el 9 del inicio.'
  if (c.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim()))
    e.email = 'Revisa tu correo.'
  return e
}

function aSolicitud(c: Campos): SolicitudNueva {
  const opcional = (v: string) => v.trim() || null
  return {
    comercio: c.comercio.trim(),
    rubro: c.rubro.trim(),
    contacto: c.contacto.trim(),
    telefono: c.telefono.trim(),
    email: opcional(c.email),
    direccion: opcional(c.direccion),
    mensaje: opcional(c.mensaje),
  }
}

/** Formulario "Quiero unirme al piloto": crea una solicitud de comercio interesado. */
export function FormularioPiloto() {
  const id = useId()
  const [campos, setCampos] = useState<Campos>(VACIO)
  const [errores, setErrores] = useState<Errores>({})
  const enviar = useMutation({ mutationFn: api.comercios.solicitar })

  function cambiar(campo: keyof Campos, valor: string) {
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
    enviar.mutate(aSolicitud(campos))
  }

  if (enviar.isSuccess) {
    return (
      <Card className="aparecer">
        <CardContent className="flex flex-col items-start gap-4" role="status">
          <span className="flex size-14 items-center justify-center rounded-full bg-exito-fondo text-exito-texto">
          </span>
          <h3 className="text-3xl font-extrabold">¡Gracias, {campos.contacto.trim().split(' ')[0]}!</h3>
          <p className="text-lg text-muted-foreground">{enviar.data.mensaje}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setCampos(VACIO)
              enviar.reset()
            }}
          >
            Enviar otro negocio
          </Button>
        </CardContent>
      </Card>
    )
  }

  const campo = (
    nombre: keyof Campos,
    etiqueta: string,
    props: React.ComponentProps<'input'> & { ayuda?: string } = {},
  ) => {
    const { ayuda, ...resto } = props
    const error = errores[nombre]
    return (
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={`${id}-${nombre}`}>{etiqueta}</FieldLabel>
        <Input
          id={`${id}-${nombre}`}
          name={nombre}
          value={campos[nombre]}
          onChange={(e) => cambiar(nombre, e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-${nombre}-error` : ayuda ? `${id}-${nombre}-ayuda` : undefined}
          {...resto}
        />
        {ayuda && !error && <FieldDescription id={`${id}-${nombre}-ayuda`}>{ayuda}</FieldDescription>}
        {error && <FieldError id={`${id}-${nombre}-error`}>{error}</FieldError>}
      </Field>
    )
  }

  return (
    <Card>
      <CardContent>
        <form noValidate onSubmit={alEnviar} aria-label="Quiero unirme al piloto">
          <FieldGroup>
            {campo('comercio', 'Nombre de tu negocio', { autoComplete: 'organization', maxLength: 120 })}
            {campo('rubro', 'Qué vendes', {
              placeholder: 'Almacén, panadería, verdulería…',
              maxLength: 60,
            })}
            {campo('contacto', 'Tu nombre', { autoComplete: 'name', maxLength: 120 })}
            {campo('telefono', 'Tu WhatsApp', {
              type: 'tel',
              inputMode: 'tel',
              autoComplete: 'tel',
              placeholder: '+56 9 0000 0000',
              maxLength: 20,
              ayuda: 'Te escribimos por aquí.',
            })}
            {campo('email', 'Tu correo (opcional)', {
              type: 'email',
              inputMode: 'email',
              autoComplete: 'email',
              maxLength: 200,
            })}
            {campo('direccion', 'Dirección del local (opcional)', {
              autoComplete: 'street-address',
              maxLength: 200,
            })}
            <Field>
              <FieldLabel htmlFor={`${id}-mensaje`}>¿Algo que quieras contarnos? (opcional)</FieldLabel>
              <Textarea
                id={`${id}-mensaje`}
                name="mensaje"
                value={campos.mensaje}
                maxLength={2000}
                onChange={(e) => cambiar('mensaje', e.target.value)}
              />
            </Field>

            {enviar.isError && (
              <Alert variant="destructive">
                <AlertTitle>No pudimos enviar tus datos</AlertTitle>
                <AlertDescription>{enviar.error.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={enviar.isPending}>
              {enviar.isPending ? 'Enviando…' : 'Enviar mis datos'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
