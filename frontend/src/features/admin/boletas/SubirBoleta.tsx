import { Cargando } from '@/components/marca/Cargando'
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { VecinoResumen } from '@/lib/api'
import { comprimir, ErrorImagen } from '@/lib/imagen'
import { cn } from '@/lib/utils'
import { mensajeError, useBuscarVecinos, useSubirPorVecino } from '../consultas'

/** Busca al vecino por teléfono o nombre (el texto se espera un momento antes de consultar). */
function BuscarVecino({ elegido, onElegir }: { elegido: VecinoResumen | null; onElegir: (v: VecinoResumen) => void }) {
  const id = useId()
  const [texto, setTexto] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300)
    return () => clearTimeout(t)
  }, [texto])
  const busqueda = useBuscarVecinos(q)

  return (
    <Field>
      <FieldLabel htmlFor={id}>Vecino</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          className="pl-12"
          placeholder="Teléfono o nombre"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
        />
      </div>
      {q && (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto" aria-label="Resultados">
          {busqueda.data?.length === 0 && <li className="px-2 py-3 text-muted-foreground">No encontramos a nadie con eso.</li>}
          {busqueda.data?.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onElegir(v)}
                aria-pressed={elegido?.id === v.id}
                className={cn(
                  'flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border-2 px-4 py-2 text-left transition-colors duration-200',
                  elegido?.id === v.id ? 'border-vecina bg-secondary' : 'border-transparent hover:bg-muted',
                )}
              >
                <span className="font-bold">{v.nombre}</span>
                <span className="text-muted-foreground tabular-nums">{v.telefono}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}

/** El operador sube una boleta que llegó por WhatsApp y la asigna a un vecino. */
export function SubirBoleta() {
  const navigate = useNavigate()
  const subir = useSubirPorVecino()
  const [abierto, setAbierto] = useState(false)
  const [vecino, setVecino] = useState<VecinoResumen | null>(null)
  const [foto, setFoto] = useState<{ blob: Blob; vista: string } | null>(null)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  const [preparando, setPreparando] = useState(false)
  const archivo = useRef<HTMLInputElement>(null)

  const vista = foto?.vista
  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista)
  }, [vista])

  function reiniciar() {
    setVecino(null)
    setFoto(null)
    setErrorFoto(null)
    subir.reset()
  }

  async function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const elegido = e.target.files?.[0]
    e.target.value = ''
    if (!elegido) return
    setErrorFoto(null)
    setPreparando(true)
    try {
      const blob = await comprimir(elegido)
      setFoto({ blob, vista: URL.createObjectURL(blob) })
    } catch (error) {
      setErrorFoto(error instanceof ErrorImagen ? error.message : 'No pudimos preparar la foto.')
    } finally {
      setPreparando(false)
    }
  }

  function enviar() {
    if (!vecino || !foto) return
    subir.mutate(
      { vecinoId: vecino.id, foto: foto.blob },
      {
        onSuccess: (b) => {
          setAbierto(false)
          reiniciar()
          navigate(`/admin/boletas/${b.id}`)
        },
      },
    )
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v)
        if (!v) reiniciar()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">
          Subir boleta de WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir boleta</DialogTitle>
          <DialogDescription>Para las boletas que llegan por WhatsApp. Elige al vecino y la foto.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <BuscarVecino elegido={vecino} onElegir={setVecino} />
          <div className="flex flex-col gap-3">
            <input ref={archivo} type="file" accept="image/*" className="sr-only" onChange={alElegir} tabIndex={-1} />
            {foto ? (
              <img src={foto.vista} alt="Vista previa de la boleta" className="max-h-56 self-start rounded-lg border-2 border-border" />
            ) : null}
            <Button variant="outline" onClick={() => archivo.current?.click()} disabled={preparando}>
              {preparando && <Cargando />}
              {foto ? 'Cambiar foto' : 'Elegir foto'}
            </Button>
            {errorFoto && (
              <Alert variant="destructive">
                <AlertDescription>{errorFoto}</AlertDescription>
              </Alert>
            )}
          </div>
          {subir.isError && (
            <Alert variant="destructive">
              <AlertDescription>{mensajeError(subir.error)}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button onClick={enviar} disabled={!vecino || !foto || subir.isPending}>
            {subir.isPending && <Cargando />}
            {vecino ? `Subir para ${vecino.nombre.split(' ')[0]}` : 'Subir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
