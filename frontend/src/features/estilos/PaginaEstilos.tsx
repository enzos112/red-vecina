import type { ReactNode } from 'react'
import { Logo } from '@/components/marca/Logo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { fechaHora, pesos } from '@/lib/formato'
import { Contenedor } from '@/features/landing/partes'

type Color = { nombre: string; uso: string; variable: string; texto: string; contraste: string }

/** Paleta de la sección 6. El contraste indicado es del texto de muestra sobre el color. */
const PALETA: Color[] = [
  { nombre: 'Azul noche', uso: 'Hero y bloques de énfasis', variable: '--barrio', texto: 'text-crema', contraste: 'Crema 12,0:1' },
  { nombre: 'Azul', uso: 'Acción principal en fondo claro', variable: '--vecina', texto: 'text-white', contraste: 'Blanco 7,4:1' },
  { nombre: 'Azul brillante', uso: 'Foco y detalles, nunca texto chico', variable: '--vecina-claro', texto: 'text-white', contraste: 'Solo decorativo' },
  { nombre: 'Naranja', uso: 'Acento y acción sobre azul noche', variable: '--mango', texto: 'text-barrio', contraste: 'Azul noche 5,8:1' },
  { nombre: 'Naranja texto', uso: 'Texto naranja chico sobre claro', variable: '--mango-texto', texto: 'text-white', contraste: 'Sobre crema 5,2:1' },
  { nombre: 'Crema', uso: 'Fondo general', variable: '--crema', texto: 'text-tinta', contraste: 'Tinta 16,5:1' },
  { nombre: 'Blanco', uso: 'Tarjetas', variable: '--card', texto: 'text-tinta', contraste: 'Tinta 17,2:1' },
  { nombre: 'Tinta', uso: 'Texto', variable: '--tinta', texto: 'text-crema', contraste: 'Crema 16,5:1' },
  { nombre: 'Grafito', uso: 'Texto secundario', variable: '--musgo', texto: 'text-white', contraste: 'Blanco 6,0:1 · crema 5,7:1' },
]

const ESTADOS: Color[] = [
  { nombre: 'Éxito', uso: 'Barras y bordes', variable: '--exito', texto: 'text-white', contraste: 'Texto en #17633A: 7,3:1' },
  { nombre: 'Alerta', uso: 'Barras y bordes', variable: '--alerta', texto: 'text-white', contraste: 'Texto en #7F4C00: 7,2:1' },
  { nombre: 'Peligro', uso: 'Barras y bordes', variable: '--peligro', texto: 'text-white', contraste: 'Texto en #A12D22: 7,2:1' },
]

function Muestra({ color }: { color: Color }) {
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className={`flex h-28 items-end p-4 text-lg font-bold ${color.texto}`}
        style={{ background: `var(${color.variable})` }}
      >
        Aa
      </div>
      <div className="p-4">
        <p className="font-extrabold">{color.nombre}</p>
        <p className="text-sm text-muted-foreground">{color.uso}</p>
        <p className="mt-2 font-mono text-sm">{color.variable}</p>
        <p className="text-sm text-muted-foreground">{color.contraste}</p>
      </div>
    </li>
  )
}

function Bloque({ titulo, children, oscuro }: { titulo: string; children: ReactNode; oscuro?: boolean }) {
  return (
    <section className="border-b border-border py-14 last:border-0">
      <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{titulo}</h2>
      <div className={oscuro ? 'mt-8' : 'mt-8'}>{children}</div>
    </section>
  )
}

const FILAS = [
  { fecha: '2026-11-13T21:30:00Z', comercio: 'Minimarket del ejemplo', monto: 7850, estado: 'exito' as const, texto: 'Aprobada' },
  { fecha: '2026-11-14T15:05:00Z', comercio: 'Panadería del ejemplo', monto: 12400, estado: 'alerta' as const, texto: 'Pendiente' },
  { fecha: '2026-11-14T23:40:00Z', comercio: 'Verdulería del ejemplo', monto: 3200, estado: 'peligro' as const, texto: 'Rechazada' },
]

/** Página interna con todos los componentes y colores del sistema de diseño. */
export function PaginaEstilos() {
  return (
    <div className="min-h-svh">
      <header className="sobre-tapa bg-tapa py-16">
        <Contenedor>
          <Logo tono="oscuro" />
          <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-crema sm:text-7xl">Estilos</h1>
          <p className="mt-4 max-w-xl text-xl text-crema/85">
            Página interna. Colores, tipografía y componentes de Red Vecina.
          </p>
        </Contenedor>
      </header>

      <Contenedor>
        <Bloque titulo="Colores">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {PALETA.map((c) => (
              <Muestra key={c.variable} color={c} />
            ))}
          </ul>
          <h3 className="mt-10 text-xl font-extrabold">Estados</h3>
          <p className="mt-1 text-muted-foreground">
            El color puro marca; el texto usa su tono oscuro. Siempre van con texto.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ESTADOS.map((c) => (
              <Muestra key={c.variable} color={c} />
            ))}
          </ul>
        </Bloque>

        <Bloque titulo="Tipografía">
          <p className="text-muted-foreground">Archivo, alojada en el proyecto. Nada bajo 15 px.</p>
          <div className="mt-6 flex flex-col gap-5">
            <p className="text-6xl font-extrabold tracking-tight sm:text-7xl">Titular 800</p>
            <p className="text-5xl font-extrabold tracking-tight">Sección 800</p>
            <p className="text-2xl font-extrabold">Título de tarjeta 800</p>
            <p className="text-lg">Texto destacado de 19 px para frases de apoyo.</p>
            <p>Texto base de 17 px. Te faltan 50 puntos para tu descuento en la panadería.</p>
            <p className="text-sm text-muted-foreground">Texto chico de 16 px, en musgo.</p>
            <p className="text-xs text-muted-foreground">Mínimo de 15 px, solo para notas.</p>
            <p>
              Montos: <strong>{pesos(7850)}</strong> · <strong>{pesos(120000)}</strong> · Fechas:{' '}
              <strong>{fechaHora('2026-11-20T21:30:00Z')}</strong>
            </p>
          </div>
        </Bloque>

        <Bloque titulo="Botones">
          <p className="text-muted-foreground">Píldora, color plano, 52 px en celular. Cambio de color en 200 ms.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button>Principal</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="destructive">
              Peligro
            </Button>
            <Button disabled>Desactivado</Button>
            <Button variant="link">Enlace</Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg">
              Grande
            </Button>
            <Button>Normal</Button>
            <Button size="sm">Chico (48 px)</Button>
          </div>
          <div className="sobre-tapa mt-6 flex flex-wrap gap-3 rounded-xl bg-barrio p-6">
            <Button variant="oscuro">Sobre fondo oscuro</Button>
            <Button variant="oscuro-secundario">Secundario sobre oscuro</Button>
          </div>
        </Bloque>

        <Bloque titulo="Tarjeta">
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tu saldo</CardTitle>
                <CardDescription>Puntos disponibles para canjear.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-extrabold">452</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Subir boleta</Button>
              </CardFooter>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Tarjeta chica</CardTitle>
                <CardDescription>Esquinas de 22 px, borde fino y sin sombra.</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="exito">Aprobada</Badge>
              </CardContent>
            </Card>
          </div>
        </Bloque>

        <Bloque titulo="Campos de texto">
          <FieldGroup className="max-w-lg">
            <Field>
              <FieldLabel htmlFor="estilos-nombre">Tu nombre</FieldLabel>
              <Input id="estilos-nombre" placeholder="Rosa" />
              <FieldDescription>Así te saludaremos en tu tarjeta.</FieldDescription>
            </Field>
            <Field data-invalid>
              <FieldLabel htmlFor="estilos-telefono">Tu WhatsApp</FieldLabel>
              <Input id="estilos-telefono" type="tel" defaultValue="+56 9 0000" aria-invalid />
              <FieldError>Revisa tu WhatsApp. Le faltan números.</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="estilos-desactivado">Desactivado</FieldLabel>
              <Input id="estilos-desactivado" disabled defaultValue="No se puede editar" />
            </Field>
            <Field>
              <FieldLabel htmlFor="estilos-mensaje">Mensaje</FieldLabel>
              <Textarea id="estilos-mensaje" placeholder="Escribe aquí…" />
            </Field>
          </FieldGroup>
        </Bloque>

        <Bloque titulo="Etiquetas de estado">
          <div className="flex flex-wrap gap-3">
            <Badge variant="exito">Aprobada</Badge>
            <Badge variant="alerta">Pendiente</Badge>
            <Badge variant="peligro">Rechazada</Badge>
            <Badge>Principal</Badge>
            <Badge variant="secondary">Almacén</Badge>
            <Badge variant="mango">Nuevo</Badge>
            <Badge variant="outline">Contorno</Badge>
          </div>
        </Bloque>

        <Bloque titulo="Avisos">
          <div className="flex max-w-2xl flex-col gap-4">
            <Alert>
              <AlertTitle>Tu boleta está en revisión</AlertTitle>
              <AlertDescription>Te avisamos por WhatsApp cuando sumemos tus puntos.</AlertDescription>
            </Alert>
            <Alert variant="exito">
              <AlertTitle>Código usado</AlertTitle>
              <AlertDescription>El descuento quedó registrado.</AlertDescription>
            </Alert>
            <Alert variant="alerta">
              <AlertTitle>Tus puntos vencen pronto</AlertTitle>
              <AlertDescription>Úsalos antes del viernes.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTitle>Código vencido</AlertTitle>
              <AlertDescription>Pide uno nuevo desde tu tarjeta.</AlertDescription>
            </Alert>
          </div>
        </Bloque>

        <Bloque titulo="Diálogo">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Abrir diálogo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Pedir este código?</DialogTitle>
                <DialogDescription>
                  Reservamos tu descuento y te mostramos un código para la caja.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Volver</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Pedir código</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Bloque>

        <Bloque titulo="Pestañas">
          <Tabs defaultValue="vigentes" className="max-w-2xl">
            <TabsList>
              <TabsTrigger value="vigentes">Vigentes</TabsTrigger>
              <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>
            <TabsContent value="vigentes">Tus beneficios publicados.</TabsContent>
            <TabsContent value="pendientes">Cambios que esperan aprobación.</TabsContent>
            <TabsContent value="historial">Lo que publicaste antes.</TabsContent>
          </Tabs>
          <Tabs defaultValue="a" className="mt-8 max-w-2xl">
            <TabsList variant="line">
              <TabsTrigger value="a">Semana actual</TabsTrigger>
              <TabsTrigger value="b">Semana pasada</TabsTrigger>
            </TabsList>
            <TabsContent value="a">Variante de línea.</TabsContent>
            <TabsContent value="b">Variante de línea, otra pestaña.</TabsContent>
          </Tabs>
        </Bloque>

        <Bloque titulo="Tabla">
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableCaption className="pb-4">Boletas de ejemplo.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Comercio</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FILAS.map((f) => (
                  <TableRow key={f.fecha}>
                    <TableCell>{fechaHora(f.fecha)}</TableCell>
                    <TableCell className="font-semibold">{f.comercio}</TableCell>
                    <TableCell className="text-right tabular-nums">{pesos(f.monto)}</TableCell>
                    <TableCell>
                      <Badge variant={f.estado}>{f.texto}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Bloque>

        <Bloque titulo="Esqueleto de carga">
          <Card className="max-w-md">
            <CardHeader>
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-5 w-56" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-14 w-32" />
              <Skeleton className="h-13 w-full" />
            </CardContent>
          </Card>
        </Bloque>
      </Contenedor>
    </div>
  )
}
