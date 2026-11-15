import type { CSSProperties } from 'react'
import type { CondicionesRed } from '@/lib/api'
import { numero, pesos } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { Circulo } from '@/components/marca/libreta'
import { turno } from '@/lib/libreta'

/**
 * Datos de la ilustración. Son de ejemplo (Rosa no existe) y van rotulados como tales; los
 * puntos de cada fila salen de los parámetros vigentes: el canje usa el primer nivel y las
 * boletas se convierten con el valor del punto.
 */
const SALDO_ANTERIOR = 450
const BOLETA_APROBADA = 5240
export const BOLETA_PENDIENTE = 7850

type Fila = {
  fecha: string
  texto: string
  cifra: string
  estado: 'tinta' | 'tachado' | 'lapiz'
  nota?: string
}

/** Cuánto tarda en anotarse cada parte de la cuenta (ms desde que se ve). */
const PASO = 520

/**
 * La cuenta de una vecina de ejemplo, que se escribe sola: cada fila entra un renglón, el canje
 * se tacha, el total se encierra en un círculo y al final llega una boleta nueva a lápiz.
 */
export function CuentaEjemplo({ c, className }: { c?: CondicionesRed; className?: string }) {
  if (!c) {
    return (
      <div
        aria-busy="true"
        aria-label="Cargando la cuenta de ejemplo"
        className={cn('border-2 border-tapa bg-papel', className)}
      >
        <div className="h-16 bg-tapa" />
        <div className="renglones h-[22rem]" />
      </div>
    )
  }

  const porPunto = c.pesos_por_punto
  const canje = c.niveles[0]?.puntos ?? 0
  const suma = Math.floor(BOLETA_APROBADA / porPunto)
  const pendiente = Math.floor(BOLETA_PENDIENTE / porPunto)
  const total = SALDO_ANTERIOR - canje + suma

  const filas: Fila[] = [
    { fecha: 'lun 10', texto: 'Saldo anterior', cifra: numero(SALDO_ANTERIOR), estado: 'tinta' },
    {
      fecha: 'mié 12',
      texto: 'Canje en Panadería La Espiga',
      cifra: `−${numero(canje)}`,
      estado: 'tachado',
      nota: `${pesos(c.niveles[0]?.valor_pesos ?? 0)} menos en su compra`,
    },
    {
      fecha: 'vie 14',
      texto: 'Boleta de Verdulería Doña Ana',
      cifra: `+${numero(suma)}`,
      estado: 'tinta',
      nota: `Compra de ${pesos(BOLETA_APROBADA)}`,
    },
  ]

  const tTotal = PASO * (filas.length + 1)
  const tPendiente = tTotal + 900

  return (
    <figure className={cn('border-2 border-tapa bg-papel', className)}>
      <figcaption className="flex h-16 items-center justify-between gap-3 bg-tapa px-4 text-papel">
        <span className="rotulo text-2xl">Cuenta de Rosa</span>
        <span className="text-[0.9375rem] font-semibold text-tapa-texto">Ejemplo</span>
      </figcaption>

      <ol>
        {filas.map((f, i) => (
          <li
            key={f.texto}
            style={turno(true, PASO * (i + 1)) as CSSProperties}
            className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-cuadricula px-4 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
          >
            <span className="col-span-2 text-[0.9375rem] font-semibold text-tapa sm:col-span-1">{f.fecha}</span>
            <span className="min-w-0">
              <span
                className={cn('font-semibold', f.estado === 'tachado' && 'tachado')}
                style={
                  f.estado === 'tachado'
                    ? { animation: `tachar-texto 420ms ease-out ${PASO * (i + 1) + 600}ms both` }
                    : undefined
                }
              >
                {f.texto}
              </span>
              {f.nota && <span className="block text-[0.9375rem] text-lapiz">{f.nota}</span>}
              {f.estado === 'tachado' && <span className="sr-only">(canje usado)</span>}
            </span>
            <span className="text-right text-2xl font-extrabold text-tinta-azul tabular-nums">{f.cifra}</span>
          </li>
        ))}

        <li
          style={turno(true, tTotal) as CSSProperties}
          className="flex min-h-28 items-center justify-between gap-3 border-b border-cuadricula px-4"
        >
          <span className="text-lg font-bold">Disponible</span>
          <span className="rotulo text-6xl text-tapa">
            <Circulo retraso={tTotal + 250} className="mr-3">{numero(total)}</Circulo>
          </span>
        </li>

        <li
          style={turno(true, tPendiente) as CSSProperties}
          className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 text-lapiz sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
        >
          <span className="col-span-2 text-[0.9375rem] font-semibold sm:col-span-1">sáb 15</span>
          <span className="min-w-0">
            <span className="block font-semibold">Boleta de Minimarket Don Luis</span>
            <span className="block text-[0.9375rem]">A lápiz: la estamos revisando</span>
          </span>
          <span className="text-right text-2xl font-medium tabular-nums underline decoration-dashed decoration-2 underline-offset-[6px]">
            +{numero(pendiente)}
          </span>
        </li>
      </ol>
    </figure>
  )
}
