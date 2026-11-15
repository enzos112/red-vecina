import { CalendarClock, CheckCircle2, ChevronRight, Gift, History, MessageCircle, Receipt, Upload } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import type { Tarjeta } from '@/lib/api'
import { useCondiciones } from '@/lib/consultas'
import { dia, numero, pesos, puntos } from '@/lib/formato'
import { CodigoActivo } from './CodigoActivo'
import { esTarjetaInexistente, enlaceWhatsapp, recordarTarjeta, useTarjeta, useToken } from './consultas'
import { FilaHistorial } from './FilaHistorial'
import { armarHistorial } from './historial'
import { ErrorBloque, TarjetaNoEncontrada, Vacio } from './partes'

/** Cuántos movimientos recientes se ven en la tarjeta antes de "Ver todo". */
const RECIENTES = 3

/** Estado que dejan otras pantallas al volver a la tarjeta. */
export type AvisoTarjeta = { bienvenida?: boolean; boletaEnviada?: boolean }

function Cargando() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando tu tarjeta">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-56 w-full rounded-3xl" />
      <Skeleton className="h-13 w-full rounded-full" />
      <Skeleton className="h-13 w-full rounded-full" />
    </div>
  )
}

function GuardarEnWhatsapp({ t, token, onCerrar }: { t: Tarjeta; token: string; onCerrar: () => void }) {
  return (
    <section aria-labelledby="titulo-bienvenida" className="sobre-oscuro aparecer rounded-3xl bg-barrio p-6 text-crema">
      <CheckCircle2 className="size-10 text-mango" aria-hidden="true" />
      <h2 id="titulo-bienvenida" className="mt-3 text-3xl font-extrabold">
        ¡Listo, ya eres parte de Red Vecina!
      </h2>
      <p className="mt-2 text-lg">
        Esta es tu tarjeta. Guárdala en tu WhatsApp para abrirla cuando quieras: te mandas el enlace a tu propio chat.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Button asChild variant="oscuro" size="lg" className="h-auto min-h-14 w-full py-3 text-center whitespace-normal">
          <a href={enlaceWhatsapp(t.whatsapp.numero, t.whatsapp.mensaje, token)} target="_blank" rel="noreferrer">
            <MessageCircle data-icon="inline-start" />
            Guardar mi tarjeta en WhatsApp
          </a>
        </Button>
        <Button variant="oscuro-secundario" className="w-full" onClick={onCerrar}>
          Ahora no
        </Button>
      </div>
    </section>
  )
}

function Saldo({ t, destacado }: { t: Tarjeta; destacado: boolean }) {
  const proximo = t.proximo_nivel
  const avance = proximo ? Math.min(100, (Math.max(t.saldo.disponible, 0) / proximo.puntos) * 100) : 100
  const pendientes = t.pendientes
  return (
    <section aria-labelledby="titulo-saldo" className="rounded-3xl border border-border bg-card p-6">
      <h2 id="titulo-saldo" className="text-base font-semibold text-muted-foreground">
        Tu saldo disponible
      </h2>
      <p
        className={
          destacado
            ? 'mt-1 text-7xl font-extrabold tracking-tight tabular-nums'
            : 'mt-1 text-5xl font-extrabold tracking-tight tabular-nums'
        }
      >
        {numero(t.saldo.disponible)}{' '}
        <span className="text-2xl font-bold text-muted-foreground">{t.saldo.disponible === 1 ? 'punto' : 'puntos'}</span>
      </p>

      {(t.saldo.retenido > 0 || pendientes.boletas > 0) && (
        <ul className="mt-3 flex flex-col gap-1 text-base">
          {t.saldo.retenido > 0 && (
            <li>
              <strong>{puntos(t.saldo.retenido)}</strong> reservados en tu código.
            </li>
          )}
          {pendientes.boletas > 0 && (
            <li>
              {pendientes.puntos > 0 ? (
                <>
                  <strong>{puntos(pendientes.puntos)}</strong> pendientes de{' '}
                </>
              ) : (
                'Pendientes: '
              )}
              {pendientes.boletas === 1 ? '1 boleta en revisión' : `${pendientes.boletas} boletas en revisión`}.
            </li>
          )}
        </ul>
      )}

      <div className="mt-6">
        <Progress
          value={avance}
          aria-label={proximo ? `Llevas ${numero(Math.max(t.saldo.disponible, 0))} de ${numero(proximo.puntos)} puntos` : 'Meta cumplida'}
        />
        <p className="mt-3 text-lg">
          {proximo ? (
            <>
              Te faltan <strong>{puntos(proximo.faltan)}</strong> para un descuento de <strong>{pesos(proximo.valor_pesos)}</strong>.
            </>
          ) : (
            <>Ya te alcanza para el beneficio más grande. ¡Revisa tus beneficios!</>
          )}
        </p>
      </div>
    </section>
  )
}

function PorVencer({ t }: { t: Tarjeta }) {
  if (t.por_vencer.length === 0) return null
  return (
    <Alert variant="alerta">
      <CalendarClock aria-hidden="true" />
      <AlertTitle>Tienes puntos por vencer</AlertTitle>
      <AlertDescription>
        <ul>
          {t.por_vencer.map((v) => (
            <li key={v.fecha}>
              <strong>{puntos(v.puntos)}</strong> vencen el {dia(v.fecha)}.
            </li>
          ))}
        </ul>
        <p className="mt-1">Úsalos antes en un beneficio.</p>
      </AlertDescription>
    </Alert>
  )
}

function Recientes({ t, token }: { t: Tarjeta; token: string }) {
  const items = armarHistorial(t)
  return (
    <section aria-labelledby="titulo-recientes" className="flex flex-col gap-3">
      <h2 id="titulo-recientes" className="text-2xl font-extrabold">
        Lo último
      </h2>
      {items.length === 0 ? (
        <Vacio icono={Receipt} titulo="Aún no tienes movimientos">
          Cuando subas tu primera boleta, aparecerá aquí.
        </Vacio>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.slice(0, RECIENTES).map((item) => (
              <FilaHistorial key={item.clave} item={item} />
            ))}
          </ul>
          <Button asChild variant="link" className="self-start">
            <Link to={`/t/${token}/historial`}>
              <History data-icon="inline-start" />
              Ver todo mi historial
            </Link>
          </Button>
        </>
      )}
    </section>
  )
}

/** /t/:token — la tarjeta del vecino. */
export function PaginaTarjeta() {
  const token = useToken()
  const tarjeta = useTarjeta(token)
  const condiciones = useCondiciones()
  const location = useLocation()
  const navigate = useNavigate()
  const aviso = (location.state ?? {}) as AvisoTarjeta

  useEffect(() => {
    if (tarjeta.isSuccess) recordarTarjeta(token)
  }, [tarjeta.isSuccess, token])

  const quitarAviso = () => navigate('.', { replace: true, state: null })

  if (tarjeta.isPending) return <Cargando />
  if (tarjeta.isError) {
    if (esTarjetaInexistente(tarjeta.error)) return <TarjetaNoEncontrada />
    return <ErrorBloque titulo="No pudimos abrir tu tarjeta" error={tarjeta.error} reintentar={() => void tarjeta.refetch()} />
  }

  const t = tarjeta.data
  const codigo = t.codigo_activo
  const primerNombre = t.nombre.trim().split(/\s+/)[0]
  const plazo = condiciones.data?.plazo_validacion_horas

  return (
    <div className="aparecer flex flex-col gap-5">
      <h1 className="text-3xl font-extrabold">Hola, {primerNombre}</h1>

      {aviso.bienvenida && <GuardarEnWhatsapp t={t} token={token} onCerrar={quitarAviso} />}

      {aviso.boletaEnviada && (
        <Alert variant="exito" role="status">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Recibimos tu boleta</AlertTitle>
          <AlertDescription>
            {plazo ? `La revisamos en menos de ${plazo} horas.` : 'La revisaremos pronto.'} Tus puntos aparecen aquí al
            aprobarla.
          </AlertDescription>
        </Alert>
      )}

      {t.estado === 'suspendido' && (
        <Alert variant="destructive">
          <AlertTitle>Tu cuenta está suspendida</AlertTitle>
          <AlertDescription>Escríbele al equipo de Red Vecina para revisarla.</AlertDescription>
        </Alert>
      )}

      {codigo && <CodigoActivo codigo={codigo} token={token} />}

      <Saldo t={t} destacado={!codigo} />

      <PorVencer t={t} />

      <div className="flex flex-col gap-3">
        <Button asChild size="lg" variant={codigo ? 'secondary' : 'default'} className="w-full">
          <Link to={`/t/${token}/boleta`}>
            <Upload data-icon="inline-start" />
            Subir boleta
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-between">
          <Link to={`/t/${token}/beneficios`}>
            <span className="inline-flex items-center gap-2">
              <Gift className="size-5" aria-hidden="true" />
              Mis beneficios
            </span>
            <ChevronRight className="size-5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <Recientes t={t} token={token} />

      {!aviso.bienvenida && (
        <Button asChild variant="link" className="self-start">
          <a href={enlaceWhatsapp(t.whatsapp.numero, t.whatsapp.mensaje, token)} target="_blank" rel="noreferrer">
            <MessageCircle data-icon="inline-start" />
            Guardar mi tarjeta en WhatsApp
          </a>
        </Button>
      )}
    </div>
  )
}
