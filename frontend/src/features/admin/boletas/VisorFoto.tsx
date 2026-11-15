import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const ZOOM_MIN = 1
const ZOOM_MAX = 5
const PASO = 0.5

/**
 * Foto de la boleta con zoom y giro a la izquierda. El contenedor tiene scroll, así que con
 * zoom se recorre la boleta arrastrando la barra o con la rueda del mouse.
 */
export function VisorFoto({ src, alt }: { src: string; alt: string }) {
  const marco = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(0)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [giro, setGiro] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    const el = marco.current
    if (!el) return
    const observador = new ResizeObserver(([e]) => setAncho(e.contentRect.width))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  const acostada = giro % 180 !== 0
  // La caja girada ocupa el ancho del marco multiplicado por el zoom.
  const cajaAncho = ancho * zoom
  let img = { w: 0, h: 0 }
  let caja = { w: 0, h: 0 }
  if (natural && ancho) {
    if (acostada) {
      img = { w: (cajaAncho * natural.w) / natural.h, h: cajaAncho }
      caja = { w: img.h, h: img.w }
    } else {
      img = { w: cajaAncho, h: (cajaAncho * natural.h) / natural.w }
      caja = img
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Controles de la foto">
        <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - PASO))} disabled={zoom <= ZOOM_MIN} aria-label="Alejar">
          <span aria-hidden="true" className="text-2xl leading-none font-bold">−</span>
        </Button>
        <span className="w-14 text-center font-bold tabular-nums">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + PASO))} disabled={zoom >= ZOOM_MAX} aria-label="Acercar">
          <span aria-hidden="true" className="text-2xl leading-none font-bold">+</span>
        </Button>
        <Button variant="outline" onClick={() => setZoom(1)}>
          Ajustar
        </Button>
        <Button variant="outline" onClick={() => setGiro((g) => (g + 270) % 360)}>
          Girar
        </Button>
      </div>
      <div ref={marco} className="min-h-80 flex-1 overflow-auto rounded-lg border-2 border-border bg-muted">
        {error ? (
          <p className="p-6 text-lg text-muted-foreground">No pudimos cargar la foto.</p>
        ) : (
          <div className="relative mx-auto" style={{ width: caja.w || '100%', height: caja.h || 320 }}>
            <img
              src={src}
              alt={alt}
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={() => setError(true)}
              className="absolute top-1/2 left-1/2 max-w-none"
              style={{
                width: img.w || undefined,
                height: img.h || undefined,
                transform: `translate(-50%, -50%) rotate(${giro}deg)`,
                visibility: natural ? 'visible' : 'hidden',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
