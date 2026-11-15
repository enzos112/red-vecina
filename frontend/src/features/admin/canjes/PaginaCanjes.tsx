import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CanjeSalida, EstadoCanje } from '@/lib/api'
import { codigo, fechaHora, numero, pesos } from '@/lib/formato'
import { mensajeError, useCanjes, useLocalCerrado } from '../consultas'
import { EstadoCanjeBadge, EstadoLista, FiltroComercio } from '../partes'

const ESTADOS: { valor: EstadoCanje | 'todos'; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'activo', texto: 'Emitidos' },
  { valor: 'usado', texto: 'Usados' },
  { valor: 'vencido', texto: 'Vencidos' },
]

function Detalle({ c }: { c: CanjeSalida }) {
  const cerrado = useLocalCerrado()
  if (c.estado === 'usado' && c.usado_en) {
    return (
      <span>
        {fechaHora(c.usado_en)}
        {c.monto_ticket !== null && <span className="text-muted-foreground"> · ticket {pesos(c.monto_ticket)}</span>}
      </span>
    )
  }
  if (c.estado === 'vencido') {
    return (
      <span className="flex flex-wrap items-center gap-2">
        {c.vencido_en ? fechaHora(c.vencido_en) : fechaHora(c.vence_en)}
        {c.cuenta_para_p19 ? (
          <Button variant="ghost" size="xs" onClick={() => cerrado.mutate(c.id)} disabled={cerrado.isPending} title="El vencimiento no cuenta para el límite de códigos vencidos">
            El local estaba cerrado
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">(local cerrado: no cuenta)</span>
        )}
        {cerrado.isError && <span className="text-peligro-texto">{mensajeError(cerrado.error)}</span>}
      </span>
    )
  }
  return <span className="text-muted-foreground">vence {fechaHora(c.vence_en)}</span>
}

/** /admin/canjes — códigos emitidos, usados y vencidos. */
export function PaginaCanjes() {
  const [params, setParams] = useSearchParams()
  const estado = (params.get('estado') as EstadoCanje | null) ?? 'todos'
  const comercio = params.get('comercio') ? Number(params.get('comercio')) : null
  const canjes = useCanjes({ estado: estado === 'todos' ? null : estado, comercio_id: comercio })
  const lista = canjes.data ?? []

  function cambiar(clave: string, valor: string | null) {
    const siguiente = new URLSearchParams(params)
    if (valor === null) siguiente.delete(clave)
    else siguiente.set(clave, valor)
    setParams(siguiente, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={estado} onValueChange={(v) => cambiar('estado', v === 'todos' ? null : v)}>
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

      {canjes.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : canjes.isError ? (
        <EstadoLista texto={canjes.error.message} />
      ) : lista.length === 0 ? (
        <EstadoLista texto="No hay códigos con estos filtros." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Vecino</TableHead>
              <TableHead>Comercio</TableHead>
              <TableHead className="text-right">Descuento</TableHead>
              <TableHead className="text-right">Puntos</TableHead>
              <TableHead>Emitido</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Uso o vencimiento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-bold whitespace-nowrap tabular-nums">{codigo(c.codigo)}</TableCell>
                <TableCell>
                  <Link to={`/admin/vecinos/${c.vecino_id}`} className="hover:underline">
                    {c.vecino}
                  </Link>
                </TableCell>
                <TableCell>{c.comercio}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {pesos(c.valor_pesos)}
                  <span className="block text-sm text-muted-foreground">mín. {pesos(c.compra_minima)}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{numero(c.puntos)}</TableCell>
                <TableCell className="whitespace-nowrap">{fechaHora(c.emitido_en)}</TableCell>
                <TableCell>
                  <EstadoCanjeBadge estado={c.estado} />
                </TableCell>
                <TableCell>
                  <Detalle c={c} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
