import { ArrowLeft, KeyRound, LoaderCircle, Scale } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
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
import { mensajeError, useAjustar, useNuevoEnlace, useVecino } from '../consultas'
import { EstadoBoletaBadge, EstadoCanjeBadge, EstadoLista, MensajeParaVecino } from '../partes'

const TIPO: Record<TipoMovimiento, string> = {
  gana: 'Gana',
  retiene: 'Retiene',
  libera: 'Libera',
  canjea: 'Canjea',
  vence: 'Vence',
  ajusta: 'Ajuste',
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
          <Scale className="size-5" aria-hidden="true" /> Ajustar saldo
        </CardTitle>
        <CardDescription>Para corregir errores o resolver reclamos. El motivo es obligatorio y queda registrado.</CardDescription>
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
            {ajustar.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
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
  const texto = v.whatsapp.mensaje.replaceAll('{enlace}', `${window.location.origin}${v.enlace}`)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <KeyRound className="size-5" aria-hidden="true" /> Enlace de su tarjeta
        </CardTitle>
        <CardDescription>Reenvíaselo si lo perdió. Si alguien más lo tiene, genera uno nuevo.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <MensajeParaVecino texto={texto} whatsapp={enlaceWhatsapp(v.whatsapp.numero, v.whatsapp.mensaje, tokenDe(v.enlace))} />
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

/** /admin/vecinos/:id — saldo, movimientos, boletas y canjes; ajuste y enlace. */
export function PaginaVecino() {
  const { id } = useParams()
  const vecino = useVecino(Number(id))

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
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link to="/admin/vecinos">
          <ArrowLeft aria-hidden="true" />
          Vecinos
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold">{v.nombre}</h2>
          <p className="text-lg text-muted-foreground">
            <span className="tabular-nums">{v.telefono}</span> · inscrito el {dia(v.creado_en)}
            {v.comercio_origen && ` en ${v.comercio_origen}`} · {v.estado}
          </p>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="text-5xl font-extrabold tabular-nums">{numero(v.saldo.disponible)}</p>
            <p className="text-muted-foreground">disponibles</p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Ajuste v={v} />
        <Enlace v={v} />
      </div>

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
                    <TableCell className="text-right font-bold tabular-nums">
                      {m.puntos > 0 ? '+' : ''}
                      {numero(m.puntos)}
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
