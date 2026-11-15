import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { CodigoSalida } from '@/lib/api'
import { cuentaRegresiva, fechaHora, pesos, puntos } from '@/lib/formato'
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
 * El código activo ocupa el lugar principal de la tarjeta: los 6 dígitos en grande, cada uno en
 * su cuadro, para dictarlos o mostrarlos en la caja; el comercio, la compra mínima y la cuenta
 * regresiva.
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
    <section aria-labelledby="titulo-codigo" className="sobre-tapa border-2 border-tapa bg-tapa text-papel">
      <h2 id="titulo-codigo" className="px-5 pt-5 text-lg font-bold">
        Tu código de canje
      </h2>
      <p
        className="flex gap-1.5 px-5 pt-3"
        aria-label={`Código ${codigo.codigo.split('').join(' ')}`}
      >
        {codigo.codigo.split('').map((d, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="rotulo grid aspect-[4/5] flex-1 place-items-center border-2 border-tapa-texto/60 text-[2.75rem] leading-none tabular-nums"
          >
            {d}
          </span>
        ))}
      </p>
      <p className="px-5 pt-3 text-lg">
        Muéstralo en la caja <strong>antes de pagar</strong>.
      </p>

      <dl className="mt-5 border-t-2 border-tapa-texto/40">
        <div className="border-b border-tapa-texto/30 px-5 py-4">
          <dt className="sr-only">Comercio y beneficio</dt>
          <dd className="rotulo text-2xl">{codigo.comercio}</dd>
          {codigo.texto && <dd className="text-tapa-texto">{codigo.texto}</dd>}
          <dd className="mt-1">
            Descuento: <strong>{pesos(codigo.valor_pesos)}</strong> · Compra mínima:{' '}
            <strong>{pesos(codigo.compra_minima)}</strong>
          </dd>
        </div>
        <div className="px-5 py-4">
          <dt className="sr-only">Tiempo restante</dt>
          <dd className="text-xl font-extrabold tabular-nums">
            {vencido ? 'Venció' : `Vence en ${cuentaRegresiva(restante)}`}
          </dd>
          <dd className="text-tapa-texto">Vale hasta el {fechaHora(codigo.vence_en)}</dd>
        </div>
      </dl>
      <p className="border-t border-tapa-texto/30 px-5 py-4 text-base text-tapa-texto">
        Reservamos {puntos(codigo.puntos)} de tu saldo. Si no lo usas a tiempo, vuelven solos.
      </p>
    </section>
  )
}
