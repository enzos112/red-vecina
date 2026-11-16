/**
 * Forma oficial de la marca (logo.png del proyecto, redibujado en vectores con la paleta de la
 * libreta): la R en un solo contorno y el triángulo naranja apoyado en el corte de la pierna.
 * La usan el componente Logo, el favicon y el afiche.
 *
 * Los trazos están dibujados sobre el original; el encuadre (MARCO) es un cuadrado centrado en
 * la R con el mismo aire por los cuatro lados, para que se lea igual a 16 px en la pestaña del
 * navegador que en la cabecera.
 */

/** Caja de la R en el dibujo: x 162–770, y 48–883. */
export const MARCO = { x: -69, y: -70, lado: 1070 } as const

/** viewBox del símbolo encuadrado. */
export const VISTA_MARCA = `${MARCO.x} ${MARCO.y} ${MARCO.lado} ${MARCO.lado}`

export const TRAZO_R =
  'M162 48H550A190 190 0 0 1 740 238V390C740 480 675 555 590 570L770 883H600L418 570V440H470A131 131 0 0 0 470 178H308V883H162Z'

export const TRAZO_PUNTA = 'M685 737L770 585V883Z'
