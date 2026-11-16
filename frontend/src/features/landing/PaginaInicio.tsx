import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Hoja, Resaltado } from '@/components/marca/libreta'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import type { ComercioPublico } from '@/lib/api'
import { useComerciosRed } from '@/lib/consultas'
import { lista } from '@/lib/formato'
import { COMUNAS } from './comunas'
import { EncabezadoSeccion, Pasos } from './partes'

/**
 * Landing del vecino. Un visitante nuevo debe entender en segundos qué es Red Vecina, qué gana
 * y cómo se suma. Sin cuentas de ejemplo ni cifras: el detalle vive en /condiciones.
 */
export function PaginaInicio() {
  return (
    <>
      <Portada />
      <ComoParticipar />
      <Comercios />
      <Preguntas />
      <ParaNegocios />
    </>
  )
}

const VENTAJAS = [
  { titulo: 'Descuentos en tu barrio', texto: 'Juntas puntos en un local y los usas en otro de la red.' },
  { titulo: 'Sin apps ni claves', texto: 'Tu tarjeta es un enlace que te llega por WhatsApp.' },
  { titulo: 'Gratis', texto: 'Inscribirte y usar tu tarjeta no cuesta nada.' },
]

function Portada() {
  return (
    <Hoja viva etiqueta="titulo-portada" className="border-b-2 border-tapa">
      <div className="grid items-center gap-12 py-14 sm:py-20 lg:min-h-[min(calc(100svh-5rem),48rem)] lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:gap-20">
        <div>
          <h1
            id="titulo-portada"
            className="rotulo text-[3.25rem] leading-[1.0667] tracking-[-0.035em] text-tapa sm:text-7xl lg:text-[clamp(5rem,7.6vw,7rem)]"
          >
            Tus compras del barrio ahora{' '}
            <span
              className="resaltado text-tinta"
              style={{ animation: 'resaltar 700ms cubic-bezier(0.45, 0, 0.2, 1) 350ms both' }}
            >
              suman.
            </span>
          </h1>
          <p className="mt-8 max-w-[32rem] text-xl leading-8 sm:text-[1.375rem]">
            Red Vecina es un programa de puntos compartido entre los negocios de tu cuadra. Compras, sumas y{' '}
            <strong className="font-bold text-tapa">canjeas en cualquier local de la red</strong>.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="libreta" size="lg">
              <Link to="/#como-funciona">Cómo participar</Link>
            </Button>
            <Button asChild variant="libreta-secundario" size="lg">
              <Link to="/comercios">Tengo un negocio</Link>
            </Button>
          </div>
          <p className="mt-8 border-l-[6px] border-mango pl-4 text-lg text-lapiz">
            <strong className="font-bold text-mango-800">Piloto</strong> en {lista([...COMUNAS])}.
          </p>
        </div>

        <section aria-labelledby="titulo-ventajas" className="border-2 border-tapa bg-papel">
          <h2 id="titulo-ventajas" className="rotulo bg-tapa px-5 py-4 text-2xl text-papel">
            Lo que ganas
          </h2>
          <ul>
            {VENTAJAS.map((v) => (
              <li key={v.titulo} className="border-t-2 border-cuadricula px-5 py-5 first:border-t-0">
                <p className="rotulo text-[1.625rem] leading-tight text-tapa">{v.titulo}</p>
                <p className="mt-1 text-lg">{v.texto}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Hoja>
  )
}

function ComoParticipar() {
  return (
    <Hoja viva id="como-funciona" etiqueta="titulo-como" className="py-16 sm:py-24">
      <EncabezadoSeccion
        id="titulo-como"
        titulo={
          <>
            Participar es <Resaltado>simple</Resaltado>.
          </>
        }
        bajada="Tres pasos, desde el celular que ya tienes."
      />
      <Pasos
        pasos={[
          {
            numero: 1,
            titulo: 'Te inscribes en la caja',
            texto: 'Escaneas el código QR de un local de la red y te llega tu tarjeta por WhatsApp.',
          },
          {
            numero: 2,
            titulo: 'Subes tus boletas',
            texto: 'Le sacas una foto a la boleta desde tu tarjeta. La revisamos y sumas puntos.',
          },
          {
            numero: 3,
            titulo: 'Canjeas donde quieras',
            texto: 'Eliges un beneficio, pides tu código y lo muestras en la caja de cualquier local de la red.',
          },
        ]}
      />
    </Hoja>
  )
}

function Comercios() {
  const comercios = useComerciosRed()
  return (
    <section aria-labelledby="titulo-comercios" id="comercios" className="sobre-tapa bg-tapa py-16 text-papel sm:py-24">
      <div className="mx-auto max-w-[90rem] pr-4 pl-12 sm:pr-8 lg:pl-44">
        <EncabezadoSeccion
          id="titulo-comercios"
          oscuro
          titulo={
            <>
              Dónde <Resaltado sobreTapa>juntar</Resaltado> puntos.
            </>
          }
          bajada="Busca el afiche de Red Vecina en la caja. Cada local elige su beneficio."
        />
        <div className="mt-12">
          {comercios.isPending ? (
            <ul aria-label="Cargando comercios" aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-24 border-2 border-tapa-texto/30" />
              ))}
            </ul>
          ) : comercios.isError || comercios.data.length === 0 ? (
            <p className="max-w-[38rem] border-l-[6px] border-mango pl-4 text-xl leading-8 text-tapa-texto">
              Estamos sumando los primeros locales en {lista([...COMUNAS])}. Muy pronto los verás aquí.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {comercios.data.map((c) => (
                <Comercio key={c.slug} c={c} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function Comercio({ c }: { c: ComercioPublico }) {
  return (
    <li className="border-2 border-tapa-texto/40 px-5 py-4 transition-colors duration-200 hover:border-mango">
      <p className="rotulo text-2xl leading-tight">{c.nombre}</p>
      <p className="mt-1 text-lg text-tapa-texto">
        {c.rubro} · {c.direccion}
      </p>
    </li>
  )
}

const PREGUNTAS: { p: string; r: ReactNode }[] = [
  { p: '¿Cuánto cuesta?', r: 'Nada. Inscribirte y usar tu tarjeta es gratis.' },
  {
    p: '¿Tengo que descargar una aplicación?',
    r: 'No. Tu tarjeta es un enlace personal que te llega por WhatsApp. Lo abres en el navegador del celular.',
  },
  {
    p: '¿Mis puntos vencen?',
    r: 'Sí, después de un tiempo. Te avisamos por WhatsApp antes y siempre usamos primero los más antiguos.',
  },
  {
    p: '¿Qué hacen con mis datos?',
    r: (
      <>
        Los usamos solo para el programa y no los vendemos. Lee las{' '}
        <Link to="/condiciones">condiciones y el uso de datos</Link>.
      </>
    ),
  },
]

function Preguntas() {
  return (
    <Hoja viva id="preguntas" etiqueta="titulo-preguntas" className="py-16 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <EncabezadoSeccion
          id="titulo-preguntas"
          titulo="Preguntas frecuentes."
          bajada={
            <>
              Montos, plazos y reglas, en las{' '}
              <Link
                to="/condiciones"
                className="font-semibold text-tinta-azul underline decoration-mango decoration-2 underline-offset-[6px]"
              >
                condiciones del programa
              </Link>
              .
            </>
          }
        />
        <Accordion type="single" collapsible className="border-t-2 border-tapa bg-papel">
          {PREGUNTAS.map((item) => (
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

/** La tapa de la libreta: el llamado a los negocios. */
function ParaNegocios() {
  return (
    <section aria-labelledby="titulo-tapa" className="sobre-tapa border-b border-tapa-texto/30 bg-tapa text-papel">
      <div className="mx-auto flex max-w-[90rem] flex-col items-start gap-8 py-16 pr-4 pl-12 sm:py-24 sm:pr-8 lg:flex-row lg:items-end lg:justify-between lg:pl-44">
        <div>
          <h2 id="titulo-tapa" className="rotulo max-w-[16ch] text-[2.5rem] leading-[1.05] tracking-[-0.035em] sm:text-6xl">
            ¿Tienes un <Resaltado sobreTapa>negocio</Resaltado> en el barrio?
          </h2>
          <p className="mt-6 max-w-[32rem] text-xl leading-8 text-tapa-texto">
            Súmate al piloto y recibe clientes que hoy compran en otros locales.
          </p>
        </div>
        <Button asChild variant="libreta" size="lg">
          <Link to="/comercios">Conoce cómo funciona</Link>
        </Button>
      </div>
    </section>
  )
}
