import { Link } from 'react-router'
import { Hoja, Resaltado } from '@/components/marca/libreta'
import { Button } from '@/components/ui/button'
import { lista } from '@/lib/formato'
import { FormularioPiloto } from './FormularioPiloto'
import { COMUNAS } from './comunas'
import { EncabezadoSeccion, Pasos } from './partes'

export function PaginaComercios() {
  return (
    <>
      <Hero />
      <ComoFunciona />
      <Unirme />
    </>
  )
}

const RAZONES = [
  { titulo: 'Clientes nuevos', texto: 'Vecinos que juntaron puntos en otros locales vienen a canjearlos al tuyo.' },
  { titulo: 'Tú eliges el beneficio', texto: 'Un descuento o un producto, con las reglas que te acomoden.' },
  { titulo: 'Un tope que te cuida', texto: 'Cada semana tienes un cupo de descuentos según lo que vendes.' },
  { titulo: 'Sin costo en el piloto', texto: 'Validas los códigos desde tu celular, sin máquinas nuevas.' },
]

function Hero() {
  return (
    <Hoja viva etiqueta="titulo-comercios" className="border-b-2 border-tapa">
      <div className="grid items-center gap-12 py-14 sm:py-20 lg:min-h-[min(calc(100svh-5rem),48rem)] lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:gap-20">
        <div>
          <h1
            id="titulo-comercios"
            className="rotulo text-[3.25rem] leading-[1.0667] tracking-[-0.035em] text-tapa sm:text-7xl lg:text-[clamp(4.5rem,7vw,6.5rem)]"
          >
            Clientes{' '}
            <span className="resaltado" style={{ animation: 'resaltar 700ms cubic-bezier(0.45, 0, 0.2, 1) 350ms both' }}>
              nuevos
            </span>
            , del mismo barrio.
          </h1>
          <p className="mt-8 max-w-[32rem] text-xl leading-8 sm:text-[1.375rem]">
            Red Vecina une a los negocios de la cuadra en un solo programa de puntos. Lo que tus vecinos compran en
            otros locales <strong className="font-bold text-tapa">los trae al tuyo</strong>.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="libreta" size="lg">
              <Link to="/comercios#unirme">Quiero unirme al piloto</Link>
            </Button>
            <Button asChild variant="libreta-secundario" size="lg">
              <Link to="/comercios#como-funciona-comercio">Cómo funciona</Link>
            </Button>
          </div>
          <p className="mt-8 border-l-[6px] border-mango pl-4 text-lg text-lapiz">
            <strong className="font-bold text-mango-800">Piloto</strong> en {lista([...COMUNAS])}.
          </p>
        </div>

        <section aria-labelledby="titulo-razones" className="border-2 border-tapa bg-papel">
          <h2 id="titulo-razones" className="rotulo bg-tapa px-5 py-4 text-2xl text-papel">
            Lo que gana tu negocio
          </h2>
          <ul>
            {RAZONES.map((r) => (
              <li key={r.titulo} className="border-t-2 border-cuadricula px-5 py-4 first:border-t-0">
                <p className="rotulo text-[1.5rem] leading-tight text-tapa">{r.titulo}</p>
                <p className="mt-1 text-lg">{r.texto}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Hoja>
  )
}

function ComoFunciona() {
  return (
    <Hoja viva id="como-funciona-comercio" etiqueta="como-funciona-comercio-titulo" className="py-16 sm:py-24">
      <EncabezadoSeccion
        id="como-funciona-comercio-titulo"
        titulo={
          <>
            Partir es <Resaltado>simple</Resaltado>.
          </>
        }
        bajada="Nosotros armamos todo. Tú sigues atendiendo como siempre."
      />
      <Pasos
        pasos={[
          { numero: 1, titulo: 'Conversamos', texto: 'Te visitamos, vemos tu negocio y acordamos tus beneficios.' },
          {
            numero: 2,
            titulo: 'Pones el afiche',
            texto: 'Te damos un afiche con código QR para tu caja. Tus clientes se inscriben en un minuto.',
          },
          {
            numero: 3,
            titulo: 'Validas códigos',
            texto: 'El vecino te muestra su código, lo ingresas en tu celular y aplicas el beneficio.',
          },
        ]}
      />
    </Hoja>
  )
}

function Unirme() {
  return (
    <Hoja viva id="unirme" etiqueta="unirme-titulo" className="border-t-2 border-tapa py-16 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <EncabezadoSeccion
          id="unirme-titulo"
          titulo="Quiero unirme al piloto."
          bajada={`Por ahora el piloto corre en ${lista([...COMUNAS])}. Déjanos tus datos y te escribimos por WhatsApp para conversar. Sin compromiso.`}
        />
        <FormularioPiloto />
      </div>
    </Hoja>
  )
}
