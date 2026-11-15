import { Skeleton } from '@/components/ui/skeleton'
import { useComerciosRed, useCondiciones } from '@/lib/consultas'
import { numero, pesos, puntos as textoPuntos } from '@/lib/formato'
import { cn } from '@/lib/utils'

/** Fracción ilustrativa del camino hacia el beneficio en la tarjeta de muestra. */
const AVANCE_EJEMPLO = 0.82

type Meta = { puntos: number; valor: number; donde: string }

/** El beneficio destacado de la red (o, si aún no hay comercios, el nivel del medio). */
function useMeta(): Meta | null | undefined {
  const comercios = useComerciosRed()
  const condiciones = useCondiciones()
  const conBeneficio = comercios.data?.find((c) => c.destacado)
  if (conBeneficio?.destacado) {
    return {
      puntos: conBeneficio.destacado.puntos,
      valor: conBeneficio.destacado.valor_pesos,
      donde: conBeneficio.nombre,
    }
  }
  if (comercios.isPending || condiciones.isPending) return undefined
  const niveles = condiciones.data?.niveles ?? []
  const nivel = niveles[Math.floor(niveles.length / 2)]
  return nivel ? { puntos: nivel.puntos, valor: nivel.valor_pesos, donde: 'la red' } : null
}

/**
 * Ilustración del hero: cómo se ve la tarjeta de un vecino. Es un dibujo, no un control:
 * no tiene botones. Los montos salen del beneficio destacado de la API; el saldo es ilustrativo.
 */
export function TarjetaEjemplo({ className }: { className?: string }) {
  const meta = useMeta()
  const saldo = meta ? Math.round((meta.puntos * AVANCE_EJEMPLO) / 10) * 10 : 0
  const faltan = meta ? meta.puntos - saldo : 0
  const avance = meta ? (saldo / meta.puntos) * 100 : 0

  return (
    <figure aria-label="Ilustración: así se ve tu tarjeta" className={cn('w-full max-w-sm', className)}>
      <div className="rotate-[-2deg] rounded-2xl bg-card text-tinta">
        <div className="flex items-center justify-between rounded-t-2xl bg-mango px-6 py-3 sm:px-7">
          <span className="font-extrabold tracking-tight text-barrio">Red Vecina.</span>
          <span className="text-sm font-bold tracking-wide text-barrio uppercase">Tu tarjeta</span>
        </div>

        <div className="px-6 pt-6 pb-7 sm:px-7">
          <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Saldo</p>
          {meta === undefined ? (
            <Skeleton className="mt-2 h-16 w-48" />
          ) : (
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-6xl leading-none font-extrabold tracking-tighter tabular-nums">
                {numero(saldo)}
              </span>
              <span className="text-xl font-bold text-muted-foreground">puntos</span>
            </p>
          )}

          <div className="mt-7" role="img" aria-label={meta ? `Llevas ${saldo} de ${meta.puntos} puntos` : 'Avance'}>
            <div className="relative h-2 rounded-full bg-secondary">
              <div className="h-full rounded-full bg-vecina" style={{ width: `${avance}%` }} />
              <span
                aria-hidden="true"
                className="absolute top-1/2 right-0 size-5 translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card bg-mango"
              />
            </div>
            {meta && (
              <div className="mt-2 flex justify-between text-sm font-semibold text-muted-foreground tabular-nums">
                <span>0</span>
                <span>{numero(meta.puntos)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Talón con perforación: el beneficio que viene. */}
        <div className="relative border-t-2 border-dashed border-border px-6 py-5 sm:px-7">
          <span aria-hidden="true" className="absolute -top-3 -left-3 size-6 rounded-full bg-barrio" />
          <span aria-hidden="true" className="absolute -top-3 -right-3 size-6 rounded-full bg-barrio" />
          {meta === undefined ? (
            <Skeleton className="h-12 w-full" />
          ) : meta ? (
            <>
              <p className="text-sm font-bold tracking-wide text-mango-texto uppercase">
                A {textoPuntos(faltan)} de tu beneficio
              </p>
              <p className="mt-1 text-lg leading-snug font-extrabold">
                {pesos(meta.valor)} de descuento en {meta.donde}
              </p>
            </>
          ) : (
            <p className="text-lg leading-snug font-extrabold">
              Junta en un local y canjea en otro.
            </p>
          )}
        </div>
      </div>
      <figcaption className="mt-5 text-center text-sm text-crema/80">
        Así se ve tu tarjeta en el celular.
      </figcaption>
    </figure>
  )
}
