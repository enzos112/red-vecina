import { Cargando } from '@/components/marca/Cargando'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { IngresoDiferidoSalida } from '@/lib/api'
import { aCampoFechaHora, codigo as formatoCodigo, desdeCampoFechaHora, fechaHora, pesos } from '@/lib/formato'
import { mensajeError } from '@/lib/sesion'
import { useDiferidosDeHoy, useIngresarDiferido } from './consultas'

const LARGO = 6
const soloDigitos = (v: string) => v.replace(/\D/g, '')

/** "09:30" de hoy en Santiago → fecha UTC en ISO. */
function horaDeHoy(hora: string): string | null {
  const hoy = aCampoFechaHora(new Date().toISOString()).slice(0, 10)
  return desdeCampoFechaHora(`${hoy}T${hora}`)
}

function horaActual(): string {
  return aCampoFechaHora(new Date().toISOString()).slice(11, 16)
}

function Resultado({ d }: { d: IngresoDiferidoSalida }) {
  return d.descontado ? (
    <Alert variant="exito">
      <AlertTitle>Registrado: {formatoCodigo(d.codigo)}</AlertTitle>
      <AlertDescription>
        El código era válido. Se descontaron {pesos(d.valor_pesos ?? 0)} de tu cupo. El equipo lo revisará.
      </AlertDescription>
    </Alert>
  ) : (
    <Alert variant="destructive">
      <AlertTitle>Registrado para revisión: {formatoCodigo(d.codigo)}</AlertTitle>
      <AlertDescription>
        {d.mensaje} Este canje no se descuenta de tu cupo. El equipo de Red Vecina lo revisará contigo.
      </AlertDescription>
    </Alert>
  )
}

/** /comercio/sin-internet — sección 8: el código se aplicó sin señal y se ingresa ese mismo día. */
export function PaginaSinInternet() {
  const id = useId()
  const ingresar = useIngresarDiferido()
  const hoy = useDiferidosDeHoy()
  const [codigo, setCodigo] = useState('')
  const [monto, setMonto] = useState('')
  const [hora, setHora] = useState(horaActual)

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (codigo.length !== LARGO) return
    ingresar.mutate(
      { codigo, monto_compra: monto ? Number(monto) : null, aplicado_en: horaDeHoy(hora) },
      {
        onSuccess: () => {
          setCodigo('')
          setMonto('')
          setHora(horaActual())
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link to="/comercio">
          Validador
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-extrabold">Códigos sin internet</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Si no había señal y aplicaste el descuento, ingresa aquí el código que anotaste. Hazlo hoy mismo.
        </p>
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-5">
        <Field>
          <FieldLabel htmlFor={`${id}-codigo`}>Código</FieldLabel>
          <Input
            id={`${id}-codigo`}
            inputMode="numeric"
            placeholder="000 000"
            value={formatoCodigo(codigo)}
            onChange={(e) => setCodigo(soloDigitos(e.target.value).slice(0, LARGO))}
            className="h-16 text-center text-4xl font-extrabold tracking-widest tabular-nums md:h-16"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-hora`}>Hora en que lo aplicaste</FieldLabel>
          <Input id={`${id}-hora`} type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="max-w-40" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-monto`}>Total de la compra</FieldLabel>
          <Input
            id={`${id}-monto`}
            inputMode="numeric"
            placeholder="Antes del descuento"
            value={monto ? pesos(Number(monto)) : ''}
            onChange={(e) => setMonto(soloDigitos(e.target.value))}
          />
          <FieldDescription>Opcional, pero ayuda a revisar el canje.</FieldDescription>
        </Field>
        {ingresar.isError && (
          <Alert variant="destructive">
            <AlertDescription>{mensajeError(ingresar.error)}</AlertDescription>
          </Alert>
        )}
        {ingresar.data && <Resultado d={ingresar.data} />}
        <Button type="submit" size="lg" disabled={codigo.length !== LARGO || !hora || ingresar.isPending}>
          {ingresar.isPending && <Cargando />}
          Registrar código
        </Button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">Ingresados hoy</h2>
        {hoy.isPending ? (
          <Skeleton className="h-16" />
        ) : !hoy.data?.length ? (
          <p className="text-muted-foreground">Ninguno todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {hoy.data.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-border bg-card px-4 py-3">
                <span>
                  <strong className="tabular-nums">{formatoCodigo(d.codigo)}</strong>
                  <span className="block text-sm text-muted-foreground">aplicado {fechaHora(d.aplicado_en)}</span>
                </span>
                <span className={d.descontado ? 'font-bold text-exito-texto' : 'font-bold text-peligro-texto'}>
                  {d.descontado ? 'Válido' : 'En revisión'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
