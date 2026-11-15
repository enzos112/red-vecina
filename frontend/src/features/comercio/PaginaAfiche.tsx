import { Download, FileText, LoaderCircle } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCondiciones } from '@/lib/consultas'
import { A4, cm, descargar, pdfConImagen } from '@/lib/pdf'
import { useYo } from '@/lib/sesion'

// Colores de la marca (index.css). El lienzo no lee variables CSS, así que se repiten aquí.
const C = {
  barrio: '#12382A',
  barrioClaro: '#1A4636',
  vecina: '#1F6F4A',
  mango: '#FFC857',
  crema: '#FBF8F1',
  tinta: '#1C2B24',
}
const FUENTE = '"Plus Jakarta Sans Variable", system-ui, sans-serif'

type Lienzo = { canvas: HTMLCanvasElement; ancho: number; alto: number }

function nuevoLienzo(ancho: number, alto: number) {
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no permite dibujar el afiche.')
  return { canvas, ctx }
}

function fuente(ctx: CanvasRenderingContext2D, peso: number, tamano: number) {
  ctx.font = `${peso} ${tamano}px ${FUENTE}`
}

/** Escribe un texto partido en líneas que caben en `ancho`. Devuelve la y siguiente. */
function parrafo(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, ancho: number, alto: number): number {
  const palabras = texto.split(' ')
  let linea = ''
  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra
    if (ctx.measureText(prueba).width > ancho && linea) {
      ctx.fillText(linea, x, y)
      linea = palabra
      y += alto
    } else {
      linea = prueba
    }
  }
  if (linea) ctx.fillText(linea, x, y)
  return y + alto
}

function rectRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

/** Marca de Red Vecina: el cuadro mango con dos casas y el nombre. */
function marca(ctx: CanvasRenderingContext2D, x: number, y: number, lado: number, color: string) {
  ctx.fillStyle = C.mango
  rectRedondo(ctx, x, y, lado, lado, lado * 0.25)
  const casa = (cx: number, base: number, w: number, h: number, relleno: string) => {
    ctx.fillStyle = relleno
    ctx.beginPath()
    ctx.moveTo(cx - w / 2, base)
    ctx.lineTo(cx - w / 2, base - h * 0.6)
    ctx.lineTo(cx, base - h)
    ctx.lineTo(cx + w / 2, base - h * 0.6)
    ctx.lineTo(cx + w / 2, base)
    ctx.closePath()
    ctx.fill()
  }
  casa(x + lado * 0.38, y + lado * 0.8, lado * 0.36, lado * 0.5, C.barrio)
  casa(x + lado * 0.64, y + lado * 0.8, lado * 0.3, lado * 0.4, C.vecina)
  ctx.fillStyle = color
  fuente(ctx, 800, lado * 0.6)
  ctx.textBaseline = 'middle'
  ctx.fillText('Red Vecina', x + lado * 1.3, y + lado / 2)
  ctx.textBaseline = 'alphabetic'
}

async function cargarFuentes() {
  try {
    await Promise.all([document.fonts.load(`800 40px ${FUENTE}`), document.fonts.load(`500 40px ${FUENTE}`)])
  } catch {
    // Sin la fuente se dibuja con la del sistema.
  }
}

/** Afiche A4 para la vitrina o el mesón: QR a /unirme/<comercio>. */
async function dibujarAfiche(comercio: string, enlace: string): Promise<Lienzo> {
  await cargarFuentes()
  const ancho = 1240
  const alto = 1754
  const { canvas, ctx } = nuevoLienzo(ancho, alto)
  const m = 96

  ctx.fillStyle = C.crema
  ctx.fillRect(0, 0, ancho, alto)

  // Cabecera verde barrio.
  ctx.fillStyle = C.barrio
  ctx.fillRect(0, 0, ancho, 620)
  ctx.fillStyle = C.barrioClaro
  ctx.beginPath()
  ctx.arc(ancho - 40, 80, 260, 0, Math.PI * 2)
  ctx.fill()
  marca(ctx, m, 80, 72, C.crema)

  ctx.fillStyle = C.crema
  fuente(ctx, 800, 92)
  let y = parrafo(ctx, 'Suma puntos', m, 300, ancho - 2 * m, 104)
  ctx.fillStyle = C.mango
  y = parrafo(ctx, `en ${comercio}`, m, y, ancho - 2 * m, 104)
  ctx.fillStyle = C.crema
  fuente(ctx, 500, 40)
  parrafo(ctx, 'y canjéalos en los locales del barrio.', m, Math.min(y + 10, 590), ancho - 2 * m, 50)

  // QR sobre tarjeta blanca.
  const qrLado = 600
  const qrX = (ancho - qrLado) / 2
  const qrY = 700
  ctx.fillStyle = '#FFFFFF'
  ctx.shadowColor = 'rgba(0,0,0,0.12)'
  ctx.shadowBlur = 30
  rectRedondo(ctx, qrX - 40, qrY - 40, qrLado + 80, qrLado + 80, 36)
  ctx.shadowBlur = 0
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, enlace, { width: qrLado, margin: 0, color: { dark: C.tinta, light: '#FFFFFF' } })
  ctx.drawImage(qr, qrX, qrY, qrLado, qrLado)

  // Pasos.
  ctx.fillStyle = C.tinta
  ctx.textAlign = 'center'
  fuente(ctx, 800, 52)
  ctx.fillText('Escanea con la cámara', ancho / 2, 1440)
  fuente(ctx, 500, 36)
  ctx.fillText('Inscríbete gratis, sube tus boletas y junta puntos.', ancho / 2, 1500)
  fuente(ctx, 500, 30)
  ctx.fillStyle = C.vecina
  ctx.fillText(enlace.replace(/^https?:\/\//, ''), ancho / 2, 1560)

  // Pie.
  ctx.fillStyle = C.mango
  ctx.fillRect(0, alto - 110, ancho, 110)
  ctx.fillStyle = C.barrio
  fuente(ctx, 800, 36)
  ctx.fillText('Compra en tu barrio. Gana en tu barrio.', ancho / 2, alto - 44)
  ctx.textAlign = 'left'

  return { canvas, ancho, alto }
}

/** Tarjeta de 3 pasos para la caja (10 × 15 cm). */
async function dibujarTarjeta(contacto: string | null | undefined): Promise<Lienzo> {
  await cargarFuentes()
  const ancho = 1181
  const alto = 1772
  const { canvas, ctx } = nuevoLienzo(ancho, alto)
  const m = 90

  ctx.fillStyle = C.crema
  ctx.fillRect(0, 0, ancho, alto)
  ctx.fillStyle = C.barrio
  ctx.fillRect(0, 0, ancho, 330)
  marca(ctx, m, 70, 64, C.crema)
  ctx.fillStyle = C.crema
  fuente(ctx, 800, 72)
  ctx.fillText('Canjes en la caja', m, 260)

  const pasos: [string, string][] = [
    ['Pide el código antes de cobrar', 'Pregunta: “¿Tienes código de Red Vecina?”. Son 6 números.'],
    ['Escríbelo en el validador', 'Abre el portal del comercio en tu celular y digita los 6 números.'],
    ['Verde: aplica. Rojo: no.', 'Si sale verde, toca “Usar” y aplica el descuento. Si sale rojo, cobra normal.'],
  ]
  let y = 450
  pasos.forEach(([titulo, detalle], i) => {
    ctx.fillStyle = C.mango
    ctx.beginPath()
    ctx.arc(m + 56, y + 20, 56, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = C.barrio
    ctx.textAlign = 'center'
    fuente(ctx, 800, 64)
    ctx.fillText(String(i + 1), m + 56, y + 43)
    ctx.textAlign = 'left'
    const x = m + 150
    ctx.fillStyle = C.tinta
    fuente(ctx, 800, 46)
    let yy = parrafo(ctx, titulo, x, y + 10, ancho - x - m, 56)
    fuente(ctx, 500, 36)
    yy = parrafo(ctx, detalle, x, yy + 6, ancho - x - m, 46)
    y = yy + 70
  })

  // Sin internet y contacto.
  ctx.fillStyle = '#FFFFFF'
  rectRedondo(ctx, m, y, ancho - 2 * m, 330, 28)
  ctx.fillStyle = C.tinta
  fuente(ctx, 800, 40)
  ctx.fillText('¿Sin internet?', m + 40, y + 70)
  fuente(ctx, 500, 34)
  const yy = parrafo(
    ctx,
    'Si decides aplicarlo igual, anota el código y la hora, e ingrésalo hoy mismo en “Códigos sin internet”.',
    m + 40,
    y + 125,
    ancho - 2 * m - 80,
    44,
  )
  if (contacto) {
    fuente(ctx, 800, 34)
    ctx.fillStyle = C.vecina
    parrafo(ctx, `Dudas: WhatsApp ${contacto}`, m + 40, yy + 10, ancho - 2 * m - 80, 44)
  }
  return { canvas, ancho, alto }
}

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad?: number): Promise<Blob> {
  return new Promise((resolver, rechazar) =>
    canvas.toBlob((b) => (b ? resolver(b) : rechazar(new Error('No se pudo generar el archivo.'))), tipo, calidad),
  )
}

async function comoPdf({ canvas, ancho, alto }: Lienzo, pagina: { ancho: number; alto: number }): Promise<Blob> {
  // El JPEG no admite transparencia: el fondo ya está pintado.
  const jpeg = new Uint8Array(await (await aBlob(canvas, 'image/jpeg', 0.92)).arrayBuffer())
  return pdfConImagen(jpeg, { ancho, alto }, pagina)
}

function Pieza({
  titulo,
  descripcion,
  archivo,
  dibujar,
  pagina,
}: {
  titulo: string
  descripcion: string
  archivo: string
  dibujar: () => Promise<Lienzo>
  pagina: { ancho: number; alto: number }
}) {
  const [lienzo, setLienzo] = useState<Lienzo | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    dibujar()
      .then((l) => {
        if (!vigente) return
        setLienzo(l)
        setVista(l.canvas.toDataURL('image/png'))
      })
      .catch((e: unknown) => vigente && setError(e instanceof Error ? e.message : 'No se pudo dibujar.'))
    return () => {
      vigente = false
    }
  }, [dibujar])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <p>{error}</p>
        ) : vista ? (
          <img src={vista} alt={`Vista previa: ${titulo}`} className="mx-auto max-h-[28rem] rounded-md border-2 border-border shadow-sm" />
        ) : (
          <Skeleton className="mx-auto aspect-[1/1.41] w-2/3" />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            disabled={!lienzo}
            onClick={async () => lienzo && descargar(await aBlob(lienzo.canvas, 'image/png'), `${archivo}.png`)}
          >
            {lienzo ? <Download aria-hidden="true" /> : <LoaderCircle className="animate-spin" aria-hidden="true" />}
            Imagen
          </Button>
          <Button disabled={!lienzo} onClick={async () => lienzo && descargar(await comoPdf(lienzo, pagina), `${archivo}.pdf`)}>
            <FileText aria-hidden="true" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** /comercio/afiche — afiche con el QR de inscripción y tarjeta de 3 pasos para la caja. */
export function PaginaAfiche() {
  const yo = useYo()
  const condiciones = useCondiciones()
  const comercio = yo.data?.comercio
  const contacto = condiciones.data?.contacto_whatsapp
  const [dibujos, setDibujos] = useState<{ afiche: () => Promise<Lienzo>; tarjeta: () => Promise<Lienzo> } | null>(null)
  const clave = comercio && !condiciones.isPending ? `${comercio.slug}|${contacto ?? ''}` : null
  const [claveDibujos, setClaveDibujos] = useState<string | null>(null)

  // Las funciones de dibujo cambian solo si cambia el comercio o el contacto.
  if (clave && clave !== claveDibujos && comercio) {
    const enlace = `${window.location.origin}/unirme/${comercio.slug}`
    setClaveDibujos(clave)
    setDibujos({ afiche: () => dibujarAfiche(comercio.nombre, enlace), tarjeta: () => dibujarTarjeta(contacto) })
  }

  if (!comercio || !dibujos) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Afiche y tarjeta</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Imprime el afiche y ponlo a la vista: los vecinos que se inscriben con tu QR quedan asociados a tu local.
        </p>
      </div>
      <Pieza
        titulo="Afiche con tu QR"
        descripcion="Tamaño A4. Llévalo a la vitrina o al mesón."
        archivo={`afiche-${comercio.slug}`}
        dibujar={dibujos.afiche}
        pagina={A4}
      />
      <Pieza
        titulo="Tarjeta para la caja"
        descripcion="Tres pasos para quien atiende. 10 × 15 cm."
        archivo="tarjeta-caja-red-vecina"
        dibujar={dibujos.tarjeta}
        pagina={{ ancho: cm(10), alto: cm(15) }}
      />
    </div>
  )
}
