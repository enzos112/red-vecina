import { Camera, ImageIcon, LoaderCircle, RotateCcw, Send } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCondiciones } from '@/lib/consultas'
import { pesos } from '@/lib/formato'
import { comprimir, ErrorImagen } from '@/lib/imagen'
import { useSubirBoleta, useToken } from './consultas'
import type { AvisoTarjeta } from './PaginaTarjeta'
import { Encabezado } from './partes'

type Paso =
  | { tipo: 'elegir' }
  | { tipo: 'preparando' }
  | { tipo: 'lista'; foto: Blob; vista: string }
  | { tipo: 'error'; mensaje: string }

function Consejos() {
  const condiciones = useCondiciones()
  const c = condiciones.data
  return (
    <ul className="flex list-disc flex-col gap-1 pl-6 text-lg">
      <li>Que se vean el nombre del local, la fecha, el total y el folio.</li>
      <li>Foto derecha, con buena luz y sin cortar la boleta.</li>
      {c && (
        <li>
          Súbela dentro de {c.plazo_boleta_horas} horas desde la compra. Suman compras desde {pesos(c.compra_minima_sumar)}.
        </li>
      )}
    </ul>
  )
}

/** /t/:token/boleta — cámara o galería, compresión, vista previa y envío. */
export function PaginaBoleta() {
  const token = useToken()
  const navigate = useNavigate()
  const subir = useSubirBoleta(token)
  const [paso, setPaso] = useState<Paso>({ tipo: 'elegir' })
  const camara = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)

  const vista = paso.tipo === 'lista' ? paso.vista : null
  useEffect(() => {
    return () => {
      if (vista) URL.revokeObjectURL(vista)
    }
  }, [vista])

  async function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    evento.target.value = '' // permite volver a elegir la misma foto
    if (!archivo) return
    subir.reset()
    setPaso({ tipo: 'preparando' })
    try {
      const foto = await comprimir(archivo)
      setPaso({ tipo: 'lista', foto, vista: URL.createObjectURL(foto) })
    } catch (error) {
      setPaso({
        tipo: 'error',
        mensaje:
          error instanceof ErrorImagen
            ? 'No pudimos abrir esa foto. Prueba con otra o toma una nueva.'
            : 'Algo falló al preparar la foto. Intenta otra vez.',
      })
    }
  }

  function enviar() {
    if (paso.tipo !== 'lista') return
    subir.mutate(paso.foto, {
      onSuccess: () => {
        const aviso: AvisoTarjeta = { boletaEnviada: true }
        navigate(`/t/${token}`, { state: aviso })
      },
    })
  }

  const elegirOtra = () => {
    subir.reset()
    setPaso({ tipo: 'elegir' })
  }

  return (
    <div className="aparecer">
      <Encabezado token={token} titulo="Sube tu boleta">
        Sumas puntos cuando la aprobamos.
      </Encabezado>

      {/* Dos entradas: una abre la cámara trasera y la otra la galería. */}
      <input ref={camara} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={alElegir} />
      <input ref={galeria} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={alElegir} />

      {(paso.tipo === 'elegir' || paso.tipo === 'error') && (
        <div className="flex flex-col gap-6">
          <Consejos />
          {paso.tipo === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo usar esa foto</AlertTitle>
              <AlertDescription>{paso.mensaje}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={() => camara.current?.click()}>
              <Camera data-icon="inline-start" />
              Tomar foto
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => galeria.current?.click()}>
              <ImageIcon data-icon="inline-start" />
              Elegir de la galería
            </Button>
          </div>
        </div>
      )}

      {paso.tipo === 'preparando' && (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="aspect-3/4 w-full rounded-2xl" />
          <p className="flex items-center gap-2 text-lg" role="status">
            <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Preparando tu foto…
          </p>
        </div>
      )}

      {paso.tipo === 'lista' && (
        <div className="flex flex-col gap-5">
          <figure className="overflow-hidden rounded-2xl border border-border bg-card">
            <img src={paso.vista} alt="Vista previa de tu boleta" className="max-h-[60svh] w-full object-contain" />
            <figcaption className="p-4 text-base text-muted-foreground">
              Revisa que se lean el local, la fecha, el total y el folio.
            </figcaption>
          </figure>

          {subir.isError && (
            <Alert variant="destructive">
              <AlertTitle>No pudimos enviar tu boleta</AlertTitle>
              <AlertDescription>{subir.error.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={enviar} disabled={subir.isPending}>
              {subir.isPending ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Send data-icon="inline-start" />
              )}
              {subir.isPending ? 'Enviando…' : 'Enviar boleta'}
            </Button>
            <Button variant="secondary" className="w-full" onClick={elegirOtra} disabled={subir.isPending}>
              <RotateCcw data-icon="inline-start" />
              Elegir otra foto
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
