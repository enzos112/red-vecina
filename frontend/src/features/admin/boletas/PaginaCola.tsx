import { Link, useNavigate, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { EstadoBoleta } from '@/lib/api'
import { fechaHora, numero, pesos } from '@/lib/formato'
import { useCola, useResumenCola } from '../consultas'
import { EstadoBoletaBadge, EstadoLista, FiltroComercio } from '../partes'
import { SubirBoleta } from './SubirBoleta'

const ESTADOS: { valor: EstadoBoleta | 'todas'; texto: string }[] = [
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'aprobada', texto: 'Aprobadas' },
  { valor: 'rechazada', texto: 'Rechazadas' },
  { valor: 'todas', texto: 'Todas' },
]

/** Lo que hay que hacer hoy: cuántas esperan, cuántas se atrasaron y el atajo a la más antigua. */
function Contador({ primera }: { primera?: number }) {
  const r = useResumenCola()
  if (!r.data) return <Skeleton className="h-32 w-full max-w-xl rounded-none" />
  const { pendientes, atrasadas } = r.data
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-2 border-tapa bg-mango-50 px-5 py-4">
      <div>
        <p className="rotulo text-6xl leading-none tracking-[-0.035em] text-mango-700">{numero(pendientes)}</p>
        <p className="mt-1 text-lg font-semibold text-tapa">
          {pendientes === 1 ? 'boleta por revisar' : 'boletas por revisar'}
        </p>
      </div>
      {atrasadas > 0 && (
        <Badge variant="peligro" className="text-base">
          {numero(atrasadas)} fuera del plazo de revisión
        </Badge>
      )}
      {pendientes > 0 && primera !== undefined && (
        <Button asChild variant="libreta">
          <Link to={`/admin/boletas/${primera}`}>Revisar la más antigua</Link>
        </Button>
      )}
    </div>
  )
}

/** /admin/boletas — cola de la más antigua a la más nueva, con filtros por estado y comercio. */
export function PaginaCola() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const estado = (params.get('estado') as EstadoBoleta | 'todas' | null) ?? 'pendiente'
  const comercio = params.get('comercio') ? Number(params.get('comercio')) : null
  const cola = useCola(
    estado === 'todas' ? { estado: null, comercio_id: comercio, todas: true } : { estado, comercio_id: comercio },
  )

  function cambiar(clave: string, valor: string | null) {
    const siguiente = new URLSearchParams(params)
    if (valor === null) siguiente.delete(clave)
    else siguiente.set(clave, valor)
    setParams(siguiente, { replace: true })
  }

  const lista = cola.data ?? []
  const ahora = cola.dataUpdatedAt // momento de la consulta, para marcar las atrasadas

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Contador primera={estado === 'pendiente' ? lista[0]?.id : undefined} />
        <SubirBoleta />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={estado} onValueChange={(v) => cambiar('estado', v === 'pendiente' ? null : v)}>
          <TabsList>
            {ESTADOS.map((e) => (
              <TabsTrigger key={e.valor} value={e.valor}>
                {e.texto}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <FiltroComercio valor={comercio} onCambio={(id) => cambiar('comercio', id === null ? null : String(id))} />
      </div>

      {cola.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : cola.isError ? (
        <EstadoLista texto={cola.error.message} />
      ) : lista.length === 0 ? (
        <EstadoLista texto={estado === 'pendiente' ? 'No hay boletas pendientes. Buen trabajo.' : 'No hay boletas con estos filtros.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recibida</TableHead>
              <TableHead>Vecino</TableHead>
              <TableHead>Comercio</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Puntos</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((b) => {
              const atrasada = b.estado === 'pendiente' && new Date(b.revisar_antes_de).getTime() < ahora
              return (
                <TableRow
                  key={b.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin/boletas/${b.id}`)}
                >
                  <TableCell className="whitespace-nowrap">
                    <Link to={`/admin/boletas/${b.id}`} className="font-bold hover:underline" onClick={(e) => e.stopPropagation()}>
                      {fechaHora(b.recibida_en)}
                    </Link>
                    {atrasada && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[0.9375rem] font-bold text-peligro-texto">
                        atrasada
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {b.vecino.nombre}
                    {b.origen === 'operador' && (
                      <span className="ml-2 text-[0.9375rem] text-lapiz">(por WhatsApp)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {b.comercio ?? (
                      <span className="inline-flex items-center gap-1 text-lapiz">
                        por leer
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{b.monto_total !== null ? pesos(b.monto_total) : '—'}</TableCell>
                  <TableCell className="text-right font-extrabold text-mango-800 tabular-nums">
                    {b.puntos !== null ? `+${numero(b.puntos)}` : '—'}
                  </TableCell>
                  <TableCell>
                    <EstadoBoletaBadge estado={b.estado} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
