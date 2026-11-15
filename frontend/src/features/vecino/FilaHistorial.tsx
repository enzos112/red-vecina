import { Badge } from '@/components/ui/badge'
import { fechaHora } from '@/lib/formato'
import type { ItemHistorial } from './historial'

/** Una fila del historial: ícono, qué pasó, cuánto y cuándo. */
export function FilaHistorial({ item }: { item: ItemHistorial }) {
  const Icono = item.icono
  return (
    <li className="flex gap-4 rounded-2xl border border-border bg-card p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-vecina">
        <Icono className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
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
