import { fechaHora } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { ItemHistorial } from './historial'

/**
 * Cómo se escribe cada movimiento en la libreta: lo que espera revisión va a lápiz, lo firme en
 * tinta, el canje usado queda tachado (saldado) y lo que no sumó se dice en rojo, con palabras.
 */
type Trazo = 'tinta' | 'lapiz' | 'saldado' | 'peligro'

function trazo(item: ItemHistorial): Trazo {
  if (item.etiqueta.variante === 'peligro') return 'peligro'
  if (item.tipo === 'canje' && item.etiqueta.variante === 'secondary') return 'saldado'
  if (item.etiqueta.variante === 'alerta') return 'lapiz'
  return 'tinta'
}

const CIFRA: Record<Trazo, string> = {
  tinta: 'font-extrabold text-tinta-azul',
  lapiz: 'font-medium text-lapiz underline decoration-dashed decoration-2 underline-offset-[6px]',
  saldado: 'font-bold text-tinta',
  peligro: 'font-bold text-peligro-texto',
}

/** Una línea de la cuenta: qué pasó y cuándo a la izquierda, cuánto o en qué quedó a la derecha. */
export function FilaHistorial({ item }: { item: ItemHistorial }) {
  const t = trazo(item)
  return (
    <li className={cn('grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b border-cuadricula py-4', t === 'lapiz' && 'text-lapiz')}>
      <div className="min-w-0">
        <p className="font-bold">
          <span
            className={cn(
              t === 'saldado' && 'line-through decoration-tinta-azul decoration-[3px]',
            )}
          >
            {item.titulo}
          </span>
        </p>
        {item.detalle && <p className={t === 'lapiz' ? undefined : 'text-lapiz'}>{item.detalle}</p>}
        {item.nota && <p className="mt-1">{item.nota}</p>}
        <p className="mt-1 text-[0.9375rem] font-semibold text-tapa">{fechaHora(item.fecha)}</p>
      </div>
      <p className={cn('text-right text-lg tabular-nums', CIFRA[t])}>{item.etiqueta.texto}</p>
    </li>
  )
}
