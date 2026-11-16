# Red Vecina · Construcción del MVP web

Nov 14, 2026 · @Equi

## 1. Recomendación

Construye un **monolito modular**: un solo repositorio y un solo servicio en Render, donde FastAPI entrega la API y también el frontend de React ya compilado. La base de datos va aparte, en Neon. No necesitas dos repos ni Vercel.

El MVP tiene una landing y tres interfaces: la tarjeta del vecino, el portal del comercio y el panel del operador. Sí, el comercio tiene su propio login, y ustedes como administradores tienen el suyo.

| Decisión | Recomendación | Por qué |
| --- | --- | --- |
| Arquitectura | Monolito modular: FastAPI + React (Vite) en un repo | Un deploy, sin CORS, y los módulos se pueden separar después |
| Hosting | Un Web Service en Render con Docker | El plan gratuito lo permite; detalle en la sección 2 |
| Base de datos | Postgres en Neon, plan gratuito | No vence; la base gratuita de Render se borra a los 30 días |
| Acceso del vecino | Enlace personal sin contraseña | Tu público no quiere crear cuentas; ya estaba en la propuesta |
| Acceso de comercio y operador | Correo y contraseña, creados por el administrador | Simple y suficiente para 6 comercios |
| Entrada de boletas | La vecina sube la foto desde su tarjeta web; el operador también puede subirla si llegó por WhatsApp | Quita al operador el paso de descargar y volver a subir |
| Lectura de boletas | Modelo de visión por API que devuelve los campos; el operador siempre aprueba | Las boletas térmicas fotografiadas se leen mal con OCR clásico |
| WhatsApp | Sin API: el panel genera el mensaje con botón “Copiar” y “Abrir WhatsApp” | La API de Meta sigue fuera del MVP, como definió la propuesta |
| Tareas programadas | Se ejecutan al primer uso del día o con un botón del administrador | El plan gratuito no incluye tareas en segundo plano |

**Queda fuera del MVP:** API de WhatsApp, notificaciones automáticas, pagos, app móvil, cobro de membresías y el Modelo B.

## 2. Hosting

Sí puedes subir el monolito completo a Render gratis: es un solo Web Service con Docker que compila React y lo sirve desde FastAPI. Lo único que conviene sacar de Render es la base de datos.

| Pieza | Dónde | Costo | Límite que importa |
| --- | --- | --- | --- |
| Aplicación (API + frontend) | Render, Web Service gratuito con Docker | $0 | Se duerme tras 15 minutos sin tráfico y tarda cerca de 1 minuto en despertar; 750 horas al mes por cuenta ([Render](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026)) |
| Base de datos | Neon, plan gratuito | $0 | 1 GB por proyecto y 100 horas de cómputo al mes, sin fecha de vencimiento ([Neon](https://neon.com/faqs/free-plan-limits-and-quotas)) |
| Fotos de boletas | En Postgres, comprimidas a unos 200 KB | $0 | Unas 2.500 fotos caben en 0,5 GB; el disco de un servicio gratuito no sirve porque se borra en cada reinicio |
| Lectura de boletas | API de un modelo de visión | $0 o centavos | Sección 4 |

**Por qué no las otras opciones**

- **Postgres gratuito de Render:** tiene 1 GB, pero vence 30 días después de crearlo, con 14 días de gracia antes de borrar los datos. Alcanza para dos semanas, pero si el piloto se alarga pierdes todo.
- **Frontend en Vercel y backend en Render:** funciona, pero son dos deploys, dos repos y configuración de CORS y cookies entre dominios. No aporta nada a un prototipo.
- **Railway:** según la comparación de Render, da 5 dólares de crédito el primer mes y 1 dólar los siguientes; los servicios se pausan al agotarlo. Sirve como plan B, no como base.
- **Cloudflare:** su base gratuita (D1) es SQLite pensado para Workers, no para un backend FastAPI con Postgres. No calza con este stack.

**El sueño del servicio sí importa en un punto: la caja.** Una cajera no puede esperar un minuto a que despierte el validador con el cliente al frente. Dos salidas:

1. Un monitor gratuito que visite la ruta `/api/salud` cada 10 minutos. Las 750 horas mensuales cubren un servicio despierto todo el mes.
2. Pagar la instancia de 7 dólares solo durante las semanas con comercios reales. Es lo más seguro para una demostración ante el docente o un dueño.

Para las entrevistas basta la opción 1. Abre la web un par de minutos antes de mostrarla.

## 3. Roles e interfaces

Hay cuatro tipos de usuario. El comercio no define el piso de cupo: ese es un parámetro de la red que solo cambia el administrador. Lo que el comercio sí maneja es su cupo extra y sus beneficios.

| Rol | Cómo entra | Qué puede hacer |
| --- | --- | --- |
| Vecino | Enlace personal `/t/<token>`, sin contraseña | Ver saldo y puntos por vencer, subir una boleta, pedir un código de canje, ver su historial |
| Comercio | Correo y contraseña | Validar códigos, ver su cupo de la semana, agregar cupo extra, proponer beneficios, ver su reporte, descargar su afiche con QR |
| Operador | Correo y contraseña | Revisar boletas, aprobar o rechazar, copiar mensajes, buscar vecinos, resolver reclamos |
| Administrador | Correo y contraseña | Todo lo del operador, más crear comercios y usuarios, aprobar beneficios, cambiar parámetros, ver indicadores de la red, aplicar sanciones |

**Pantallas**

| Zona | Ruta | Contenido |
| --- | --- | --- |
| Pública | `/` | Landing para vecinos: cómo funciona en 3 pasos, comercios de la red, preguntas frecuentes |
| Pública | `/comercios` | Landing para dueños con formulario “Quiero unirme al piloto” |
| Pública | `/unirme/<comercio>` | Inscripción al escanear el QR: nombre, WhatsApp y aceptar condiciones. Guarda el comercio de origen |
| Pública | `/condiciones` | Condiciones del programa y uso de datos |
| Vecino | `/t/<token>` | Tarjeta: saldo, barra hacia el próximo beneficio, beneficios disponibles ordenados por el algoritmo, botón “Subir boleta”, código activo con cuenta regresiva, historial |
| Comercio | `/comercio` | Validador: un campo grande de 6 dígitos y el resultado en pantalla completa |
| Comercio | `/comercio/cupo` | Cupo de la semana, usado, reservado y libre; botón para agregar cupo extra |
| Comercio | `/comercio/beneficios` | Sus 1 a 3 beneficios; los cambios quedan pendientes de aprobación y rigen desde el lunes |
| Comercio | `/comercio/reporte` | Vecinos inscritos, clientes derivados, recompra sin canje, costo de canjes sobre ventas |
| Operador | `/admin/boletas` | Cola de boletas con lectura automática (sección 4) |
| Operador | `/admin/vecinos` | Buscar por nombre o teléfono, ver movimientos, reenviar enlace, ajustar saldo con motivo |
| Operador | `/admin/canjes` | Códigos emitidos, usados y vencidos |
| Administrador | `/admin/comercios` | Alta de comercios y usuarios, aprobación de beneficios, suspensión |
| Administrador | `/admin/red` | Indicadores de la sección 10 de las reglas, con alertas |
| Administrador | `/admin/parametros` | Los 20 parámetros P1 a P20, editables, con registro de cambios |

El enlace personal del vecino funciona como una llave: quien lo tenga ve la tarjeta y puede pedir códigos. Para un piloto es un riesgo aceptable, porque un código solo sirve con una compra en el local. El token debe ser largo y aleatorio, y el operador debe poder regenerarlo.

## 4. Boletas con lectura automática

La lectura no debe ser manual: el sistema lee la boleta, la contrasta con las reglas y deja al operador una decisión de un clic. El operador siempre aprueba; en el MVP nada se acredita solo.

**Flujo**

1. **Entra la foto.** La vecina la sube desde su tarjeta, o el operador la sube y elige a la vecina si llegó por WhatsApp. El navegador la comprime antes de enviarla.
2. **El sistema la lee.** Un modelo de visión devuelve RUT y nombre del emisor, folio, fecha, hora, total y las líneas de productos, cada campo con su nivel de confianza.
3. **El sistema la contrasta** con las reglas y marca cada control en verde, ámbar o rojo.
4. **El operador decide.** Ve la foto con zoom a la izquierda y los campos editables a la derecha. Aprueba, corrige y aprueba, o rechaza con un motivo de la lista.
5. **El sistema entrega el mensaje** ya redactado con los datos reales, con los botones “Copiar” y “Abrir WhatsApp”. El segundo abre el chat de esa vecina con el texto escrito.

**Controles automáticos**

| Control | Regla | Si falla |
| --- | --- | --- |
| El emisor es un comercio de la red | RUT de la boleta contra el RUT registrado | Rojo: rechazo sugerido |
| Folio no repetido | A9 | Rojo: muestra quién la registró antes |
| Fecha dentro de 48 horas | P7 | Rojo: rechazo sugerido |
| Monto mínimo de $1.000 | P3 | Rojo |
| Tope de 500 puntos por boleta | P4 | Ámbar: acredita 500 |
| Máximo 2 boletas al día en ese comercio y 1.000 puntos al día | P5 y P6 | Rojo o ámbar según el caso |
| Productos excluidos | A12 y A13: busca cigarros, recargas y similares en las líneas | Ámbar: propone el monto sin esos productos |
| La vecina no trabaja en ese comercio | A3 | Rojo |
| Lectura dudosa | Confianza baja en total, folio o fecha | Ámbar: resalta el campo para que el operador lo mire |

Cuando todos los controles salen en verde, el botón “Aprobar” queda como acción principal y la boleta se resuelve en segundos.

**Qué motor usar**

Usa un modelo de visión por API y no Tesseract. Las boletas son papel térmico arrugado, fotografiado con celular: el OCR clásico entrega texto suelto que luego hay que interpretar, y además exige instalar un binario en el servidor. Un modelo de visión devuelve directamente los campos en JSON.

| Opción | Costo | A considerar |
| --- | --- | --- |
| Gemini Flash, nivel gratuito | $0 | Los límites dependen del proyecto y se ven en AI Studio; Google indica que el uso gratuito puede servir para mejorar sus productos ([precios](https://ai.google.dev/gemini-api/docs/pricing)) |
| Claude con visión, o Gemini pagado | Centavos por boleta | Sin uso de los datos para mejorar productos en el nivel pagado de Gemini; revisa las condiciones vigentes de cada proveedor |
| Sin lector | $0 | El operador digita los campos. Debe existir siempre como respaldo si la API falla |

Mi recomendación: dejar el proveedor configurable por variable de entorno, partir con el nivel gratuito para las pruebas con datos ficticios y pasar a uno pagado cuando entren boletas de vecinos reales. Con unos cientos de boletas en el piloto el gasto es marginal.

**Plantillas de mensajes**

Se guardan en la base de datos y el administrador puede editarlas. Variables entre llaves.

| Momento | Texto base |
| --- | --- |
| Bienvenida | Hola {nombre}, ya eres parte de Red Vecina. Esta es tu tarjeta: {enlace}. Guárdala; ahí ves tus puntos y subes tus boletas. |
| Boleta recibida | Recibimos tu boleta de {comercio} por {monto}. Tienes {puntos} puntos pendientes; te confirmamos en menos de 24 horas. |
| Boleta aprobada | Listo: +{puntos} puntos. Saldo disponible: {saldo}. {sugerencia\_beneficio} |
| Boleta rechazada | No pudimos sumar tu boleta de {comercio}: {motivo}. {como\_resolver} |
| Código emitido | Tu código es {codigo}. Muéstralo en la caja de {comercio} antes de pagar. Vale hasta el {vence}. Compra mínima: {minimo}. |
| Canje usado | Canje usado en {comercio}. Saldo: {saldo} puntos. Sube la boleta de esta compra y suma más. |
| Puntos por vencer | {nombre}, tienes {puntos} puntos que vencen el {fecha}. Te alcanzan para {beneficio} en {comercio}. |
| Cupo agotado | {comercio} ya entregó sus beneficios de esta semana. Desde el lunes vuelve a estar disponible. Hoy puedes canjear en {alternativas}. |

Si la vecina sube la boleta desde su tarjeta, ve ahí mismo el estado “pendiente” o “aprobada”, y varios de estos mensajes dejan de ser necesarios.

## 5. Arquitectura

El backend se divide en módulos por dominio, y las reglas de negocio viven en funciones puras que no tocan la base de datos. Eso permite probarlas con los números del documento de reglas y, más adelante, separar un módulo sin reescribirlo.

```
red-vecina/
  CLAUDE.md                 convenciones del proyecto para Claude Code
  Dockerfile                compila el frontend y arma la imagen de Python
  render.yaml               definición del servicio en Render
  docs/
    reglas-negocio.md       el documento de reglas, exportado
    construccion.md         este documento, exportado
  backend/
    app/
      main.py               crea la app, monta la API y sirve el frontend
      core/                 configuración, base de datos, seguridad, errores
      modulos/
        cuentas/            usuarios, login, roles
        vecinos/            inscripción, tarjeta, token personal
        comercios/          comercios, beneficios, cupo extra
        boletas/            carga, lectura, controles, aprobación
        puntos/             movimientos, saldo, vencimiento
        canjes/             códigos, reserva, validación
        equilibrio/         cupo semanal, filtro y orden de beneficios
        mensajes/           plantillas y armado de textos
        reportes/           indicadores por comercio y de la red
        parametros/         P1 a P20 con registro de cambios
      servicios/
        lector/             interfaz + proveedores (gemini, anthropic, manual)
        archivos/           interfaz + proveedor en base de datos
      tareas/               recalculo del lunes, vencimientos, códigos vencidos
    migrations/             Alembic
    tests/
  frontend/
    src/
      app/                  rutas y layouts por zona
      features/             vecino, comercio, admin, landing
      components/ui/        componentes de shadcn personalizados
      lib/                  cliente de la API, formato de pesos y fechas
```

**Convenciones**

- Cada módulo tiene `modelos.py`, `esquemas.py`, `reglas.py`, `servicio.py` y `rutas.py`. Un módulo usa a otro solo a través de su `servicio.py`.
- `reglas.py` no importa nada de la base de datos: recibe datos y parámetros, devuelve resultados.
- Ningún número de negocio va escrito en el código. Todo sale de la tabla de parámetros.
- Los puntos se llevan como un libro de movimientos (gana, retiene, libera, canjea, vence, ajusta). El saldo es la suma; nunca se edita un saldo a mano.
- Dinero en pesos enteros. Fechas en UTC en la base de datos y en hora de Santiago en pantalla.
- Stack: FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, pytest; React con TypeScript, Vite, Tailwind, shadcn/ui, React Router y TanStack Query.
- SQLite para desarrollo y pruebas en tu PC; Postgres en producción. Sin tipos exclusivos de Postgres.
- Sesión de comercio y operador con cookie httpOnly. Como frontend y API comparten dominio, no hace falta CORS.

**Tareas sin servidor de fondo.** El recálculo de cupos del lunes, el vencimiento de puntos y la liberación de códigos vencidos se ejecutan de forma perezosa: la primera petición del día revisa si falta correr algo y lo corre una sola vez. El administrador tiene además un botón para forzarlo.

## 6. Diseño

**La libreta del almacén** (desde el 15 de noviembre de 2026). Red Vecina se dibuja como la libreta de cuentas del almacén, llevada entre todos los locales: cada compra se anota, cada canje se tacha y la cuenta siempre cuadra. La página es una hoja cuadriculada con margen doble; los bloques de cierre y las cabeceras son la tapa azul noche. El detalle completo (tokens, componentes y reglas) está en `DESIGN.md`.

**Paleta** (colores propios, sin degradados). Azul de confianza y naranja de barrio, sobre papel cuadriculado: el azul dice que detrás hay alguien serio (puntos que valen plata, datos personales); el naranja trae la calidez del comercio. Son complementarios y la pareja más segura para daltónicos.

| Uso | Nombre | Hex | Contraste |
| --- | --- | --- | --- |
| Tapa: cabeceras, bloques de cierre, titulares | Azul noche (`tapa`, `barrio`) | `#053073` | 12,9:1 sobre papel |
| Tinta: lo anotado y confirmado, enlaces | Tinta azul (`tinta-azul`, `vecina`) | `#0B47A8` | 8,4:1 sobre papel |
| Líneas de la hoja | Cuadrícula (`cuadricula`) | `#CBD9F0` | — |
| Acción: solo lo que se toca | Naranja (`mango`) | `#F79D18` | Siempre con texto azul noche, 5,8:1. Nunca texto blanco (2,1:1) |
| Texto naranja chico sobre claro | Naranja texto (`mango-texto`) | `#9A5B00` | 5,2:1 |
| Fondo general: la hoja | Papel (`papel`, `crema`) | `#FAFCFF` | — |
| Tarjetas | Blanco | `#FFFFFF` | — |
| Texto | Tinta | `#0B1B33` | 16,5:1 |
| Lo pendiente y lo secundario | Lápiz (`lapiz`, `musgo`) | `#5F6B80` | 5,4:1 |
| Estados | Verde `#1E7A46`, ámbar `#B86E00`, rojo `#C0392B` | | Separados de la marca y siempre con una palabra |

Los nombres entre paréntesis son las variables de `frontend/src/index.css`.

**Reglas visuales**

- **Tipografía:** Archivo (variable, alojada en el proyecto). Titulares como rótulos de columna: peso 850, algo angostos. Cifras tabulares. Texto base de 17 a 19 px. Nada bajo 15 px.
- **Botones y tarjetas:** rectángulos de esquinas rectas con borde de 2 px azul noche, sin sombras. El naranja es el plumón de la libreta, en una escala de tonos: marca la acción principal, resalta la palabra clave de la landing, la cifra que importa en cada pantalla de trabajo y el lugar activo de la navegación. Al pasar el cursor los botones solo cambian de color (200 ms).
- **Estados por trazo:** lo pendiente va a lápiz (gris con subrayado discontinuo), lo confirmado en tinta azul, el canje usado tachado. Siempre con su palabra.
- **Movimiento:** una sola secuencia: la cuenta se escribe fila por fila en pasos de renglón, lo pendiente pasa de lápiz a tinta, el canje se tacha y el total se encierra en un círculo. Con movimiento reducido todo aparece terminado.
- **Portada de la landing:** hoja cuadriculada con fechas en el margen, titular grande en azul noche y a la derecha la cuenta de una vecina de ejemplo que se escribe sola, rotulada como ilustración.
- **Sin íconos.** La imagen la hacen la tipografía y la composición: números grandes, pasos numerados, barras y bloques de color planos, renglones y tachados. Los estados se dicen con palabras ("Válido", "Revisar"), no con símbolos. La marca es una R trazada en un cuadrado azul noche con un punto naranja.
- **Móvil primero:** la tarjeta del vecino y el validador se usan en celular; el panel del operador, en computador.

**Pensado para tu público** (mujeres a cargo de las compras del hogar y hombres sobre 40)

- Contraste alto y áreas táctiles de al menos 48 px.
- Una acción principal por pantalla; la tarjeta abre mostrando el saldo y un solo botón, “Subir boleta”.
- Textos en español de Chile, de tú, con frases cortas y sin jerga: “Te faltan 50 puntos para tu descuento en la panadería”.
- Los montos siempre en pesos con punto de miles; las fechas como “viernes 20, 18:30”.
- Sin íconos: cada acción y estado se nombra con palabras. Sin carruseles ni menús ocultos en la tarjeta.

shadcn/ui se usa como base y se personaliza por variables de tema (colores, radios y tipografía), sin crear componentes desde cero.

## 7. Prompts por fase para Claude Code

Son 9 prompts, uno por fase, pensados para pegarlos en orden. Cada uno se apoya en dos archivos que Claude Code lee del proyecto, así que los prompts quedan cortos y las reglas tienen una sola fuente.

**Antes de empezar**

1. Crea la carpeta `red-vecina` y dentro una carpeta `docs`.
2. Exporta como Markdown el documento de reglas de negocio y guárdalo como `docs/reglas-negocio.md`. Haz lo mismo con este documento como `docs/construccion.md`.
3. Abre la terminal en `red-vecina` y ejecuta `claude`.
4. Pega un prompt por sesión. Al terminar cada fase: prueba lo que te indique, pide un commit y usa `/clear` antes de la siguiente.
5. Si algo falla, pega el error tal cual y pide que lo corrija antes de avanzar.

### Fase 0 · Fundaciones

```
Vas a construir Red Vecina, un programa de puntos compartido entre comercios de barrio.
Lee completos docs/reglas-negocio.md y docs/construccion.md. Si falta alguno, detente y
pídemelo. Son la fuente de verdad: si algo que te pido los contradice, avísame antes de
programar.

En esta fase solo quiero las fundaciones del monolito, sin lógica de negocio:

1. La estructura de carpetas de la sección 5 de construccion.md.
2. Backend: FastAPI con la ruta /api/salud, configuración por variables de entorno
   (DATABASE_URL, SECRET_KEY, LECTOR_PROVEEDOR y sus claves), SQLAlchemy 2, Alembic,
   pytest y ruff. SQLite en desarrollo, Postgres en producción.
3. Frontend: Vite + React + TypeScript + Tailwind + shadcn/ui, React Router y TanStack
   Query. En desarrollo, proxy de /api hacia el backend. Una página provisional que
   consulte /api/salud y muestre "API en línea".
4. En producción FastAPI sirve frontend/dist, con respaldo a index.html para toda ruta
   que no empiece con /api.
5. Dockerfile de varias etapas: compila el frontend con Node y arma una imagen liviana
   de Python que escuche en $PORT.
6. Un solo comando para levantar backend y frontend en desarrollo. Detecta mi sistema
   operativo y deja scripts que funcionen en él.
7. CLAUDE.md con las convenciones de la sección 5, los comandos del proyecto y esta
   regla: ningún número de negocio se escribe en el código, todo sale de parámetros.
8. git init, .gitignore, .env.example y un README breve.

Usa versiones estables actuales. Antes de instalar Tailwind y shadcn revisa su
documentación oficial, porque los comandos cambian entre versiones.

Termina cuando: el proyecto levanta en mi PC con un comando, la página muestra "API en
línea" y pytest pasa. No avances a la fase siguiente. Al final dime qué hiciste y cómo
probarlo.
```

### Fase 1 · Datos y motor de reglas

```
Lee CLAUDE.md, docs/reglas-negocio.md y docs/construccion.md. En esta fase construyes el
núcleo del negocio, sin pantallas ni rutas nuevas.

1. Modelos y migración inicial: usuarios con rol (admin, operador, comercio); comercios
   (nombre, rubro, RUT, dirección, slug, estado); vecinos (nombre, teléfono, token
   personal, comercio de origen, consentimiento con fecha, estado); parámetros P1 a P20
   con historial de cambios; beneficios (nivel, texto, tipo, restricción, compra mínima,
   estado, vigente desde); boletas (imagen, lectura en JSON, folio, fecha de compra,
   monto, monto válido, puntos, estado, motivo, revisor); libro de movimientos de puntos
   (gana, retiene, libera, canjea, vence, ajusta, con fecha de vencimiento); canjes
   (código, nivel, estado, emitido, vence, usado, monto del ticket); cupos semanales por
   comercio (base, extra, arrastre, reservado, usado); plantillas de mensajes; auditoría.
2. Funciones puras en el reglas.py de cada módulo, sin acceso a la base de datos:
   cálculo de puntos (A6, A7, P3 a P6); vencimiento a 90 días gastando primero lo más
   antiguo; cupo semanal con la fórmula de la sección 6.1, incluida la proyección de las
   primeras 4 semanas y el arrastre limitado; elegibilidad del vecino; filtro y orden de
   beneficios de la sección 6.2; ciclo del código (reservar, usar, vencer, P19); cliente
   derivado; indicadores de la sección 10.
3. Pruebas que reproduzcan los números de los documentos: una boleta de $7.850 da 78
   puntos; el caso de Rosa (450, canje de 250, queda en 200, suma 52, termina en 252);
   los cupos de 4 semanas de la tabla 6.4 ($120.000, $45.000, $36.000, $30.000, $24.000
   y $20.000); cada límite por vecino; y los casos borde de la sección 8 que dependan de
   reglas.
4. Tareas idempotentes: recalcular cupos del lunes, vencer puntos, liberar códigos
   vencidos. Deben poder ejecutarse dos veces sin duplicar efectos.
5. Datos de demostración: los parámetros con sus valores iniciales, 6 comercios
   ficticios, un admin, un operador, un usuario por comercio, 12 vecinos con 4 semanas
   de boletas y algunos canjes, y las plantillas de la sección 4. Las contraseñas
   iniciales se leen de variables de entorno.

Si una regla es ambigua, no la inventes: pregúntame. Termina cuando todas las pruebas
pasan y el comando de datos de demostración deja una base utilizable. No avances.
```

### Fase 2 · API y acceso

```
Lee CLAUDE.md y los dos documentos de docs. En esta fase expones el núcleo por la API.

1. Acceso: login, logout y "quién soy" para admin, operador y comercio, con contraseña
   cifrada y sesión en cookie httpOnly. El vecino entra solo con su token personal en la
   ruta. Dependencias de FastAPI que exijan rol y, para el comercio, que solo vea lo suyo.
2. Límite de intentos en el login, en las rutas con token de vecino y en la validación
   de códigos.
3. Rutas públicas: comercios de la red con su beneficio destacado, inscripción de
   vecino con comercio de origen y consentimiento, solicitud de un comercio interesado.
4. Rutas del vecino: tarjeta (saldo, pendientes, por vencer, historial), subir boleta
   (guarda la imagen y la deja pendiente), opciones de canje según el algoritmo, pedir
   código.
5. Rutas del comercio: consultar un código y marcarlo usado en dos pasos, cupo de la
   semana, agregar cupo extra, beneficios (los cambios quedan pendientes), reporte.
6. Rutas de operador y admin: cola de boletas, aprobar con ajustes, rechazar con motivo,
   vecinos, canjes, comercios y usuarios, beneficios por aprobar, parámetros,
   indicadores, ejecutar tareas. Cambiar parámetros y crear comercios es solo de admin.
7. Errores con un mensaje en español que se pueda mostrar tal cual al usuario.
8. Pruebas de la API por rol: un comercio no ve datos de otro, un operador no cambia
   parámetros, un token inválido no revela si el vecino existe.
9. Un cliente tipado de la API en frontend/src/lib.

Termina cuando las pruebas pasan y /docs muestra la API ordenada por módulo. No avances.
```

### Fase 3 · Sistema de diseño y landing

```
Lee CLAUDE.md y la sección 6 de docs/construccion.md. En esta fase defines la identidad
visual y construyes las páginas públicas.

1. Tema de shadcn/ui con la paleta, radios y tipografía de la sección 6, como variables
   CSS. Plus Jakarta Sans alojada en el proyecto. Personaliza los componentes de shadcn
   por tema y variantes; no crees componentes desde cero si shadcn ya tiene uno.
2. Componentes base ajustados: botón (principal, secundario, sobre fondo oscuro, de
   peligro; forma de píldora; transición de color de 200 ms), tarjeta, campo de texto,
   etiqueta de estado, diálogo, aviso, pestañas, tabla y esqueleto de carga.
3. Una página interna /estilos que muestre todos los componentes y colores.
4. Layouts por zona: pública, vecino (móvil), comercio (móvil) y admin (computador con
   menú lateral).
5. Landing para vecinos en /: hero a pantalla completa con fondo verde barrio, titular
   grande, frase de apoyo, dos botones y una tarjeta de vecino de ejemplo; "cómo
   funciona" en 3 pasos; comercios de la red tomados de la API; preguntas frecuentes;
   pie de página. Formas geométricas planas de fondo, sin degradados ni fotos de banco.
6. Landing para dueños en /comercios con el formulario "Quiero unirme al piloto".
7. /condiciones con un borrador claro, marcado como pendiente de revisión legal.
8. Textos en español de Chile, de tú, con frases cortas. Montos con punto de miles.

La referencia de estilo es la sobriedad de wise.com: tipografía enorme, colores planos
y mucho aire. No copies su marca, sus colores, sus textos ni su logotipo, y no uses
logos ni marcas reales. Público: mujeres a cargo de las compras del hogar y hombres
sobre 40; prioriza legibilidad y áreas táctiles de 48 px o más.

Revisa el resultado a 390 px y a 1280 px de ancho, corrige desbordes y verifica el
contraste de cada combinación de texto y fondo. Termina cuando las tres páginas se ven
bien en ambos anchos. No avances.
```

### Fase 4 · Inscripción y tarjeta del vecino

```
Lee CLAUDE.md y los dos documentos de docs. En esta fase construyes lo que usa el vecino,
siempre en celular.

1. /unirme/<comercio>: llega desde el QR del local. Muestra el nombre del comercio, pide
   nombre y WhatsApp, y exige aceptar las condiciones. Al terminar lleva a la tarjeta y
   ofrece "Guardar mi tarjeta en WhatsApp", que abre un chat con el enlace personal ya
   escrito.
2. /t/<token>, la tarjeta: saludo, saldo disponible en grande, puntos pendientes, aviso
   de puntos por vencer y una barra hacia el próximo beneficio con el texto "Te faltan
   X puntos para...".
3. Botón principal "Subir boleta": cámara o galería, compresión en el navegador a unos
   200 KB, vista previa y confirmación. La boleta aparece como pendiente en el historial.
4. "Mis beneficios": las opciones que entrega el algoritmo, en su orden, con comercio,
   descuento, compra mínima y puntos. Los comercios sin cupo aparecen al final con
   "Vuelve el lunes". Si el vecino no puede canjear, se explica el motivo en una frase.
5. Pedir código: confirmación con las condiciones, y luego el código de 6 dígitos en
   grande con cuenta regresiva de 48 horas, el comercio y la compra mínima. Mientras hay
   un código activo, ocupa el lugar principal de la tarjeta.
6. Historial de compras, canjes y vencimientos.
7. Estados vacíos, de carga y de error para cada bloque, con textos amables.

Una acción principal por pantalla. Termina cuando puedo inscribir un vecino nuevo, subir
una boleta y pedir un código desde el celular con los datos de demostración. No avances.
```

### Fase 5 · Panel del operador: boletas con lectura automática y mensajes

```
Lee CLAUDE.md y la sección 4 de docs/construccion.md. En esta fase construyes el trabajo
diario del operador.

1. Servicio lector con una interfaz única que recibe una imagen y devuelve RUT y nombre
   del emisor, folio, fecha, hora, total, líneas de productos y un nivel de confianza
   por campo. Tres proveedores elegidos por LECTOR_PROVEEDOR: gemini, anthropic y manual
   (no lee nada). Revisa la documentación oficial vigente de cada API para el nombre del
   modelo de visión y el formato de salida estructurada; no los asumas de memoria. Si el
   proveedor falla o tarda, la boleta queda para digitación manual sin romper nada.
2. Al entrar una boleta se lee y se aplican los controles de la tabla de la sección 4.
   Cada control guarda su resultado (verde, ámbar, rojo) y su explicación.
3. /admin/boletas: cola ordenada por antigüedad con filtros por estado y comercio, y un
   contador de pendientes.
4. Revisión de una boleta: foto con zoom y giro a la izquierda; a la derecha los campos
   editables, los controles con su color, los puntos calculados en vivo y las acciones
   Aprobar, Aprobar con ajustes y Rechazar con motivo de una lista. Atajos de teclado
   para aprobar y pasar a la siguiente.
5. El operador también puede subir una boleta que llegó por WhatsApp y asignarla a un
   vecino buscándolo por teléfono o nombre.
6. Tras cada decisión, el mensaje para el vecino armado con la plantilla y los datos
   reales, con los botones "Copiar" y "Abrir WhatsApp" (enlace wa.me con el texto).
7. /admin/vecinos y /admin/canjes según la sección 3, incluido el ajuste de saldo con
   motivo obligatorio, que queda en auditoría.
8. Pruebas del lector con un proveedor simulado y de cada control.

No escribas claves en el código: van en variables de entorno. Termina cuando puedo
procesar de punta a punta una boleta de prueba con el proveedor manual y con uno real.
No avances.
```

### Fase 6 · Portal del comercio

```
Lee CLAUDE.md y los dos documentos de docs. En esta fase construyes lo que usa el
comercio, pensado para el celular de la caja.

1. /comercio/login y sesión de larga duración, para no pedir la clave en cada turno.
2. /comercio, el validador: un campo grande para los 6 dígitos con teclado numérico. La
   respuesta ocupa toda la pantalla: en verde "Válido: $X de descuento, compra mínima
   $Y" con el botón "Usar" y un campo opcional para el monto del ticket; en rojo el
   motivo exacto (vencido, ya usado con fecha y hora, de otro local, no existe). Tras
   usarlo, confirmación clara y vuelta al campo vacío. Debe resolverse en menos de 10
   segundos y con dos toques.
3. Ingreso diferido para cuando no hubo internet: registrar un código ya aplicado, que
   queda marcado para revisión del operador (sección 8 de las reglas).
4. /comercio/cupo: cupo de la semana, usado, reservado y libre, con una barra y el
   semáforo; explicación en una frase de cómo se calcula; botón para agregar cupo extra.
   El comercio no puede bajar su cupo ni tocar el piso.
5. /comercio/beneficios: sus 1 a 3 beneficios por nivel, con texto, tipo, restricción y
   compra mínima (solo puede bajarla). Los cambios quedan pendientes de aprobación y
   rigen desde el lunes siguiente; se muestra la versión vigente y la pendiente.
6. /comercio/reporte: vecinos inscritos en su local, clientes derivados recibidos,
   recompra sin canje, canjes del mes, ventas registradas y costo de canjes como
   porcentaje de esas ventas, con comparación contra el mes anterior y una frase de
   resumen.
7. Afiche descargable en PDF o imagen con el QR que apunta a /unirme/<comercio>, y una
   tarjeta de 3 pasos para la caja.

Termina cuando, con dos navegadores, puedo pedir un código como vecino y validarlo como
comercio, y el cupo y el saldo cambian como dicen las reglas. No avances.
```

### Fase 7 · Administración e indicadores

```
Lee CLAUDE.md y los dos documentos de docs. En esta fase cierras el panel de
administración.

1. /admin/comercios: alta y edición de comercios y de sus usuarios, aprobación o rechazo
   de beneficios pendientes con comentario, suspensión y registro de sanciones (sección
   9 de las reglas). Bandeja de solicitudes llegadas desde la landing.
2. /admin/parametros: P1 a P20 con su descripción, valor editable, validación de rangos
   y registro de quién cambió qué y cuándo. Los cambios rigen hacia adelante y nunca
   recalculan puntos ya otorgados.
3. /admin/red: los indicadores de la sección 10 por comercio y de la red, con su señal
   de alerta y la acción sugerida. Para cualquier gráfico usa los componentes de
   gráficos de shadcn.
4. Revisión del lunes en una pantalla: cupos nuevos por comercio comparados con la
   semana anterior, cobertura de la red y alertas activas.
5. Alertas de fraude de la sección 9: cuentas con muchas boletas en un mismo local,
   horarios superpuestos, saltos de ventas registradas.
6. Plantillas de mensajes editables, con vista previa usando datos de ejemplo.
7. Botón "Ejecutar tareas ahora" y fecha de la última ejecución de cada tarea.
8. Exportar a CSV boletas, canjes y el reporte por comercio.
9. Salida de un vecino del programa: borra sus datos personales y anula sus puntos,
   conservando los totales anónimos.

Al final recorre la aplicación completa con los tres roles y corrige lo que encuentres
roto o inconsistente con las reglas. Entrégame una lista de lo que revisaste. No avances.
```

### Fase 8 · Publicación en Render y Neon

```
Lee CLAUDE.md y la sección 2 de docs/construccion.md. En esta fase dejas el proyecto
listo para publicar. Tú preparas todo; las cuentas y los clics los hago yo.

1. Revisa el Dockerfile: imagen final liviana, usuario sin privilegios, escucha en
   $PORT, y al iniciar aplica las migraciones antes de levantar el servidor.
2. render.yaml con un Web Service de Docker en el plan gratuito, ruta de salud
   /api/salud y la lista de variables de entorno sin sus valores.
3. Conexión a Postgres de Neon: usa la cadena con pooling y SSL, y un pool pequeño que
   tolere que la base se suspenda y despierte.
4. Un comando para cargar parámetros, plantillas y el primer administrador en la base
   de producción, ejecutable desde mi PC apuntando a Neon, y otro separado para los
   datos de demostración. Ninguno debe correr solo al iniciar el servicio.
5. Seguridad mínima: cookies seguras, cabeceras básicas, límite de tamaño de subida,
   /docs desactivado en producción y ninguna clave en el repositorio. Revisa el
   historial de git por si quedó alguna.
6. DEPLOY.md con los pasos exactos para mí: crear el proyecto en Neon, subir el repo a
   GitHub, crear el servicio en Render, cargar las variables, ejecutar los comandos del
   punto 4, configurar un monitor que visite /api/salud cada 10 minutos y una lista de
   comprobación final por rol.
7. Construye la imagen localmente si tengo Docker; si no, dime cómo verificar el build
   directamente en Render.

Termina cuando DEPLOY.md está completo y el proyecto arranca en modo producción en mi
PC. Después acompáñame paso a paso mientras lo publico.
```

**Tres cuidados al publicar**

- No subas boletas ni teléfonos reales hasta que las condiciones y el manejo de datos estén revisados; para las entrevistas bastan los datos de demostración.
- Cambia las contraseñas iniciales el mismo día de la publicación.
- Antes de la primera prueba con un comercio real, decide entre el monitor gratuito y la instancia pagada (sección 2).

## Fuentes

- [Render: plataformas con nivel gratuito real en 2026](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026): límites del servicio web y del Postgres gratuitos de Render, y créditos de Railway.
- [Neon: límites del plan gratuito](https://neon.com/faqs/free-plan-limits-and-quotas): almacenamiento y horas de cómputo.
- [Gemini API: precios](https://ai.google.dev/gemini-api/docs/pricing): nivel gratuito y uso de datos.
- [Wise Chile](https://wise.com/cl/): referencia de estructura de la landing.

Los planes gratuitos cambian con frecuencia. Confirma los límites en cada sitio el día que publiques.
