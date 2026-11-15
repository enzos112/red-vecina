---
name: Red Vecina
description: La libreta del almacén puesta en común; cada compra se anota, cada canje se tacha y la cuenta siempre cuadra.
colors:
  tapa: "#053073"
  tapa-hover: "#0A3D8A"
  tinta-azul: "#0B47A8"
  mango: "#F79D18"
  mango-oscuro: "#EB9310"
  mango-activo: "#DE870A"
  papel: "#FAFCFF"
  papel-hover: "#E6EEFA"
  cuadricula: "#CBD9F0"
  tinta: "#0B1B33"
  lapiz: "#5F6B80"
  tapa-texto: "#C9D6EC"
  peligro: "#C0392B"
  peligro-texto: "#A12D22"
typography:
  display:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(5rem, 8.2vw, 7.5rem)"
    fontWeight: 850
    lineHeight: 1.0667
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 88"
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "4.25rem"
    fontWeight: 850
    lineHeight: 1.05
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 88"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 850
    lineHeight: 1.25
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 88"
  cifra:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1.3
    fontFeature: "'tnum'"
  body:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: "2rem"
  body-lead:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: "2rem"
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  none: "0px"
  marca: "4px"
spacing:
  renglon: "32px"
  fila: "64px"
  margen-movil: "24px"
  margen: "128px"
  seccion: "96px"
components:
  button-libreta:
    backgroundColor: "{colors.mango}"
    textColor: "{colors.tapa}"
    rounded: "{rounded.none}"
    padding: "0 32px"
    height: "56px"
  button-libreta-hover:
    backgroundColor: "{colors.mango-oscuro}"
  button-libreta-active:
    backgroundColor: "{colors.mango-activo}"
  button-libreta-secundario:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tapa}"
    rounded: "{rounded.none}"
    padding: "0 32px"
    height: "56px"
  button-libreta-secundario-hover:
    backgroundColor: "{colors.papel-hover}"
  button-libreta-tapa:
    backgroundColor: "{colors.tapa}"
    textColor: "{colors.papel}"
    rounded: "{rounded.none}"
    padding: "0 28px"
    height: "52px"
  button-libreta-tapa-hover:
    backgroundColor: "{colors.tapa-hover}"
  cuenta-cabecera:
    backgroundColor: "{colors.tapa}"
    textColor: "{colors.papel}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "64px"
  cuenta-fila:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    padding: "12px 16px"
    height: "64px"
---

# Design System: Red Vecina

## Overview

**Creative North Star: "La libreta del almacén"**

Red Vecina se dibuja como la libreta de fiado del almacén de la esquina, pero llevada entre todos los locales. La página es una hoja cuadriculada de tinta azul con su margen doble; la cabecera de las cuentas, los bloques de cierre y el pie son la tapa azul noche. Lo firme se escribe en tinta, lo pendiente queda a lápiz, el canje se tacha con un trazo y el total se encierra en un círculo. La confianza no viene de adornos sino de que la cuenta cuadra a la vista.

La densidad es la de un cuaderno: todo calza en un renglón de 32 px, las filas miden dos renglones, los titulares bajan en pasos enteros de renglón. La tipografía hace el trabajo de la imagen: una grotesca pesada y algo angosta (Archivo) como rótulo de columna, con cifras tabulares. Esquinas rectas, bordes de 2 px, colores planos, sin sombras, sin fotos y sin íconos. El naranja aparece solo donde se toca.

El movimiento cuenta una sola historia: la cuenta se escribe sola fila por fila, lo pendiente pasa de lápiz a tinta, el canje se tacha y el total se encierra. Con movimiento reducido todo aparece en su estado final.

Alcance: este mundo rige toda la aplicación. La zona pública y la del vecino usan la hoja cuadriculada con margen; el portal del comercio, la hoja sin margen; el panel del equipo, papel liso con la tapa en el menú activo, porque es una pantalla de trabajo. Los componentes de shadcn heredan el mundo por tema (radio 0, bordes de tapa, Archivo).

**Key Characteristics:**
- Hoja cuadriculada de 32 px con margen doble azul noche a 128 px (24 px en el celular).
- Tapa azul noche para cabeceras de cuenta, bloques de cierre, código de canje y pie.
- Un estado, un trazo: tinta azul para lo firme, lápiz gris con subrayado discontinuo para lo pendiente, tachado de tinta para lo canjeado.
- Archivo variable: rótulos a peso 850 y ancho 88 %, cifras tabulares en toda la zona.
- Rectángulos de esquina recta y borde de 2 px; sin sombras ni radios.
- Naranja solo en acciones.

## Colors

Dos azules de libreta sobre papel frío, un gris de lápiz y un único naranja que significa "tócame".

### Primary
- **Tapa azul noche** (tapa): la tapa de la libreta. Cabecera de cada cuenta, bloques de cierre (Lo que valen tus puntos, llamado a comercios), código de canje, pie, márgenes dobles, bordes de 2 px y titulares. Su hover es **Tapa gastada** (tapa-hover).
- **Tinta azul** (tinta-azul): lo anotado y confirmado. Cifras firmes, el subrayado de "suman.", el tachado de los canjes, el círculo del total, la barra de avance y el anillo de foco dentro de la libreta.

### Secondary
- **Naranja mango** (mango): solo en lo que se toca. Fondo del botón principal (con texto tapa), anillo de foco sobre la tapa, subrayado de enlaces del pie y el punto de la marca. Hover **mango-oscuro**, presión **mango-activo**.

### Neutral
- **Papel** (papel): la hoja, fondo de toda la zona y relleno de cuentas, muestras y botones secundarios. Hover de botón en **papel-hover**.
- **Cuadrícula** (cuadricula): las líneas de 1 px de la hoja y los separadores entre filas de una cuenta.
- **Tinta negra** (tinta): texto corrido.
- **Lápiz** (lapiz): lo pendiente o secundario: boletas en revisión, notas bajo una fila, "Ilustración con datos de ejemplo".
- **Texto de tapa** (tapa-texto): texto secundario y bordes suaves sobre la tapa.
- **Peligro** (peligro, peligro-texto): lo que no sumó o falló, siempre con una palabra al lado.

### Named Rules
**The Naranja-Que-Se-Toca Rule.** El naranja marca solo lo accionable: botones principales, foco sobre la tapa, enlaces del pie. La única excepción es el punto naranja de la marca. Nunca como fondo de bloque, titular o adorno.

**The Una-Tinta-Por-Rol Rule.** Tapa para estructura y títulos, tinta azul para lo confirmado, lápiz para lo pendiente, tinta negra para leer. Un color no cambia de rol entre pantallas.

**The Lo-Dice-En-Palabras Rule.** Ningún estado depende solo del color o del trazo: "A lápiz: la estamos revisando", "(canje usado)", "Venció".

## Typography

**Display Font:** Archivo Variable (con ui-sans-serif, system-ui)
**Body Font:** Archivo Variable
**Label/Mono Font:** la misma, con cifras tabulares en toda la zona `.libreta`

**Character:** Una sola familia en dos voces: el rótulo pesado y angosto que se lee como encabezado de columna en un cuaderno contable, y el texto regular, amplio y tranquilo. Las cifras siempre alinean en columna.

### Hierarchy
- **Display** (850, ancho 88 %, clamp(5rem, 8.2vw, 7.5rem), interlínea 1.0667, -0.035em): solo el titular de portada; cada línea ocupa cuatro renglones exactos. En el celular baja a 3.25rem.
- **Headline** (850, ancho 88 %, 4.25rem / 2.5rem en celular, 1.05, -0.035em): titulares de sección, máximo 14 a 16 caracteres por línea.
- **Title** (850, ancho 88 %, 1.75 a 2rem): pasos, nombres de comercio en el índice, "Hola, Rosa", "Lo último".
- **Cifra** (800, 1.625rem, tabular): montos de cada fila, en tinta azul si están firmes. El total disponible sube a 4.25rem en rótulo y se encierra en el círculo.
- **Body** (400, 1.1875rem, interlínea 32 px): texto corrido, 36rem de ancho máximo. La bajada de sección usa 1.375rem con la misma interlínea.
- **Label** (600, 0.9375rem): fechas de margen y de fila, encabezados de tabla, notas. Nada baja de 15 px.

### Named Rules
**The Interlínea-De-Renglón Rule.** El texto corrido usa interlínea de 32 px (un renglón) y los titulares, múltiplos de renglón.

**The Rótulo-No-Kicker Rule.** El rótulo es para titulares y cifras. No hay sobretítulos, etiquetas en mayúsculas ni kickers sobre los titulares; las fechas y folios van en el margen, como en una libreta.

## Layout

La página es una sucesión de hojas a todo el ancho (contenido hasta 90rem). Cada hoja dibuja la cuadrícula de 32 px y un margen doble vertical (dos trazos de 2 px en tapa, separados por 2 px) a 128 px del borde en escritorio y a 24 px en el celular. A la izquierda del margen queda una columna de 128 px para fechas y folios (solo en pantallas grandes); el contenido empieza a 176 px en escritorio y a 48 px en el celular.

Las secciones respiran 96 px arriba y abajo (64 px en el celular). La portada ocupa el alto de pantalla en escritorio, con el titular a la izquierda y la cuenta de ejemplo (24 a 30rem) a la derecha. Los pasos y el índice son listas de filas separadas por reglas de 2 px, con el número en el margen. Las filas de una cuenta miden 64 px (dos renglones); el total, 112 px.

La zona del vecino es una sola columna de 28rem centrada, con el margen doble a 16 px y el contenido a 40 px, pensada para el celular.

**The Paso-De-Renglón Rule.** Alturas de fila, interlíneas y desplazamientos de animación son múltiplos o fracciones exactas del renglón (32 px).

## Elevation & Depth

El sistema es plano. No hay sombras en ningún elemento. La profundidad se construye con dos materiales: el papel cuadriculado (claro) y la tapa (azul noche), separados por reglas de 2 px. Un bloque importante dentro del papel se enmarca con borde de 2 px en tapa; sobre la tapa, un recuadro de papel se rodea con un doble filete (borde de papel, 8 px de aire, borde de tapa).

**The Papel-Y-Tapa Rule.** Lo que destaca cambia de material (papel a tapa) o gana un borde de 2 px; nunca flota con una sombra.

## Shapes

Esquinas rectas en todo: botones, cuentas, muestras, tablas, avisos, barra de avance y dígitos del código (0 px). La única curva es el cuadrado de la marca (4 px) y el círculo del total, trazado a mano alzada en SVG con trazo de 3.5 px y punta redonda. Los bordes estructurales son de 2 px en tapa; los separadores entre filas, de 1 px en cuadrícula. Los vacíos usan borde discontinuo de 2 px; los guías del índice, puntos de 3 px. Las líneas de la hoja, los renglones y el tachado se dibujan con trazos de 1 a 3 px (gradiente lineal usado como línea, nunca como degradado de color).

## Components

### Buttons
Rectángulos firmes con borde de tapa, en peso 800. Solo cambia el color de fondo al pasar o presionar (200 ms).
- **Shape:** esquina recta (0 px), borde de 2 px, alto mínimo de 48 px (56 px en tamaño grande).
- **Primary (libreta):** fondo naranja mango, texto y borde tapa. Una sola por pantalla.
- **Secondary (libreta-secundario):** fondo papel, texto y borde tapa; hover papel-hover, presión cuadrícula.
- **Sobre la tapa (libreta-tapa):** fondo transparente, borde tapa-texto, texto papel; hover borde papel y fondo tapa-hover; foco naranja.
- **Focus:** contorno de 3 px en tinta azul con 3 px de separación; sobre la tapa, en naranja.

### Cards / Containers (Cuenta)
La pieza firma: una cuenta de libreta.
- **Corner Style:** recta (0 px).
- **Background:** cabecera en tapa de 64 px con el nombre en rótulo y una etiqueta en tapa-texto; filas en papel.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** 2 px en tapa alrededor; 1 px en cuadrícula entre filas.
- **Internal Padding:** 12 x 16 px por fila; columna de fecha de 72 px, texto, cifra alineada a la derecha.

### Fila de movimiento
Cada movimiento se escribe con su trazo: firme en tinta azul extra negrita; pendiente en lápiz con subrayado discontinuo de 2 px; canje usado tachado con trazo de 3 px en tinta azul; lo que no sumó en peligro, con palabras. Fecha en etiqueta de tapa.

### Navigation
Encabezado de papel de 80 px con regla inferior de 2 px en tapa; marca a la izquierda alineada con el margen. Enlaces en tinta, 17 px semibold, que pasan a tinta azul con subrayado de 2 px. En el celular queda solo el botón secundario. El pie es la contratapa: fondo tapa, enlaces en papel con subrayado naranja. En la zona del vecino la cabecera es una franja de tapa de 64 px con la marca invertida.

### Código de canje
Bloque de tapa con los seis dígitos en rótulo de 2.75rem, cada uno en su cuadro de borde tapa-texto (proporción 4:5), seguido de la cuenta regresiva en palabras.

### Barra de avance
Alto de 32 px, borde de 2 px en tapa, papel con divisiones de cuadrícula cada 10 % y relleno plano en tinta azul.

### Movimiento
- **Anotar:** cada fila entra en su turno (520 ms, cubic-bezier(0.2, 0.9, 0.25, 1.15)), se descubre de izquierda a derecha y sube medio renglón; turnos separados de 300 a 520 ms, disparados al entrar en pantalla.
- **Entintar:** la cifra pasa de lápiz a tinta azul (500 ms).
- **Tachar:** el trazo crece de 0 a 100 % (420 ms; 600 ms el subrayado del titular).
- **Trazar:** el círculo del total se dibuja en 700 ms.
- Con movimiento reducido, todo se muestra en su estado final.

## Do's and Don'ts

### Do:
- **Do** poner cada pantalla del vecino y cada página pública nueva dentro de la libreta: papel, cuadrícula de 32 px y margen doble en tapa.
- **Do** escribir cada cifra según su estado: tinta azul si está firme, lápiz con subrayado discontinuo si está pendiente, tachado de 3 px si ya se usó, y siempre con su palabra.
- **Do** usar esquinas rectas y bordes de 2 px en tapa para todo bloque que destaque.
- **Do** dejar una sola acción naranja por pantalla, con texto tapa.
- **Do** alinear alturas e interlíneas al renglón de 32 px y usar cifras tabulares.
- **Do** rotular como ejemplo toda cuenta ilustrativa ("Ejemplo", "Ilustración con datos de ejemplo").

### Don't:
- **Don't** usar íconos, ni los que traen los componentes de shadcn; acciones y estados se dicen en palabras.
- **Don't** usar el naranja en fondos de bloque, titulares o adornos.
- **Don't** agregar sombras, radios ni botones en píldora dentro de la libreta.
- **Don't** usar degradados de color; los gradientes lineales solo dibujan líneas de 1 a 3 px.
- **Don't** poner sobretítulos o kickers sobre los titulares; fechas y folios van en el margen.
- **Don't** bajar texto de 15 px ni dejar táctiles bajo 48 px.
- **Don't** volver a esquinas redondeadas, píldoras, sombras ni al crema: el sistema anterior (Plus Jakarta sobre crema) quedó reemplazado.
