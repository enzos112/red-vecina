import { CheckCircle2, Handshake, QrCode, ScanLine, ShieldCheck, Smartphone, Users, Gift } from 'lucide-react'
import { Link } from 'react-router'
import { FormasFondo } from '@/components/marca/FormasFondo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useComerciosRed, useCondiciones } from '@/lib/consultas'
import { pesos } from '@/lib/formato'
import { FormularioPiloto } from './FormularioPiloto'
import { Contenedor, EncabezadoSeccion, Pasos } from './partes'

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
    <section aria-labelledby="titulo-comercios" className="sobre-oscuro relative isolate overflow-hidden bg-barrio">
      <FormasFondo className="-z-10" />
      <Contenedor className="grid min-h-[calc(100svh-4.5rem)] items-center gap-12 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
        <div className="aparecer">
          <p className="text-sm font-bold tracking-wide text-mango uppercase">Para dueños de negocios</p>
          <h1
            id="titulo-comercios"
            className="mt-4 text-[2.75rem] leading-[1.02] font-extrabold tracking-tight text-crema sm:text-6xl lg:text-7xl"
          >
            Clientes nuevos, del mismo barrio.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-crema/85 sm:text-xl">
            Red Vecina une a los almacenes, panaderías y negocios de la cuadra en un solo programa
            de puntos. Lo que tus vecinos compran en otros locales los trae al tuyo.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="oscuro" size="lg">
              <Link to="/comercios#unirme">Quiero unirme al piloto</Link>
            </Button>
            <Button asChild variant="oscuro-secundario" size="lg">
              <Link to="/comercios#como-funciona-comercio">Cómo funciona</Link>
            </Button>
          </div>
        </div>
        <div className="aparecer flex justify-center lg:justify-end [animation-delay:150ms]">
          <ValidadorEjemplo />
        </div>
      </Contenedor>
    </section>
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
    <figure aria-label="Ejemplo del validador de códigos" className="w-full max-w-sm rounded-2xl bg-card p-6 text-tinta sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold">Validar código</p>
        <Badge variant="mango">Ejemplo</Badge>
      </div>
      <p
        className="mt-6 rounded-lg border-2 border-input bg-background py-4 text-center font-mono text-4xl font-bold tracking-[0.2em]"
        aria-label="Código de ejemplo"
      >
        482 913
      </p>
      <div className="mt-5 rounded-lg bg-exito-fondo p-5">
        <p className="flex items-center gap-2 text-lg font-extrabold text-exito-texto">
          <CheckCircle2 className="size-6" aria-hidden="true" />
          Código válido
        </p>
        {cargando ? (
          <Skeleton className="mt-2 h-6 w-3/4 bg-white/60" />
        ) : (
          <p className="mt-1 text-tinta">
            {destacado?.texto ?? (valor ? `Descuento de ${pesos(valor)}` : 'Beneficio de la red')}
          </p>
        )}
      </div>
      <p className="mt-5 text-muted-foreground">Lo validas desde tu celular, sin máquinas nuevas.</p>
    </figure>
  )
}

const RAZONES = [
  {
    icono: Users,
    titulo: 'Clientes que vienen de otros locales',
    texto: 'Cada vecino que llega con puntos de otro negocio es un cliente nuevo. Tu reporte te muestra cuántos llegaron.',
  },
  {
    icono: Gift,
    titulo: 'Tú eliges el beneficio',
    texto: 'Un descuento o un producto, con las reglas que te acomoden. Cambiarlo es simple.',
  },
  {
    icono: ShieldCheck,
    titulo: 'Un tope que te cuida',
    texto: 'Cada semana tienes un cupo de descuentos según tus ventas. Si se usa entero, tus beneficios descansan hasta la semana siguiente.',
  },
  {
    icono: Smartphone,
    titulo: 'Sin máquinas ni costos',
    texto: 'Validas los códigos desde tu celular. Durante el piloto no cobramos nada.',
  },
]

function QueGanas() {
  return (
    <section aria-labelledby="que-ganas" className="py-20 sm:py-28">
      <Contenedor>
        <EncabezadoSeccion
          id="que-ganas"
          antetitulo="Qué ganas"
          titulo="Más movimiento en tu caja."
          bajada="Los vecinos ya compran cerca. Con la red, también te eligen a ti."
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2">
          {RAZONES.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo} className="flex gap-5 rounded-xl border border-border bg-card p-6 sm:p-8">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-vecina">
                <Icono className="size-7" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-xl font-extrabold sm:text-2xl">{titulo}</h3>
                <p className="mt-2 text-muted-foreground">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </Contenedor>
    </section>
  )
}

function ComoFunciona() {
  return (
    <section aria-labelledby="como-funciona-comercio" className="scroll-mt-4 border-y border-border bg-card py-20 sm:py-28">
      <Contenedor>
        <EncabezadoSeccion
          id="como-funciona-comercio"
          antetitulo="Cómo funciona"
          titulo="Partir es simple."
          bajada="Nosotros armamos todo. Tú sigues atendiendo como siempre."
        />
        <Pasos
          pasos={[
            {
              numero: 1,
              titulo: 'Conversamos',
              icono: <Handshake />,
              texto: 'Te visitamos, vemos tu negocio y acordamos tus beneficios.',
            },
            {
              numero: 2,
              titulo: 'Pones el afiche',
              icono: <QrCode />,
              texto: 'Te damos un afiche con código QR para tu caja. Tus clientes se inscriben en un minuto.',
            },
            {
              numero: 3,
              titulo: 'Validas códigos',
              icono: <ScanLine />,
              texto: 'El vecino te muestra su código, lo ingresas en tu celular y aplicas el beneficio.',
            },
          ]}
        />
      </Contenedor>
    </section>
  )
}

function Unirme() {
  return (
    <section aria-labelledby="unirme" className="scroll-mt-4 py-20 sm:py-28">
      <Contenedor className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <EncabezadoSeccion
          id="unirme"
          antetitulo="Piloto"
          titulo="Quiero unirme al piloto."
          bajada="Déjanos tus datos y te escribimos por WhatsApp para conversar. Sin compromiso."
        />
        <FormularioPiloto />
      </Contenedor>
    </section>
  )
}
