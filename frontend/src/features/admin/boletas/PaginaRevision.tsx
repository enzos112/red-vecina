import { Cargando } from '@/components/marca/Cargando'
import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, type BoletaDetalle, type ControlSalida, type DatosBoleta, type Decision } from '@/lib/api'
import { aCampoFechaHora, desdeCampoFechaHora, fechaHora, numero, pesos, puntos } from '@/lib/formato'
import { cn } from '@/lib/utils'
import {
  mensajeError,
  useAprobar,
  useBoleta,
  useComercios,
  useEvaluar,
  useLeer,
  useMotivos,
  useRechazar,
} from '../consultas'
import { EstadoBoletaBadge, MensajeParaVecino } from '../partes'
import { VisorFoto } from './VisorFoto'

type Formulario = {
  comercio_id: string
  folio: string
  fecha: string // datetime-local en hora de Santiago
  monto_total: string
  monto_excluido: string
}

type Campo = 'comercio_id' | 'folio' | 'fecha_compra' | 'monto_total' | 'monto_excluido'

function inicial(b: BoletaDetalle): Formulario {
  return {
    comercio_id: b.comercio_id ? String(b.comercio_id) : '',
    folio: b.folio ?? '',
    fecha: b.fecha_compra ? aCampoFechaHora(b.fecha_compra) : '',
    monto_total: b.monto_total !== null ? String(b.monto_total) : '',
    monto_excluido: b.monto_excluido ? String(b.monto_excluido) : '',
  }
}

const soloDigitos = (v: string) => v.replace(/\D/g, '')

/** Los datos del formulario para la API, o null si falta algo. */
function aDatos(f: Formulario): DatosBoleta | null {
  const fecha = desdeCampoFechaHora(f.fecha)
  if (!f.comercio_id || !f.folio.trim() || !fecha || f.monto_total === '') return null
  return {
    comercio_id: Number(f.comercio_id),
    folio: f.folio.trim(),
    fecha_compra: fecha,
    monto_total: Number(f.monto_total),
    monto_excluido: f.monto_excluido === '' ? 0 : Number(f.monto_excluido),
  }
}

/** Espera a que el operador deje de escribir antes de recalcular. */
function useDemorado<T>(valor: T, ms = 350): T {
  const [demorado, setDemorado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setDemorado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return demorado
}

/** No dispara atajos mientras se escribe en un campo. */
function escribiendo(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.getAttribute('role') === 'combobox')
}

/** Siguiente pendiente más antigua que no sea esta. */
function useSiguiente(actual: number) {
  const cola = useQuery({
    queryKey: ['admin', 'boletas', 'cola', { estado: 'pendiente', comercio_id: null }],
    queryFn: () => api.boletas.cola({ estado: 'pendiente' }),
  })
  return cola.data?.find((b) => b.id !== actual)?.id ?? null
}

// --- Controles ---

const COLOR: Record<ControlSalida['color'], { etiqueta: string; clase: string; texto: string }> = {
  verde: { etiqueta: 'text-exito-texto', clase: 'border-exito', texto: 'Bien' },
  ambar: { etiqueta: 'text-alerta-texto', clase: 'border-alerta bg-alerta-fondo', texto: 'Revisar' },
  rojo: { etiqueta: 'text-peligro-texto', clase: 'border-peligro bg-peligro-fondo', texto: 'Rechazo' },
}

const ORDEN = { rojo: 0, ambar: 1, verde: 2 }

function Controles({ controles }: { controles: ControlSalida[] }) {
  const ordenados = [...controles].sort((a, b) => ORDEN[a.color] - ORDEN[b.color])
  return (
    <ul className="flex flex-col gap-2" aria-label="Controles">
      {ordenados.map((c) => (
        <li key={c.clave} className={cn('flex items-start gap-3 border-2 px-3 py-2', COLOR[c.color].clase)}>
          <span className={cn('w-20 shrink-0 pt-0.5 text-xs font-extrabold tracking-wide uppercase', COLOR[c.color].etiqueta)}>
            {COLOR[c.color].texto}
          </span>
          <span>{c.mensaje}</span>
        </li>
      ))}
    </ul>
  )
}

/** Color con que se resalta un campo según los controles que lo señalan. */
function marcaCampo(controles: ControlSalida[], campo: Campo): string {
  const colores = controles.filter((c) => c.color !== 'verde' && c.campos?.includes(campo)).map((c) => c.color)
  if (colores.includes('rojo')) return 'border-peligro ring-3 ring-peligro/20'
  if (colores.includes('ambar')) return 'border-alerta ring-3 ring-alerta/30'
  return ''
}

// --- Lectura automática ---

type Lectura = {
  proveedor?: string
  error?: string | null
  segundos?: number
  datos?: {
    rut_emisor?: string | null
    nombre_emisor?: string | null
    lineas?: { descripcion: string; monto: number | null }[]
  } | null
}

function InfoLectura({ b }: { b: BoletaDetalle }) {
  const leer = useLeer(b.id)
  const lectura = b.lectura as Lectura | null
  const pendiente = b.estado === 'pendiente'

  if (pendiente && b.tiene_imagen && !lectura) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <Cargando /> Leyendo la boleta…
      </p>
    )
  }
  const datos = lectura?.datos
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-muted-foreground">
          {!lectura
            ? 'Sin lectura automática.'
            : lectura.proveedor === 'manual'
              ? 'Lector manual: digita los campos.'
              : datos
                ? `Leída por ${lectura.proveedor} en ${String(lectura.segundos ?? 0).replace('.', ',')} s.`
                : `El lector ${lectura.proveedor} no pudo leerla.`}
        </p>
        {pendiente && b.tiene_imagen && (
          <Button variant="ghost" size="xs" onClick={() => leer.mutate()} disabled={leer.isPending}>
            Volver a leer
          </Button>
        )}
      </div>
      {leer.isError && <p className="text-peligro-texto">{mensajeError(leer.error)}</p>}
      {datos && (datos.nombre_emisor || datos.rut_emisor) && (
        <p>
          Emisor: <strong>{datos.nombre_emisor ?? 'sin nombre'}</strong>
          {datos.rut_emisor && <span className="text-muted-foreground"> · RUT {datos.rut_emisor}</span>}
        </p>
      )}
      {datos?.lineas && datos.lineas.length > 0 && (
        <details className="text-base">
          <summary className="cursor-pointer font-bold">Productos leídos ({datos.lineas.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {datos.lineas.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{l.descripcion}</span>
                <span className="tabular-nums">{l.monto !== null ? pesos(l.monto) : '—'}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

// --- Rechazo ---

/** Motivo sugerido según el control en rojo. */
const MOTIVO_DE_CONTROL: Record<string, string> = {
  comercio: 'no_es_de_la_red',
  folio: 'folio_repetido',
  plazo: 'fuera_de_plazo',
  monto_minimo: 'monto_bajo',
  boletas_dia: 'boletas_del_dia',
  empleado: 'trabaja_ahi',
}

function DialogoRechazo({
  abierto,
  onCambio,
  boletaId,
  sugerido,
  onDecision,
}: {
  abierto: boolean
  onCambio: (v: boolean) => void
  boletaId: number
  sugerido: string | null
  onDecision: (d: Decision) => void
}) {
  const id = useId()
  const motivos = useMotivos()
  const rechazar = useRechazar(boletaId)
  const [clave, setClave] = useState<string>('')
  const [nota, setNota] = useState('')

  useEffect(() => {
    if (abierto) {
      setClave(sugerido ?? '')
      setNota('')
      rechazar.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  return (
    <Dialog open={abierto} onOpenChange={onCambio}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rechazar boleta</DialogTitle>
          <DialogDescription>Elige el motivo. El vecino lo verá en su tarjeta y en el mensaje.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!clave) return
            rechazar.mutate({ clave, nota: clave === 'otro' ? nota : null }, { onSuccess: onDecision })
          }}
        >
          <RadioGroup value={clave} onValueChange={setClave} className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
            {motivos.data?.map((m) => (
              <Label
                key={m.clave}
                htmlFor={`${id}-${m.clave}`}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 border-transparent px-3 py-2 text-base font-normal has-data-[state=checked]:border-vecina has-data-[state=checked]:bg-secondary"
              >
                <RadioGroupItem id={`${id}-${m.clave}`} value={m.clave} />
                <span>
                  <span className="font-bold">{m.titulo}</span>
                  {m.clave === sugerido && <span className="ml-2 text-sm text-muted-foreground">(sugerido)</span>}
                </span>
              </Label>
            ))}
          </RadioGroup>
          {clave === 'otro' && (
            <Field>
              <FieldLabel htmlFor={`${id}-nota`}>Motivo para el vecino</FieldLabel>
              <Textarea id={`${id}-nota`} value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} autoFocus />
            </Field>
          )}
          {rechazar.isError && (
            <Alert variant="destructive">
              <AlertDescription>{mensajeError(rechazar.error)}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={!clave || (clave === 'otro' && !nota.trim()) || rechazar.isPending}>
              {rechazar.isPending && <Cargando />}
              Rechazar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- Resultado de la decisión ---

function ResultadoDecision({ d, siguiente }: { d: Decision; siguiente: number | null }) {
  const navigate = useNavigate()
  const aprobada = d.boleta.estado === 'aprobada'
  return (
    <Card className="aparecer">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          {aprobada ? `Aprobada: +${puntos(d.boleta.puntos ?? 0)}` : 'Rechazada'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="font-bold">Mensaje para {d.boleta.vecino.nombre}</p>
          <MensajeParaVecino texto={d.mensaje.texto} whatsapp={d.mensaje.whatsapp} />
        </div>
        <div className="flex flex-wrap gap-2">
          {siguiente ? (
            <Button onClick={() => navigate(`/admin/boletas/${siguiente}`)}>
              Siguiente boleta
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => navigate('/admin/boletas')}>
              No quedan pendientes: volver a la cola
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Atajo: S para la siguiente.</p>
      </CardContent>
    </Card>
  )
}

// --- Formulario ---

function FormularioRevision({ b, onDecision }: { b: BoletaDetalle; onDecision: (d: Decision) => void }) {
  const id = useId()
  const comercios = useComercios()
  const aprobar = useAprobar(b.id)
  const original = useMemo(() => inicial(b), [b])
  const [f, setF] = useState<Formulario>(original)
  const [rechazando, setRechazando] = useState(false)

  const datos = useMemo(() => aDatos(f), [f])
  const evaluacion = useEvaluar(b.id, useDemorado(datos))
  const ev = datos ? evaluacion.data : undefined
  const controles = ev?.controles ?? b.controles ?? []
  const hayRojo = controles.some((c) => c.color === 'rojo')
  const todoVerde = controles.length > 0 && controles.every((c) => c.color === 'verde')
  const ajustado = JSON.stringify(f) !== JSON.stringify(original)
  const sugerido = controles.filter((c) => c.color === 'rojo').map((c) => MOTIVO_DE_CONTROL[c.clave]).find(Boolean) ?? null
  const puedeAprobar = !!datos && !hayRojo && !aprobar.isPending

  function cambiar<K extends keyof Formulario>(k: K, v: Formulario[K]) {
    setF((actual) => ({ ...actual, [k]: v }))
  }

  function aprobarAhora() {
    if (!datos || !puedeAprobar) return
    aprobar.mutate(datos, { onSuccess: onDecision })
  }

  // Atajos: A aprueba, R rechaza (fuera de los campos); Ctrl+Enter aprueba desde cualquier lado.
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (rechazando) return
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        aprobarAhora()
        return
      }
      if (escribiendo(e) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        aprobarAhora()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setRechazando(true)
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  })

  const clase = (campo: Campo) => marcaCampo(controles, campo)

  return (
    <div className="flex flex-col gap-6">
      <InfoLectura b={b} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`${id}-comercio`}>Comercio</FieldLabel>
          <Select value={f.comercio_id} onValueChange={(v) => cambiar('comercio_id', v)}>
            <SelectTrigger id={`${id}-comercio`} className={cn('w-full', clase('comercio_id'))}>
              <SelectValue placeholder="Elige el comercio" />
            </SelectTrigger>
            <SelectContent>
              {comercios.data?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombre} · RUT {c.rut}
                  {c.estado !== 'activo' && ` (${c.estado})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-folio`}>Folio</FieldLabel>
          <Input id={`${id}-folio`} value={f.folio} onChange={(e) => cambiar('folio', e.target.value)} className={clase('folio')} maxLength={40} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-fecha`}>Fecha y hora de compra</FieldLabel>
          <Input id={`${id}-fecha`} type="datetime-local" value={f.fecha} onChange={(e) => cambiar('fecha', e.target.value)} className={clase('fecha_compra')} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-total`}>Total pagado ($)</FieldLabel>
          <Input
            id={`${id}-total`}
            inputMode="numeric"
            value={f.monto_total}
            onChange={(e) => cambiar('monto_total', soloDigitos(e.target.value))}
            className={cn('tabular-nums', clase('monto_total'))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-excluido`}>Productos que no suman ($)</FieldLabel>
          <Input
            id={`${id}-excluido`}
            inputMode="numeric"
            placeholder="0"
            value={f.monto_excluido}
            onChange={(e) => cambiar('monto_excluido', soloDigitos(e.target.value))}
            className={cn('tabular-nums', clase('monto_excluido'))}
          />
        </Field>
      </div>

      <div className="flex items-end justify-between gap-4 rounded-lg bg-secondary px-5 py-4">
        <div>
          <p className="text-sm font-bold text-secondary-foreground">Puntos a acreditar</p>
          <p className="text-5xl font-extrabold tabular-nums" aria-live="polite">
            {ev ? numero(ev.puntos) : '—'}
          </p>
        </div>
        {ev && (
          <p className="text-right text-muted-foreground">
            Monto válido {pesos(ev.monto_valido)}
            {ev.puntos_calculados !== ev.puntos && <><br />Calculados: {numero(ev.puntos_calculados)}</>}
          </p>
        )}
        {evaluacion.isFetching && <Cargando />}
      </div>
      {!datos && <p className="text-muted-foreground">Completa comercio, folio, fecha y total para calcular los puntos.</p>}
      {datos && evaluacion.isError && <p className="text-peligro-texto">{mensajeError(evaluacion.error)}</p>}

      {controles.length > 0 && <Controles controles={controles} />}

      {aprobar.isError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo aprobar</AlertTitle>
          <AlertDescription>{mensajeError(aprobar.error)}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size={todoVerde ? 'lg' : 'default'}
          variant={hayRojo ? 'outline' : 'default'}
          onClick={aprobarAhora}
          disabled={!puedeAprobar}
        >
          {aprobar.isPending && <Cargando />}
          {ajustado ? 'Aprobar con ajustes' : 'Aprobar'}
        </Button>
        <Button variant={hayRojo ? 'destructive' : 'outline'} onClick={() => setRechazando(true)}>
          Rechazar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Atajos: A o Ctrl+Enter aprueba · R rechaza · S pasa a la siguiente.
        {hayRojo && ' Con un control en rojo no se puede aprobar: corrige el dato o rechaza.'}
      </p>

      <DialogoRechazo abierto={rechazando} onCambio={setRechazando} boletaId={b.id} sugerido={sugerido} onDecision={onDecision} />
    </div>
  )
}

/** Ficha de una boleta ya revisada. */
function Revisada({ b }: { b: BoletaDetalle }) {
  const filas: [string, string][] = [
    ['Comercio', b.comercio ?? '—'],
    ['Folio', b.folio ?? '—'],
    ['Compra', b.fecha_compra ? fechaHora(b.fecha_compra) : '—'],
    ['Total', b.monto_total !== null ? pesos(b.monto_total) : '—'],
    ['Monto válido', b.monto_valido !== null ? pesos(b.monto_valido) : '—'],
    ['Puntos', b.puntos !== null ? numero(b.puntos) : '—'],
    ['Revisada', b.revisada_en ? fechaHora(b.revisada_en) : '—'],
  ]
  return (
    <div className="flex flex-col gap-5">
      <InfoLectura b={b} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-lg">
        {filas.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      {b.motivo && (
        <Alert variant="destructive">
          <AlertTitle>Motivo</AlertTitle>
          <AlertDescription>{b.motivo}</AlertDescription>
        </Alert>
      )}
      {b.controles && <Controles controles={b.controles} />}
    </div>
  )
}

/** /admin/boletas/:id — foto a la izquierda; campos, controles, puntos y acciones a la derecha. */
export function PaginaRevision() {
  const { id } = useParams()
  const boletaId = Number(id)
  const navigate = useNavigate()
  const boleta = useBoleta(boletaId)
  const siguiente = useSiguiente(boletaId)
  const [ultima, setDecision] = useState<Decision | null>(null)
  // La decisión vale solo para la boleta en que se tomó (al pasar a la siguiente se limpia sola).
  const decision = ultima?.boleta.id === boletaId ? ultima : null

  // S: siguiente boleta (fuera de los campos de texto).
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (escribiendo(e) || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('[role="dialog"]')) return
      if ((e.key === 's' || e.key === 'S') && siguiente) {
        e.preventDefault()
        navigate(`/admin/boletas/${siguiente}`)
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [siguiente, navigate])

  if (boleta.isPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[60vh]" />
        <Skeleton className="h-[60vh]" />
      </div>
    )
  }
  if (boleta.isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-lg">{boleta.error.message}</p>
        <Button variant="secondary" asChild>
          <Link to="/admin/boletas">Volver a la cola</Link>
        </Button>
      </div>
    )
  }

  const b = boleta.data
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/boletas">
            Cola
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3 text-lg">
          <span>
            <strong>{b.vecino.nombre}</strong> <span className="text-muted-foreground tabular-nums">{b.vecino.telefono}</span>
          </span>
          <span className="text-muted-foreground">· recibida el {fechaHora(b.recibida_en)}</span>
          <EstadoBoletaBadge estado={decision?.boleta.estado ?? b.estado} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-4 lg:h-[calc(100svh-10rem)]">
          {b.tiene_imagen ? (
            <VisorFoto src={api.boletas.imagen(b.id)} alt={`Boleta de ${b.vecino.nombre}`} />
          ) : (
            <p className="rounded-lg border-2 border-dashed border-border p-10 text-center text-muted-foreground">Esta boleta no tiene foto.</p>
          )}
        </div>
        <div>
          {decision ? (
            <ResultadoDecision d={decision} siguiente={siguiente} />
          ) : b.estado === 'pendiente' ? (
            // Se vuelve a montar cuando llega (o se repite) la lectura, para cargar los campos leídos.
            <FormularioRevision key={`${b.id}-${JSON.stringify(b.lectura)}`} b={b} onDecision={setDecision} />
          ) : (
            <Revisada b={b} />
          )}
        </div>
      </div>
    </div>
  )
}
