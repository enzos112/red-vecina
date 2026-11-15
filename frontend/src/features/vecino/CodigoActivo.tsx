import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { CodigoSalida } from '@/lib/api'
import { codigo as formatoCodigo, cuentaRegresiva, fechaHora, pesos, puntos } from '@/lib/formato'
import { claves } from './consultas'

const SEGUNDO = 1000

/** Hora actual que se actualiza cada segundo. */
function useAhora(): number {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), SEGUNDO)
    return () => window.clearInterval(id)
  }, [])
  return ahora
}

/**
 * El código activo ocupa el lugar principal de la tarjeta: los 6 dígitos en grande para
 * mostrarlos en la caja, el comercio, la compra mínima y la cuenta regresiva.
 */
export function CodigoActivo({ codigo, token }: { codigo: CodigoSalida; token: string }) {
  const cliente = useQueryClient()
  const ahora = useAhora()
  const restante = new Date(codigo.vence_en).getTime() - ahora
  const vencido = restante <= 0

  useEffect(() => {
    // Al vencer, la API devuelve los puntos: se vuelve a pedir la tarjeta.
    if (vencido) void cliente.invalidateQueries({ queryKey: claves.todo(token) })
  }, [vencido, cliente, token])

  return (
    <section aria-labelledby="titulo-codigo" className="sobre-oscuro aparecer rounded-3xl bg-barrio p-6 text-crema">
      <h2 id="titulo-codigo" className="text-lg font-bold">
        Tu código de canje
      </h2>
      <p
        className="mt-2 text-6xl font-extrabold tracking-wider text-mango tabular-nums sm:text-7xl"
        aria-label={`Código ${codigo.codigo.split('').join(' ')}`}
      >
        {formatoCodigo(codigo.codigo)}
      </p>
      <p className="mt-3 text-lg">
        Muéstralo en la caja <strong>antes de pagar</strong>.
      </p>

      <dl className="mt-6 grid gap-5 rounded-2xl bg-barrio-claro p-4">
        <div className="flex gap-3">
          <div>
            <dt className="sr-only">Comercio y beneficio</dt>
            <dd className="text-xl font-extrabold">{codigo.comercio}</dd>
            {codigo.texto && <dd className="text-crema/90">{codigo.texto}</dd>}
            <dd className="mt-1">
              Descuento: <strong>{pesos(codigo.valor_pesos)}</strong> · Compra mínima: <strong>{pesos(codigo.compra_minima)}</strong>
            </dd>
          </div>
        </div>
        <div className="flex gap-3">
          <div>
            <dt className="sr-only">Tiempo restante</dt>
            <dd className="text-xl font-extrabold tabular-nums">
              {vencido ? 'Venció' : `Vence en ${cuentaRegresiva(restante)}`}
            </dd>
            <dd className="text-crema/90">Vale hasta el {fechaHora(codigo.vence_en)}</dd>
          </div>
        </div>
      </dl>
      <p className="mt-4 text-base text-crema/90">
        Reservamos {puntos(codigo.puntos)} de tu saldo. Si no lo usas a tiempo, vuelven solos.
      </p>
    </section>
  )
}
