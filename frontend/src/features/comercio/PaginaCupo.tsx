import { LoaderCircle, Plus } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { CupoSalida, Semaforo } from '@/lib/api'
import { dia, pesos } from '@/lib/formato'
import { mensajeError } from '@/lib/sesion'
import { useAgregarExtra, useCupo } from './consultas'

const SEMAFORO: Record<Semaforo, { texto: string; variante: 'exito' | 'alerta' | 'peligro' }> = {
  verde: { texto: 'Con cupo', variante: 'exito' },
  ambar: { texto: 'Queda poco', variante: 'alerta' },
  rojo: { texto: 'Agotado', variante: 'peligro' },
}

const soloDigitos = (v: string) => v.replace(/\D/g, '')

/** Barra: usado (lleno), reservado (rayado) y libre. */
function Barra({ c }: { c: CupoSalida }) {
  const pct = (n: number) => (c.total > 0 ? Math.min(100, (n / c.total) * 100) : 0)
  return (
    <div
      className="flex h-6 w-full overflow-hidden rounded-full bg-secondary"
      role="img"
      aria-label={`Usado ${pesos(c.usado)}, reservado ${pesos(c.reservado)}, libre ${pesos(c.libre)} de ${pesos(c.total)}`}
    >
      <div className="h-full bg-vecina" style={{ width: `${pct(c.usado)}%` }} />
      <div
        className="h-full bg-vecina/45"
        style={{
          width: `${pct(c.reservado)}%`,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 6px, rgb(255 255 255 / 0.35) 6px 12px)',
        }}
      />
    </div>
  )
}

function Fila({ etiqueta, valor, muestra }: { etiqueta: string; valor: number; muestra?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-lg">
      <span className="flex items-center gap-3">
        {muestra && <span className={`size-4 rounded-sm ${muestra}`} aria-hidden="true" />}
        {etiqueta}
      </span>
      <span className="font-bold tabular-nums">{pesos(valor)}</span>
    </div>
  )
}

function CupoExtra() {
  const id = useId()
  const agregar = useAgregarExtra()
  const [monto, setMonto] = useState('')
  const [listo, setListo] = useState<number | null>(null)

  function enviar(e: FormEvent) {
    e.preventDefault()
    const n = Number(monto)
    if (!n) return
    setListo(null)
    agregar.mutate(n, {
      onSuccess: () => {
        setListo(n)
        setMonto('')
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Agregar cupo extra</CardTitle>
        <CardDescription>
          Para recibir más canjes esta semana, por ejemplo en una campaña. Solo se puede sumar y no pasa a la semana siguiente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={id}>Monto extra</FieldLabel>
            <Input
              id={id}
              inputMode="numeric"
              placeholder="$0"
              value={monto ? pesos(Number(monto)) : ''}
              onChange={(e) => setMonto(soloDigitos(e.target.value))}
            />
            <FieldDescription>Se suma al cupo de esta semana.</FieldDescription>
          </Field>
          {agregar.isError && (
            <Alert variant="destructive">
              <AlertDescription>{mensajeError(agregar.error)}</AlertDescription>
            </Alert>
          )}
          {listo !== null && (
            <Alert variant="exito">
              <AlertDescription>Listo: sumaste {pesos(listo)} a tu cupo de esta semana.</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={!Number(monto) || agregar.isPending}>
            {agregar.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
            Agregar cupo
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/** /comercio/cupo — cupo de la semana, con barra, semáforo y cupo extra. */
export function PaginaCupo() {
  const cupo = useCupo()
  if (cupo.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-48" />
      </div>
    )
  }
  if (cupo.isError) return <p className="text-lg">{cupo.error.message}</p>
  const c = cupo.data
  const s = SEMAFORO[c.semaforo]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-lg text-muted-foreground">Cupo de la semana del {dia(c.semana)}</p>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-5xl font-extrabold tabular-nums">{pesos(c.libre)}</p>
          <Badge variant={s.variante}>{s.texto}</Badge>
        </div>
        <p className="text-lg">libres de {pesos(c.total)}</p>
      </div>

      <Barra c={c} />

      <div className="divide-y divide-border rounded-lg border-2 border-border bg-card px-4">
        <Fila etiqueta="Usado" valor={c.usado} muestra="bg-vecina" />
        <Fila etiqueta="Reservado (códigos sin usar)" valor={c.reservado} muestra="bg-vecina/45" />
        <Fila etiqueta="Libre" valor={c.libre} muestra="bg-secondary border border-border" />
      </div>

      <details className="rounded-lg border-2 border-border bg-card px-4 py-3">
        <summary className="cursor-pointer text-lg font-bold">Cómo se calcula</summary>
        <p className="mt-3 text-lg">{c.explicacion}</p>
        <div className="mt-3 divide-y divide-border">
          <Fila etiqueta="Base" valor={c.base} />
          <Fila etiqueta="Lo que no usaste la semana pasada" valor={c.arrastre} />
          <Fila etiqueta="Extra que agregaste" valor={c.extra} />
        </div>
        <p className="mt-2 text-muted-foreground">Se vuelve a calcular el {dia(c.proxima_liberacion)}.</p>
      </details>

      <CupoExtra />
    </div>
  )
}
