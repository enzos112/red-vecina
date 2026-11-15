import { Download, LoaderCircle, Play } from 'lucide-react'
import { useId, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { fechaHora, numero } from '@/lib/formato'
import { mensajeError, useEjecutarTareas, useTareas } from '../consultas'
import { EstadoLista } from '../partes'

/** Nombre en pantalla de lo que devuelve cada tarea. */
const RESULTADOS: Record<string, string> = {
  codigos: 'códigos',
  vecinos: 'vecinos',
  puntos: 'puntos',
  comercios: 'comercios',
  cuentas: 'cuentas',
  creados: 'cupos creados',
}

function resultado(r: Record<string, unknown>): string {
  const partes = Object.entries(r).map(([k, v]) => `${typeof v === 'number' ? numero(v) : String(v)} ${RESULTADOS[k] ?? k}`)
  return partes.length ? partes.join(' · ') : '—'
}

function Tareas() {
  const tareas = useTareas()
  const ejecutar = useEjecutarTareas()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Tareas programadas</CardTitle>
        <CardDescription>
          Corren solas con la primera visita del día. Si algo quedó atrasado, puedes correrlas ahora: no repiten lo ya
          hecho.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button className="self-start" onClick={() => ejecutar.mutate()} disabled={ejecutar.isPending}>
          {ejecutar.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}
          Ejecutar tareas ahora
        </Button>
        {ejecutar.isError && (
          <Alert variant="destructive">
            <AlertDescription>{mensajeError(ejecutar.error)}</AlertDescription>
          </Alert>
        )}
        {ejecutar.isSuccess && (
          <Alert variant="exito">
            <AlertDescription>Listo: las tareas corrieron.</AlertDescription>
          </Alert>
        )}
        {tareas.isPending ? (
          <Skeleton className="h-40" />
        ) : tareas.isError ? (
          <EstadoLista texto={tareas.error.message} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead>Última ejecución</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tareas.data.map((t) => (
                <TableRow key={t.tarea}>
                  <TableCell className="font-bold">{t.nombre}</TableCell>
                  <TableCell>
                    {t.ejecutada_en ? fechaHora(t.ejecutada_en) : 'Nunca'}
                    {t.forzada && (
                      <Badge variant="secondary" className="ml-2">
                        A mano
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{resultado(t.resultado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function Exportar() {
  const id = useId()
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const rango = { desde: desde || null, hasta: hasta || null }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Exportar a CSV</CardTitle>
        <CardDescription>
          Se abre en Excel. Los vecinos van por número, sin nombre ni teléfono. Las fechas son en hora de Santiago.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-4">
          <Field className="w-48">
            <FieldLabel htmlFor={`${id}-desde`}>Desde</FieldLabel>
            <Input id={`${id}-desde`} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </Field>
          <Field className="w-48">
            <FieldLabel htmlFor={`${id}-hasta`}>Hasta</FieldLabel>
            <Input id={`${id}-hasta`} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={api.reportes.exportarBoletas(rango)} download>
              <Download aria-hidden="true" />
              Boletas
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={api.reportes.exportarCanjes(rango)} download>
              <Download aria-hidden="true" />
              Canjes
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={api.reportes.exportarComercios()} download>
              <Download aria-hidden="true" />
              Reporte por comercio
            </a>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Boletas por fecha de recepción y canjes por fecha de emisión. El reporte por comercio usa la ventana del cupo y
          no depende de las fechas.
        </p>
      </CardContent>
    </Card>
  )
}

/** /admin/sistema — tareas programadas y exportación de datos. */
export function PaginaSistema() {
  return (
    <div className="flex flex-col gap-6">
      <Tareas />
      <Exportar />
    </div>
  )
}
