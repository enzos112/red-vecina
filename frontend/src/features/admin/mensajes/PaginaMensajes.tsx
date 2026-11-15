import { LoaderCircle, RotateCcw } from 'lucide-react'
import { useDeferredValue, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { PlantillaSalida } from '@/lib/api'
import { fechaHora } from '@/lib/formato'
import { mensajeError, useEditarPlantilla, usePlantillas, useVistaPrevia } from '../consultas'
import { EstadoLista } from '../partes'

function Plantilla({ t }: { t: PlantillaSalida }) {
  const editar = useEditarPlantilla()
  const [texto, setTexto] = useState(t.texto)
  const diferido = useDeferredValue(texto)
  const cambiado = texto !== t.texto
  const previa = useVistaPrevia(t.clave, diferido, diferido !== t.texto)
  const area = useRef<HTMLTextAreaElement>(null)
  const id = `plantilla-${t.clave}`

  function insertar(variable: string) {
    const el = area.current
    const marca = `{${variable}}`
    if (!el) return setTexto(texto + marca)
    const inicio = el.selectionStart ?? texto.length
    const fin = el.selectionEnd ?? texto.length
    setTexto(texto.slice(0, inicio) + marca + texto.slice(fin))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(inicio + marca.length, inicio + marca.length)
    })
  }

  const vista = cambiado ? previa.data : { texto: t.vista_previa, error: null }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
          {t.momento}
          {t.editada && <Badge variant="secondary">Editada</Badge>}
        </CardTitle>
        {t.actualizado_por && (
          <CardDescription>
            Último cambio: {t.actualizado_por}, {t.actualizado_en && fechaHora(t.actualizado_en)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor={id}>Texto</FieldLabel>
            <Textarea ref={area} id={id} value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-32" maxLength={1000} />
            <FieldDescription>Toca una variable para insertarla donde está el cursor.</FieldDescription>
          </Field>
          <div className="flex flex-wrap gap-2">
            {t.variables.map((v) => (
              <Button key={v} type="button" variant="outline" size="xs" onClick={() => insertar(v)}>
                {`{${v}}`}
              </Button>
            ))}
          </div>
          {editar.isError && <p className="text-peligro-texto">{mensajeError(editar.error)}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!cambiado || !!vista?.error || editar.isPending}
              onClick={() => editar.mutate({ clave: t.clave, texto })}
            >
              {editar.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Guardar
            </Button>
            {cambiado && (
              <Button variant="ghost" onClick={() => setTexto(t.texto)}>
                Descartar cambios
              </Button>
            )}
            {texto !== t.texto_base && (
              <Button variant="ghost" onClick={() => setTexto(t.texto_base)}>
                <RotateCcw aria-hidden="true" />
                Volver al texto original
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-bold">Vista previa con datos de ejemplo</p>
          {vista?.error ? (
            <p className="rounded-lg border-2 border-peligro bg-peligro-fondo px-4 py-3">{vista.error}</p>
          ) : (
            <p className="rounded-2xl rounded-tl-sm bg-vecina-claro/15 px-4 py-3 text-lg whitespace-pre-wrap">
              {vista?.texto ?? '…'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** /admin/mensajes — plantillas de los mensajes al vecino, con vista previa. */
export function PaginaMensajes() {
  const plantillas = usePlantillas()
  if (plantillas.isPending) return <Skeleton className="h-96" />
  if (plantillas.isError) return <EstadoLista texto={plantillas.error.message} />
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-muted-foreground">
        Estos textos se copian al WhatsApp del vecino. Los plazos y montos van como variables: salen de los parámetros
        y de cada caso, nunca escritos a mano.
      </p>
      {plantillas.data.map((t) => (
        <Plantilla key={`${t.clave}-${t.actualizado_en ?? ''}`} t={t} />
      ))}
    </div>
  )
}
