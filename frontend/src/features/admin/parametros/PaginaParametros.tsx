import { Cargando } from '@/components/marca/Cargando'
import { useId, useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { CambioParametroSalida, ParametroSalida } from '@/lib/api'
import { fechaHora } from '@/lib/formato'
import { mensajeError, useCambiarParametro, useCambiosParametros, useParametros, useYo } from '../consultas'
import { EstadoLista } from '../partes'

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const CAMPOS_DIA = new Set(['dia_inicio', 'antes_de_dia'])

/** Nombre en pantalla de cada campo de los parámetros. */
const ETIQUETAS: Record<string, string> = {
  ambar_desde: 'Ámbar desde (% usado)',
  antes_de_dia: 'Antes del día',
  boletas: 'Boletas',
  boletas_semana: 'Boletas a la semana',
  boletas_validadas: 'Boletas validadas',
  canjes: 'Canjes',
  cantidad: 'Cantidad',
  casos: 'Casos',
  codigos: 'Códigos',
  dia_inicio: 'Día de inicio',
  dias: 'Días',
  dias_minimos: 'Días mínimos',
  dias_ventas: 'Días de ventas',
  horas: 'Horas',
  informativo: 'Solo informativo',
  maximo: 'Máximo',
  minutos: 'Minutos',
  nombres: 'Nombres',
  obligatorio: 'Nivel obligatorio',
  pausa_dias: 'Días de pausa',
  pesos: 'Pesos',
  pesos_por_punto: 'Pesos por punto',
  pesos_semana: 'Pesos a la semana',
  por_dia: 'Por día',
  porcentaje: 'Porcentaje',
  porcentaje_sobre_minimo: 'Porcentaje sobre el mínimo',
  puntos: 'Puntos',
  rojo_desde: 'Rojo desde (% usado)',
  semanas: 'Semanas',
  semanas_cupo: 'Semanas de cupo',
  semanas_seguidas: 'Semanas seguidas',
  semanas_suspension: 'Semanas de suspensión',
  veces_descuento: 'Veces el descuento',
  vencidos: 'Códigos vencidos',
}

type Esquema = {
  type?: string
  anyOf?: Esquema[]
  items?: Esquema
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
}

type Tipo = { base: 'entero' | 'decimal' | 'texto' | 'booleano' | 'lista-entero' | 'lista-texto'; nulo: boolean; rango: Esquema }

function tipoDe(e: Esquema): Tipo {
  const opciones = e.anyOf ?? [e]
  const nulo = opciones.some((o) => o.type === 'null')
  const principal = opciones.find((o) => o.type && o.type !== 'null' && o.type !== 'string') ?? opciones[0]
  if (principal.type === 'array') {
    return { base: principal.items?.type === 'integer' ? 'lista-entero' : 'lista-texto', nulo, rango: principal.items ?? {} }
  }
  if (principal.type === 'integer') return { base: 'entero', nulo, rango: principal }
  if (principal.type === 'number') return { base: 'decimal', nulo, rango: principal }
  if (principal.type === 'boolean') return { base: 'booleano', nulo, rango: principal }
  return { base: 'texto', nulo, rango: principal }
}

function rangoTexto(r: Esquema): string | null {
  const partes: string[] = []
  if (r.minimum !== undefined) partes.push(`desde ${r.minimum}`)
  if (r.exclusiveMinimum !== undefined) partes.push(`mayor que ${r.exclusiveMinimum}`)
  if (r.maximum !== undefined) partes.push(`hasta ${r.maximum}`)
  if (r.exclusiveMaximum !== undefined) partes.push(`menor que ${r.exclusiveMaximum}`)
  return partes.length ? `Válido: ${partes.join(', ')}.` : null
}

function fueraDeRango(n: number, r: Esquema): boolean {
  return (
    (r.minimum !== undefined && n < r.minimum) ||
    (r.exclusiveMinimum !== undefined && n <= r.exclusiveMinimum) ||
    (r.maximum !== undefined && n > r.maximum) ||
    (r.exclusiveMaximum !== undefined && n >= r.exclusiveMaximum)
  )
}

/** Texto corto del valor vigente. */
function resumen(valor: Record<string, unknown>): string {
  return Object.entries(valor)
    .map(([k, v]) => {
      const etiqueta = ETIQUETAS[k] ?? k
      if (v === null) return `${etiqueta}: sin valor`
      if (CAMPOS_DIA.has(k) && typeof v === 'number') return `${etiqueta}: ${DIAS[v]}`
      if (typeof v === 'boolean') return `${etiqueta}: ${v ? 'sí' : 'no'}`
      if (Array.isArray(v)) return `${etiqueta}: ${v.join(', ')}`
      return `${etiqueta}: ${String(v)}`
    })
    .join(' · ')
}

type Borrador = Record<string, { texto: string; nulo: boolean; marcado: boolean }>

function aBorrador(valor: Record<string, unknown>): Borrador {
  return Object.fromEntries(
    Object.entries(valor).map(([k, v]) => [
      k,
      {
        texto: v === null ? '' : Array.isArray(v) ? v.join(', ') : String(v),
        nulo: v === null,
        marcado: v === true,
      },
    ]),
  )
}

/** Convierte el borrador al valor que espera la API, o devuelve los errores por campo. */
function aValor(borrador: Borrador, props: Record<string, Esquema>) {
  const valor: Record<string, unknown> = {}
  const errores: Record<string, string> = {}
  for (const [k, e] of Object.entries(props)) {
    const t = tipoDe(e)
    const b = borrador[k] ?? { texto: '', nulo: t.nulo, marcado: false }
    if (t.nulo && b.nulo) {
      valor[k] = null
      continue
    }
    if (t.base === 'booleano') {
      valor[k] = b.marcado
    } else if (t.base === 'lista-entero' || t.base === 'lista-texto') {
      const partes = b.texto.split(',').map((x) => x.trim()).filter(Boolean)
      if (t.base === 'lista-entero') {
        const nums = partes.map(Number)
        if (nums.some((n) => !Number.isInteger(n))) errores[k] = 'Escribe números enteros separados por coma.'
        valor[k] = nums
      } else valor[k] = partes
      if (!partes.length) errores[k] = 'Escribe al menos un valor.'
    } else if (t.base === 'entero' || t.base === 'decimal') {
      const n = Number(b.texto.replace(',', '.'))
      if (b.texto.trim() === '' || Number.isNaN(n)) errores[k] = 'Escribe un número.'
      else if (t.base === 'entero' && !Number.isInteger(n)) errores[k] = 'Debe ser un número entero.'
      else if (fueraDeRango(n, t.rango)) errores[k] = rangoTexto(t.rango) ?? 'Fuera de rango.'
      valor[k] = n
    } else valor[k] = b.texto
  }
  return { valor, errores }
}

function Editor({ p, onCerrar }: { p: ParametroSalida; onCerrar: () => void }) {
  const id = useId()
  const cambiar = useCambiarParametro()
  const props = ((p.esquema as { properties?: Record<string, Esquema> }).properties ?? {}) as Record<string, Esquema>
  const [borrador, setBorrador] = useState<Borrador>(() => aBorrador(p.valor))
  const [motivo, setMotivo] = useState('')
  const { valor, errores } = aValor(borrador, props)
  const hayErrores = Object.keys(errores).length > 0

  function poner(k: string, cambio: Partial<Borrador[string]>) {
    setBorrador({ ...borrador, [k]: { ...(borrador[k] ?? { texto: '', nulo: false, marcado: false }), ...cambio } })
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (hayErrores) return
    cambiar.mutate({ codigo: p.codigo, valor, motivo }, { onSuccess: onCerrar })
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      {Object.entries(props).map(([k, e]) => {
        const t = tipoDe(e)
        const b = borrador[k] ?? { texto: '', nulo: t.nulo, marcado: false }
        const campoId = `${id}-${k}`
        return (
          <Field key={k} data-invalid={!!errores[k]}>
            <FieldLabel htmlFor={campoId}>{ETIQUETAS[k] ?? k}</FieldLabel>
            {t.base === 'booleano' ? (
              <label className="flex items-center gap-3">
                <Checkbox id={campoId} checked={b.marcado} onCheckedChange={(v) => poner(k, { marcado: v === true })} />
                Sí
              </label>
            ) : CAMPOS_DIA.has(k) ? (
              <Select value={b.texto} onValueChange={(v) => poner(k, { texto: v })}>
                <SelectTrigger id={campoId} className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS.map((d, n) => (
                    <SelectItem key={d} value={String(n)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={campoId}
                inputMode={t.base === 'entero' || t.base === 'decimal' ? 'decimal' : undefined}
                value={b.texto}
                disabled={t.nulo && b.nulo}
                onChange={(ev) => poner(k, { texto: ev.target.value })}
                aria-invalid={!!errores[k]}
              />
            )}
            {t.nulo && (
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={b.nulo} onCheckedChange={(v) => poner(k, { nulo: v === true })} />
                Sin valor (el indicador se calcula pero no alerta)
              </label>
            )}
            {t.base.startsWith('lista') && <FieldDescription>Separados por coma.</FieldDescription>}
            {!errores[k] && rangoTexto(t.rango) && <FieldDescription>{rangoTexto(t.rango)}</FieldDescription>}
            {errores[k] && <FieldError>{errores[k]}</FieldError>}
          </Field>
        )
      })}
      <Field>
        <FieldLabel htmlFor={`${id}-motivo`}>Motivo del cambio</FieldLabel>
        <Textarea id={`${id}-motivo`} value={motivo} onChange={(e) => setMotivo(e.target.value)} required maxLength={500} />
        <FieldDescription>
          Rige desde ahora hacia adelante. Los puntos ya otorgados, los códigos emitidos y el cupo de esta semana no se
          recalculan.
        </FieldDescription>
      </Field>
      {cambiar.isError && (
        <Alert variant="destructive">
          <AlertDescription>{mensajeError(cambiar.error)}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="self-start" disabled={hayErrores || !motivo.trim() || cambiar.isPending}>
        {cambiar.isPending && <Cargando />}
        Guardar cambio
      </Button>
    </form>
  )
}

function Historial({ cambios }: { cambios: CambioParametroSalida[] }) {
  if (cambios.length === 0) return <EstadoLista texto="Sin cambios registrados." />
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cuándo</TableHead>
          <TableHead>Parámetro</TableHead>
          <TableHead>Antes</TableHead>
          <TableHead>Después</TableHead>
          <TableHead>Quién</TableHead>
          <TableHead>Motivo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cambios.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="whitespace-nowrap">{fechaHora(c.cambiado_en)}</TableCell>
            <TableCell className="font-bold">{c.codigo}</TableCell>
            <TableCell className="text-sm">{c.valor_anterior ? resumen(c.valor_anterior) : '—'}</TableCell>
            <TableCell className="text-sm">{resumen(c.valor_nuevo)}</TableCell>
            <TableCell>{c.usuario ?? 'Carga inicial'}</TableCell>
            <TableCell className="text-sm">{c.motivo}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

type Vista = 'red' | 'umbral' | 'cambios'

/** /admin/parametros — P1 a P20 y umbrales, editables por el admin, con registro de cambios. */
export function PaginaParametros() {
  const yo = useYo()
  const esAdmin = yo.data?.rol === 'admin'
  const parametros = useParametros()
  const cambios = useCambiosParametros()
  const [vista, setVista] = useState<Vista>('red')
  const [editando, setEditando] = useState<ParametroSalida | null>(null)

  if (parametros.isPending) return <Skeleton className="h-96" />
  if (parametros.isError) return <EstadoLista texto={parametros.error.message} />
  const lista = parametros.data.filter((p) => p.grupo === vista).sort((a, b) => a.orden - b.orden)

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={vista} onValueChange={(v) => setVista(v as Vista)}>
        <TabsList>
          <TabsTrigger value="red">P1 a P20</TabsTrigger>
          <TabsTrigger value="umbral">Umbrales</TabsTrigger>
          <TabsTrigger value="cambios">Registro de cambios</TabsTrigger>
        </TabsList>
      </Tabs>
      {vista === 'cambios' ? (
        cambios.isPending ? (
          <Skeleton className="h-40" />
        ) : cambios.isError ? (
          <EstadoLista texto={cambios.error.message} />
        ) : (
          <Historial cambios={cambios.data} />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Parámetro</TableHead>
              <TableHead>Valor vigente</TableHead>
              <TableHead>Último cambio</TableHead>
              {esAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((p) => (
              <TableRow key={p.codigo}>
                <TableCell className="font-bold">{p.codigo}</TableCell>
                <TableCell className="max-w-sm">
                  <span className="font-bold">{p.nombre}</span>
                  <span className="block text-sm whitespace-normal text-muted-foreground">{p.descripcion}</span>
                </TableCell>
                <TableCell className="max-w-xs text-sm whitespace-normal">{resumen(p.valor)}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {fechaHora(p.actualizado_en)}
                  <span className="block text-muted-foreground">{p.actualizado_por_nombre ?? 'Carga inicial'}</span>
                </TableCell>
                {esAdmin && (
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setEditando(p)}>
                      Editar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          {editando && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {editando.codigo} · {editando.nombre}
                </DialogTitle>
                <DialogDescription>{editando.descripcion}</DialogDescription>
              </DialogHeader>
              <Editor key={editando.codigo} p={editando} onCerrar={() => setEditando(null)} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
