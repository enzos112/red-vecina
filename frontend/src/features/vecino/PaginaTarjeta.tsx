import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Circulo } from '@/components/marca/libreta'
import type { Tarjeta } from '@/lib/api'
import { useCondiciones } from '@/lib/consultas'
import { dia, numero, pesos, puntos } from '@/lib/formato'
import { CodigoActivo } from './CodigoActivo'
import { esTarjetaInexistente, enlaceWhatsapp, recordarTarjeta, useTarjeta, useToken } from './consultas'
import { FilaHistorial } from './FilaHistorial'
import { armarHistorial } from './historial'
import { ErrorBloque, TarjetaNoEncontrada, Vacio } from './partes'

/** Cuántos movimientos recientes se ven en la tarjeta antes de "Ver todo" (celular y computador). */
const RECIENTES = 3
const RECIENTES_ANCHO = 7

/** Estado que dejan otras pantallas al volver a la tarjeta. */
export type AvisoTarjeta = { bienvenida?: boolean; boletaEnviada?: boolean }

function Cargando() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando tu tarjeta">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-64 w-full rounded-none" />
      <Skeleton className="h-14 w-full rounded-none" />
      <Skeleton className="h-14 w-full rounded-none" />
    </div>
  )
}

function GuardarEnWhatsapp({ t, token, onCerrar }: { t: Tarjeta; token: string; onCerrar: () => void }) {
  return (
    <section aria-labelledby="titulo-bienvenida" className="sobre-tapa aparecer border-2 border-tapa bg-tapa p-5 text-papel">
      <h2 id="titulo-bienvenida" className="rotulo text-3xl leading-tight">
        ¡Listo, ya eres parte de Red Vecina!
      </h2>
      <p className="mt-2 text-lg">
        Esta es tu tarjeta. Guárdala en tu WhatsApp para abrirla cuando quieras: te mandas el enlace a tu propio chat.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Button asChild variant="libreta" size="lg" className="h-auto min-h-14 w-full py-3 text-center whitespace-normal">
          <a href={enlaceWhatsapp(t.whatsapp.numero, t.whatsapp.mensaje, token)} target="_blank" rel="noreferrer">
            Guardar mi tarjeta en WhatsApp
          </a>
        </Button>
        <Button variant="libreta-tapa" className="w-full" onClick={onCerrar}>
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
  const unidad = t.saldo.disponible === 1 ? 'punto' : 'puntos'
  return (
    <section aria-labelledby="titulo-saldo" className="border-2 border-tapa bg-papel">
      <h2 id="titulo-saldo" className="flex h-12 items-center bg-tapa px-4 text-base font-semibold text-papel">
        Tu saldo disponible
      </h2>
      <div className="px-4 pt-6 pb-5">
        <p className="flex items-baseline gap-3">
          <span className={destacado ? 'rotulo text-7xl leading-none text-tapa' : 'rotulo text-5xl leading-none text-tapa'}>
            {destacado ? <Circulo retraso={200}>{numero(t.saldo.disponible)}</Circulo> : numero(t.saldo.disponible)}
          </span>
          <span className="text-xl font-bold">{unidad}</span>
        </p>
      </div>

      {(t.saldo.retenido > 0 || pendientes.boletas > 0) && (
        <ul className="border-t border-cuadricula text-base">
          {t.saldo.retenido > 0 && (
            <li className="flex justify-between gap-3 border-b border-cuadricula px-4 py-3">
              <span>Reservados en tu código</span>
              <strong className="tabular-nums">{numero(t.saldo.retenido)}</strong>
            </li>
          )}
          {pendientes.boletas > 0 && (
            <li className="flex justify-between gap-3 border-b border-cuadricula px-4 py-3 text-lapiz">
              <span>
                A lápiz: {pendientes.boletas === 1 ? '1 boleta en revisión' : `${pendientes.boletas} boletas en revisión`}
              </span>
              {pendientes.puntos > 0 && (
                <strong className="font-semibold tabular-nums underline decoration-dashed decoration-2 underline-offset-[6px]">
                  +{numero(pendientes.puntos)}
                </strong>
              )}
            </li>
          )}
        </ul>
      )}

      <div className="px-4 pt-5 pb-5">
        <Progress
          value={avance}
          className="h-8 rounded-none border-2 border-tapa bg-papel bg-[linear-gradient(90deg,var(--cuadricula)_2px,transparent_2px)] bg-size-[10%_100%]"
          indicadorClassName="rounded-none bg-tinta-azul"
          aria-label={proximo ? `Llevas ${numero(Math.max(t.saldo.disponible, 0))} de ${numero(proximo.puntos)} puntos` : 'Meta cumplida'}
        />
        <p className="mt-3 text-lg">
          {proximo ? (
            <>
              Te faltan <strong className="text-mango-800">{puntos(proximo.faltan)}</strong> para un descuento de{' '}
              <strong className="resaltado">{pesos(proximo.valor_pesos)}</strong>.
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
    <Alert variant="alerta" className="rounded-none border-2">
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
      <h2 id="titulo-recientes" className="rotulo text-3xl text-tapa">
        Lo último
      </h2>
      {items.length === 0 ? (
        <Vacio titulo="Aún no tienes movimientos">
          Cuando subas tu primera boleta, aparecerá aquí.
        </Vacio>
      ) : (
        <>
          <ul className="border-t-2 border-tapa">
            {items.slice(0, RECIENTES_ANCHO).map((item, i) => (
              <FilaHistorial key={item.clave} item={item} className={i >= RECIENTES ? 'max-lg:hidden' : undefined} />
            ))}
          </ul>
          <Button asChild variant="link" className="self-start">
            <Link to={`/t/${token}/historial`}>
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
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-x-16 lg:gap-y-8">
      <div className="lg:col-span-2">
        <h1 className="rotulo text-4xl text-tapa lg:text-6xl lg:tracking-[-0.035em]">Hola, {primerNombre}</h1>
        <p className="mt-2 hidden max-w-[40rem] text-xl leading-8 lg:block">
          Esta es tu libreta en la red: lo que juntas en un local lo canjeas en otro.
        </p>
      </div>

      <div className="flex flex-col gap-6">

      {aviso.bienvenida && <GuardarEnWhatsapp t={t} token={token} onCerrar={quitarAviso} />}

      {aviso.boletaEnviada && (
        <Alert variant="exito" role="status">
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
        <Button asChild size="lg" variant={codigo ? 'libreta-secundario' : 'libreta'} className="w-full">
          <Link to={`/t/${token}/boleta`}>
            Subir boleta
          </Link>
        </Button>
        <Button asChild variant="libreta-secundario" size="lg" className="w-full">
          <Link to={`/t/${token}/beneficios`}>Mis beneficios</Link>
        </Button>
      </div>
      </div>

      <div className="flex flex-col gap-6">
      <Recientes t={t} token={token} />

      {!aviso.bienvenida && (
        <Button asChild variant="link" className="self-start">
          <a href={enlaceWhatsapp(t.whatsapp.numero, t.whatsapp.mensaje, token)} target="_blank" rel="noreferrer">
            Guardar mi tarjeta en WhatsApp
          </a>
        </Button>
      )}
      </div>
    </div>
  )
}
