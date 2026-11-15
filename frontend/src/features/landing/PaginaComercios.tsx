import { Link } from 'react-router'
import { Hoja } from '@/components/marca/libreta'
import { Button } from '@/components/ui/button'
import { useComerciosRed, useCondiciones } from '@/lib/consultas'
import { pesos } from '@/lib/formato'
import { FormularioPiloto } from './FormularioPiloto'
import { EncabezadoSeccion, Pasos } from './partes'

export function PaginaComercios() {
  return (
    <>
      <Hero />
      <QueGanas />
      <ComoFunciona />
      <Unirme />
    </>
  )
}

function Hero() {
  return (
    <Hoja etiqueta="titulo-comercios" className="border-b-2 border-tapa">
      <div className="grid items-center gap-12 py-12 sm:py-16 lg:min-h-[min(calc(100svh-5rem),52rem)] lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:gap-16">
        <div>
          <h1
            id="titulo-comercios"
            className="rotulo text-[3.25rem] leading-[1.0667] tracking-[-0.035em] text-tapa sm:text-7xl lg:text-[clamp(4.5rem,7vw,6.5rem)]"
          >
            Clientes nuevos, del mismo barrio.
          </h1>
          <p className="mt-8 max-w-[34rem] text-xl leading-8 sm:text-[1.375rem]">
            Red Vecina une a los almacenes, panaderías y negocios de la cuadra en un solo programa de puntos. Lo que
            tus vecinos compran en otros locales los trae al tuyo.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="libreta" size="lg">
              <Link to="/comercios#unirme">Quiero unirme al piloto</Link>
            </Button>
            <Button asChild variant="libreta-secundario" size="lg">
              <Link to="/comercios#como-funciona-comercio">Cómo funciona</Link>
            </Button>
          </div>
        </div>
        <div>
          <ValidadorEjemplo />
          <p className="mt-3 text-[0.9375rem] text-lapiz">Ilustración con datos de ejemplo.</p>
        </div>
      </div>
    </Hoja>
  )
}

/** Muestra del validador del comercio, con el beneficio destacado que entrega la API. */
function ValidadorEjemplo() {
  const comercios = useComerciosRed()
  const condiciones = useCondiciones()
  const destacado = comercios.data?.find((c) => c.destacado)?.destacado
  const niveles = condiciones.data?.niveles ?? []
  const valor = destacado?.valor_pesos ?? niveles[Math.floor(niveles.length / 2)]?.valor_pesos
  const cargando = comercios.isPending || condiciones.isPending

  return (
    <figure aria-label="Ejemplo del validador de códigos" className="border-2 border-tapa bg-papel">
      <figcaption className="flex h-16 items-center justify-between gap-3 bg-tapa px-4 text-papel">
        <span className="rotulo text-2xl">Validar código</span>
        <span className="text-[0.9375rem] font-semibold text-tapa-texto">Ejemplo</span>
      </figcaption>
      <p className="flex gap-1.5 p-4" aria-label="Código de ejemplo: 4 8 2 9 1 3">
        {'482913'.split('').map((d, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="rotulo grid aspect-[4/5] flex-1 place-items-center border-2 border-tapa text-4xl text-tapa"
          >
            {d}
          </span>
        ))}
      </p>
      <div className="mx-4 border-2 border-exito bg-exito-fondo px-4 py-3">
        <p className="text-lg font-extrabold text-exito-texto">Válido</p>
        <p className="mt-1 min-h-7 text-lg font-bold text-tinta">
          {cargando ? '' : (destacado?.texto ?? (valor ? `Descuento de ${pesos(valor)}` : 'Beneficio de la red'))}
        </p>
      </div>
      <p className="border-t border-cuadricula px-4 py-4 text-lg">Lo validas desde tu celular, sin máquinas nuevas.</p>
    </figure>
  )
}

const RAZONES = [
  {
    clave: 'Clientes',
    titulo: 'Clientes que vienen de otros locales',
    texto: 'Cada vecino que llega con puntos de otro negocio es un cliente nuevo. Tu reporte te muestra cuántos llegaron.',
  },
  {
    clave: 'Tu regla',
    titulo: 'Tú eliges el beneficio',
    texto: 'Un descuento o un producto, con las reglas que te acomoden. Cambiarlo es simple.',
  },
  {
    clave: 'Con tope',
    titulo: 'Un tope que te cuida',
    texto: 'Cada semana tienes un cupo de descuentos según tus ventas. Si se usa entero, tus beneficios descansan hasta la semana siguiente.',
  },
  {
    clave: '$0',
    titulo: 'Sin máquinas ni costos',
    texto: 'Validas los códigos desde tu celular. Durante el piloto no cobramos nada.',
  },
]

function QueGanas() {
  return (
    <section aria-labelledby="que-ganas" className="sobre-tapa bg-tapa py-16 text-papel sm:py-24">
      <div className="mx-auto max-w-[90rem] pr-4 pl-12 sm:pr-8 lg:pl-44">
        <EncabezadoSeccion
          id="que-ganas"
          oscuro
          titulo="Más movimiento en tu caja."
          bajada="Los vecinos ya compran cerca. Con la red, también te eligen a ti."
        />
        <ul className="mt-12 grid border-t-2 border-tapa-texto/50 sm:grid-cols-2">
          {RAZONES.map(({ clave, titulo, texto }) => (
            <li key={titulo} className="border-b-2 border-tapa-texto/30 py-8 sm:odd:pr-10 sm:even:border-l-2 sm:even:pl-10">
              <p className="rotulo text-5xl leading-none tracking-[-0.035em] sm:text-6xl">{clave}</p>
              <h3 className="rotulo mt-5 text-[1.75rem] leading-tight">{titulo}</h3>
              <p className="mt-2 max-w-md text-lg leading-8 text-tapa-texto">{texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function ComoFunciona() {
  return (
    <Hoja id="como-funciona-comercio" etiqueta="como-funciona-comercio-titulo" className="py-16 sm:py-24">
      <EncabezadoSeccion
        id="como-funciona-comercio-titulo"
        titulo="Partir es simple."
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
    <Hoja id="unirme" etiqueta="unirme-titulo" className="border-t-2 border-tapa py-16 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <EncabezadoSeccion
          id="unirme-titulo"
          titulo="Quiero unirme al piloto."
          bajada="Déjanos tus datos y te escribimos por WhatsApp para conversar. Sin compromiso."
        />
        <FormularioPiloto />
      </div>
    </Hoja>
  )
}
