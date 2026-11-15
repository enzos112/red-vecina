import { ArrowDown, ArrowUp, Minus, TriangleAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { IndicadorSalida } from '@/lib/api'
import { numero, pesos } from '@/lib/formato'
import { useReporte } from './consultas'

type Formato = 'numero' | 'pesos' | 'pct'

function valorTexto(v: number | null, f: Formato): string {
  if (v === null) return '—'
  if (f === 'pesos') return pesos(v)
  if (f === 'pct') return `${numero(Math.round(v))}%`
  return numero(v)
}

/** Flecha y texto contra el mismo tramo del mes anterior. */
function Comparacion({ actual, anterior, formato }: { actual: number | null; anterior: number | null; formato: Formato }) {
  if (actual === null || anterior === null) return <span className="text-muted-foreground">Sin comparación</span>
  const diferencia = actual - anterior
  const Icono = diferencia > 0 ? ArrowUp : diferencia < 0 ? ArrowDown : Minus
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Icono className="size-4" aria-hidden="true" />
      <span>mes pasado: {valorTexto(anterior, formato)}</span>
    </span>
  )
}

function Cifra({
  titulo,
  actual,
  anterior,
  formato = 'numero',
  nota,
}: {
  titulo: string
  actual: number | null
  anterior: number | null
  formato?: Formato
  nota?: string
}) {
  return (
    <Card className="gap-1 py-5">
      <CardContent className="flex flex-col gap-1 px-5">
        <p className="font-bold text-muted-foreground">{titulo}</p>
        <p className="text-4xl font-extrabold tabular-nums">{valorTexto(actual, formato)}</p>
        <Comparacion actual={actual} anterior={anterior} formato={formato} />
        {nota && <p className="text-sm text-muted-foreground">{nota}</p>}
      </CardContent>
    </Card>
  )
}

function Alerta({ i }: { i: IndicadorSalida }) {
  return (
    <li className="flex gap-3 rounded-lg border border-l-4 border-border border-l-alerta bg-alerta-fondo px-4 py-3">
      <TriangleAlert className="mt-1 size-5 shrink-0 text-alerta-texto" aria-hidden="true" />
      <span>
        <strong>{i.nombre}:</strong> {i.senal}. {i.accion}
      </span>
    </li>
  )
}

/** /comercio/reporte — el mes en curso contra el mismo tramo del mes anterior. */
export function PaginaReporte() {
  const reporte = useReporte()
  if (reporte.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }
  if (reporte.isError) return <p className="text-lg">{reporte.error.message}</p>
  const r = reporte.data
  const { mes, mes_anterior: ant } = r
  const recompra = r.indicadores.find((i) => i.clave === 'recompra')
  const alertas = r.indicadores.filter((i) => i.alerta)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold first-letter:uppercase">{r.nombre_mes}</h1>
        <p className="mt-3 text-xl leading-snug">{r.resumen}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <Cifra titulo="Ventas registradas" actual={mes.ventas} anterior={ant.ventas} formato="pesos" />
        <Cifra titulo="Canjes recibidos" actual={mes.canjes} anterior={ant.canjes} nota={`Costo ${pesos(mes.canjes_pesos)}`} />
        <Cifra titulo="Costo de canjes" actual={mes.costo_pct} anterior={ant.costo_pct} formato="pct" nota="Sobre tus ventas registradas" />
        <Cifra titulo="Clientes derivados" actual={mes.derivados} anterior={ant.derivados} nota="Vienen de otros locales de la red" />
        <Cifra titulo="Recompra sin canje" actual={mes.recompras} anterior={ant.recompras} nota="Derivados que volvieron sin código" />
        <Cifra titulo="Vecinos inscritos aquí" actual={mes.inscritos} anterior={ant.inscritos} nota={`${numero(r.vecinos_inscritos)} en total con tu QR`} />
      </div>

      {recompra && recompra.valor !== null && (
        <p className="text-lg">
          De tus clientes derivados, el <strong>{numero(Math.round(recompra.valor))}%</strong> volvió a comprar sin usar un código.
        </p>
      )}

      {alertas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold">Para conversar con el equipo</h2>
          <ul className="flex flex-col gap-2">
            {alertas.map((i) => (
              <Alerta key={i.clave} i={i} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
