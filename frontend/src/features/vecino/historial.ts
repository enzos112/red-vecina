/** Historial del vecino: compras (boletas), canjes y vencimientos en una sola línea de tiempo. */
import type { Tarjeta } from '@/lib/api'
import { fechaHora, pesos, puntos } from '@/lib/formato'

export type TipoItem = 'compra' | 'canje' | 'vencimiento' | 'ajuste'

type Etiqueta = { texto: string; variante: 'exito' | 'alerta' | 'peligro' | 'secondary' }

export type ItemHistorial = {
  clave: string
  tipo: TipoItem
  fecha: string
  titulo: string
  detalle: string | null
  nota: string | null
  etiqueta: Etiqueta
}

function detalleBoleta(monto: number | null, fechaCompra: string | null): string | null {
  const partes = [monto != null ? pesos(monto) : null, fechaCompra ? `compra del ${fechaHora(fechaCompra)}` : null]
  return partes.filter(Boolean).join(' · ') || null
}

export function armarHistorial(t: Tarjeta): ItemHistorial[] {
  const items: ItemHistorial[] = []

  for (const b of t.boletas) {
    const base = {
      clave: `boleta-${b.id}`,
      tipo: 'compra' as const,
      fecha: b.recibida_en,
      detalle: detalleBoleta(b.monto_valido ?? b.monto_total, b.fecha_compra),
    }
    if (b.estado === 'pendiente') {
      items.push({
        ...base,
        titulo: b.comercio ? `Boleta de ${b.comercio}` : 'Boleta enviada',
        nota: 'La estamos revisando. Sus puntos aparecen al aprobarla.',
        etiqueta: { texto: 'En revisión', variante: 'alerta' },
      })
    } else if (b.estado === 'aprobada') {
      items.push({
        ...base,
        titulo: b.comercio ? `Compra en ${b.comercio}` : 'Compra aprobada',
        nota: null,
        etiqueta: { texto: `+${puntos(b.puntos ?? 0)}`, variante: 'exito' },
      })
    } else {
      items.push({
        ...base,
        titulo: b.comercio ? `Boleta de ${b.comercio}` : 'Boleta sin sumar',
        nota: b.motivo,
        etiqueta: { texto: 'No sumó', variante: 'peligro' },
      })
    }
  }

  for (const c of t.canjes) {
    const base = {
      clave: `canje-${c.id}`,
      tipo: 'canje' as const,
      titulo: `Canje en ${c.comercio}`,
      detalle: `${pesos(c.valor_pesos)} de descuento · ${puntos(c.puntos)}`,
    }
    if (c.estado === 'usado') {
      items.push({
        ...base,
        fecha: c.usado_en ?? c.emitido_en,
        nota: c.monto_ticket != null ? `Compra de ${pesos(c.monto_ticket)}.` : null,
        etiqueta: { texto: 'Usado', variante: 'secondary' },
      })
    } else if (c.estado === 'activo') {
      items.push({
        ...base,
        fecha: c.emitido_en,
        nota: `Vale hasta el ${fechaHora(c.vence_en)}.`,
        etiqueta: { texto: 'Activo', variante: 'exito' },
      })
    } else {
      items.push({
        ...base,
        fecha: c.vencido_en ?? c.vence_en,
        nota: 'No se usó a tiempo. Tus puntos volvieron a tu saldo.',
        etiqueta: { texto: 'Venció', variante: 'alerta' },
      })
    }
  }

  for (const m of t.movimientos) {
    if (m.tipo === 'vence') {
      items.push({
        clave: `mov-${m.id}`,
        tipo: 'vencimiento',
        fecha: m.creado_en,
        titulo: `Vencieron ${puntos(m.puntos)}`,
        detalle: null,
        nota: 'Pasó su plazo sin usarse. Siempre se gastan primero los puntos más antiguos.',
        etiqueta: { texto: `-${puntos(m.puntos)}`, variante: 'peligro' },
      })
    } else if (m.tipo === 'ajusta') {
      const positivo = m.puntos >= 0
      items.push({
        clave: `mov-${m.id}`,
        tipo: 'ajuste',
        fecha: m.creado_en,
        titulo: 'Ajuste del equipo',
        detalle: null,
        nota: m.motivo,
        etiqueta: {
          texto: `${positivo ? '+' : '-'}${puntos(Math.abs(m.puntos))}`,
          variante: positivo ? 'exito' : 'peligro',
        },
      })
    }
  }

  return items.sort((a, b) => b.fecha.localeCompare(a.fecha))
}
