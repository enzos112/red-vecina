import { Cargando } from '@/components/marca/Cargando'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ResultadoCajaSalida } from '@/lib/api'
import { codigo as formatoCodigo, pesos } from '@/lib/formato'
import { mensajeError } from '@/lib/sesion'
import { useConsultarCodigo, useCupo, useUsarCodigo } from './consultas'

const LARGO = 6 // B10: el código tiene 6 dígitos (formato, no regla ajustable)
/** Cuánto queda a la vista la confirmación antes de volver al campo vacío (interfaz). */
const VUELTA_MS = 6000

type Estado =
  | { paso: 'escribir' }
  | { paso: 'resultado'; codigo: string; r: ResultadoCajaSalida }
  | { paso: 'usado'; codigo: string; r: ResultadoCajaSalida }

const soloDigitos = (v: string) => v.replace(/\D/g, '')

/** Pantalla completa del resultado: verde si se puede usar, rojo con el motivo si no. */
function Pantalla({ tono, children }: { tono: 'verde' | 'rojo'; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={
        'aparecer fixed inset-0 z-50 flex flex-col overflow-y-auto px-6 pt-10 pb-[max(2rem,env(safe-area-inset-bottom))] text-white ' +
        (tono === 'verde' ? 'sobre-tapa bg-exito-texto' : 'bg-peligro-oscuro')
      }
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">{children}</div>
    </div>
  )
}

function Valido({
  codigo,
  r,
  onUsado,
  onCancelar,
}: {
  codigo: string
  r: ResultadoCajaSalida
  onUsado: (r: ResultadoCajaSalida) => void
  onCancelar: () => void
}) {
  const id = useId()
  const usar = useUsarCodigo()
  const [monto, setMonto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  function enviar(e: FormEvent) {
    e.preventDefault()
    setAviso(null)
    usar.mutate(
      { codigo, monto_compra: monto ? Number(monto) : null },
      {
        onSuccess: (res) => {
          if (res.usado) onUsado(res)
          else setAviso(res.mensaje) // por ejemplo, la compra no llega al mínimo
        },
      },
    )
  }

  return (
    <Pantalla tono="verde">
      <div>
        <p className="text-5xl leading-tight font-extrabold">Válido</p>
        <p className="mt-3 text-3xl font-bold">{r.valor_pesos != null ? `${pesos(r.valor_pesos)} de descuento` : r.mensaje}</p>
        {r.compra_minima != null && <p className="mt-1 text-2xl">Compra mínima {pesos(r.compra_minima)}</p>}
        {r.texto && <p className="mt-4 text-xl text-crema/90">{r.texto}</p>}
        <p className="mt-2 text-lg text-crema/80">Código {formatoCodigo(codigo)}</p>
      </div>
      <form onSubmit={enviar} className="mt-auto flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-monto`} className="text-lg font-bold">
            Total de la compra (opcional)
          </label>
          <Input
            id={`${id}-monto`}
            inputMode="numeric"
            placeholder="Antes del descuento"
            value={monto ? pesos(Number(monto)) : ''}
            onChange={(e) => setMonto(soloDigitos(e.target.value))}
            className="h-14 border-white/40 bg-white text-xl text-tinta"
          />
        </div>
        {aviso && <p className="bg-white px-4 py-3 text-lg font-bold text-peligro-texto">{aviso}</p>}
        {usar.isError && (
          <p className="bg-white px-4 py-3 text-lg font-bold text-peligro-texto">{mensajeError(usar.error)}</p>
        )}
        <Button type="submit" variant="oscuro" size="lg" className="h-16 text-2xl" disabled={usar.isPending}>
          {usar.isPending && <Cargando />}
          Usar
        </Button>
        <Button type="button" variant="oscuro-secundario" size="lg" onClick={onCancelar}>
          No usar ahora
        </Button>
      </form>
    </Pantalla>
  )
}

function Invalido({ r, onOtro }: { r: ResultadoCajaSalida; onOtro: () => void }) {
  const titulo: Record<string, string> = {
    no_existe: 'No existe',
    otro_local: 'De otro local',
    vencido: 'Vencido',
    usado: 'Ya usado',
    dia_no_permitido: 'Hoy no vale',
    bajo_minimo: 'Bajo el mínimo',
  }
  return (
    <Pantalla tono="rojo">
      <div>
        <p className="text-5xl leading-tight font-extrabold">{titulo[r.resultado] ?? 'No válido'}</p>
        <p className="mt-4 text-2xl">{r.mensaje}</p>
        <p className="mt-6 text-xl">No apliques el descuento.</p>
      </div>
      <Button size="lg" className="mt-auto h-16 bg-white text-2xl text-peligro-texto hover:bg-crema" onClick={onOtro} autoFocus>
        Probar otro código
      </Button>
    </Pantalla>
  )
}

function Usado({ r, onSeguir }: { r: ResultadoCajaSalida; onSeguir: () => void }) {
  useEffect(() => {
    const t = setTimeout(onSeguir, VUELTA_MS)
    return () => clearTimeout(t)
  }, [onSeguir])
  return (
    <Pantalla tono="verde">
      <div>
        <p className="text-5xl leading-tight font-extrabold">Listo</p>
        <p className="mt-3 text-3xl font-bold">
          {r.valor_pesos != null ? `Aplica ${pesos(r.valor_pesos)} de descuento.` : 'Aplica el descuento.'}
        </p>
        <p className="mt-4 text-xl text-crema/90">El código quedó usado. No sirve de nuevo.</p>
      </div>
      <Button variant="oscuro" size="lg" className="mt-auto h-16 text-2xl" onClick={onSeguir} autoFocus>
        Siguiente código
      </Button>
    </Pantalla>
  )
}

/**
 * Solo en el computador: al lado del campo, cuánto cupo queda libre esta semana y los pasos.
 * En el celular de la caja no se muestra, para no correr el campo hacia abajo.
 */
function Costado() {
  const cupo = useCupo()
  const c = cupo.data
  return (
    <aside aria-label="Tu semana" className="hidden flex-col gap-6 lg:flex">
      <section aria-labelledby="titulo-cupo-libre" className="border-2 border-tapa bg-papel">
        <h2 id="titulo-cupo-libre" className="flex h-12 items-center bg-tapa px-4 text-base font-semibold text-papel">
          Cupo libre esta semana
        </h2>
        <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-5">
          {cupo.isPending ? (
            <span className="h-14 w-40 bg-esqueleto" aria-label="Cargando cupo" />
          ) : cupo.isError ? (
            <p className="text-lg text-peligro-texto">{mensajeError(cupo.error)}</p>
          ) : (
            c && (
              <>
                <p>
                  <span className="rotulo block text-6xl leading-none tracking-[-0.035em] text-mango-700">
                    {pesos(c.libre)}
                  </span>
                  <span className="mt-2 block text-lg">de {pesos(c.total)} para canjes</span>
                </p>
                <Link
                  to="/comercio/cupo"
                  className="inline-flex min-h-12 items-center font-bold text-tinta-azul underline decoration-mango decoration-2 underline-offset-[6px] hover:text-tapa"
                >
                  Ver mi cupo
                </Link>
              </>
            )
          )}
        </div>
      </section>
      <section aria-labelledby="titulo-pasos-caja">
        <h2 id="titulo-pasos-caja" className="rotulo text-3xl text-tapa">
          En la caja
        </h2>
        <ol className="mt-4 border-t-2 border-tapa">
          {[
            'Pide el código antes de cobrar.',
            'Escríbelo: lo revisamos al completar los 6 números.',
            'Si sale Válido, aplica el descuento y toca Usar.',
          ].map((texto, i) => (
            <li key={texto} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 border-b-2 border-cuadricula py-4">
              <span aria-hidden="true" className="rotulo text-3xl leading-none text-mango-700">
                {i + 1}
              </span>
              <p className="text-lg">{texto}</p>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  )
}

/** /comercio — el validador de la caja: escribir 6 dígitos, ver el resultado, usar. */
export function PaginaValidar() {
  const id = useId()
  const campo = useRef<HTMLInputElement>(null)
  const consultar = useConsultarCodigo()
  const [codigo, setCodigo] = useState('')
  const [estado, setEstado] = useState<Estado>({ paso: 'escribir' })

  function volver() {
    setCodigo('')
    consultar.reset()
    setEstado({ paso: 'escribir' })
    setTimeout(() => campo.current?.focus(), 0)
  }

  function revisar(valor: string) {
    if (valor.length !== LARGO || consultar.isPending) return
    consultar.mutate({ codigo: valor }, { onSuccess: (r) => setEstado({ paso: 'resultado', codigo: valor, r }) })
  }

  function alEscribir(texto: string) {
    const valor = soloDigitos(texto).slice(0, LARGO)
    setCodigo(valor)
    consultar.reset()
    if (valor.length === LARGO) revisar(valor) // sin toque extra: consulta al completar
  }

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-16">
      <div className="flex flex-col gap-8">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          revisar(codigo)
        }}
        className="flex flex-col gap-4"
      >
        <label htmlFor={id} className="rotulo text-3xl text-tapa lg:text-6xl lg:tracking-[-0.035em]">
          Código del vecino
        </label>
        <Input
          id={id}
          ref={campo}
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="go"
          placeholder="000 000"
          value={formatoCodigo(codigo)}
          onChange={(e) => alEscribir(e.target.value)}
          maxLength={LARGO + 1}
          aria-describedby={`${id}-ayuda`}
          className="h-24 border-2 border-tapa bg-papel text-center text-6xl font-extrabold tracking-[0.15em] text-tapa tabular-nums placeholder:text-tapa/20 focus-visible:border-mango md:h-24 lg:h-32 lg:text-7xl"
        />
        <p id={`${id}-ayuda`} className="text-lg text-lapiz">
          Pídelo antes de cobrar. Al escribir los 6 números lo revisamos solo.
        </p>
        {consultar.isPending && (
          <p className="flex items-center gap-2 text-lg font-bold">
            <Cargando /> Revisando…
          </p>
        )}
        {consultar.isError && <p className="text-lg font-bold text-peligro-texto">{mensajeError(consultar.error)}</p>}
        {codigo.length === LARGO && !consultar.isPending && (
          <Button type="submit" variant="libreta" size="lg">
            Revisar de nuevo
          </Button>
        )}
      </form>

      <Link
        to="/comercio/sin-internet"
        className="flex min-h-14 items-center gap-3 border-2 border-dashed border-tapa/50 bg-papel px-4 text-lg font-bold text-tapa transition-colors duration-200 hover:border-tapa hover:bg-mango-50"
      >
        ¿Aplicaste un código sin internet? Ingrésalo aquí
      </Link>
      </div>

      <Costado />

      {estado.paso === 'resultado' &&
        (estado.r.se_puede_usar ? (
          <Valido
            codigo={estado.codigo}
            r={estado.r}
            onUsado={(r) => setEstado({ paso: 'usado', codigo: estado.codigo, r: { ...estado.r, ...r, valor_pesos: estado.r.valor_pesos } })}
            onCancelar={volver}
          />
        ) : (
          <Invalido r={estado.r} onOtro={volver} />
        ))}
      {estado.paso === 'usado' && <Usado r={estado.r} onSeguir={volver} />}
    </div>
  )
}
