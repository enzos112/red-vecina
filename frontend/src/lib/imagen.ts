/**
 * Compresión de fotos en el navegador antes de subirlas. La boleta se guarda en la base de
 * datos, así que conviene que pese unos 200 KB (sección 2 de construccion.md). Son límites
 * técnicos de almacenamiento, no reglas de negocio.
 */

const PESO_OBJETIVO = 200 * 1024
/** Lado mayor inicial: las boletas son largas y angostas, y el texto debe seguir legible. */
const LADO_MAXIMO = 2000
/** Tope de píxeles para que una boleta muy larga no se dispare de peso. */
const PIXELES_MAXIMOS = 1_600_000
const CALIDADES = [0.82, 0.72, 0.62, 0.52]
const REDUCCION = 0.8
const LADO_MINIMO = 700

export class ErrorImagen extends Error {}

async function cargar(archivo: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' })
    } catch {
      // Algunos navegadores no abren ciertos formatos con createImageBitmap: se prueba con <img>.
    }
  }
  const url = URL.createObjectURL(archivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function aJpeg(lienzo: HTMLCanvasElement, calidad: number): Promise<Blob> {
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob(
      (blob) => (blob ? resolver(blob) : rechazar(new ErrorImagen('No se pudo comprimir.'))),
      'image/jpeg',
      calidad,
    ),
  )
}

/** Devuelve un JPEG de unos 200 KB. Lanza ErrorImagen si la foto no se puede abrir. */
export async function comprimir(archivo: Blob): Promise<Blob> {
  let imagen: ImageBitmap | HTMLImageElement
  try {
    imagen = await cargar(archivo)
  } catch {
    throw new ErrorImagen('No pudimos abrir esa foto.')
  }
  const ancho = imagen.width
  const alto = imagen.height
  if (!ancho || !alto) throw new ErrorImagen('No pudimos abrir esa foto.')

  let escala = Math.min(1, LADO_MAXIMO / Math.max(ancho, alto), Math.sqrt(PIXELES_MAXIMOS / (ancho * alto)))
  let mejor: Blob | null = null
  try {
    for (;;) {
      const lienzo = document.createElement('canvas')
      lienzo.width = Math.max(1, Math.round(ancho * escala))
      lienzo.height = Math.max(1, Math.round(alto * escala))
      const ctx = lienzo.getContext('2d')
      if (!ctx) throw new ErrorImagen('Tu navegador no pudo preparar la foto.')
      ctx.fillStyle = '#fff' // un PNG con transparencia no queda negro en JPEG
      ctx.fillRect(0, 0, lienzo.width, lienzo.height)
      ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
      for (const calidad of CALIDADES) {
        const blob = await aJpeg(lienzo, calidad)
        if (!mejor || blob.size < mejor.size) mejor = blob
        if (blob.size <= PESO_OBJETIVO) return blob
      }
      if (mejor && Math.max(lienzo.width, lienzo.height) * REDUCCION < LADO_MINIMO) return mejor
      escala *= REDUCCION
    }
  } finally {
    if ('close' in imagen) imagen.close()
  }
}
