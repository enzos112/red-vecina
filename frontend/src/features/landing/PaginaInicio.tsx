import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { FormasFondo } from '@/components/marca/FormasFondo'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ComercioPublico, CondicionesRed } from '@/lib/api'
import { useComerciosRed, useCondiciones } from '@/lib/consultas'
import { lista, pesos, puntos } from '@/lib/formato'
import { TarjetaEjemplo } from './TarjetaEjemplo'
import { Contenedor, EncabezadoSeccion, Pasos } from './partes'

export function PaginaInicio() {
  const condiciones = useCondiciones()
  const c = condiciones.data
  return (
    <>
      <Hero />
      <ComoFunciona c={c} />
      <Comercios />
      <Preguntas c={c} />
      <LlamadoComercios />
    </>
  )
}

function Hero() {
  return (
    <section
      aria-labelledby="titulo-hero"
      className="sobre-oscuro relative isolate overflow-hidden bg-barrio"
    >
      <FormasFondo className="-z-10" />
      <Contenedor className="grid min-h-[calc(100svh-4.5rem)] items-center gap-12 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
        <div className="aparecer">
          <h1
            id="titulo-hero"
            className="text-[2.75rem] leading-[1.02] font-extrabold tracking-tight text-crema sm:text-6xl lg:text-7xl"
          >
            Tus compras del barrio ahora suman.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-crema/85 sm:text-xl">
            Compra en los negocios de tu cuadra, sube la foto de tu boleta y junta puntos. Los
            canjeas por descuentos en cualquier local de la red.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="oscuro" size="lg">
              <Link to="/#comercios">Ver comercios</Link>
            </Button>
            <Button asChild variant="oscuro-secundario" size="lg">
              <Link to="/#como-funciona">Cómo funciona</Link>
            </Button>
          </div>
        </div>
        <div className="aparecer flex justify-center lg:justify-end [animation-delay:150ms]">
          <TarjetaEjemplo />
        </div>
      </Contenedor>
    </section>
  )
}

function ComoFunciona({ c }: { c?: CondicionesRed }) {
  return (
    <section aria-labelledby="como-funciona" className="scroll-mt-4 py-20 sm:py-28">
      <Contenedor>
        <EncabezadoSeccion
          id="como-funciona"
          antetitulo="Cómo funciona"
          titulo="Tres pasos. Sin apps ni claves."
          bajada="Tu tarjeta es un enlace que te llega por WhatsApp. La abres en el celular cuando quieras."
        />
        <Pasos
          pasos={[
            {
              numero: 1,
              titulo: 'Inscríbete en el local',
              texto:
                'Escanea el código QR en la caja de un comercio de la red. Solo te pedimos tu nombre y tu WhatsApp.',
            },
            {
              numero: 2,
              titulo: 'Sube tu boleta',
              texto: c
                ? `Saca una foto a tu boleta desde tu tarjeta. Ganas 1 punto por cada ${pesos(c.pesos_por_punto)} de compra.`
                : 'Saca una foto a tu boleta desde tu tarjeta y suma puntos por cada compra.',
            },
            {
              numero: 3,
              titulo: 'Canjea donde quieras',
              texto:
                'Elige un beneficio, pide tu código y muéstralo en la caja. Sirve en cualquier local de la red.',
            },
          ]}
        />
      </Contenedor>
    </section>
  )
}

function Comercios() {
  const comercios = useComerciosRed()
  return (
    <section aria-labelledby="comercios" className="scroll-mt-4 border-y border-border bg-card py-20 sm:py-28">
      <Contenedor>
        <EncabezadoSeccion
          id="comercios"
          antetitulo="Comercios de la red"
          titulo="Tus puntos valen en todos estos locales."
          bajada="Junta en uno y canjea en otro. Cada comercio elige su beneficio."
        />
        <div className="mt-12">
          {comercios.isPending ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando comercios">
              {[0, 1, 2].map((i) => (
                <li key={i} className="rounded-xl border border-border p-6">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="mt-5 h-8 w-3/4" />
                  <Skeleton className="mt-3 h-6 w-1/2" />
                  <Skeleton className="mt-6 h-24 w-full" />
                </li>
              ))}
            </ul>
          ) : comercios.isError ? (
            <Alert variant="destructive">
              <AlertTitle>No pudimos cargar los comercios</AlertTitle>
              <AlertDescription>
                <p>{comercios.error.message}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => comercios.refetch()}>
                  Intentar de nuevo
                </Button>
              </AlertDescription>
            </Alert>
          ) : comercios.data.length === 0 ? (
            <Alert>
              <AlertTitle>Pronto sumaremos comercios</AlertTitle>
              <AlertDescription>Estamos armando la red de tu barrio.</AlertDescription>
            </Alert>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {comercios.data.map((comercio) => (
                <li key={comercio.slug} className="flex">
                  <TarjetaComercio comercio={comercio} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Contenedor>
    </section>
  )
}

function TarjetaComercio({ comercio }: { comercio: ComercioPublico }) {
  const beneficio = comercio.destacado
  return (
    <Card className="w-full bg-background">
      <CardHeader>
        <Badge variant="secondary">{comercio.rubro}</Badge>
        <CardTitle className="mt-3 text-2xl">{comercio.nombre}</CardTitle>
        <p className="text-muted-foreground">{comercio.direccion}</p>
      </CardHeader>
      <CardContent className="mt-auto">
        {beneficio ? (
          <div className="rounded-lg bg-secondary p-5">
            <p className="text-sm font-bold tracking-wide text-vecina uppercase">Con {puntos(beneficio.puntos)}</p>
            <p className="mt-1 text-lg font-bold">{beneficio.texto}</p>
            {beneficio.compra_minima > 0 && (
              <p className="mt-1 text-muted-foreground">
                En compras desde {pesos(beneficio.compra_minima)}.
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-muted p-5 text-muted-foreground">
            Muy pronto publicará su beneficio.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

type Pregunta = { p: string; r: ReactNode }

function preguntas(c?: CondicionesRed): Pregunta[] {
  return [
    {
      p: '¿Cuánto cuesta?',
      r: 'Nada. Inscribirte y usar tu tarjeta es gratis.',
    },
    {
      p: '¿Tengo que descargar una aplicación?',
      r: 'No. Tu tarjeta es un enlace personal que te llega por WhatsApp. Lo abres en el navegador del celular, sin crear claves.',
    },
    {
      p: '¿Cuántos puntos gano?',
      r: c ? (
        <>
          Ganas 1 punto por cada {pesos(c.pesos_por_punto)} de tu boleta. La compra debe ser
          desde {pesos(c.compra_minima_sumar)} y subes la foto dentro de {c.plazo_boleta_horas}{' '}
          horas.
        </>
      ) : (
        'Ganas puntos según el monto de tu boleta. Súbela apenas compres.'
      ),
    },
    {
      p: '¿Cuánto valen mis puntos?',
      r: c ? (
        <>
          <ul className="mb-3 flex flex-col gap-1">
            {c.niveles.map((n) => (
              <li key={n.numero}>
                <strong className="text-tinta">{puntos(n.puntos)}</strong>: un beneficio de{' '}
                {pesos(n.valor_pesos)}.
              </li>
            ))}
          </ul>
          <p>Cada comercio elige qué ofrece en cada nivel. Algunos piden una compra mínima: la ves antes de pedir tu código.</p>
        </>
      ) : (
        'Cada nivel de puntos te da un descuento o un producto. Cada comercio elige qué ofrece.'
      ),
    },
    {
      p: '¿Mis puntos vencen?',
      r: c ? (
        <>
          Sí, a los {c.vigencia_puntos_dias} días desde la compra. Siempre usamos primero los más
          antiguos. Te avisamos por WhatsApp {lista(c.avisos_vencimiento_dias)} días antes.
        </>
      ) : (
        'Sí. Siempre usamos primero los más antiguos y te avisamos por WhatsApp antes de que venzan.'
      ),
    },
    {
      p: '¿Cómo canjeo?',
      r: c ? (
        <>
          En tu tarjeta eliges el beneficio y pides un código. Lo muestras en la caja antes de
          pagar. El código dura {c.vigencia_codigo_horas} horas.
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
          Usamos tu nombre, tu WhatsApp y tus boletas solo para el programa. No vendemos tus
          datos. Lee las <Link to="/condiciones">condiciones y el uso de datos</Link>.
        </>
      ),
    },
  ]
}

function Preguntas({ c }: { c?: CondicionesRed }) {
  return (
    <section aria-labelledby="preguntas" className="scroll-mt-4 py-20 sm:py-28">
      <Contenedor className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <EncabezadoSeccion
          id="preguntas"
          antetitulo="Preguntas frecuentes"
          titulo="Lo que más nos preguntan."
          bajada="¿Te quedó una duda? Pregunta en la caja de cualquier local de la red."
        />
        <Accordion type="single" collapsible className="border-t-2 border-border">
          {preguntas(c).map((item) => (
            <AccordionItem key={item.p} value={item.p}>
              <AccordionTrigger>{item.p}</AccordionTrigger>
              <AccordionContent>{item.r}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Contenedor>
    </section>
  )
}

function LlamadoComercios() {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <div className="sobre-oscuro relative isolate mx-auto max-w-7xl overflow-hidden rounded-2xl bg-vecina px-6 py-14 sm:px-12 sm:py-20">
        <FormasFondo variante="bloque" sobre="vecina" className="-z-10" />
        <h2 className="max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          ¿Tienes un negocio en el barrio?
        </h2>
        <p className="mt-5 max-w-xl text-lg text-white/90 sm:text-xl">
          Súmate al piloto y recibe clientes que hoy compran en otros locales.
        </p>
        <Button asChild variant="oscuro" size="lg" className="mt-8">
          <Link to="/comercios">Conoce cómo funciona</Link>
        </Button>
      </div>
    </section>
  )
}
