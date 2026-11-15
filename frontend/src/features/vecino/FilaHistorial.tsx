import { Badge } from '@/components/ui/badge'
import { fechaHora } from '@/lib/formato'
import type { ItemHistorial, TipoItem } from './historial'

/** Tipo de movimiento: color de la barra lateral y nombre corto. */
const TIPOS: Record<TipoItem, { barra: string; texto: string }> = {
  compra: { barra: 'bg-vecina', texto: 'Compra' },
  canje: { barra: 'bg-mango', texto: 'Canje' },
  vencimiento: { barra: 'bg-musgo', texto: 'Vencimiento' },
  ajuste: { barra: 'bg-barrio', texto: 'Ajuste' },
}

/** Una fila del historial: qué tipo de movimiento, qué pasó, cuánto y cuándo. */
export function FilaHistorial({ item }: { item: ItemHistorial }) {
  const tipo = TIPOS[item.tipo]
  return (
    <li className="relative overflow-hidden rounded-2xl border border-border bg-card py-4 pr-4 pl-6">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${tipo.barra}`} />
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{tipo.texto}</p>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className="font-bold">{item.titulo}</p>
          <Badge variant={item.etiqueta.variante}>{item.etiqueta.texto}</Badge>
        </div>
        {item.detalle && <p className="text-muted-foreground">{item.detalle}</p>}
        {item.nota && <p className="mt-1 text-base">{item.nota}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{fechaHora(item.fecha)}</p>
      </div>
    </li>
  )
}
