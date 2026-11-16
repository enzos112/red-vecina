import { EncabezadoPagina } from '@/components/marca/EncabezadoPagina'
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
  if (actual === null || anterior === null) return <span className="text-lapiz">Sin comparación</span>
  const diferencia = actual - anterior
  const tendencia = diferencia > 0 ? 'Sube' : diferencia < 0 ? 'Baja' : 'Igual'
  return (
    <span className="text-lapiz">
      <strong className={diferencia > 0 ? 'text-exito-texto' : diferencia < 0 ? 'text-peligro-texto' : ''}>
        {tendencia}
      </strong>{' '}
      · mes pasado: {valorTexto(anterior, formato)}
    </span>
  )
}

function Cifra({
  titulo,
  actual,
  anterior,
  formato = 'numero',
  nota,
  destacada,
}: {
  destacada?: boolean
  titulo: string
  actual: number | null
  anterior: number | null
  formato?: Formato
  nota?: string
}) {
  return (
    <div className={`flex flex-col gap-1 border-2 border-tapa px-5 py-5 ${destacada ? 'bg-mango-50' : 'bg-papel'}`}>
      <p className="font-bold text-tapa">{titulo}</p>
      <p
        className={`rotulo text-5xl leading-tight tracking-[-0.03em] tabular-nums ${destacada ? 'text-mango-700' : 'text-tapa'}`}
      >
        {valorTexto(actual, formato)}
      </p>
      <Comparacion actual={actual} anterior={anterior} formato={formato} />
      {nota && <p className="text-[0.9375rem] text-lapiz">{nota}</p>}
    </div>
  )
}

function Alerta({ i }: { i: IndicadorSalida }) {
  return (
    <li className="flex gap-3 border-2 border-alerta bg-alerta-fondo px-4 py-3">
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
    <div className="flex flex-col gap-6 lg:gap-10">
      <EncabezadoPagina
        titulo={`Reporte de ${r.nombre_mes}`}
        descripcion={r.resumen}
      />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        <Cifra titulo="Ventas registradas" actual={mes.ventas} anterior={ant.ventas} formato="pesos" destacada />
        <Cifra titulo="Canjes recibidos" actual={mes.canjes} anterior={ant.canjes} nota={`Costo ${pesos(mes.canjes_pesos)}`} />
        <Cifra titulo="Costo de canjes" actual={mes.costo_pct} anterior={ant.costo_pct} formato="pct" nota="Sobre tus ventas registradas" />
        <Cifra destacada titulo="Clientes derivados" actual={mes.derivados} anterior={ant.derivados} nota="Vienen de otros locales de la red" />
        <Cifra titulo="Recompra sin canje" actual={mes.recompras} anterior={ant.recompras} nota="Derivados que volvieron sin código" />
        <Cifra titulo="Vecinos inscritos aquí" actual={mes.inscritos} anterior={ant.inscritos} nota={`${numero(r.vecinos_inscritos)} en total con tu QR`} />
      </div>

      {recompra && recompra.valor !== null && (
        <p className="text-lg">
          De tus clientes derivados, el <strong className="text-mango-800">{numero(Math.round(recompra.valor))}%</strong> volvió a comprar sin usar un código.
        </p>
      )}

      {alertas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="rotulo text-3xl text-tapa">Para conversar con el equipo</h2>
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
