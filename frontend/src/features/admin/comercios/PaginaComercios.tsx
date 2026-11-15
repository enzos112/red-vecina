import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { EstadoSolicitud, PropuestaPendiente, SolicitudSalida } from '@/lib/api'
import { dia, fechaHora } from '@/lib/formato'
import {
  mensajeError,
  useAprobarBeneficios,
  useAtenderSolicitud,
  useComercios,
  useCrearComercio,
  usePorAprobar,
  useRechazarBeneficios,
  useSolicitudes,
  useYo,
} from '../consultas'
import { EstadoLista } from '../partes'
import { EstadoComercioBadge, FormularioComercio, ListaBeneficios, type DatosComercio } from './partes'

const VACIO: DatosComercio = { nombre: '', rubro: '', rut: '', direccion: '' }

/** Alta de un comercio. Si viene de una solicitud, la marca como incorporada. */
function NuevoComercio({
  abierto,
  onCerrar,
  inicial,
  solicitudId,
}: {
  abierto: boolean
  onCerrar: () => void
  inicial: DatosComercio
  solicitudId: number | null
}) {
  const crear = useCrearComercio()
  const atender = useAtenderSolicitud()
  const navigate = useNavigate()
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo comercio</DialogTitle>
          <DialogDescription>
            Parte con el piso de cupo. Después agrégale un usuario y espera su propuesta de beneficios.
          </DialogDescription>
        </DialogHeader>
        <FormularioComercio
          key={solicitudId ?? 'nuevo'}
          inicial={inicial}
          textoBoton="Dar de alta"
          pendiente={crear.isPending}
          error={crear.error}
          onGuardar={(datos) =>
            crear.mutate(datos, {
              onSuccess: async (c) => {
                if (solicitudId !== null) {
                  await atender.mutateAsync({ id: solicitudId, datos: { estado: 'incorporada', comercio_id: c.id } })
                }
                navigate(`/admin/comercios/${c.id}`)
              },
            })
          }
        />
      </DialogContent>
    </Dialog>
  )
}

function Lista({ esAdmin, onNuevo }: { esAdmin: boolean; onNuevo: () => void }) {
  const comercios = useComercios()
  if (comercios.isPending) return <Skeleton className="h-40" />
  if (comercios.isError) return <EstadoLista texto={comercios.error.message} />
  return (
    <div className="flex flex-col gap-4">
      {esAdmin && (
        <Button className="self-start" onClick={onNuevo}>
          Nuevo comercio
        </Button>
      )}
      {comercios.data.length === 0 ? (
        <EstadoLista texto="Todavía no hay comercios en la red." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comercio</TableHead>
              <TableHead>Rubro</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Alta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comercios.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link to={`/admin/comercios/${c.id}`} className="font-bold hover:underline">
                    {c.nombre}
                  </Link>
                  {c.es_demo && <span className="ml-2 text-sm text-muted-foreground">(demo)</span>}
                </TableCell>
                <TableCell>{c.rubro}</TableCell>
                <TableCell className="tabular-nums">{c.rut}</TableCell>
                <TableCell>
                  <EstadoComercioBadge estado={c.estado} />
                  {c.suspendido_hasta && (
                    <span className="block text-sm text-muted-foreground">hasta el {dia(c.suspendido_hasta)}</span>
                  )}
                </TableCell>
                <TableCell>{dia(c.alta_en)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function Propuesta({ prop }: { prop: PropuestaPendiente }) {
  const aprobar = useAprobarBeneficios()
  const rechazar = useRechazarBeneficios()
  const [comentario, setComentario] = useState('')
  const error = aprobar.error ?? rechazar.error
  return (
    <li className="flex flex-col gap-4 rounded-lg border-2 border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-extrabold">
          <Link to={`/admin/comercios/${prop.comercio_id}`} className="hover:underline">
            {prop.comercio}
          </Link>
        </h3>
        <p className="text-muted-foreground">Enviada {fechaHora(prop.solicitado_en)}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h4 className="font-bold">Propuesta</h4>
          <ListaBeneficios beneficios={prop.beneficios} vacio="Sin beneficios." />
        </section>
        <section className="flex flex-col gap-2">
          <h4 className="font-bold">Vigentes hoy</h4>
          <ListaBeneficios beneficios={prop.vigentes} vacio="Ninguno: serían sus primeros beneficios y rigen al aprobarlos." />
        </section>
      </div>
      <Field>
        <FieldLabel htmlFor={`comentario-${prop.comercio_id}`}>Comentario para el comercio</FieldLabel>
        <Textarea
          id={`comentario-${prop.comercio_id}`}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Obligatorio si rechazas. Opcional si apruebas."
          maxLength={1000}
        />
      </Field>
      {error && <p className="text-peligro-texto">{mensajeError(error)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => aprobar.mutate({ id: prop.comercio_id, comentario })} disabled={aprobar.isPending}>
          Aprobar
        </Button>
        <Button
          variant="outline"
          onClick={() => rechazar.mutate({ id: prop.comercio_id, comentario })}
          disabled={rechazar.isPending || !comentario.trim()}
        >
          Rechazar
        </Button>
      </div>
    </li>
  )
}

function Propuestas() {
  const props = usePorAprobar()
  if (props.isPending) return <Skeleton className="h-40" />
  if (props.isError) return <EstadoLista texto={props.error.message} />
  if (props.data.length === 0) return <EstadoLista texto="No hay beneficios esperando aprobación." />
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        Un cambio aprobado rige desde el primer lunes con el aviso mínimo. Los códigos ya emitidos se respetan.
      </p>
      <ul className="flex flex-col gap-4">
        {props.data.map((p) => (
          <Propuesta key={p.comercio_id} prop={p} />
        ))}
      </ul>
    </div>
  )
}

const ESTADOS_SOLICITUD: Record<EstadoSolicitud, string> = {
  nueva: 'Nueva',
  contactada: 'Contactada',
  incorporada: 'Incorporada',
  descartada: 'Descartada',
}

function Solicitud({ s, esAdmin, onCrear }: { s: SolicitudSalida; esAdmin: boolean; onCrear: (s: SolicitudSalida) => void }) {
  const atender = useAtenderSolicitud()
  const [nota, setNota] = useState(s.nota ?? '')
  return (
    <li className="flex flex-col gap-3 rounded-lg border-2 border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-extrabold">
          {s.comercio} <span className="font-normal text-muted-foreground">· {s.rubro}</span>
        </h3>
        <Badge variant={s.estado === 'nueva' ? 'alerta' : 'secondary'}>{ESTADOS_SOLICITUD[s.estado]}</Badge>
      </div>
      <p>
        {s.contacto} · {s.telefono}
        {s.email && ` · ${s.email}`}
        {s.direccion && ` · ${s.direccion}`}
      </p>
      {s.mensaje && <p className="rounded-md bg-muted px-3 py-2 whitespace-pre-wrap">{s.mensaje}</p>}
      <p className="text-sm text-muted-foreground">
        Llegó {fechaHora(s.creado_en)}
        {s.atendida_en && ` · atendida ${fechaHora(s.atendida_en)}`}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Field className="min-w-60 flex-1">
          <FieldLabel htmlFor={`nota-${s.id}`}>Nota</FieldLabel>
          <Textarea id={`nota-${s.id}`} value={nota} onChange={(e) => setNota(e.target.value)} className="min-h-12" maxLength={2000} />
        </Field>
        <Select
          value={s.estado}
          onValueChange={(estado) => atender.mutate({ id: s.id, datos: { estado: estado as EstadoSolicitud, nota } })}
        >
          <SelectTrigger className="w-44" aria-label="Estado de la solicitud">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ESTADOS_SOLICITUD).map(([valor, texto]) => (
              <SelectItem key={valor} value={valor}>
                {texto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => atender.mutate({ id: s.id, datos: { estado: s.estado, nota } })}>
          Guardar nota
        </Button>
        {esAdmin && s.estado !== 'incorporada' && <Button onClick={() => onCrear(s)}>Dar de alta</Button>}
        {s.comercio_id && (
          <Button variant="link" asChild>
            <Link to={`/admin/comercios/${s.comercio_id}`}>Ver comercio</Link>
          </Button>
        )}
      </div>
      {atender.isError && <p className="text-peligro-texto">{mensajeError(atender.error)}</p>}
    </li>
  )
}

function Solicitudes({ esAdmin, onCrear }: { esAdmin: boolean; onCrear: (s: SolicitudSalida) => void }) {
  const solicitudes = useSolicitudes()
  if (solicitudes.isPending) return <Skeleton className="h-40" />
  if (solicitudes.isError) return <EstadoLista texto={solicitudes.error.message} />
  if (solicitudes.data.length === 0) return <EstadoLista texto="No han llegado solicitudes desde la landing." />
  return (
    <ul className="flex flex-col gap-4">
      {solicitudes.data.map((s) => (
        <Solicitud key={s.id} s={s} esAdmin={esAdmin} onCrear={onCrear} />
      ))}
    </ul>
  )
}

type Vista = 'comercios' | 'beneficios' | 'solicitudes'

/** /admin/comercios — comercios, beneficios por aprobar y solicitudes de la landing. */
export function PaginaComercios() {
  const yo = useYo()
  const esAdmin = yo.data?.rol === 'admin'
  const [params, setParams] = useSearchParams()
  const vista = (params.get('vista') as Vista | null) ?? 'comercios'
  const porAprobar = usePorAprobar()
  const solicitudes = useSolicitudes()
  const nuevas = solicitudes.data?.filter((s) => s.estado === 'nueva').length ?? 0
  const [alta, setAlta] = useState<{ inicial: DatosComercio; solicitudId: number | null } | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={vista} onValueChange={(v) => setParams(v === 'comercios' ? {} : { vista: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="comercios">Comercios</TabsTrigger>
          <TabsTrigger value="beneficios">Beneficios por aprobar ({porAprobar.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes{nuevas > 0 ? ` (${nuevas} nuevas)` : ''}</TabsTrigger>
        </TabsList>
      </Tabs>
      {vista === 'comercios' && <Lista esAdmin={esAdmin} onNuevo={() => setAlta({ inicial: VACIO, solicitudId: null })} />}
      {vista === 'beneficios' && <Propuestas />}
      {vista === 'solicitudes' && (
        <Solicitudes
          esAdmin={esAdmin}
          onCrear={(s) =>
            setAlta({
              inicial: { nombre: s.comercio, rubro: s.rubro, rut: '', direccion: s.direccion ?? '' },
              solicitudId: s.id,
            })
          }
        />
      )}
      <NuevoComercio
        abierto={alta !== null}
        onCerrar={() => setAlta(null)}
        inicial={alta?.inicial ?? VACIO}
        solicitudId={alta?.solicitudId ?? null}
      />
    </div>
  )
}
