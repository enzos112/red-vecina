import { FileWarning } from 'lucide-react'
import type { ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import type { CondicionesRed } from '@/lib/api'
import { useCondiciones } from '@/lib/consultas'
import { lista, pesos, puntos } from '@/lib/formato'
import { Contenedor } from './partes'

type Seccion = { id: string; titulo: string; cuerpo: ReactNode }

function secciones(c?: CondicionesRed): Seccion[] {
  return [
    {
      id: 'que-es',
      titulo: 'Qué es Red Vecina',
      cuerpo: (
        <p>
          Red Vecina es un programa de puntos compartido entre comercios de barrio. Juntas puntos
          con tus compras en un local de la red y los canjeas por beneficios en cualquier otro.
          Participar es gratis y voluntario.
        </p>
      ),
    },
    {
      id: 'inscripcion',
      titulo: 'Cómo te inscribes',
      cuerpo: (
        <>
          <p>
            Te inscribes escaneando el código QR de un comercio de la red. Te pedimos tu nombre y
            tu número de WhatsApp, y que aceptes estas condiciones.
          </p>
          <p>
            Recibes un enlace personal a tu tarjeta. Ese enlace funciona como una llave: no lo
            compartas. Si lo pierdes, te enviamos uno nuevo y el anterior deja de funcionar.
          </p>
        </>
      ),
    },
    {
      id: 'puntos',
      titulo: 'Cómo sumas puntos',
      cuerpo: c ? (
        <ul>
          <li>Ganas 1 punto por cada {pesos(c.pesos_por_punto)} de compra, redondeado hacia abajo.</li>
          <li>La boleta debe ser de al menos {pesos(c.compra_minima_sumar)}.</li>
          <li>Una boleta entrega como máximo {puntos(c.maximo_puntos_boleta)}.</li>
          <li>Subes la foto de la boleta dentro de {c.plazo_boleta_horas} horas desde la compra.</li>
          <li>
            Revisamos cada boleta antes de sumar los puntos. Podemos rechazar boletas ilegibles,
            repetidas o de comercios fuera de la red.
          </li>
        </ul>
      ) : null,
    },
    {
      id: 'canje',
      titulo: 'Cómo canjeas',
      cuerpo: c ? (
        <ul>
          <li>
            Los beneficios tienen niveles:{' '}
            {lista(c.niveles.map((n) => `${puntos(n.puntos)} (${pesos(n.valor_pesos)})`))}.
          </li>
          <li>
            Pides un código desde tu tarjeta y lo muestras en la caja antes de pagar. El código
            dura {c.vigencia_codigo_horas} horas.
          </li>
          <li>
            Puedes tener {c.codigos_activos === 1 ? 'un código activo' : `${c.codigos_activos} códigos activos`}{' '}
            a la vez.
          </li>
          <li>
            Puedes canjear hasta {c.canjes_por_comercio} {c.canjes_por_comercio === 1 ? 'vez' : 'veces'} en
            un mismo comercio cada {c.canjes_por_comercio_dias} días, y hasta {c.canjes_red}{' '}
            {c.canjes_red === 1 ? 'vez' : 'veces'} en toda la red cada {c.canjes_red_dias} días.
          </li>
          {c.boletas_para_canjear > 0 && (
            <li>
              Para tu primer canje necesitas {c.boletas_para_canjear}{' '}
              {c.boletas_para_canjear === 1 ? 'boleta aprobada' : 'boletas aprobadas'}.
            </li>
          )}
          <li>
            Cada comercio define su beneficio y puede pedir una compra mínima, de hasta{' '}
            {c.veces_compra_minima_canje} veces el valor del descuento. La ves antes de pedir el
            código.
          </li>
          <li>
            Los comercios tienen un cupo semanal de canjes. Si un comercio llega a su cupo, sus
            beneficios vuelven a estar disponibles la semana siguiente.
          </li>
        </ul>
      ) : null,
    },
    {
      id: 'vigencia',
      titulo: 'Vigencia de los puntos',
      cuerpo: c ? (
        <>
          <p>
            Tus puntos vencen a los {c.vigencia_puntos_dias} días desde la compra. Al canjear,
            usamos primero los más antiguos. Te avisamos por WhatsApp{' '}
            {lista(c.avisos_vencimiento_dias)} días antes del vencimiento.
          </p>
          <p>
            Si no registras compras en {c.cuenta_sin_compras_dias} días, podemos cerrar tu cuenta.
            Si crees que falta un saldo, puedes reclamar dentro de {c.plazo_reclamo_dias} días
            desde la compra.
          </p>
        </>
      ) : null,
    },
    {
      id: 'datos',
      titulo: 'Tus datos',
      cuerpo: (
        <>
          <p>Guardamos solo lo necesario para el programa:</p>
          <ul>
            <li>Tu nombre y tu número de WhatsApp.</li>
            <li>El comercio donde te inscribiste y la fecha en que aceptaste estas condiciones.</li>
            <li>Las fotos de tus boletas, con su fecha, monto y comercio.</li>
            <li>Tus puntos, tus códigos de canje y su uso.</li>
          </ul>
          <p>
            Usamos estos datos para sumar y canjear tus puntos, enviarte avisos por WhatsApp y
            evitar abusos. Los comercios ven cifras de la red, no tu historial de compras en otros
            locales. No vendemos tus datos.
          </p>
          <p>
            Puedes pedir ver, corregir o borrar tus datos, o salir del programa cuando quieras.
            Tratamos tus datos según la ley chilena de protección de datos personales.
          </p>
        </>
      ),
    },
    {
      id: 'cambios',
      titulo: 'Cambios y término del programa',
      cuerpo: c ? (
        <p>
          Podemos ajustar estas condiciones durante el piloto. Si el programa termina, te avisamos
          con {c.aviso_cierre_dias} días de anticipación para que uses tus puntos.
        </p>
      ) : null,
    },
    {
      id: 'contacto',
      titulo: 'Contacto',
      cuerpo: (
        <p>
          Para dudas, reclamos o solicitudes sobre tus datos, escríbenos por WhatsApp o pregunta en
          cualquier comercio de la red. <em>Pendiente: datos de contacto del responsable.</em>
        </p>
      ),
    },
  ]
}

const estiloTexto =
  'mt-4 flex flex-col gap-4 text-lg text-tinta/90 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6 [&_li]:marker:text-vecina'

export function PaginaCondiciones() {
  const condiciones = useCondiciones()
  const c = condiciones.data

  return (
    <Contenedor className="py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold tracking-wide text-vecina uppercase">Condiciones</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">
          Condiciones del programa y uso de datos
        </h1>

        <Alert variant="alerta" className="mt-8">
          <FileWarning />
          <AlertTitle>Borrador pendiente de revisión legal</AlertTitle>
          <AlertDescription>
            Este texto explica cómo funciona el piloto. Todavía no lo revisa un abogado y puede
            cambiar.
          </AlertDescription>
        </Alert>

        {condiciones.isError && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Faltan algunas cifras</AlertTitle>
            <AlertDescription>{condiciones.error.message}</AlertDescription>
          </Alert>
        )}

        <nav aria-label="Contenido" className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-extrabold">En esta página</h2>
          <ol className="mt-3 grid list-decimal gap-x-8 pl-6 sm:grid-cols-2">
            {secciones(c).map((s) => (
              <li key={s.id} className="marker:font-bold marker:text-vecina">
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-12 items-center text-vecina underline underline-offset-4 hover:text-vecina-oscuro"
                >
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-6">
          {secciones(c).map((s, i) => (
            <section key={s.id} aria-labelledby={s.id} className="border-b border-border py-10 last:border-0">
              <h2 id={s.id} className="scroll-mt-6 text-2xl font-extrabold sm:text-3xl">
                {i + 1}. {s.titulo}
              </h2>
              <div className={estiloTexto}>
                {s.cuerpo ??
                  (condiciones.isPending ? (
                    <div className="flex flex-col gap-3" aria-label="Cargando">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-5/6" />
                      <Skeleton className="h-6 w-2/3" />
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No pudimos cargar las cifras vigentes. Intenta de nuevo en un rato.
                    </p>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Contenedor>
  )
}
