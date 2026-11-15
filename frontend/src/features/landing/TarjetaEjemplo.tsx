import { Upload } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
 * Tarjeta de vecino de muestra para el hero. Los montos salen del beneficio destacado de la
 * API; el saldo es ilustrativo.
 */
export function TarjetaEjemplo({ className }: { className?: string }) {
  const meta = useMeta()
  const saldo = meta ? Math.round((meta.puntos * AVANCE_EJEMPLO) / 10) * 10 : 0
  const faltan = meta ? meta.puntos - saldo : 0

  return (
    <figure
      aria-label="Ejemplo de tarjeta de vecino"
      className={cn(
        'w-full max-w-sm rounded-2xl bg-card p-6 text-tinta sm:p-7',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold">Hola, Rosa</p>
        <Badge variant="mango">Ejemplo</Badge>
      </div>

      <p className="mt-6 text-sm font-semibold text-muted-foreground">Tu saldo</p>
      {meta === undefined ? (
        <Skeleton className="mt-2 h-14 w-48" />
      ) : (
        <p className="mt-1 text-5xl font-extrabold tracking-tight">
          {numero(saldo)} <span className="text-2xl font-bold text-muted-foreground">puntos</span>
        </p>
      )}

      <div
        className="mt-6 h-3 overflow-hidden rounded-full bg-secondary"
        role="img"
        aria-label={meta ? `Llevas ${saldo} de ${meta.puntos} puntos` : 'Avance hacia tu beneficio'}
      >
        <div
          className="h-full rounded-full bg-vecina"
          style={{ width: `${meta ? (saldo / meta.puntos) * 100 : 0}%` }}
        />
      </div>

      {meta === undefined ? (
        <Skeleton className="mt-4 h-12 w-full" />
      ) : meta ? (
        <p className="mt-4 text-base">
          Te faltan <strong>{textoPuntos(faltan)}</strong> para tu descuento de{' '}
          <strong>{pesos(meta.valor)}</strong> en {meta.donde}.
        </p>
      ) : (
        <p className="mt-4 text-base">Junta puntos y canjéalos en cualquier local de la red.</p>
      )}

      <span aria-hidden="true" className={cn(buttonVariants(), 'pointer-events-none mt-6 w-full')}>
        <Upload />
        Subir boleta
      </span>
    </figure>
  )
}
