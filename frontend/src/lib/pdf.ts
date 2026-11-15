/**
 * PDF mínimo de una página con una imagen JPEG a página completa. Alcanza para descargar el
 * afiche y la tarjeta de la caja sin sumar una librería de PDF al proyecto.
 */

const texto = new TextEncoder()

/** Ancho y alto de la página en puntos PDF (1/72 de pulgada). */
export type TamanoPagina = { ancho: number; alto: number }

/** A4 vertical. */
export const A4: TamanoPagina = { ancho: 595.28, alto: 841.89 }

/** Centímetros → puntos PDF. */
export const cm = (valor: number) => (valor / 2.54) * 72

export function pdfConImagen(jpeg: Uint8Array, px: { ancho: number; alto: number }, pagina: TamanoPagina): Blob {
  const partes: Uint8Array[] = []
  const desplazamientos: number[] = []
  let largo = 0
  const agregar = (p: Uint8Array | string) => {
    const bytes = typeof p === 'string' ? texto.encode(p) : p
    partes.push(bytes)
    largo += bytes.length
  }
  const objeto = (n: number, cuerpo: string) => {
    desplazamientos[n] = largo
    agregar(`${n} 0 obj\n${cuerpo}\nendobj\n`)
  }

  const w = pagina.ancho.toFixed(2)
  const h = pagina.alto.toFixed(2)
  const contenido = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`

  agregar('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  objeto(1, '<< /Type /Catalog /Pages 2 0 R >>')
  objeto(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  objeto(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  )
  desplazamientos[4] = largo
  agregar(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${px.ancho} /Height ${px.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  )
  agregar(jpeg)
  agregar('\nendstream\nendobj\n')
  objeto(5, `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`)

  const inicioXref = largo
  let xref = `xref\n0 6\n0000000000 65535 f \n`
  for (let n = 1; n <= 5; n++) xref += `${String(desplazamientos[n]).padStart(10, '0')} 00000 n \n`
  agregar(xref)
  agregar(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`)
  return new Blob(partes as BlobPart[], { type: 'application/pdf' })
}

/** Descarga un Blob con un nombre de archivo. */
export function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
