/** Piezas compartidas del panel del equipo. */
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EstadoBoleta, EstadoCanje } from '@/lib/api'
import { useComercios } from './consultas'

const TODOS = 'todos'

/** Selector de comercio para filtros: "Todos los comercios" o uno. */
export function FiltroComercio({
  valor,
  onCambio,
  id,
}: {
  valor: number | null
  onCambio: (id: number | null) => void
  id?: string
}) {
  const comercios = useComercios()
  return (
    <Select value={valor === null ? TODOS : String(valor)} onValueChange={(v) => onCambio(v === TODOS ? null : Number(v))}>
      <SelectTrigger id={id} className="min-w-56" aria-label="Comercio">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>Todos los comercios</SelectItem>
        {comercios.data?.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const ESTADO_BOLETA: Record<EstadoBoleta, { texto: string; variante: 'alerta' | 'exito' | 'peligro' }> = {
  pendiente: { texto: 'Pendiente', variante: 'alerta' },
  aprobada: { texto: 'Aprobada', variante: 'exito' },
  rechazada: { texto: 'Rechazada', variante: 'peligro' },
}

export function EstadoBoletaBadge({ estado }: { estado: EstadoBoleta }) {
  const e = ESTADO_BOLETA[estado]
  return <Badge variant={e.variante}>{e.texto}</Badge>
}

const ESTADO_CANJE: Record<EstadoCanje, { texto: string; variante: 'alerta' | 'exito' | 'secondary' }> = {
  activo: { texto: 'Activo', variante: 'alerta' },
  usado: { texto: 'Usado', variante: 'exito' },
  vencido: { texto: 'Vencido', variante: 'secondary' },
}

export function EstadoCanjeBadge({ estado }: { estado: EstadoCanje }) {
  const e = ESTADO_CANJE[estado]
  return <Badge variant={e.variante}>{e.texto}</Badge>
}

/** El texto listo para el vecino con "Copiar" y "Abrir WhatsApp". */
export function MensajeParaVecino({ texto, whatsapp }: { texto: string; whatsapp: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin permiso para el portapapeles: el texto queda a la vista para copiarlo a mano.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-lg border-2 border-border bg-muted px-4 py-3 text-lg whitespace-pre-wrap select-all">{texto}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={copiar}>
          {copiado ? 'Copiado' : 'Copiar'}
        </Button>
        <Button asChild>
          <a href={whatsapp} target="_blank" rel="noreferrer">
            Abrir WhatsApp
          </a>
        </Button>
      </div>
    </div>
  )
}

/** "Cargando", "error" y "vacío" para listas del panel. */
export function EstadoLista({ texto }: { texto: string }) {
  return <p className="rounded-lg border-2 border-dashed border-border px-6 py-10 text-center text-lg text-muted-foreground">{texto}</p>
}
