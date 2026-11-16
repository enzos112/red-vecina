import { Info } from '@/components/marca/Info'
import { Cargando } from '@/components/marca/Cargando'
import { useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { TipoMovimiento, VecinoDetalle } from '@/lib/api'
import { codigo, dia, fechaHora, numero, pesos } from '@/lib/formato'
import { enlaceWhatsapp } from '@/features/vecino/consultas'
import { useUrlPublica } from '@/lib/consultas'
import { mensajeError, useAjustar, useNuevoEnlace, useSalidaVecino, useVecino } from '../consultas'
import { EstadoBoletaBadge, EstadoCanjeBadge, EstadoLista, MensajeParaVecino } from '../partes'

const TIPO: Record<TipoMovimiento, string> = {
  gana: 'Gana',
  retiene: 'Retiene',
  libera: 'Libera',
  canjea: 'Canjea',
  vence: 'Vence',
  ajusta: 'Ajuste',
}

/** Efecto de cada movimiento en lo disponible: los puntos se guardan siempre en positivo. */
const SIGNO: Record<TipoMovimiento, 1 | -1 | 0> = {
  gana: 1,
  retiene: -1,
  libera: 1,
  canjea: 0, // usa lo que ya se había reservado al pedir el código
  vence: -1,
  ajusta: 1, // el ajuste ya trae su signo
}

function Puntos({ tipo, puntos }: { tipo: TipoMovimiento; puntos: number }) {
  const s = SIGNO[tipo]
  if (s === 0) return <span className="font-semibold text-lapiz">{numero(puntos)} reservados</span>
  const v = s * puntos
  return (
    <span className={v < 0 ? 'text-peligro-texto' : 'text-exito-texto'}>
      {v > 0 ? '+' : '−'}
      {numero(Math.abs(v))}
    </span>
  )
}

function tokenDe(enlace: string): string {
  return enlace.split('/').at(-1) ?? ''
}

function Ajuste({ v }: { v: VecinoDetalle }) {
  const id = useId()
  const ajustar = useAjustar(v.id)
  const [puntos, setPuntos] = useState('')
  const [motivo, setMotivo] = useState('')
  const [hecho, setHecho] = useState<string | null>(null)
  const n = Number(puntos)
  const valido = /^-?\d+$/.test(puntos) && n !== 0 && motivo.trim().length > 0

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    setHecho(null)
    ajustar.mutate(
      { puntos: n, motivo: motivo.trim() },
      {
        onSuccess: () => {
          setHecho(`${n > 0 ? 'Sumaste' : 'Restaste'} ${numero(Math.abs(n))} puntos. Quedó en la auditoría.`)
          setPuntos('')
          setMotivo('')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          Ajustar saldo
        </CardTitle>
        <CardDescription>Para corregir errores o resolver reclamos. El motivo queda registrado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={`${id}-puntos`}>Puntos</FieldLabel>
            <Input
              id={`${id}-puntos`}
              inputMode="numeric"
              placeholder="Ej.: 50 o -20"
              value={puntos}
              onChange={(e) => setPuntos(e.target.value.replace(/[^\d-]/g, '').replace(/(?!^)-/g, ''))}
              className="max-w-48 tabular-nums"
            />
            <FieldDescription>Positivo suma, negativo resta.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-motivo`}>Motivo</FieldLabel>
            <Textarea id={`${id}-motivo`} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} />
          </Field>
          {ajustar.isError && (
            <Alert variant="destructive">
              <AlertDescription>{mensajeError(ajustar.error)}</AlertDescription>
            </Alert>
          )}
          {hecho && (
            <Alert variant="exito">
              <AlertDescription>{hecho}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="self-start" disabled={!valido || ajustar.isPending}>
            {ajustar.isPending && <Cargando />}
            Guardar ajuste
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Enlace({ v }: { v: VecinoDetalle }) {
  const nuevo = useNuevoEnlace(v.id)
  const [confirmar, setConfirmar] = useState(false)
  const base = useUrlPublica()
  const texto = v.whatsapp.mensaje.replaceAll('{enlace}', `${base}${v.enlace}`)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          Enlace de su tarjeta
        </CardTitle>
        <CardDescription>Reenvíaselo si lo perdió. Si alguien más lo tiene, genera uno nuevo.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <MensajeParaVecino texto={texto} whatsapp={enlaceWhatsapp(v.whatsapp.numero, v.whatsapp.mensaje, tokenDe(v.enlace), base)} />
        {confirmar ? (
          <div className="flex flex-wrap items-center gap-2">
            <p>El enlace actual dejará de funcionar.</p>
            <Button variant="destructive" size="sm" onClick={() => nuevo.mutate(undefined, { onSuccess: () => setConfirmar(false) })} disabled={nuevo.isPending}>
              Generar enlace nuevo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="self-start" onClick={() => setConfirmar(true)}>
            Generar enlace nuevo
          </Button>
        )}
        {nuevo.isError && <p className="text-peligro-texto">{mensajeError(nuevo.error)}</p>}
      </CardContent>
    </Card>
  )
}

/** Sección 8: el vecino pide salir. Se borran sus datos y se anulan sus puntos, previa confirmación. */
function Salida({ v }: { v: VecinoDetalle }) {
  const id = useId()
  const salida = useSalidaVecino(v.id)
  const [motivo, setMotivo] = useState('')
  const [confirmar, setConfirmar] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          Salida del programa
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          Solo si el vecino lo pide. No se puede deshacer.
          <Info etiqueta="Qué pasa al dar de baja">
            Se borran su nombre, teléfono y fotos de boletas, y se anulan sus{' '}
            {numero(v.saldo.disponible + v.saldo.retenido)} puntos. Las compras y canjes quedan sin datos personales
            para los totales de la red.
          </Info>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor={`${id}-motivo`}>Cómo lo pidió</FieldLabel>
          <Input
            id={`${id}-motivo`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por ejemplo: lo pidió por WhatsApp el 15/11"
            maxLength={500}
          />
        </Field>
        {confirmar ? (
          <div className="flex flex-col gap-3 rounded-lg border-2 border-peligro bg-peligro-fondo p-4">
            <p className="font-bold">¿Confirmas la salida de {v.nombre}? Sus datos se borran ahora.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" onClick={() => salida.mutate(motivo)} disabled={salida.isPending}>
                {salida.isPending && <Cargando />}
                Sí, borrar sus datos
              </Button>
              <Button variant="ghost" onClick={() => setConfirmar(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="self-start" disabled={!motivo.trim()} onClick={() => setConfirmar(true)}>
            Dar de baja
          </Button>
        )}
        {salida.isError && <p className="text-peligro-texto">{mensajeError(salida.error)}</p>}
        {salida.isSuccess && <p className="text-exito-texto">{salida.data.mensaje}</p>}
      </CardContent>
    </Card>
  )
}

type Herramienta = 'enlace' | 'ajuste' | 'salida'

const HERRAMIENTAS: { clave: Herramienta; texto: string }[] = [
  { clave: 'enlace', texto: 'Mandar su enlace' },
  { clave: 'ajuste', texto: 'Ajustar saldo' },
  { clave: 'salida', texto: 'Dar de baja' },
]

/** Las acciones sobre el vecino, una a la vez y solo cuando se piden: así el historial queda a la vista. */
function Herramientas({ v, inicial }: { v: VecinoDetalle; inicial: Herramienta | null }) {
  const [abierta, setAbierta] = useState<Herramienta | null>(inicial)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Acciones">
        {HERRAMIENTAS.map((h) => (
          <Button
            key={h.clave}
            variant={abierta === h.clave ? 'libreta' : 'libreta-secundario'}
            size="sm"
            aria-expanded={abierta === h.clave}
            onClick={() => setAbierta((a) => (a === h.clave ? null : h.clave))}
          >
            {h.texto}
          </Button>
        ))}
      </div>
      {abierta && (
        <div className="max-w-2xl">
          {abierta === 'enlace' && <Enlace v={v} />}
          {abierta === 'ajuste' && <Ajuste v={v} />}
          {abierta === 'salida' && <Salida v={v} />}
        </div>
      )}
    </div>
  )
}

/** /admin/vecinos/:id — saldo, movimientos, boletas y canjes; ajuste, enlace y salida. */
export function PaginaVecino() {
  const { id } = useParams()
  const vecino = useVecino(Number(id))
  const recienInscrito = (useLocation().state as { recienInscrito?: boolean } | null)?.recienInscrito

  if (vecino.isPending) return <Skeleton className="h-96" />
  if (vecino.isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-lg">{vecino.error.message}</p>
        <Button variant="secondary" asChild>
          <Link to="/admin/vecinos">Volver</Link>
        </Button>
      </div>
    )
  }
  const v = vecino.data

  return (
    <div className="flex flex-col gap-8">
      <Link
        to="/admin/vecinos"
        className="inline-flex min-h-10 items-center self-start font-semibold text-tinta-azul underline decoration-2 underline-offset-[6px] hover:text-tapa"
      >
        Volver a vecinos
      </Link>

      {recienInscrito && (
        <p className="border-l-[6px] border-mango bg-mango-50 px-5 py-4 text-lg">
          <strong className="text-tapa">{v.nombre} ya está en la red.</strong> Mándale su enlace por WhatsApp, aquí
          abajo. Sin ese enlace no puede ver sus puntos.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="rotulo text-4xl text-tapa">{v.nombre}</h2>
          <p className="text-lg text-lapiz">
            <span className="tabular-nums">{v.telefono}</span> · inscrito el {dia(v.creado_en)}
            {v.comercio_origen && ` en ${v.comercio_origen}`} · {v.estado}
          </p>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="rotulo text-5xl text-mango-700 tabular-nums">{numero(v.saldo.disponible)}</p>
            <p className="text-lapiz">disponibles</p>
          </div>
          {v.saldo.retenido > 0 && (
            <div>
              <p className="text-5xl font-extrabold text-muted-foreground tabular-nums">{numero(v.saldo.retenido)}</p>
              <p className="text-muted-foreground">retenidos</p>
            </div>
          )}
        </div>
      </div>

      {v.por_vencer.length > 0 && (
        <Alert variant="alerta">
          <AlertDescription>
            Por vencer: {v.por_vencer.map((x) => `${numero(x.puntos)} el ${dia(x.fecha)}`).join(' · ')}
          </AlertDescription>
        </Alert>
      )}

      {v.estado === 'cerrado' ? (
        <Alert>
          <AlertDescription>Esta cuenta está cerrada: sus datos personales se borraron y su enlace no funciona.</AlertDescription>
        </Alert>
      ) : (
        <Herramientas v={v} inicial={recienInscrito ? 'enlace' : null} />
      )}

      <Tabs defaultValue="movimientos">
        <TabsList>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="boletas">Boletas ({v.boletas.length})</TabsTrigger>
          <TabsTrigger value="canjes">Canjes ({v.canjes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="movimientos" className="pt-4">
          {v.movimientos.length === 0 ? (
            <EstadoLista texto="Sin movimientos todavía." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">{fechaHora(m.creado_en)}</TableCell>
                    <TableCell>{TIPO[m.tipo]}</TableCell>
                    <TableCell className="text-right font-bold whitespace-nowrap tabular-nums">
                      <Puntos tipo={m.tipo} puntos={m.puntos} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.motivo ?? (m.boleta_id ? <Link className="underline" to={`/admin/boletas/${m.boleta_id}`}>Boleta {m.boleta_id}</Link> : m.vence_en ? `Vence el ${dia(m.vence_en)}` : '')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
        <TabsContent value="boletas" className="pt-4">
          {v.boletas.length === 0 ? (
            <EstadoLista texto="Sin boletas todavía." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recibida</TableHead>
                  <TableHead>Comercio</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.boletas.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link to={`/admin/boletas/${b.id}`} className="font-bold hover:underline">
                        {fechaHora(b.recibida_en)}
                      </Link>
                    </TableCell>
                    <TableCell>{b.comercio ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.monto_total !== null ? pesos(b.monto_total) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.puntos !== null ? numero(b.puntos) : '—'}</TableCell>
                    <TableCell>
                      <EstadoBoletaBadge estado={b.estado} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
        <TabsContent value="canjes" className="pt-4">
          {v.canjes.length === 0 ? (
            <EstadoLista texto="Sin canjes todavía." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Comercio</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                  <TableHead>Emitido</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.canjes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold tabular-nums">{codigo(c.codigo)}</TableCell>
                    <TableCell>{c.comercio}</TableCell>
                    <TableCell className="text-right tabular-nums">{pesos(c.valor_pesos)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fechaHora(c.emitido_en)}</TableCell>
                    <TableCell>
                      <EstadoCanjeBadge estado={c.estado} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
