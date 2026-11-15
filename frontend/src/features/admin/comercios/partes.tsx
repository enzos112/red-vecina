import { Cargando } from '@/components/marca/Cargando'
/** Piezas compartidas de /admin/comercios. */
import { useId, useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { BeneficioSalida, ComercioNuevo, EstadoComercio } from '@/lib/api'
import { dia, lista, pesos } from '@/lib/formato'
import { mensajeError } from '../consultas'

const ESTADO: Record<EstadoComercio, { texto: string; variante: 'exito' | 'alerta' | 'secondary' }> = {
  activo: { texto: 'Activo', variante: 'exito' },
  suspendido: { texto: 'Suspendido', variante: 'alerta' },
  retirado: { texto: 'Retirado', variante: 'secondary' },
}

export function EstadoComercioBadge({ estado }: { estado: EstadoComercio }) {
  const e = ESTADO[estado]
  return <Badge variant={e.variante}>{e.texto}</Badge>
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

/** Los beneficios de un conjunto, uno por nivel. */
export function ListaBeneficios({ beneficios, vacio }: { beneficios: BeneficioSalida[]; vacio: string }) {
  if (beneficios.length === 0) return <p className="text-muted-foreground">{vacio}</p>
  return (
    <ul className="flex flex-col gap-2">
      {beneficios.map((b) => (
        <li key={b.id} className="rounded-lg border-2 border-border bg-card px-4 py-3">
          <p className="font-bold">
            {b.nombre_nivel} · {pesos(b.valor_pesos)} ({b.puntos} pts)
          </p>
          <p>{b.texto}</p>
          <p className="text-sm text-muted-foreground">
            Compra mínima {pesos(b.compra_minima)}
            {b.dias_permitidos && ` · solo ${lista(b.dias_permitidos.map((d) => DIAS[d]))}`}
            {b.restriccion && ` · ${b.restriccion}`}
            {b.vigente_desde && ` · rige desde el ${dia(b.vigente_desde)}`}
          </p>
          {b.comentario_revision && <p className="text-sm">Comentario del equipo: {b.comentario_revision}</p>}
        </li>
      ))}
    </ul>
  )
}

export type DatosComercio = ComercioNuevo

/** Nombre, rubro, RUT y dirección. Sirve para el alta y para corregir datos. */
export function FormularioComercio({
  inicial,
  textoBoton,
  pendiente,
  error,
  onGuardar,
}: {
  inicial: DatosComercio
  textoBoton: string
  pendiente: boolean
  error: unknown
  onGuardar: (datos: DatosComercio) => void
}) {
  const id = useId()
  const [datos, setDatos] = useState(inicial)
  const campo = (clave: keyof DatosComercio) => ({
    id: `${id}-${clave}`,
    value: datos[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDatos({ ...datos, [clave]: e.target.value }),
  })

  function enviar(e: FormEvent) {
    e.preventDefault()
    onGuardar(datos)
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-nombre`}>Nombre</FieldLabel>
          <Input {...campo('nombre')} required maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-rubro`}>Rubro</FieldLabel>
          <Input {...campo('rubro')} required maxLength={60} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-rut`}>RUT</FieldLabel>
          <Input {...campo('rut')} required placeholder="76543210-3" maxLength={12} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-direccion`}>Dirección</FieldLabel>
          <Input {...campo('direccion')} required maxLength={200} />
        </Field>
      </FieldGroup>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{mensajeError(error)}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="self-start" disabled={pendiente}>
        {pendiente && <Cargando />}
        {textoBoton}
      </Button>
    </form>
  )
}
