import { Cargando } from '@/components/marca/Cargando'
import { useId, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { CausaSancion, ComercioDetalle, EstadoComercio, TipoSancion, UsuarioDeComercio } from '@/lib/api'
import { dia, fechaHora } from '@/lib/formato'
import {
  mensajeError,
  useComercio,
  useCrearUsuario,
  useEditarComercio,
  useEditarUsuario,
  useSancionar,
  useYo,
} from '../consultas'
import { EstadoLista } from '../partes'
import { EstadoComercioBadge, FormularioComercio, ListaBeneficios } from './partes'

const LARGO_CLAVE = 10 // política de contraseñas del backend

const TIPOS: Record<TipoSancion, string> = {
  advertencia: 'Advertencia escrita',
  suspension: 'Suspensión de beneficios',
  salida: 'Salida de la red',
}

const CAUSAS: Record<CausaSancion, string> = {
  nego_codigo: 'Se negó a respetar un código válido',
  fraude: 'Fraude o abuso (sección 9)',
  otra: 'Otra causa',
}

function Usuario({ u, esAdmin }: { u: UsuarioDeComercio; esAdmin: boolean }) {
  const editar = useEditarUsuario()
  const [clave, setClave] = useState('')
  const [listo, setListo] = useState(false)
  return (
    <li className="flex flex-col gap-3 rounded-lg border-2 border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <strong>{u.nombre}</strong> · {u.email}
        </p>
        <Badge variant={u.activo ? 'exito' : 'secondary'}>{u.activo ? 'Activo' : 'Desactivado'}</Badge>
      </div>
      {esAdmin && (
        <div className="flex flex-wrap items-end gap-2">
          <Field className="max-w-xs">
            <FieldLabel htmlFor={`clave-${u.id}`}>Nueva contraseña</FieldLabel>
            <Input
              id={`clave-${u.id}`}
              type="text"
              autoComplete="off"
              value={clave}
              onChange={(e) => {
                setClave(e.target.value)
                setListo(false)
              }}
            />
          </Field>
          <Button
            variant="secondary"
            disabled={clave.length < LARGO_CLAVE || editar.isPending}
            onClick={() =>
              editar.mutate({ id: u.id, datos: { contrasena: clave } }, { onSuccess: () => (setClave(''), setListo(true)) })
            }
          >
            Cambiar contraseña
          </Button>
          <Button variant="outline" onClick={() => editar.mutate({ id: u.id, datos: { activo: !u.activo } })}>
            {u.activo ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      )}
      {listo && <p className="text-exito-texto">Contraseña cambiada. Sus sesiones abiertas se cerraron.</p>}
      {editar.isError && <p className="text-peligro-texto">{mensajeError(editar.error)}</p>}
    </li>
  )
}

function NuevoUsuario({ comercioId, slug }: { comercioId: number; slug: string }) {
  const id = useId()
  const crear = useCrearUsuario()
  const [datos, setDatos] = useState({ nombre: '', email: `${slug}@`, contrasena: '' })

  function enviar(e: FormEvent) {
    e.preventDefault()
    crear.mutate(
      { ...datos, rol: 'comercio', comercio_id: comercioId },
      { onSuccess: () => setDatos({ nombre: '', email: '', contrasena: '' }) },
    )
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-border p-4">
      <h4 className="font-bold">Nuevo usuario del comercio</h4>
      <FieldGroup className="grid gap-3 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`${id}-nombre`}>Nombre</FieldLabel>
          <Input id={`${id}-nombre`} value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-email`}>Correo</FieldLabel>
          <Input
            id={`${id}-email`}
            type="email"
            value={datos.email}
            onChange={(e) => setDatos({ ...datos, email: e.target.value })}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-clave`}>Contraseña inicial</FieldLabel>
          <Input
            id={`${id}-clave`}
            type="text"
            autoComplete="off"
            value={datos.contrasena}
            onChange={(e) => setDatos({ ...datos, contrasena: e.target.value })}
            required
            minLength={LARGO_CLAVE}
          />
          <FieldDescription>Al menos {LARGO_CLAVE} caracteres. Entrégala en persona.</FieldDescription>
        </Field>
      </FieldGroup>
      {crear.isError && <p className="text-peligro-texto">{mensajeError(crear.error)}</p>}
      <Button type="submit" variant="secondary" className="self-start" disabled={crear.isPending}>
        Crear usuario
      </Button>
    </form>
  )
}

function CambiarEstado({ d }: { d: ComercioDetalle }) {
  const editar = useEditarComercio(d.comercio.id)
  const estado = d.comercio.estado
  const opciones: { a: EstadoComercio; texto: string; variante: 'default' | 'outline' | 'destructive' }[] = [
    { a: 'activo' as const, texto: 'Reactivar', variante: 'default' as const },
    { a: 'suspendido' as const, texto: 'Suspender sin plazo', variante: 'outline' as const },
    { a: 'retirado' as const, texto: 'Retirar de la red', variante: 'destructive' as const },
  ].filter((o) => o.a !== estado)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <Button
            key={o.a}
            variant={o.variante}
            disabled={editar.isPending}
            onClick={() => {
              if (o.a === 'retirado' && !window.confirm('¿Retirar el comercio de la red? Sus códigos emitidos se respetan.')) return
              editar.mutate({ estado: o.a })
            }}
          >
            {o.texto}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Suspendido: sus boletas siguen sumando, pero sus beneficios no se muestran. Para suspender por una sanción,
        regístrala abajo: así queda con fecha, evidencia y plazo.
      </p>
      {editar.isError && <p className="text-peligro-texto">{mensajeError(editar.error)}</p>}
    </div>
  )
}

function Sanciones({ d }: { d: ComercioDetalle }) {
  const id = useId()
  const sancionar = useSancionar(d.comercio.id)
  const [causa, setCausa] = useState<CausaSancion>('nego_codigo')
  const sugerida = d.sugerencias[causa]
  const [tipo, setTipo] = useState<TipoSancion | null>(null)
  const elegido = tipo ?? sugerida?.tipo ?? 'advertencia'
  const [motivo, setMotivo] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const retirado = d.comercio.estado === 'retirado'

  function enviar(e: FormEvent) {
    e.preventDefault()
    sancionar.mutate(
      { tipo: elegido, causa, motivo, evidencia },
      {
        onSuccess: () => {
          setMotivo('')
          setEvidencia('')
          setTipo(null)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sanciones</CardTitle>
        <CardDescription>Las decide el equipo y quedan anotadas con fecha y evidencia (sección 9).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {d.sanciones.length === 0 ? (
          <p className="text-muted-foreground">Sin sanciones.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {d.sanciones.map((s) => (
              <li key={s.id} className="rounded-lg border-2 border-border px-4 py-3">
                <p className="font-bold">
                  {TIPOS[s.tipo]} · {fechaHora(s.decidida_en)}
                  {s.hasta && <span className="font-normal"> · hasta el {dia(s.hasta)}</span>}
                </p>
                <p>
                  {CAUSAS[s.causa]}: {s.motivo}
                </p>
                <p className="text-sm text-muted-foreground">Evidencia: {s.evidencia}</p>
              </li>
            ))}
          </ul>
        )}

        {!retirado && (
          <form onSubmit={enviar} className="flex flex-col gap-4 rounded-lg border-2 border-dashed border-border p-4">
            <h4 className="font-bold">Registrar una sanción</h4>
            <Field>
              <FieldLabel>Causa</FieldLabel>
              <RadioGroup
                value={causa}
                onValueChange={(v) => {
                  setCausa(v as CausaSancion)
                  setTipo(null)
                }}
              >
                {Object.entries(CAUSAS).map(([valor, texto]) => (
                  <label key={valor} className="flex items-center gap-3">
                    <RadioGroupItem value={valor} />
                    {texto}
                  </label>
                ))}
              </RadioGroup>
            </Field>
            {sugerida && (
              <Alert variant="alerta">
                <AlertTitle>Según las reglas: {TIPOS[sugerida.tipo].toLowerCase()}</AlertTitle>
                <AlertDescription>{sugerida.razon}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel>Sanción</FieldLabel>
              <RadioGroup value={elegido} onValueChange={(v) => setTipo(v as TipoSancion)}>
                {Object.entries(TIPOS).map(([valor, texto]) => (
                  <label key={valor} className="flex items-center gap-3">
                    <RadioGroupItem value={valor} />
                    {texto}
                    {valor === 'suspension' && sugerida && (
                      <span className="text-muted-foreground">({sugerida.semanas_suspension} semanas)</span>
                    )}
                  </label>
                ))}
              </RadioGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-motivo`}>Qué pasó</FieldLabel>
              <Textarea id={`${id}-motivo`} value={motivo} onChange={(e) => setMotivo(e.target.value)} required maxLength={1000} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-evidencia`}>Evidencia</FieldLabel>
              <Textarea
                id={`${id}-evidencia`}
                value={evidencia}
                onChange={(e) => setEvidencia(e.target.value)}
                placeholder="Mensajes del vecino, código, fotos, fecha y hora."
                required
                maxLength={2000}
              />
            </Field>
            {sancionar.isError && <p className="text-peligro-texto">{mensajeError(sancionar.error)}</p>}
            <Button
              type="submit"
              variant={elegido === 'advertencia' ? 'default' : 'destructive'}
              className="self-start"
              disabled={sancionar.isPending || !motivo.trim() || !evidencia.trim()}
            >
              {sancionar.isPending && <Cargando />}
              Registrar {TIPOS[elegido].toLowerCase()}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

/** /admin/comercios/:id — datos, usuarios, beneficios, estado y sanciones. */
export function PaginaComercio() {
  const id = Number(useParams().id)
  const yo = useYo()
  const esAdmin = yo.data?.rol === 'admin'
  const detalle = useComercio(id)
  const editar = useEditarComercio(id)

  if (detalle.isPending) return <Skeleton className="h-96" />
  if (detalle.isError) return <EstadoLista texto={detalle.error.message} />
  const d = detalle.data
  const c = d.comercio

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link to="/admin/comercios">
          Comercios
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-extrabold">{c.nombre}</h2>
        <EstadoComercioBadge estado={c.estado} />
        {c.suspendido_hasta && <span className="text-muted-foreground">hasta el {dia(c.suspendido_hasta)}</span>}
      </div>
      <p className="text-muted-foreground">
        {c.rubro} · {c.direccion} · RUT {c.rut} · alta el {dia(c.alta_en)} · QR: /unirme/{c.slug}
      </p>

      {esAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Datos y estado</CardTitle>
            <CardDescription>La dirección del QR no cambia aunque cambie el nombre: el afiche ya está impreso.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <FormularioComercio
              key={`${c.id}-${c.nombre}-${c.rut}`}
              inicial={{ nombre: c.nombre, rubro: c.rubro, rut: c.rut, direccion: c.direccion }}
              textoBoton="Guardar datos"
              pendiente={editar.isPending}
              error={editar.error}
              onGuardar={(datos) => editar.mutate(datos)}
            />
            <CambiarEstado d={d} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Usuarios</CardTitle>
          <CardDescription>Quienes entran al portal del comercio para validar códigos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {d.usuarios.length === 0 ? (
            <p className="text-muted-foreground">Todavía no tiene usuarios.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.usuarios.map((u) => (
                <Usuario key={u.id} u={u} esAdmin={esAdmin} />
              ))}
            </ul>
          )}
          {esAdmin && <NuevoUsuario comercioId={c.id} slug={c.slug} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Beneficios</CardTitle>
          {d.pendientes.length > 0 && (
            <CardDescription>
              Tiene una propuesta pendiente.{' '}
              <Link to="/admin/comercios?vista=beneficios" className="text-vecina underline">
                Revisarla
              </Link>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <section className="flex flex-col gap-2">
            <h4 className="font-bold">Vigentes</h4>
            <ListaBeneficios beneficios={d.vigentes} vacio="Sin beneficios vigentes." />
          </section>
          <section className="flex flex-col gap-2">
            <h4 className="font-bold">{d.pendientes.length > 0 ? 'Pendientes de aprobación' : 'Próximos'}</h4>
            <ListaBeneficios
              beneficios={d.pendientes.length > 0 ? d.pendientes : d.proximos}
              vacio="Ningún cambio en camino."
            />
          </section>
        </CardContent>
      </Card>

      <Sanciones d={d} />

    </div>
  )
}
