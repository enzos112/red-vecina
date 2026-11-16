import { Info } from '@/components/marca/Info'
import { Link, useSearchParams } from 'react-router'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AlertaFraudeSalida, IndicadorSalida, ReporteComercioSalida } from '@/lib/api'
import { dia, numero, pesos } from '@/lib/formato'
import { useFraude, useIndicadores, useRevisionSemanal } from '../consultas'
import { EstadoLista } from '../partes'

/** Cómo se lee el valor de cada indicador de la sección 10. */
const UNIDAD: Record<string, 'pct' | 'pesos' | 'numero'> = {
  costo_canjes: 'pct',
  uso_cupo: 'pct',
  ticket_promedio: 'pesos',
  clientes_derivados: 'numero',
  recompra: 'pct',
  cobertura: 'pct',
  puntos_sin_canjear: 'pesos',
}

function valor(i: IndicadorSalida): string {
  if (i.valor === null) return 'Sin datos'
  const u = UNIDAD[i.clave] ?? 'numero'
  if (u === 'pct') return `${numero(Math.round(i.valor * 10) / 10)}%`
  if (u === 'pesos') return pesos(Math.round(i.valor))
  return numero(i.valor)
}

function Indicador({ i }: { i: IndicadorSalida }) {
  return (
    <div className={`border-2 px-4 py-3 ${i.alerta ? 'border-alerta bg-alerta-fondo' : 'border-tapa bg-papel'}`}>
      <p className="flex items-center justify-between gap-2 text-[0.9375rem] font-bold text-lapiz">
        {i.nombre}
        {i.alerta && (
          <Info etiqueta={`Qué hacer con ${i.nombre}`}>
            <strong>{i.senal}.</strong> {i.accion}
          </Info>
        )}
      </p>
      <p className={`rotulo text-4xl leading-tight tabular-nums ${i.alerta ? 'text-alerta-texto' : 'text-mango-700'}`}>{valor(i)}</p>
      {i.alerta && <p className="mt-1 text-[0.9375rem] font-semibold text-alerta-texto">{i.senal}</p>}
    </div>
  )
}

function Fraude({ a }: { a: AlertaFraudeSalida }) {
  return (
    <li className="flex gap-3 border-2 border-peligro bg-card px-4 py-3">
      <div className="flex flex-col gap-1">
        <p className="font-bold">{a.titulo}</p>
        <p>{a.detalle}</p>
        <p className="text-muted-foreground">{a.accion}</p>
        <p className="flex flex-wrap gap-3 text-sm">
          {a.vecino_id && (
            <Link to={`/admin/vecinos/${a.vecino_id}`} className="text-vecina underline">
              Ver vecino
            </Link>
          )}
          {a.comercio_id && (
            <Link to={`/admin/comercios/${a.comercio_id}`} className="text-vecina underline">
              Ver comercio
            </Link>
          )}
        </p>
      </div>
    </li>
  )
}

function ListaFraude({ alertas }: { alertas: AlertaFraudeSalida[] }) {
  if (alertas.length === 0) return <EstadoLista texto="Sin alertas de fraude esta semana." />
  return (
    <ul className="flex flex-col gap-2">
      {alertas.map((a, n) => (
        <Fraude key={`${a.clave}-${a.vecino_id}-${a.comercio_id}-${n}`} a={a} />
      ))}
    </ul>
  )
}

const CONFIG_CUPOS = {
  anterior: { label: 'Semana anterior', color: 'var(--tapa)' },
  actual: { label: 'Esta semana', color: 'var(--mango)' },
} satisfies ChartConfig

function variacion(actual: number, anterior: number | null): string {
  if (anterior === null || anterior === 0) return '—'
  const v = Math.round(((actual - anterior) / anterior) * 100)
  return `${v > 0 ? '+' : ''}${numero(v)}%`
}

/** Revisión del lunes en una pantalla (sección 10). */
function Revision() {
  const r = useRevisionSemanal()
  if (r.isPending) return <Skeleton className="h-96" />
  if (r.isError) return <EstadoLista texto={r.error.message} />
  const d = r.data
  const datos = d.cupos.map((c) => ({ comercio: c.comercio, anterior: c.total_anterior ?? 0, actual: c.total }))

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-lapiz">
        Semana del {dia(d.semana)}, comparada con la del {dia(d.semana_anterior)}.
      </p>

      <section aria-label="Lo que pide atención" className="flex flex-col gap-2">
        {d.alertas.length === 0 && d.fraude.length === 0 ? (
          <p className="border-2 border-exito/60 px-4 py-3 font-semibold text-exito-texto">
            Ningún indicador en alerta y sin alertas de fraude. Buena semana.
          </p>
        ) : (
          <>
            <h2 className="rotulo text-2xl text-tapa">Pide atención ({d.alertas.length + d.fraude.length})</h2>
            <ul className="flex flex-col gap-2">
              {d.alertas.map((a) => (
                <li
                  key={`${a.comercio_id}-${a.indicador.clave}`}
                  className="flex items-start justify-between gap-3 border-2 border-alerta bg-alerta-fondo px-4 py-3"
                >
                  <span>
                    <strong>{a.comercio ?? 'Red'}</strong> · {a.indicador.nombre} ({valor(a.indicador)}): {a.indicador.senal}.
                  </span>
                  <Info etiqueta="Qué hacer" lado="left">
                    {a.indicador.accion}
                  </Info>
                </li>
              ))}
            </ul>
            {d.fraude.length > 0 && <ListaFraude alertas={d.fraude} />}
          </>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {d.red.map((i) => (
          <Indicador key={i.clave} i={i} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Cupos nuevos por comercio</CardTitle>
          <CardDescription className="flex items-center gap-2">
            Esta semana contra la anterior.
            <Info etiqueta="Cómo se arma el cupo">
              El cupo de cada comercio suma la base (según sus ventas), el arrastre de lo que no usó y el cupo extra
              voluntario. «En el piso» significa que recibe el mínimo.
            </Info>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ChartContainer config={CONFIG_CUPOS} className="aspect-auto h-72 w-full">
            <BarChart data={datos} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="comercio" tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => v.split(' ')[0]} />
              <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={(v: number) => pesos(v)} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => `${CONFIG_CUPOS[n as 'actual'].label}: ${pesos(Number(v))}`} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="anterior" fill="var(--color-anterior)" radius={0} />
              <Bar dataKey="actual" fill="var(--color-actual)" radius={0} />
            </BarChart>
          </ChartContainer>
          <details className="group">
            <summary className="inline-flex min-h-12 cursor-pointer list-none items-center font-bold text-tinta-azul underline decoration-mango decoration-2 underline-offset-[6px] [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Ver el detalle por comercio</span>
              <span className="hidden group-open:inline">Ocultar el detalle</span>
            </summary>
            <div className="mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comercio</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Arrastre</TableHead>
                  <TableHead className="text-right">Extra</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Semana anterior</TableHead>
                  <TableHead className="text-right">Cambio</TableHead>
                  <TableHead className="text-right">Usó la anterior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.cupos.map((c) => (
                  <TableRow key={c.comercio_id}>
                    <TableCell>
                      <Link to={`/admin/comercios/${c.comercio_id}`} className="font-bold hover:underline">
                        {c.comercio}
                      </Link>
                      <span className="ml-2 inline-flex gap-1">
                        {c.en_piso && <Badge variant="secondary">En el piso</Badge>}
                        {c.estado === 'suspendido' && <Badge variant="alerta">Suspendido</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{pesos(c.base)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pesos(c.arrastre)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pesos(c.extra)}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">{pesos(c.total)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.total_anterior === null ? '—' : pesos(c.total_anterior)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{variacion(c.total, c.total_anterior)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.usado_anterior === null || !c.total_anterior
                        ? '—'
                        : `${numero(Math.round((c.usado_anterior / c.total_anterior) * 100))}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </details>
        </CardContent>
      </Card>

    </div>
  )
}

const CONFIG_COSTO = {
  costo: { label: 'Costo de canjes sobre ventas', color: 'var(--chart-1)' },
} satisfies ChartConfig

function Comercio({ r }: { r: ReporteComercioSalida }) {
  const alertas = r.indicadores.filter((i) => i.alerta).length
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
          <Link to={`/admin/comercios/${r.comercio_id}`} className="hover:underline">
            {r.comercio}
          </Link>
          {alertas > 0 && <Badge variant="alerta">{alertas === 1 ? '1 alerta' : `${alertas} alertas`}</Badge>}
        </CardTitle>
        <CardDescription>
          Últimos días: ventas {pesos(r.ventas)} · {numero(r.canjes_recibidos)} canjes ({pesos(r.canjes_pesos)}) ·{' '}
          {numero(r.vecinos_inscritos)} inscritos con su QR · {numero(r.clientes_derivados_total)} derivados en total
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {r.indicadores.map((i) => (
          <Indicador key={i.clave} i={i} />
        ))}
      </CardContent>
    </Card>
  )
}

function Indicadores() {
  const ind = useIndicadores()
  if (ind.isPending) return <Skeleton className="h-96" />
  if (ind.isError) return <EstadoLista texto={ind.error.message} />
  const datos = ind.data.comercios.map((r) => ({
    comercio: r.comercio,
    costo: r.indicadores.find((i) => i.clave === 'costo_canjes')?.valor ?? 0,
  }))
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-3xl text-tapa">Red</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ind.data.red.map((i) => (
            <Indicador key={i.clave} i={i} />
          ))}
        </div>
      </section>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Costo de canjes sobre ventas registradas</CardTitle>
          <CardDescription>Por comercio, en la ventana del cupo.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={CONFIG_COSTO} className="aspect-auto h-64 w-full">
            <BarChart data={datos} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="comercio" tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => v.split(' ')[0]} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${numero(v)}%`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${numero(Math.round(Number(v) * 10) / 10)}%`} />} />
              <Bar dataKey="costo" fill="var(--color-costo)" radius={0} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-3xl text-tapa">Por comercio</h2>
        {ind.data.comercios.map((r) => (
          <Comercio key={r.comercio_id} r={r} />
        ))}
      </section>
    </div>
  )
}

function FraudeVista() {
  const f = useFraude()
  if (f.isPending) return <Skeleton className="h-40" />
  if (f.isError) return <EstadoLista texto={f.error.message} />
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        Cuentas con muchas boletas en un mismo local, compras con horarios superpuestos en dos locales y saltos de
        ventas registradas sin más vecinos. Son señales para revisar, no pruebas.
      </p>
      <ListaFraude alertas={f.data} />
    </div>
  )
}

type Vista = 'revision' | 'indicadores' | 'fraude'

/** /admin/red — revisión del lunes, indicadores de la sección 10 y alertas de fraude. */
export function PaginaRed() {
  const [params, setParams] = useSearchParams()
  const vista = (params.get('vista') as Vista | null) ?? 'revision'
  return (
    <div className="flex flex-col gap-6">
      <Tabs value={vista} onValueChange={(v) => setParams(v === 'revision' ? {} : { vista: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="revision">Revisión del lunes</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="fraude">Fraude</TabsTrigger>
        </TabsList>
      </Tabs>
      {vista === 'revision' && <Revision />}
      {vista === 'indicadores' && <Indicadores />}
      {vista === 'fraude' && <FraudeVista />}
    </div>
  )
}
