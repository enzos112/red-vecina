import { Cargando } from '@/components/marca/Cargando'
import { EncabezadoPagina } from '@/components/marca/EncabezadoPagina'
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
      className="flex h-8 w-full overflow-hidden border-2 border-tapa bg-papel"
      role="img"
      aria-label={`Usado ${pesos(c.usado)}, reservado ${pesos(c.reservado)}, libre ${pesos(c.libre)} de ${pesos(c.total)}`}
    >
      <div className="h-full bg-tinta-azul" style={{ width: `${pct(c.usado)}%` }} />
      <div
        className="h-full bg-mango-300"
        style={{
          width: `${pct(c.reservado)}%`,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 6px, rgb(255 255 255 / 0.45) 6px 12px)',
        }}
      />
    </div>
  )
}

function Fila({
  etiqueta,
  valor,
  muestra,
  cifra = 'text-tinta',
}: {
  etiqueta: string
  valor: number
  muestra?: string
  cifra?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-lg">
      <span className="flex items-center gap-3">
        {muestra && <span className={`size-4 ${muestra}`} aria-hidden="true" />}
        {etiqueta}
      </span>
      <span className={`font-extrabold tabular-nums ${cifra}`}>{pesos(valor)}</span>
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
    <Card className="border-2 border-tapa">
      <CardHeader>
        <CardTitle className="rotulo text-2xl text-tapa">Agregar cupo extra</CardTitle>
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
          <Button type="submit" variant="libreta" disabled={!Number(monto) || agregar.isPending}>
            {agregar.isPending && <Cargando />}
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
    <div className="flex flex-col gap-6 lg:gap-10">
      <EncabezadoPagina
        titulo="Cupo de la semana"
        descripcion={`Lo que puedes entregar en canjes desde el ${dia(c.semana)}. Cuando se acaba, tus beneficios descansan hasta el ${dia(c.proxima_liberacion)}.`}
      />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-16">
      <div className="flex flex-col gap-6">
      <div className="border-2 border-tapa bg-mango-50 px-5 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="rotulo text-6xl leading-none tracking-[-0.035em] text-mango-700 lg:text-7xl">{pesos(c.libre)}</p>
          <Badge variant={s.variante}>{s.texto}</Badge>
        </div>
        <p className="mt-2 text-lg">
          libres de <strong className="text-tapa">{pesos(c.total)}</strong> esta semana
        </p>
      </div>

      <Barra c={c} />

      <div className="divide-y divide-cuadricula border-2 border-tapa bg-papel px-4">
        <Fila etiqueta="Usado" valor={c.usado} muestra="bg-tinta-azul" cifra="text-tinta-azul" />
        <Fila etiqueta="Reservado (códigos sin usar)" valor={c.reservado} muestra="bg-mango-300" cifra="text-mango-800" />
        <Fila etiqueta="Libre" valor={c.libre} muestra="border-2 border-tapa bg-papel" cifra="text-tapa" />
      </div>

      <details className="border-2 border-tapa/40 bg-papel px-4 py-3 open:border-tapa">
        <summary className="cursor-pointer text-lg font-bold text-tapa">Cómo se calcula</summary>
        <p className="mt-3 text-lg">{c.explicacion}</p>
        <div className="mt-3 divide-y divide-border">
          <Fila etiqueta="Base" valor={c.base} />
          <Fila etiqueta="Lo que no usaste la semana pasada" valor={c.arrastre} />
          <Fila etiqueta="Extra que agregaste" valor={c.extra} />
        </div>
        <p className="mt-2 text-lapiz">Se vuelve a calcular el {dia(c.proxima_liberacion)}.</p>
      </details>
      </div>

      <CupoExtra />
      </div>
    </div>
  )
}
