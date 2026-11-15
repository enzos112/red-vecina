import { Cargando } from '@/components/marca/Cargando'
import { useId, useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import type { BeneficioNuevo, BeneficioSalida, BeneficiosComercio, NivelSalida, TipoBeneficio } from '@/lib/api'
import { dia, numero, pesos } from '@/lib/formato'
import { mensajeError } from '@/lib/sesion'
import { cn } from '@/lib/utils'
import { useMisBeneficios, useProponer } from './consultas'

const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const TODOS = [0, 1, 2, 3, 4, 5, 6]

function textoDias(dias: number[] | null): string | null {
  if (!dias || dias.length === TODOS.length) return null
  const nombres = [...dias].sort().map((d) => DIAS_LARGOS[d])
  return `Solo ${nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : nombres[0]}`
}

function Beneficio({ b }: { b: BeneficioSalida }) {
  const dias = textoDias(b.dias_permitidos)
  return (
    <li className="flex flex-col gap-1 rounded-lg border-2 border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">
          {b.nombre_nivel} · {numero(b.puntos)} puntos
        </span>
        <Badge variant="secondary">{b.tipo === 'producto' ? 'Producto' : 'Descuento'} de {pesos(b.valor_pesos)}</Badge>
      </div>
      <p className="text-lg">{b.texto}</p>
      <p className="text-muted-foreground">
        Compra mínima {pesos(b.compra_minima)}
        {b.restriccion && ` · ${b.restriccion}`}
        {dias && ` · ${dias}`}
      </p>
    </li>
  )
}

// --- Editor ---

type Borrador = {
  activo: boolean
  tipo: TipoBeneficio
  texto: string
  restriccion: string
  dias: number[]
  compra_minima: string
}

function borradorInicial(nivel: NivelSalida, base: BeneficioSalida[]): Borrador {
  const b = base.find((x) => x.nivel === nivel.numero)
  return b
    ? {
        activo: true,
        tipo: b.tipo,
        texto: b.texto,
        restriccion: b.restriccion ?? '',
        dias: b.dias_permitidos ?? TODOS,
        compra_minima: String(b.compra_minima),
      }
    : {
        activo: nivel.obligatorio ?? false,
        tipo: 'descuento',
        texto: `${pesos(nivel.valor_pesos)} de descuento en tu compra`,
        restriccion: '',
        dias: TODOS,
        compra_minima: String(nivel.compra_minima_tope),
      }
}

function EditorNivel({
  nivel,
  b,
  diasMinimos,
  onCambio,
}: {
  nivel: NivelSalida
  b: Borrador
  diasMinimos: number
  onCambio: (b: Borrador) => void
}) {
  const id = useId()
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => onCambio({ ...b, [k]: v })
  const compra = Number(b.compra_minima || 0)

  return (
    <Card className={cn(!b.activo && 'opacity-80')}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-xl">
          <span>
            {nivel.nombre} · {pesos(nivel.valor_pesos)}
          </span>
          <span className="text-base font-normal text-muted-foreground">{numero(nivel.puntos)} puntos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {nivel.obligatorio ? (
          <p className="text-muted-foreground">Este nivel es obligatorio.</p>
        ) : (
          <Label htmlFor={`${id}-activo`} className="flex min-h-12 cursor-pointer items-center gap-3 text-lg font-normal">
            <Checkbox id={`${id}-activo`} checked={b.activo} onCheckedChange={(v) => set('activo', v === true)} />
            Ofrecer este nivel
          </Label>
        )}
        {b.activo && (
          <>
            <RadioGroup value={b.tipo} onValueChange={(v) => set('tipo', v as TipoBeneficio)} className="flex flex-wrap gap-4">
              {(['descuento', 'producto'] as const).map((t) => (
                <Label key={t} htmlFor={`${id}-${t}`} className="flex min-h-12 cursor-pointer items-center gap-2 text-lg font-normal">
                  <RadioGroupItem id={`${id}-${t}`} value={t} />
                  {t === 'descuento' ? 'Descuento en pesos' : 'Producto de regalo'}
                </Label>
              ))}
            </RadioGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-texto`}>Lo que ve el vecino</FieldLabel>
              <Input id={`${id}-texto`} value={b.texto} maxLength={200} onChange={(e) => set('texto', e.target.value)} />
              {b.tipo === 'producto' && (
                <FieldDescription>El precio normal del producto no puede superar {pesos(nivel.valor_pesos)}. Sin cigarros ni alcohol.</FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-minima`}>Compra mínima</FieldLabel>
              <Input
                id={`${id}-minima`}
                inputMode="numeric"
                value={b.compra_minima ? pesos(compra) : ''}
                onChange={(e) => set('compra_minima', e.target.value.replace(/\D/g, ''))}
                aria-invalid={compra > nivel.compra_minima_tope || compra <= 0}
              />
              <FieldDescription>Hasta {pesos(nivel.compra_minima_tope)}. Puedes bajarla para atraer más vecinos.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-restriccion`}>Restricción (opcional, una sola)</FieldLabel>
              <Input
                id={`${id}-restriccion`}
                placeholder="Ej.: no acumulable con la oferta de la semana"
                value={b.restriccion}
                maxLength={200}
                onChange={(e) => set('restriccion', e.target.value)}
              />
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-bold">Días en que vale</legend>
              <div className="flex flex-wrap gap-2">
                {TODOS.map((d) => {
                  const marcado = b.dias.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={marcado}
                      aria-label={DIAS_LARGOS[d]}
                      onClick={() => set('dias', marcado ? b.dias.filter((x) => x !== d) : [...b.dias, d].sort())}
                      className={cn(
                        'size-12 cursor-pointer border-2 font-bold transition-colors duration-200',
                        marcado ? 'border-vecina bg-vecina text-white' : 'border-input bg-card text-foreground hover:bg-muted',
                      )}
                    >
                      {DIAS[d]}
                    </button>
                  )
                })}
              </div>
              <p className={cn('text-sm', b.dias.length < diasMinimos ? 'font-bold text-peligro-texto' : 'text-muted-foreground')}>
                Debe valer al menos {diasMinimos} días a la semana.
              </p>
            </fieldset>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Editor({
  datos,
  onEnviado,
  onCancelar,
}: {
  datos: BeneficiosComercio
  onEnviado: () => void
  onCancelar: () => void
}) {
  const proponer = useProponer()
  const base = datos.pendientes.length ? datos.pendientes : datos.proximos.length ? datos.proximos : datos.vigentes
  const [borradores, setBorradores] = useState<Record<number, Borrador>>(() =>
    Object.fromEntries(datos.niveles.map((n) => [n.numero, borradorInicial(n, base)])),
  )

  function enviar(e: FormEvent) {
    e.preventDefault()
    const beneficios: BeneficioNuevo[] = datos.niveles
      .filter((n) => borradores[n.numero].activo)
      .map((n) => {
        const b = borradores[n.numero]
        return {
          nivel: n.numero,
          tipo: b.tipo,
          texto: b.texto.trim(),
          restriccion: b.restriccion.trim() || null,
          dias_permitidos: b.dias.length === TODOS.length ? null : b.dias,
          compra_minima: Number(b.compra_minima || 0),
        }
      })
    proponer.mutate({ beneficios }, { onSuccess: onEnviado })
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <Alert>
        <AlertDescription>
          Los cambios quedan pendientes hasta que el equipo los apruebe. Si los envías hoy, rigen desde el{' '}
          {dia(datos.rige_si_pides_hoy)}.
        </AlertDescription>
      </Alert>
      {datos.niveles.map((n) => (
        <EditorNivel
          key={n.numero}
          nivel={n}
          b={borradores[n.numero]}
          diasMinimos={datos.dias_minimos}
          onCambio={(b) => setBorradores((actual) => ({ ...actual, [n.numero]: b }))}
        />
      ))}
      {proponer.isError && (
        <Alert variant="destructive">
          <AlertDescription>{mensajeError(proponer.error)}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={proponer.isPending}>
          {proponer.isPending && <Cargando />}
          Enviar para aprobación
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

/** /comercio/beneficios — versión vigente y pendiente, y propuesta de cambios. */
export function PaginaBeneficios() {
  const beneficios = useMisBeneficios()
  const [editando, setEditando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  if (beneficios.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }
  if (beneficios.isError) return <p className="text-lg">{beneficios.error.message}</p>
  const d = beneficios.data

  if (editando) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-extrabold">Cambiar beneficios</h1>
        <Editor
          datos={d}
          onEnviado={() => {
            setEditando(false)
            setEnviado(true)
          }}
          onCancelar={() => setEditando(false)}
        />
      </div>
    )
  }

  const rechazo = d.rechazados[0]?.comentario_revision
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Tus beneficios</h1>
        <Button variant="secondary" onClick={() => setEditando(true)}>
          {d.vigentes.length || d.pendientes.length ? 'Proponer cambios' : 'Crear beneficios'}
        </Button>
      </div>

      {enviado && (
        <Alert variant="exito">
          <AlertDescription>Enviado. Te avisamos cuando el equipo lo revise.</AlertDescription>
        </Alert>
      )}

      {d.pendientes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            Esperando aprobación <Badge variant="alerta">Pendiente</Badge>
          </h2>
          <ul className="flex flex-col gap-3">
            {d.pendientes.map((b) => (
              <Beneficio key={b.id} b={b} />
            ))}
          </ul>
        </section>
      )}

      {d.proximos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold">
            Aprobados, rigen desde el {d.proximos[0].vigente_desde ? dia(d.proximos[0].vigente_desde) : 'próximo inicio de semana'}
          </h2>
          <ul className="flex flex-col gap-3">
            {d.proximos.map((b) => (
              <Beneficio key={b.id} b={b} />
            ))}
          </ul>
        </section>
      )}

      {rechazo && d.pendientes.length === 0 && (
        <Alert variant="destructive">
          <AlertTitle>Tu última propuesta no se aprobó</AlertTitle>
          <AlertDescription>{rechazo}</AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">Vigentes</h2>
        {d.vigentes.length === 0 ? (
          <p className="text-lg text-muted-foreground">Aún no tienes beneficios publicados.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {d.vigentes.map((b) => (
              <Beneficio key={b.id} b={b} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
