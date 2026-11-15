import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import type { ComercioPublico, CondicionesRed } from '@/lib/api'
import { useComerciosRed, useCondiciones } from '@/lib/consultas'
import { lista, numero, pesos, puntos } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { BOLETA_PENDIENTE, CuentaEjemplo } from './CuentaEjemplo'
import { Hoja } from '@/components/marca/libreta'
import { turno, useEnVista } from '@/lib/libreta'

export function PaginaInicio() {
  const condiciones = useCondiciones()
  const c = condiciones.data
  return (
    <>
      <Portada c={c} />
      <ComoSeAnota c={c} />
      <LoQueValen c={c} />
      <Indice />
      <Notas c={c} />
      <Tapa />
    </>
  )
}

/** Titular de sección: rótulo grande de la libreta. */
function Titulo({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn('rotulo max-w-[16ch] tracking-[-0.035em] text-[2.5rem] leading-[1.05] text-tapa sm:text-6xl', className)}>
      {children}
    </h2>
  )
}

function Portada({ c }: { c?: CondicionesRed }) {
  return (
    <Hoja etiqueta="titulo-portada" className="border-b-2 border-tapa">
      <div className="grid items-center gap-12 py-12 sm:py-16 lg:min-h-[min(calc(100svh-5rem),56rem)] lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] lg:gap-16 lg:py-16">
        <div>
          <div className="relative text-[3.25rem] sm:text-7xl lg:text-[clamp(5rem,8.2vw,7.5rem)]">
            <ol
              aria-hidden="true"
              className="absolute top-0 -left-44 hidden w-32 pr-4 text-right font-semibold text-tapa lg:block"
            >
              {['lun 10', 'mié 12', 'vie 14', 'sáb 15'].map((d) => (
                <li key={d} className="flex h-[1.0667em] items-end justify-end pb-[0.12em]">
                  <span className="text-[0.9375rem] leading-none">{d}</span>
                </li>
              ))}
            </ol>
          <h1
            id="titulo-portada"
            className="rotulo leading-[1.0667] tracking-[-0.035em] text-tapa"
          >
            Tus compras del barrio ahora{' '}
            <span className="relative inline-block text-tinta">
              suman.
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-1 h-[0.08em] origin-left bg-tinta-azul"
                style={{ animation: 'tachar 600ms cubic-bezier(0.45, 0, 0.2, 1) 300ms both' }}
              />
            </span>
          </h1>
          </div>
          <p className="mt-8 max-w-[34rem] text-xl leading-8 sm:text-[1.375rem]">
            Compra en los negocios de tu cuadra, sube la foto de tu boleta y junta puntos. Los canjeas por
            descuentos en cualquier local de la red.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="libreta" size="lg">
              <Link to="/#comercios">Ver comercios</Link>
            </Button>
            <Button asChild variant="libreta-secundario" size="lg">
              <Link to="/#como-funciona">Cómo funciona</Link>
            </Button>
          </div>
        </div>
        <div>
          <CuentaEjemplo c={c} />
          <p className="mt-3 text-[0.9375rem] text-lapiz">Ilustración con datos de ejemplo.</p>
        </div>
      </div>
    </Hoja>
  )
}

type Paso = { titulo: string; texto: ReactNode; muestra: ReactNode }

/** Una fila de muestra dentro de la explicación: cómo se ve ese momento en tu cuenta. */
function Muestra({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-16 items-center justify-between gap-4 border-2 border-tapa bg-papel px-4 py-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

function ComoSeAnota({ c }: { c?: CondicionesRed }) {
  const { ref, visto } = useEnVista<HTMLOListElement>()
  const canje = c?.niveles[0]
  const ejemplo = c ? Math.floor(BOLETA_PENDIENTE / c.pesos_por_punto) : null

  const pasos: Paso[] = [
    {
      titulo: 'Abres tu cuenta en la caja',
      texto:
        'Escaneas el código QR en un comercio de la red. Te pedimos tu nombre y tu WhatsApp, y te llega tu tarjeta: un enlace, sin apps ni claves.',
      muestra: (
        <Muestra className="bg-tapa text-papel">
          <span className="rotulo text-xl">Cuenta de Rosa</span>
          <span className="text-[0.9375rem] font-semibold text-tapa-texto">abierta hoy</span>
        </Muestra>
      ),
    },
    {
      titulo: 'Anotas tu compra a lápiz',
      texto: c
        ? `Le sacas una foto a tu boleta desde tu tarjeta. Ganas 1 punto por cada ${pesos(c.pesos_por_punto)}; mientras la revisamos, quedan a lápiz.`
        : 'Le sacas una foto a tu boleta desde tu tarjeta. Mientras la revisamos, tus puntos quedan a lápiz.',
      muestra: (
        <Muestra className="text-lapiz">
          <span className="font-semibold">Boleta de Minimarket Don Luis</span>
          <span className="text-2xl font-medium underline decoration-dashed decoration-2 underline-offset-[6px]">
            {ejemplo != null ? `+${numero(ejemplo)}` : '+'}
          </span>
        </Muestra>
      ),
    },
    {
      titulo: 'Queda en tinta',
      texto: c
        ? `En menos de ${c.plazo_validacion_horas} horas la revisamos. Desde ahí tus puntos están firmes y listos para canjear.`
        : 'La revisamos pronto. Desde ahí tus puntos están firmes y listos para canjear.',
      muestra: (
        <Muestra>
          <span className="font-semibold">Boleta de Minimarket Don Luis</span>
          <span
            className="text-2xl font-extrabold text-tinta-azul"
            style={visto ? { animation: 'entintar 500ms ease-out 1500ms both' } : { color: 'var(--lapiz)' }}
          >
            {ejemplo != null ? `+${numero(ejemplo)}` : '+'}
          </span>
        </Muestra>
      ),
    },
    {
      titulo: 'Lo canjeas en otro local',
      texto: c
        ? `Eliges un beneficio, pides tu código y lo muestras en la caja antes de pagar. Dura ${c.vigencia_codigo_horas} horas y sirve en cualquier local de la red.`
        : 'Eliges un beneficio, pides tu código y lo muestras en la caja antes de pagar. Sirve en cualquier local de la red.',
      muestra: (
        <Muestra>
          <span
            className="tachado font-semibold"
            style={visto ? { animation: 'tachar-texto 420ms ease-out 2300ms both' } : { backgroundSize: '0% 3px' }}
          >
            Canje en Carnicería El Novillo
          </span>
          <span className="text-2xl font-extrabold text-tinta-azul">{canje ? `−${numero(canje.puntos)}` : '−'}</span>
        </Muestra>
      ),
    },
  ]

  return (
    <Hoja id="como-funciona" etiqueta="titulo-como" className="py-16 sm:py-24">
      <Titulo id="titulo-como">Así se anota tu compra.</Titulo>
      <p className="mt-6 max-w-[38rem] text-xl leading-8">
        Tu tarjeta es una libreta que llevamos entre todos los locales. Cada compra queda anotada y la cuenta
        siempre cuadra.
      </p>
      <ol ref={ref} className="relative mt-12 border-t-2 border-tapa">
        {pasos.map((paso, i) => (
          <li
            key={paso.titulo}
            style={turno(visto, i * 420) as CSSProperties}
            className="relative grid gap-6 border-b-2 border-tapa py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16"
          >
            <span
              aria-hidden="true"
              className="rotulo absolute top-7 -left-28 hidden w-16 text-right text-5xl text-tapa tabular-nums lg:block"
            >
              {i + 1}
            </span>
            <div>
              <h3 className="rotulo text-[1.75rem] leading-tight text-tapa sm:text-[2rem]">
                <span className="sr-only">Paso {i + 1}: </span>
                <span aria-hidden="true" className="mr-2 text-tinta-azul lg:hidden">
                  {i + 1}.
                </span>
                {paso.titulo}
              </h3>
              <p className="mt-3 max-w-[36rem] text-lg leading-8">{paso.texto}</p>
            </div>
            <div className="self-center">{paso.muestra}</div>
          </li>
        ))}
      </ol>
    </Hoja>
  )
}

function LoQueValen({ c }: { c?: CondicionesRed }) {
  const { ref, visto } = useEnVista<HTMLTableSectionElement>()
  return (
    <section aria-labelledby="titulo-valen" className="sobre-tapa bg-tapa py-16 text-papel sm:py-24">
      <div className="mx-auto grid max-w-[90rem] gap-12 pr-4 pl-12 sm:pr-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:pl-44">
        <div>
          <h2 id="titulo-valen" className="rotulo max-w-[14ch] text-[2.5rem] leading-[1.05] tracking-[-0.035em] sm:text-6xl">
            Lo que valen tus puntos.
          </h2>
          <p className="mt-6 max-w-[30rem] text-xl leading-8 text-tapa-texto">
            {c
              ? `Cada canje va con una compra de al menos ${c.veces_compra_minima_canje} veces el descuento. Así el local siempre vende y la red se sostiene.`
              : 'Cada canje va con una compra. Así el local siempre vende y la red se sostiene.'}
          </p>
          <p className="mt-4 max-w-[30rem] text-lg leading-8 text-tapa-texto">
            Cada comercio elige qué ofrece en cada nivel.
          </p>
        </div>

        <table className="w-full self-start border-2 border-papel text-left">
          <caption className="sr-only">Niveles de canje: puntos, descuento y compra mínima</caption>
          <thead>
            <tr className="border-b-2 border-papel text-[0.9375rem] text-tapa-texto">
              <th scope="col" className="px-4 py-3 font-semibold sm:px-6">Juntas</th>
              <th scope="col" className="px-4 py-3 font-semibold sm:px-6">Te descuentan</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell sm:px-6">En compras desde</th>
            </tr>
          </thead>
          <tbody ref={ref}>
            {c
              ? c.niveles.map((n, i) => (
                  <tr
                    key={n.numero}
                    style={turno(visto, i * 300) as CSSProperties}
                    className="border-b border-tapa-texto/40 last:border-b-0"
                  >
                    <td className="px-3 py-5 sm:px-6">
                      <span className="rotulo text-3xl sm:text-5xl">{numero(n.puntos)}</span>
                      <span className="ml-1.5 text-base text-tapa-texto sm:ml-2 sm:text-lg">puntos</span>
                    </td>
                    <td className="px-3 py-5 sm:px-6">
                      <span className="rotulo text-3xl sm:text-5xl">{pesos(n.valor_pesos)}</span>
                      <span className="block text-[0.9375rem] text-tapa-texto sm:hidden">
                        en compras desde {pesos(n.valor_pesos * c.veces_compra_minima_canje)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-5 text-xl font-semibold sm:table-cell sm:px-6">
                      {pesos(n.valor_pesos * c.veces_compra_minima_canje)}
                    </td>
                  </tr>
                ))
              : [0, 1, 2].map((i) => (
                  <tr key={i} aria-hidden="true" className="h-24 border-b border-tapa-texto/40 last:border-b-0">
                    <td colSpan={3} />
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Indice() {
  const comercios = useComerciosRed()
  return (
    <Hoja id="comercios" etiqueta="titulo-indice" className="py-16 sm:py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Titulo id="titulo-indice">Índice de la red.</Titulo>
        <p className="max-w-[26rem] text-xl leading-8">Juntas en uno y canjeas en otro. Cada local elige su beneficio.</p>
      </div>
      <div className="mt-12">
        {comercios.isPending ? (
          <ul aria-label="Cargando comercios" aria-busy="true" className="border-t-2 border-tapa">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-28 border-b border-cuadricula" />
            ))}
          </ul>
        ) : comercios.isError ? (
          <div role="alert" className="border-2 border-peligro bg-papel p-6">
            <p className="text-xl font-bold">No pudimos cargar los comercios.</p>
            <p className="mt-1 text-lg">{comercios.error.message}</p>
            <Button variant="libreta-secundario" size="sm" className="mt-4" onClick={() => comercios.refetch()}>
              Intentar de nuevo
            </Button>
          </div>
        ) : comercios.data.length === 0 ? (
          <div className="border-2 border-dashed border-tapa bg-papel p-6">
            <p className="text-xl font-bold">Pronto sumaremos comercios.</p>
            <p className="mt-1 text-lg">Estamos armando la red de tu barrio.</p>
          </div>
        ) : (
          <ul className="border-t-2 border-tapa">
            {comercios.data.map((comercio, i) => (
              <EntradaIndice key={comercio.slug} comercio={comercio} folio={i + 1} />
            ))}
          </ul>
        )}
      </div>
    </Hoja>
  )
}

/** Una línea del índice: el local a la izquierda, puntos guía, y su beneficio a la derecha. */
function EntradaIndice({ comercio, folio }: { comercio: ComercioPublico; folio?: number }) {
  const b = comercio.destacado
  return (
    <li className="group relative grid gap-x-6 gap-y-3 border-b-2 border-cuadricula py-6 transition-colors duration-200 hover:border-tapa lg:grid-cols-[minmax(0,1fr)_minmax(4rem,0.6fr)_minmax(0,24rem)] lg:items-baseline">
      {folio != null && (
        <span
          aria-hidden="true"
          className="rotulo absolute top-7 -left-28 hidden w-16 text-right text-3xl text-tapa tabular-nums lg:block"
        >
          {folio}
        </span>
      )}
      <div className="min-w-0">
        <p className="rotulo text-[1.75rem] leading-tight text-tapa sm:text-4xl">{comercio.nombre}</p>
        <p className="mt-1 text-lg">
          {comercio.rubro} · {comercio.direccion}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="hidden h-0 self-center border-b-[3px] border-dotted border-tapa/50 lg:block"
      />
      {b ? (
        <p className="text-lg leading-7">
          <span className="font-extrabold text-tinta-azul">Con {puntos(b.puntos)}</span>
          <span className="block font-semibold">{b.texto}</span>
          {b.compra_minima > 0 && <span className="block text-lapiz">En compras desde {pesos(b.compra_minima)}.</span>}
        </p>
      ) : (
        <p className="text-lg text-lapiz">Muy pronto publicará su beneficio.</p>
      )}
    </li>
  )
}

type Pregunta = { p: string; r: ReactNode }

function preguntas(c?: CondicionesRed): Pregunta[] {
  return [
    { p: '¿Cuánto cuesta?', r: 'Nada. Inscribirte y usar tu tarjeta es gratis.' },
    {
      p: '¿Tengo que descargar una aplicación?',
      r: 'No. Tu tarjeta es un enlace personal que te llega por WhatsApp. Lo abres en el navegador del celular, sin crear claves.',
    },
    {
      p: '¿Cuántos puntos gano?',
      r: c ? (
        <>
          Ganas 1 punto por cada {pesos(c.pesos_por_punto)} de tu boleta. La compra debe ser desde{' '}
          {pesos(c.compra_minima_sumar)} y subes la foto dentro de {c.plazo_boleta_horas} horas.
        </>
      ) : (
        'Ganas puntos según el monto de tu boleta. Súbela apenas compres.'
      ),
    },
    {
      p: '¿Mis puntos vencen?',
      r: c ? (
        <>
          Sí, a los {c.vigencia_puntos_dias} días desde la compra. Siempre usamos primero los más antiguos. Te avisamos
          por WhatsApp {lista(c.avisos_vencimiento_dias)} días antes.
        </>
      ) : (
        'Sí. Siempre usamos primero los más antiguos y te avisamos por WhatsApp antes de que venzan.'
      ),
    },
    {
      p: '¿Cómo canjeo?',
      r: c ? (
        <>
          En tu tarjeta eliges el beneficio y pides un código. Lo muestras en la caja antes de pagar. El código dura{' '}
          {c.vigencia_codigo_horas} horas.
        </>
      ) : (
        'En tu tarjeta eliges el beneficio y pides un código. Lo muestras en la caja antes de pagar.'
      ),
    },
    {
      p: '¿Qué pasa si pierdo mi enlace?',
      r: 'Escríbenos por WhatsApp y te mandamos uno nuevo. El anterior deja de funcionar y tus puntos quedan intactos.',
    },
    {
      p: '¿Qué hacen con mis datos?',
      r: (
        <>
          Usamos tu nombre, tu WhatsApp y tus boletas solo para el programa. No vendemos tus datos. Lee las{' '}
          <Link to="/condiciones">condiciones y el uso de datos</Link>.
        </>
      ),
    },
  ]
}

function Notas({ c }: { c?: CondicionesRed }) {
  return (
    <Hoja id="preguntas" etiqueta="titulo-notas" className="border-t-2 border-tapa py-16 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <div>
          <Titulo id="titulo-notas">Lo que más nos preguntan.</Titulo>
          <p className="mt-6 max-w-[26rem] text-xl leading-8">
            ¿Te quedó una duda? Pregunta en la caja de cualquier local de la red.
          </p>
        </div>
        <Accordion type="single" collapsible className="border-t-2 border-tapa bg-papel">
          {preguntas(c).map((item) => (
            <AccordionItem key={item.p} value={item.p} className="border-b-2 border-cuadricula">
              <AccordionTrigger className="rounded-none px-4 text-xl font-bold hover:text-tinta-azul [&>span]:text-tinta-azul">
                {item.p}
              </AccordionTrigger>
              <AccordionContent className="px-4 text-lg leading-8 text-tinta [&_a]:text-tinta-azul">
                {item.r}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Hoja>
  )
}

/** La tapa de la libreta, con su etiqueta: el llamado a los comercios. */
function Tapa() {
  const { ref, visto } = useEnVista<HTMLDListElement>()
  const lineas = [
    { t: 'Cuenta de', d: 'Tu negocio' },
    { t: 'Cada canje', d: 'llega con una compra' },
    { t: 'Tu cupo', d: 'va ligado a lo que vendes' },
  ]
  return (
    <section aria-labelledby="titulo-tapa" className="sobre-tapa border-b border-tapa-texto/30 bg-tapa text-papel">
      <div className="mx-auto grid max-w-[90rem] items-center gap-12 py-16 pr-4 pl-12 sm:py-24 sm:pr-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:pl-44">
        <div>
          <h2 id="titulo-tapa" className="rotulo max-w-[14ch] text-[2.5rem] leading-[1.05] tracking-[-0.035em] sm:text-6xl">
            ¿Tienes un negocio en el barrio?
          </h2>
          <p className="mt-6 max-w-[30rem] text-xl leading-8 text-tapa-texto">
            Súmate al piloto y recibe clientes que hoy compran en otros locales.
          </p>
          <Button asChild variant="libreta" size="lg" className="mt-10">
            <Link to="/comercios">Conoce cómo funciona</Link>
          </Button>
        </div>
        <div className="border-2 border-papel p-2">
          <dl ref={ref} className="border-2 border-tapa bg-papel px-6 py-4 text-tinta">
            {lineas.map((l, i) => (
              <div
                key={l.t}
                className="flex flex-wrap items-baseline justify-between gap-x-4 border-b-2 border-tapa/20 py-3 last:border-b-0"
              >
                <dt className="text-[0.9375rem] font-semibold text-lapiz">{l.t}</dt>
                <dd className="rotulo text-2xl text-tapa" style={turno(visto, 200 + i * 380) as CSSProperties}>
                  {i === 0 ? <span className="border-b-[3px] border-tinta-azul">{l.d}</span> : l.d}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
