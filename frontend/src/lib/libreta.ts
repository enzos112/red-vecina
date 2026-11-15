/** Movimiento de la libreta: cuándo entra un bloque y cómo se anota cada fila en su turno. */
import { useEffect, useRef, useState } from 'react'

/** true cuando el elemento entra en pantalla (una sola vez). Sin soporte, true de inmediato. */
export function useEnVista<T extends Element>(margen = '0px 0px -15% 0px') {
  const ref = useRef<T>(null)
  const [visto, setVisto] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisto(true)
          obs.disconnect()
        }
      },
      { rootMargin: margen },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [margen])
  return { ref, visto }
}

/** Estilo de una fila que se anota en su turno; antes de su turno no se ve. */
export function turno(activo: boolean, retraso: number) {
  return activo
    ? { animation: `anotar 520ms cubic-bezier(0.2, 0.9, 0.25, 1.15) ${retraso}ms backwards` }
    : { clipPath: 'inset(0 100% 0 0)' }
}
