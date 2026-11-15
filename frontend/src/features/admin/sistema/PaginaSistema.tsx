import { Cargando } from '@/components/marca/Cargando'
import { useId, useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { fechaHora, numero } from '@/lib/formato'
import type { Rol } from '@/lib/api'
import {
  mensajeError,
  useCrearUsuario,
  useEditarUsuario,
  useEjecutarTareas,
  useTareas,
  useUsuarios,
  useYo,
} from '../consultas'
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
          {ejecutar.isPending && <Cargando />}
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
              Boletas
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={api.reportes.exportarCanjes(rango)} download>
              Canjes
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={api.reportes.exportarComercios()} download>
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

const LARGO_CLAVE = 10 // política de contraseñas del backend

const ROLES: Record<Exclude<Rol, 'comercio'>, string> = {
  operador: 'Operador: revisa boletas, vecinos y canjes',
  admin: 'Administrador: además edita comercios, parámetros y usuarios',
}

function Equipo() {
  const id = useId()
  const usuarios = useUsuarios()
  const yo = useYo()
  const crear = useCrearUsuario()
  const editar = useEditarUsuario()
  const vacio = { nombre: '', email: '', contrasena: '', rol: 'operador' as Exclude<Rol, 'comercio'> }
  const [datos, setDatos] = useState(vacio)
  const equipo = usuarios.data?.filter((u) => u.rol !== 'comercio') ?? []

  function enviar(e: FormEvent) {
    e.preventDefault()
    crear.mutate(datos, { onSuccess: () => setDatos(vacio) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Equipo</CardTitle>
        <CardDescription>
          Cuentas del equipo. Los usuarios de cada comercio se crean en su ficha, en Comercios.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {usuarios.isPending ? (
          <Skeleton className="h-24" />
        ) : usuarios.isError ? (
          <EstadoLista texto={usuarios.error.message} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipo.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-bold">{u.nombre}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.rol === 'admin' ? 'Administrador' : 'Operador'}</TableCell>
                  <TableCell className="text-right">
                    {u.id === yo.data?.id ? (
                      <Badge variant="secondary">Tú</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant={u.activo ? 'outline' : 'default'}
                        disabled={editar.isPending}
                        onClick={() => editar.mutate({ id: u.id, datos: { activo: !u.activo } })}
                      >
                        {u.activo ? 'Desactivar' : 'Reactivar'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {editar.isError && <p className="text-peligro-texto">{mensajeError(editar.error)}</p>}
        <form onSubmit={enviar} className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-border p-4">
          <h4 className="font-bold">Nueva cuenta del equipo</h4>
          <FieldGroup className="grid gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={`${id}-nombre`}>Nombre</FieldLabel>
              <Input
                id={`${id}-nombre`}
                value={datos.nombre}
                onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                required
              />
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
          <RadioGroup
            value={datos.rol}
            onValueChange={(v) => setDatos({ ...datos, rol: v as Exclude<Rol, 'comercio'> })}
            className="gap-2"
          >
            {Object.entries(ROLES).map(([valor, texto]) => (
              <div key={valor} className="flex items-center gap-2">
                <RadioGroupItem value={valor} id={`${id}-${valor}`} />
                <label htmlFor={`${id}-${valor}`}>{texto}</label>
              </div>
            ))}
          </RadioGroup>
          {crear.isError && <p className="text-peligro-texto">{mensajeError(crear.error)}</p>}
          {crear.isSuccess && <p className="text-sm text-muted-foreground">Cuenta creada.</p>}
          <Button type="submit" variant="secondary" className="self-start" disabled={crear.isPending}>
            Crear cuenta
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/** /admin/sistema — tareas programadas, exportación de datos y cuentas del equipo. */
export function PaginaSistema() {
  return (
    <div className="flex flex-col gap-6">
      <Tareas />
      <Exportar />
      <Equipo />
    </div>
  )
}
