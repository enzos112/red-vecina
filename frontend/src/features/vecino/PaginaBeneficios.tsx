import { Cargando } from '@/components/marca/Cargando'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CondicionesRed, OpcionesSalida, OpcionSalida } from '@/lib/api'
import { useCondiciones } from '@/lib/consultas'
import { dia, diaSemana, pesos, puntos } from '@/lib/formato'
import { esTarjetaInexistente, useOpciones, usePedirCodigo, useTarjeta, useToken } from './consultas'
import { CargandoLista, Encabezado, ErrorBloque, TarjetaNoEncontrada, Vacio } from './partes'

function Opcion({ opcion, onElegir }: { opcion: OpcionSalida; onElegir: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onElegir}
        className="group flex h-full w-full cursor-pointer flex-col gap-2 border-2 border-tapa bg-papel p-5 text-left transition-colors duration-200 hover:bg-mango-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="rotulo text-2xl text-tapa">{opcion.comercio}</span>
          {opcion.nunca_compro && <Badge variant="mango">Nuevo para ti</Badge>}
        </span>
        <span className="text-xl font-semibold">
          <span className="rotulo text-4xl text-mango-700">{pesos(opcion.valor_pesos)}</span> de descuento
        </span>
        {opcion.texto && <span className="text-base">{opcion.texto}</span>}
        <span className="text-base text-lapiz">
          Compra mínima {pesos(opcion.compra_minima)} · <strong className="text-foreground">{puntos(opcion.puntos)}</strong>
        </span>
        <span className="mt-auto inline-flex items-center gap-2 pt-1 font-bold text-tinta-azul underline decoration-mango decoration-2 underline-offset-[6px] group-hover:text-tapa">
          Pedir código
        </span>
      </button>
    </li>
  )
}

function Agotados({ nombres, proxima }: { nombres: string[]; proxima: string | null }) {
  if (nombres.length === 0) return null
  const vuelve = proxima ? `Vuelve el ${diaSemana(proxima)}` : 'Vuelve pronto'
  return (
    <section aria-labelledby="titulo-agotados" className="flex flex-col gap-3">
      <h2 id="titulo-agotados" className="rotulo text-2xl text-tapa">
        Sin cupo esta semana
      </h2>
      <ul className="flex flex-col gap-3">
        {nombres.map((nombre) => (
          <li key={nombre} className="flex items-center gap-4 border-2 border-dashed border-tapa/40 bg-papel p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{nombre}</p>
              <p className="text-muted-foreground">Ya entregó sus beneficios de la semana.</p>
            </div>
            <Badge variant="secondary">{vuelve}</Badge>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Diálogo de confirmación con las condiciones del código (B10 a B14). */
function Confirmar({
  opcion,
  condiciones,
  onCerrar,
}: {
  opcion: OpcionSalida | null
  condiciones: CondicionesRed | undefined
  onCerrar: () => void
}) {
  const token = useToken()
  const navigate = useNavigate()
  const pedir = usePedirCodigo(token)
  const horas = condiciones?.vigencia_codigo_horas

  function cerrar() {
    if (pedir.isPending) return
    pedir.reset()
    onCerrar()
  }

  function confirmar() {
    if (!opcion) return
    pedir.mutate(opcion.beneficio_id, { onSuccess: () => navigate(`/t/${token}`) })
  }

  return (
    <Dialog
      open={opcion !== null}
      onOpenChange={(abierto) => {
        if (!abierto) cerrar()
      }}
    >
      {opcion && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pr-10">¿Pides tu código para {opcion.comercio}?</DialogTitle>
            <DialogDescription>
              {pesos(opcion.valor_pesos)} de descuento en compras desde {pesos(opcion.compra_minima)}.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex list-disc flex-col gap-2 pl-6 text-base">
            <li>
              Vale {horas ? `${horas} horas` : 'un tiempo limitado'} y solo en {opcion.comercio}.
            </li>
            <li>Muéstralo en la caja antes de pagar.</li>
            <li>Un código por compra. No se cambia por dinero ni se usa en partes.</li>
            <li>
              Reservamos {puntos(opcion.puntos)} de tu saldo. Si no lo usas a tiempo, vuelven solos.
            </li>
          </ul>
          {pedir.isError && (
            <Alert variant="destructive">
              <AlertTitle>No pudimos darte el código</AlertTitle>
              <AlertDescription>{pedir.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="libreta-secundario" onClick={cerrar} disabled={pedir.isPending}>
              Ahora no
            </Button>
            <Button variant="libreta" onClick={confirmar} disabled={pedir.isPending}>
              {pedir.isPending && <Cargando />}
              {pedir.isPending ? 'Pidiendo…' : 'Pedir mi código'}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}

/** Cuando el vecino no puede canjear: el motivo en una frase y, si aplica, qué hacer. */
function NoPuede({ datos, token }: { datos: OpcionesSalida; token: string }) {
  const motivo = datos.motivos[0]
  if (datos.codigo_activo || motivo?.clave === 'codigo_activo') {
    return (
      <Vacio titulo="Ya tienes un código activo">
        <p>Úsalo o espera a que venza para pedir otro.</p>
        <Button asChild className="mt-4">
          <Link to={`/t/${token}`}>Ver mi código</Link>
        </Button>
      </Vacio>
    )
  }
  return (
    <Vacio titulo="Por ahora no puedes canjear">
      <p className="text-lg text-foreground">{motivo?.mensaje ?? 'Inténtalo más tarde.'}</p>
      {motivo?.clave === 'sin_boletas' && (
        <Button asChild className="mt-4">
          <Link to={`/t/${token}/boleta`}>
            Subir boleta
          </Link>
        </Button>
      )}
    </Vacio>
  )
}

/** /t/:token/beneficios — las opciones del algoritmo de equilibrio, en su orden. */
export function PaginaBeneficios() {
  const token = useToken()
  const opciones = useOpciones(token)
  const tarjeta = useTarjeta(token)
  const condiciones = useCondiciones()
  const [verTodas, setVerTodas] = useState(false)
  const [elegida, setElegida] = useState<OpcionSalida | null>(null)

  if (opciones.isError && esTarjetaInexistente(opciones.error)) return <TarjetaNoEncontrada />

  const saldo = tarjeta.data?.saldo.disponible
  const encabezado = (
    <Encabezado token={token} titulo="Mis beneficios">
      {saldo !== undefined && (
        <>
          Tienes <strong className="text-foreground">{puntos(saldo)}</strong> disponibles.
        </>
      )}
    </Encabezado>
  )

  if (opciones.isPending) {
    return (
      <div>
        {encabezado}
        <CargandoLista etiqueta="Cargando tus beneficios" />
      </div>
    )
  }
  if (opciones.isError) {
    return (
      <div>
        {encabezado}
        <ErrorBloque titulo="No pudimos cargar tus beneficios" error={opciones.error} reintentar={() => void opciones.refetch()} />
      </div>
    )
  }

  const datos = opciones.data
  const lista = verTodas ? datos.todas : datos.destacadas
  const hayMas = datos.todas.length > datos.destacadas.length
  const minimo = condiciones.data?.niveles[0]?.puntos
  const faltaSaldo = saldo !== undefined && minimo !== undefined && saldo < minimo

  return (
    <div className="aparecer">
      {encabezado}
      <div className="flex flex-col gap-6">
        {!datos.puede ? (
          <NoPuede datos={datos} token={token} />
        ) : datos.todas.length === 0 ? (
          <Vacio titulo="Hoy no hay beneficios para ti">
            <p className="text-lg text-foreground">
              {faltaSaldo && minimo !== undefined
                ? `Te faltan ${puntos(minimo - saldo)} para tu primer beneficio. Sube tus boletas y suma más.`
                : (datos.mensaje_sin_opciones ??
                  (datos.proxima_liberacion ? `El ${dia(datos.proxima_liberacion)} se libera cupo nuevo.` : 'Vuelve pronto.'))}
            </p>
          </Vacio>
        ) : (
          <section aria-label="Beneficios disponibles" className="flex flex-col gap-3">
            <p className="text-lg">
              {verTodas ? 'Todos los beneficios que puedes pedir hoy.' : 'Los mejores para ti hoy. Toca uno para pedir tu código.'}
            </p>
            <ul className="grid gap-3 lg:grid-cols-2">
              {lista.map((o) => (
                <Opcion key={o.beneficio_id} opcion={o} onElegir={() => setElegida(o)} />
              ))}
            </ul>
            {hayMas && (
              <Button variant="libreta-secundario" className="w-full lg:w-auto lg:self-start" onClick={() => setVerTodas((v) => !v)} aria-expanded={verTodas}>
                {verTodas ? 'Ver solo los destacados' : `Ver todos (${datos.todas.length})`}
              </Button>
            )}
          </section>
        )}

        {datos.puede && <Agotados nombres={datos.agotados} proxima={datos.proxima_liberacion} />}
      </div>

      <Confirmar opcion={elegida} condiciones={condiciones.data} onCerrar={() => setElegida(null)} />
    </div>
  )
}
