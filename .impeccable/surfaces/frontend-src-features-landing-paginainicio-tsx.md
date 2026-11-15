---
version: 1
slug: "frontend-src-features-landing-paginainicio-tsx"
primary_target: "frontend/src/features/landing/PaginaInicio.tsx"
related_targets: ["frontend/src/features/vecino/PaginaTarjeta.tsx"]
---

# Landing para vecinos (/) y tarjeta del vecino (/t/<token>)

Scope: la landing pública `/` (modo Persuade) y la tarjeta del vecino `/t/<token>` (modo Operate, móvil). La propuesta reemplaza el mundo visual actual (calificado 2/10 por el usuario: "muy IA, muy básico"). Se mantiene azul + naranja, el nombre, los textos y la regla sin íconos.

Audience: vecinas a cargo de las compras del hogar y hombres sobre 40, en celular. Job: entender que sus compras en la cuadra suman y que canjean en otro local; acción: ver los comercios de la red (la inscripción ocurre con el QR en la caja). Proof: el mecanismo mismo (la cuenta de un vecino de ejemplo, los niveles reales de la API, la promesa del 3% al comercio). Constraints: WCAG 2.2 AA, nada bajo 15 px, táctiles 48 px, sin íconos, nada que parezca fintech ni infantil/de feria.

## Direction contract

THESIS: Red Vecina es la libreta del almacén puesta en común: cada compra se anota, cada canje se tacha y la cuenta siempre cuadra. Rechaza el hero de programa de puntos (titular + celular flotante + tres tarjetas + logos).

OWN-WORLD: hoja cuadriculada de tinta azul (#C9D8F0 sobre papel #FAFCFF), margen doble azul noche, tapa azul noche #053073 para cabecera de cuentas y cierre, tinta #0B47A8 para lo confirmado, lápiz gris para lo pendiente, tachado de tinta para canjes, total encerrado en un círculo trazado. Naranja #F79D18 solo en lo que se toca. Archivo variable (ancho 85–100%, pesos 500–900), cifras tabulares. Esquinas rectas, bordes de 2 px, todo calza en el renglón de 32 px.

STORY: la vecina ve que su compra queda anotada y suma, entiende que canjea en otro local de la red sin regalarle nada a nadie, confía porque la cuenta cuadra a la vista, y va a ver los comercios.

FIRST VIEWPORT: grilla a pantalla completa con margen a 128 px y fechas en el margen; titular "Tus compras del barrio ahora suman." de 120 px en azul noche, cuatro renglones, "suman." subrayado en tinta; bajada y dos botones (naranja "Ver comercios", papel "Cómo funciona") abajo a la izquierda; a la derecha la "Cuenta de Rosa (ejemplo)" que se escribe fila por fila y cierra con 252 encerrado en un círculo.

FORM: libreta del almacén, posición 6 de 7 en mi lista ordenada; seed:e6985d38384582b6. Raises: pasos enteros de renglón (depot blind); estado por peso del trazo (detector); naranja solo acción (warm app); comercios como índice con folio (sewing pattern); una sola secuencia orquestada (Versailles); una tinta por rol (j-card).

Signature interaction: la cuenta se escribe sola en pasos de renglón; lo pendiente entra en lápiz y se pasa a tinta, el canje se tacha con un trazo, el total se encierra en un círculo animado. Respeta reduced-motion (estado final directo).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
