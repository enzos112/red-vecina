import { Info } from '@/components/marca/Info'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Cargando } from '@/components/marca/Cargando'
import { Confirmar } from '@/components/marca/Confirmar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useId, useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { fechaHora, numero } from '@/lib/formato'
import type { Rol, UsuarioSalida } from '@/lib/api'
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
        <CardTitle className="flex items-center gap-3 rotulo text-3xl text-tapa">
          Tareas programadas
          <Info etiqueta="Cómo corren las tareas">
            Corren solas con la primera visita del día. Si algo quedó atrasado, puedes correrlas ahora: no repiten lo ya
            hecho.
          </Info>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button variant="libreta" className="self-start" onClick={() => ejecutar.mutate()} disabled={ejecutar.isPending}>
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
        <CardTitle className="flex items-center gap-3 rotulo text-3xl text-tapa">
          Exportar a CSV
          <Info etiqueta="Qué trae cada archivo">
            Se abre en Excel, con fechas en hora de Santiago. Boletas van por fecha de recepción y canjes por fecha de
            emisión. El reporte por comercio usa la ventana del cupo y no depende de las fechas.
          </Info>
        </CardTitle>
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
          <Button variant="libreta-secundario" asChild>
            <a href={api.reportes.exportarBoletas(rango)} download>
              Boletas
            </a>
          </Button>
          <Button variant="libreta-secundario" asChild>
            <a href={api.reportes.exportarCanjes(rango)} download>
              Canjes
            </a>
          </Button>
          <Button variant="libreta-secundario" asChild>
            <a href={api.reportes.exportarComercios()} download>
              Reporte por comercio
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const LARGO_CLAVE = 10 // política de contraseñas del backend

const ROLES: Record<Exclude<Rol, 'comercio'>, string> = {
  operador: 'Operador: revisa boletas, vecinos y canjes',
  admin: 'Administrador: además edita comercios, parámetros y usuarios',
}

/** Una clave nueva para quien la olvidó: se escribe aquí y se entrega en persona. */
function NuevaClave({ u }: { u: UsuarioSalida }) {
  const id = useId()
  const editar = useEditarUsuario()
  const [abierto, setAbierto] = useState(false)
  const [clave, setClave] = useState('')

  function guardar(e: FormEvent) {
    e.preventDefault()
    editar.mutate(
      { id: u.id, datos: { contrasena: clave } },
      {
        onSuccess: () => {
          setClave('')
          setAbierto(false)
        },
      },
    )
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v)
        if (!v) {
          setClave('')
          editar.reset()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="libreta-secundario">
          Nueva clave
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <form onSubmit={guardar} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nueva clave para {u.nombre}</DialogTitle>
            <DialogDescription>
              Sus sesiones abiertas se cierran y entra con esta clave. Entrégasela en persona o por un canal privado.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`${id}-clave`}>Clave nueva</FieldLabel>
            <Input
              id={`${id}-clave`}
              type="text"
              autoComplete="off"
              autoFocus
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              minLength={LARGO_CLAVE}
            />
            <FieldDescription>Al menos {LARGO_CLAVE} caracteres.</FieldDescription>
          </Field>
          {editar.isError && <p className="font-semibold text-peligro-texto">{mensajeError(editar.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="libreta-secundario" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="libreta" disabled={clave.length < LARGO_CLAVE || editar.isPending}>
              {editar.isPending && <Cargando />}
              Guardar clave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Equipo() {
  const id = useId()
  const usuarios = useUsuarios()
  const yo = useYo()
  const crear = useCrearUsuario()
  const editar = useEditarUsuario()
  const vacio = { nombre: '', email: '', contrasena: '', rol: 'operador' as Exclude<Rol, 'comercio'> }
  const [datos, setDatos] = useState(vacio)
  const [creando, setCreando] = useState(false)
  const equipo = usuarios.data?.filter((u) => u.rol !== 'comercio') ?? []

  function enviar(e: FormEvent) {
    e.preventDefault()
    crear.mutate(datos, {
      onSuccess: () => {
        setDatos(vacio)
        setCreando(false)
      },
    })
  }

  return (
    <Card id="equipo" className="scroll-mt-6 border-2 border-tapa">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 rotulo text-3xl text-tapa">
          Equipo
          <Info etiqueta="Quiénes son el equipo">
            Las personas que revisan boletas y administran la red. Los usuarios de cada comercio se crean en su ficha,
            en Comercios.
          </Info>
        </CardTitle>
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
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {!u.activo && <Badge variant="secondary">Desactivada</Badge>}
                      {u.id === yo.data?.id ? (
                        <Badge variant="secondary">Tú</Badge>
                      ) : (
                        <>
                          <NuevaClave u={u} />
                          {u.activo ? (
                            <Confirmar
                              titulo={`¿Desactivar a ${u.nombre}?`}
                              descripcion="No podrá entrar al panel y sus sesiones abiertas se cierran. Puedes reactivar la cuenta cuando quieras."
                              confirmar="Sí, desactivar"
                              peligro
                              onConfirmar={() => editar.mutate({ id: u.id, datos: { activo: false } })}
                            >
                              <Button size="sm" variant="libreta-secundario" disabled={editar.isPending}>
                                Desactivar
                              </Button>
                            </Confirmar>
                          ) : (
                            <Button
                              size="sm"
                              variant="libreta"
                              disabled={editar.isPending}
                              onClick={() => editar.mutate({ id: u.id, datos: { activo: true } })}
                            >
                              Reactivar
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {editar.isError && <p className="text-peligro-texto">{mensajeError(editar.error)}</p>}
        {crear.isSuccess && !creando && (
          <p role="status" className="font-semibold text-exito-texto">
            Cuenta creada para {crear.data.email}. Ya puede entrar en /admin/entrar.
          </p>
        )}
        {!creando ? (
          <Button variant="libreta" className="self-start" onClick={() => setCreando(true)}>
            Nueva cuenta del equipo
          </Button>
        ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4 border-2 border-tapa bg-mango-50 p-5">
          <h3 className="rotulo text-2xl text-tapa">Nueva cuenta del equipo</h3>
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
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="libreta" disabled={crear.isPending}>
              {crear.isPending && <Cargando />}
              Crear cuenta
            </Button>
            <Button type="button" variant="libreta-secundario" onClick={() => setCreando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
        )}
      </CardContent>
    </Card>
  )
}

/** /admin/sistema — tareas programadas, exportación de datos y cuentas del equipo. */
export function PaginaSistema() {
  return (
    <Tabs defaultValue="equipo">
      <TabsList>
        <TabsTrigger value="equipo">Equipo</TabsTrigger>
        <TabsTrigger value="tareas">Tareas</TabsTrigger>
        <TabsTrigger value="exportar">Exportar</TabsTrigger>
      </TabsList>
      <TabsContent value="equipo" className="pt-6">
        <Equipo />
      </TabsContent>
      <TabsContent value="tareas" className="pt-6">
        <Tareas />
      </TabsContent>
      <TabsContent value="exportar" className="pt-6">
        <Exportar />
      </TabsContent>
    </Tabs>
  )
}
