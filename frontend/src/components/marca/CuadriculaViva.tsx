/**
 * La cuadrícula viva de la hoja: al pasar el puntero, las líneas cercanas de la cuadrícula se
 * pintan de naranja y se apagan despacio, como tinta que se seca. Cada tanto un cuadro suelto
 * enciende sus bordes solo.
 *
 * Solo pinta las líneas (los bordes de cada cuadro), encima de las líneas azules de la hoja; el
 * relleno queda limpio. Con movimiento reducido no hay encendidos sueltos y el apagado es corto.
 * Se detiene cuando la hoja sale de pantalla o la pestaña se oculta.
 */
import { useEffect, useRef } from 'react'

/** Radio del puntero, en cuadros. */
const RADIO = 2.6
/** Cuánto se apaga un cuadro por segundo (1 = de encendido a apagado en un segundo). */
const APAGADO = 0.9
const APAGADO_REDUCIDO = 4
/** Probabilidad por segundo de que un cuadro suelto se encienda solo. */
const ENCENDIDOS_POR_SEGUNDO = 1.6

function leerColor(nombre: string, respaldo: string) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()
  return valor || respaldo
}

function hexARgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function CuadriculaViva() {
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = lienzo.current
    const hoja = canvas?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !hoja || !ctx) return

    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)')
    const tactil = window.matchMedia('(hover: none)')
    const [r, g, b] = hexARgb(leerColor('--mango', '#F79D18'))

    let lado = 32
    let columnas = 0
    let filas = 0
    let ancho = 0
    let alto = 0
    const brillo = new Map<number, number>()
    let puntero: { x: number; y: number } | null = null
    let cuadro = 0
    let ultimo = 0
    let visible = true

    const medir = () => {
      // El lienzo mide el área de relleno de la hoja (sin su borde): con eso se dibuja.
      const rect = canvas.getBoundingClientRect()
      const ppp = Math.min(window.devicePixelRatio || 1, 2)
      lado = parseFloat(getComputedStyle(hoja).backgroundSize) || 32
      ancho = rect.width
      alto = rect.height
      columnas = Math.ceil(ancho / lado)
      filas = Math.ceil(alto / lado)
      canvas.width = Math.round(ancho * ppp)
      canvas.height = Math.round(alto * ppp)
      // La escala sale del tamaño real del lienzo (redondeado), no de ppp: así cada línea cae
      // justo sobre la línea de la hoja, también al final de una sección alta.
      ctx.setTransform(canvas.width / ancho, 0, 0, canvas.height / alto, 0, 0)
      dibujar()
    }

    const encender = (indice: number, valor: number) => {
      if (valor > (brillo.get(indice) ?? 0)) brillo.set(indice, Math.min(valor, 1))
    }

    // Cada cuadro encendido ilumina sus cuatro bordes. Un borde compartido por dos cuadros toma
    // el brillo mayor, para que no se pinte dos veces y se vea más oscuro.
    const horizontales = new Map<number, number>()
    const verticales = new Map<number, number>()
    const subir = (mapa: Map<number, number>, clave: number, valor: number) => {
      if (valor > (mapa.get(clave) ?? 0)) mapa.set(clave, valor)
    }

    const dibujar = () => {
      ctx.clearRect(0, 0, ancho, alto)
      horizontales.clear()
      verticales.clear()
      const ancho1 = columnas + 1
      for (const [indice, valor] of brillo) {
        const col = indice % columnas
        const fila = Math.floor(indice / columnas)
        subir(horizontales, fila * ancho1 + col, valor)
        subir(horizontales, (fila + 1) * ancho1 + col, valor)
        subir(verticales, fila * ancho1 + col, valor)
        subir(verticales, fila * ancho1 + col + 1, valor)
      }
      // Las líneas de la hoja miden 1 px y están en el borde superior e izquierdo de cada cuadro.
      for (const [clave, valor] of horizontales) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(valor * 1.15, 1).toFixed(3)})`
        ctx.fillRect((clave % ancho1) * lado, Math.floor(clave / ancho1) * lado, lado + 1, 1)
      }
      for (const [clave, valor] of verticales) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(valor * 1.15, 1).toFixed(3)})`
        ctx.fillRect((clave % ancho1) * lado, Math.floor(clave / ancho1) * lado, 1, lado + 1)
      }
    }

    const paso = (t: number) => {
      const dt = ultimo ? Math.min((t - ultimo) / 1000, 0.1) : 0.016
      ultimo = t
      if (puntero) {
        const cx = puntero.x / lado
        const cy = puntero.y / lado
        const alcance = Math.ceil(RADIO)
        for (let f = Math.floor(cy) - alcance; f <= Math.floor(cy) + alcance; f++) {
          for (let c = Math.floor(cx) - alcance; c <= Math.floor(cx) + alcance; c++) {
            if (c < 0 || f < 0 || c >= columnas || f >= filas) continue
            const d = Math.hypot(c + 0.5 - cx, f + 0.5 - cy)
            if (d < RADIO) encender(f * columnas + c, 1 - (d / RADIO) ** 1.6)
          }
        }
      }
      if (!reducido.matches && Math.random() < ENCENDIDOS_POR_SEGUNDO * dt) {
        encender(Math.floor(Math.random() * columnas * filas), 0.35 + Math.random() * 0.25)
      }
      const apagado = (reducido.matches ? APAGADO_REDUCIDO : APAGADO) * dt
      for (const [indice, valor] of brillo) {
        const nuevo = valor - apagado
        if (nuevo <= 0.01) brillo.delete(indice)
        else brillo.set(indice, nuevo)
      }
      dibujar()
      cuadro = requestAnimationFrame(paso)
    }

    const arrancar = () => {
      if (cuadro || !visible || document.hidden) return
      ultimo = 0
      cuadro = requestAnimationFrame(paso)
    }
    const detener = () => {
      cancelAnimationFrame(cuadro)
      cuadro = 0
    }

    const mover = (e: PointerEvent) => {
      if (tactil.matches || e.pointerType === 'touch') return
      const rect = hoja.getBoundingClientRect()
      puntero = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const salir = () => {
      puntero = null
    }
    const cambiarVisibilidad = () => (document.hidden ? detener() : arrancar())

    const tamano = new ResizeObserver(medir)
    tamano.observe(hoja)
    const vista = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) arrancar()
      else detener()
    })
    vista.observe(hoja)
    hoja.addEventListener('pointermove', mover)
    hoja.addEventListener('pointerleave', salir)
    document.addEventListener('visibilitychange', cambiarVisibilidad)
    medir()
    arrancar()

    return () => {
      detener()
      tamano.disconnect()
      vista.disconnect()
      hoja.removeEventListener('pointermove', mover)
      hoja.removeEventListener('pointerleave', salir)
      document.removeEventListener('visibilitychange', cambiarVisibilidad)
    }
  }, [])

  return <canvas ref={lienzo} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
}
