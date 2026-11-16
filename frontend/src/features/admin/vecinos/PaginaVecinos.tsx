import { Cargando } from '@/components/marca/Cargando'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { dia } from '@/lib/formato'
import { useBuscarVecinos, useComercios, useInscribirVecino } from '../consultas'
import { EstadoLista } from '../partes'

const SIN_COMERCIO = 'ninguno'

/** Mismo formato que acepta la API: celular chileno de 9 dígitos que empieza con 9. */
function celularValido(texto: string): boolean {
  let digitos = texto.replace(/\D/g, '')
  if (digitos.startsWith('56')) digitos = digitos.slice(2)
  return /^9\d{8}$/.test(digitos)
}

/**
 * Inscripción a mano, para el vecino que no puede escanear el QR (sin cámara, sin datos, o
 * llama por teléfono). Queda auditada con la cuenta del equipo. Al terminar se abre su ficha,
 * donde está el mensaje con su enlace para mandárselo por WhatsApp.
 */
function InscribirAMano() {
  const id = useId()
  const navigate = useNavigate()
  const comercios = useComercios()
  const inscribir = useInscribirVecino()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [comercio, setComercio] = useState(SIN_COMERCIO)
  const [acepta, setAcepta] = useState(false)
  const [intento, setIntento] = useState(false)

  const errNombre = intento && !nombre.trim() ? 'Escribe su nombre.' : undefined
  const errTelefono =
    intento && !celularValido(telefono) ? 'Su celular de 9 dígitos, por ejemplo 9 1234 5678.' : undefined
  const errAcepta = intento && !acepta ? 'Primero cuéntale las condiciones y confirma que acepta.' : undefined

  function cambiarAbierto(v: boolean) {
    if (inscribir.isPending) return
    setAbierto(v)
    if (!v) {
      setNombre('')
      setTelefono('')
      setComercio(SIN_COMERCIO)
      setAcepta(false)
      setIntento(false)
      inscribir.reset()
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    setIntento(true)
    if (!nombre.trim() || !celularValido(telefono) || !acepta) return
    inscribir.mutate(
      {
        nombre: nombre.trim(),
        telefono,
        comercio_id: comercio === SIN_COMERCIO ? null : Number(comercio),
        acepta_condiciones: true,
      },
      { onSuccess: (v) => navigate(`/admin/vecinos/${v.id}`, { state: { recienInscrito: true } }) },
    )
  }

  const enRed = (comercios.data ?? []).filter((c) => c.estado !== 'retirado')

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogTrigger asChild>
        <Button variant="libreta">Inscribir a mano</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-10">Inscribir a un vecino</DialogTitle>
          <DialogDescription>
            Para quien no puede escanear el QR. Después le mandas su enlace por WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <form id={`${id}-form`} onSubmit={enviar} noValidate>
          <FieldGroup>
            <Field data-invalid={errNombre ? true : undefined}>
              <FieldLabel htmlFor={`${id}-nombre`}>Nombre</FieldLabel>
              <Input
                id={`${id}-nombre`}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="off"
                maxLength={120}
                aria-invalid={errNombre ? true : undefined}
              />
              {errNombre && <FieldError>{errNombre}</FieldError>}
            </Field>
            <Field data-invalid={errTelefono ? true : undefined}>
              <FieldLabel htmlFor={`${id}-telefono`}>Celular</FieldLabel>
              <Input
                id={`${id}-telefono`}
                type="tel"
                inputMode="tel"
                placeholder="9 1234 5678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                autoComplete="off"
                maxLength={20}
                aria-invalid={errTelefono ? true : undefined}
              />
              {errTelefono && <FieldError>{errTelefono}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-comercio`}>Dónde se inscribe</FieldLabel>
              <Select value={comercio} onValueChange={setComercio}>
                <SelectTrigger id={`${id}-comercio`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_COMERCIO}>Sin comercio (contactó al equipo)</SelectItem>
                  {enRed.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Queda como el comercio que lo trajo a la red.</FieldDescription>
            </Field>
            <Field data-invalid={errAcepta ? true : undefined}>
              <div className="flex items-start gap-4">
                <Checkbox
                  id={`${id}-acepta`}
                  className="mt-0.5"
                  checked={acepta}
                  onCheckedChange={(v) => setAcepta(v === true)}
                  aria-invalid={errAcepta ? true : undefined}
                />
                <FieldLabel htmlFor={`${id}-acepta`} className="block font-normal">
                  Le conté las{' '}
                  <Link
                    to="/condiciones"
                    target="_blank"
                    className="underline decoration-mango decoration-2 underline-offset-4"
                  >
                    condiciones y el uso de datos
                  </Link>
                  , tiene 18 años o más y aceptó.
                </FieldLabel>
              </div>
              {errAcepta && <FieldError>{errAcepta}</FieldError>}
            </Field>
          </FieldGroup>
        </form>
        {inscribir.isError && (
          <Alert variant="destructive">
            <AlertDescription>{inscribir.error.message}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="libreta-secundario" onClick={() => cambiarAbierto(false)} disabled={inscribir.isPending}>
            Cancelar
          </Button>
          <Button variant="libreta" type="submit" form={`${id}-form`} disabled={inscribir.isPending}>
            {inscribir.isPending && <Cargando />}
            {inscribir.isPending ? 'Inscribiendo…' : 'Inscribir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** /admin/vecinos — buscar por nombre o teléfono, o inscribir a mano. */
export function PaginaVecinos() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [texto, setTexto] = useState(params.get('q') ?? '')
  const q = params.get('q') ?? ''

  useEffect(() => {
    const t = setTimeout(() => {
      const limpio = texto.trim()
      if (limpio !== q) setParams(limpio ? { q: limpio } : {}, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [texto, q, setParams])

  const busqueda = useBuscarVecinos(q)
  const lista = busqueda.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Input
          className="w-full max-w-xl pl-4"
          placeholder="Busca por nombre o teléfono"
          aria-label="Buscar vecino"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
        />
        <InscribirAMano />
      </div>

      {busqueda.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : busqueda.isError ? (
        <EstadoLista texto={busqueda.error.message} />
      ) : lista.length === 0 ? (
        <EstadoLista texto={q ? 'No encontramos a nadie con eso.' : 'Aún no hay vecinos inscritos.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Se inscribió en</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((v) => (
              <TableRow key={v.id} className="cursor-pointer" onClick={() => navigate(`/admin/vecinos/${v.id}`)}>
                <TableCell className="font-bold">
                  <a href={`/admin/vecinos/${v.id}`} onClick={(e) => e.preventDefault()} className="hover:underline">
                    {v.nombre}
                  </a>
                </TableCell>
                <TableCell className="tabular-nums">{v.telefono}</TableCell>
                <TableCell>{v.comercio_origen ?? '—'}</TableCell>
                <TableCell>{dia(v.creado_en)}</TableCell>
                <TableCell>
                  <Badge variant={v.estado === 'activo' ? 'exito' : 'secondary'}>{v.estado}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
