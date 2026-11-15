import { Link, useNavigate, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
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

function Contador() {
  const r = useResumenCola()
  if (!r.data) return <Skeleton className="h-24 w-64" />
  const { pendientes, atrasadas } = r.data
  return (
    <div className="flex flex-wrap items-end gap-6">
      <div>
        <p className="text-6xl font-extrabold tabular-nums">{numero(pendientes)}</p>
        <p className="text-lg text-muted-foreground">{pendientes === 1 ? 'boleta pendiente' : 'boletas pendientes'}</p>
      </div>
      {atrasadas > 0 && (
        <Badge variant="peligro" className="mb-2 text-base">
          {numero(atrasadas)} fuera del plazo de revisión
        </Badge>
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
        <Contador />
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
                      <span className="ml-2 inline-flex items-center gap-1 text-sm font-bold text-peligro-texto">
                        atrasada
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {b.vecino.nombre}
                    {b.origen === 'operador' && (
                      <span className="ml-2 text-sm text-muted-foreground">(por WhatsApp)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {b.comercio ?? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        por leer
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{b.monto_total !== null ? pesos(b.monto_total) : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.puntos !== null ? numero(b.puntos) : '—'}</TableCell>
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
