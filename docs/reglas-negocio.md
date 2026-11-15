# Red Vecina · Reglas de negocio del MVP

Nov 11, 2026 · @Equi

## 1. El producto en una página

El MVP es una **tarjeta de puntos de barrio por WhatsApp** con tres piezas: el chat donde el vecino manda su boleta y pide canjes, una tarjeta web con su saldo y beneficios, y un validador web donde el comercio confirma el código. Detrás, una planilla lleva puntos, cupos y canjes.

El riesgo que señalas (todos canjean en un mismo local y ese local regala sin vender) se resuelve con cuatro reglas que actúan juntas:

1. **Todo canje va con compra.** El descuento nunca supera el 20% del ticket. No existe el producto gratis sin compra, así que cada canje trae ingreso al local.
2. **Cada comercio tiene un cupo de canje ligado a sus ventas.** Un local entrega en descuentos como máximo el 3% de lo que la red registra que vendió, con un piso de $20.000 al mes. Quien más vende a vecinos de la red, más canjes absorbe.
3. **El cupo se libera por semana.** Así no se agota en los primeros días del mes ni se concentra en un fin de semana.
4. **El sistema decide qué beneficios ve cada vecino.** Muestra primero los locales con más cupo libre y los que el vecino no conoce; oculta los que ya llegaron a su tope.

Para el dueño la promesa queda en una frase: *“Nunca vas a entregar en descuentos más del 3% de lo que vendes a vecinos de la red, y cada descuento viene con una compra de al menos cinco veces su valor.”*

Todos los números de este documento son hipótesis de partida para el piloto. Están reunidos en la sección 2 para ajustarlos en un solo lugar.

## 2. Parámetros del MVP

Estos 20 valores definen todo el programa. Cambiar una regla significa cambiar una fila de esta tabla.

| # | Parámetro | Valor inicial | Para qué sirve |
| --- | --- | --- | --- |
| P1 | Puntos por compra | 1 punto por cada $100 pagados | Igual a los 10 puntos por $1.000 de la propuesta |
| P2 | Valor de referencia del punto | $4 | 500 puntos = $2.000, como en la propuesta |
| P3 | Compra mínima para sumar | $1.000 | Evita boletas de montos ínfimos |
| P4 | Máximo de puntos por boleta | 500 (compra de $50.000) | Limita boletas atípicas o de terceros |
| P5 | Máximo de boletas por vecino | 2 al día por comercio | Frena la recolección de boletas ajenas |
| P6 | Máximo de puntos por vecino | 1.000 al día | Ídem |
| P7 | Plazo para enviar la boleta | 48 horas desde la compra | Mantiene el registro al día |
| P8 | Vigencia de los puntos | 90 días desde la compra | Obliga a usar y acota la deuda de la red |
| P9 | Niveles de beneficio | 250, 500 y 1.000 puntos | Descuentos de $1.000, $2.000 y $4.000 |
| P10 | Compra mínima para canjear | 5 veces el descuento | $5.000, $10.000 y $20.000: el descuento es a lo más 20% del ticket |
| P11 | Vigencia del código de canje | 48 horas | Libera el cupo si el vecino no va |
| P12 | Canjes por vecino en un mismo comercio | 1 cada 30 días | Evita que el mismo vecino cargue siempre al mismo local |
| P13 | Canjes por vecino en la red | 4 cada 30 días, 1 al día | Reparte el cupo entre más vecinos |
| P14 | Códigos activos por vecino | 1 a la vez | No se reserva cupo en varios locales |
| P15 | Tasa de cupo | 3% de las ventas registradas del comercio en los últimos 28 días | Núcleo del equilibrio (sección 6) |
| P16 | Piso de cupo | $5.000 a la semana ($20.000 al mes) | Inversión mínima de captación de todo socio: unos 10 canjes de $2.000 al mes |
| P17 | Liberación del cupo | Semanal, los lunes; lo no usado pasa solo a la semana siguiente | Reparte los canjes en el tiempo |
| P18 | Cobertura mínima de la red | Suma de cupos de al menos 70% del valor de los puntos emitidos en 28 días | Asegura que los vecinos sí puedan canjear |
| P19 | Códigos vencidos tolerados | 3 en 30 días; luego 7 días sin pedir canjes | Evita bloquear cupo sin usarlo |
| P20 | Antigüedad mínima para canjear | 1 boleta validada | Un número recién inscrito no canjea sin haber comprado |

## 3. Reglas para acumular puntos

El vecino suma puntos por lo que efectivamente paga en cualquier comercio de la red, y los puntos quedan firmes solo cuando el operador valida la boleta.

**Quién acumula**

- A1. Una cuenta por número de WhatsApp, de una persona mayor de 18 años que aceptó las condiciones al inscribirse.
- A2. La cuenta guarda el comercio donde el vecino escaneó el QR. Ese es su **comercio de origen** y sirve para medir clientes derivados.
- A3. Dueños y empleados pueden tener cuenta, pero no suman puntos en el local donde trabajan.

**Cómo se suma**

- A4. El vecino envía al chat una foto legible de la boleta o del comprobante de pago con tarjeta. Deben verse comercio, fecha, monto total y número de folio u operación.
- A5. Plazo: 48 horas desde la compra (P7). Pasado ese plazo la boleta no suma.
- A6. Se calcula 1 punto por cada $100 pagados, redondeando hacia abajo. Una boleta de $7.850 da 78 puntos.
- A7. Si la compra usó un canje, los puntos se calculan sobre el monto pagado después del descuento.
- A8. Los puntos aparecen como **pendientes** al enviar la foto y como **disponibles** cuando el operador la valida, en un máximo de 24 horas. Solo los disponibles sirven para canjear.
- A9. Cada boleta suma una sola vez y para una sola cuenta. El folio queda registrado; un folio repetido se rechaza.

**Límites**

- A10. Compra mínima de $1.000; máximo 500 puntos por boleta; máximo 2 boletas al día por comercio; máximo 1.000 puntos al día por vecino (P3 a P6).
- A11. Solo suman compras de consumo del hogar. Las compras con factura (de otro negocio) no suman.

**Qué no suma puntos**

- A12. Cigarros y tabaco.
- A13. Recargas de celular, pago de cuentas, giros, juegos de azar y tarjetas de regalo. Son servicios de margen casi nulo para el local.
- A14. Compras al fiado, hasta que se pagan y existe boleta.
- A15. Si la boleta mezcla productos excluidos y permitidos, el operador descuenta los excluidos que se vean en el detalle.

**Correcciones**

- A16. Si una compra se anula o se devuelve, el comercio avisa y los puntos se restan. Si ya se gastaron, el saldo queda negativo y se compensa con las compras siguientes.
- A17. El vecino puede reclamar un saldo durante 7 días desde la compra, reenviando la boleta.

## 4. Beneficios y reglas de canje

Todos los comercios ofrecen los mismos tres niveles de beneficio, siempre atados a una compra mínima en ese local.

| Nivel | Puntos | Descuento | Compra mínima | Ejemplo en producto |
| --- | --- | --- | --- | --- |
| Chico | 250 | $1.000 | $5.000 | Barbería: $1.000 menos en el corte |
| Medio | 500 | $2.000 | $10.000 | Carnicería: $2.000 menos en compras sobre $10.000 |
| Grande | 1.000 | $4.000 | $20.000 | Minimarket: $4.000 menos en compras sobre $20.000 |

**Qué ofrece cada comercio**

- B1. Cada comercio publica entre 1 y 3 beneficios, uno por nivel como máximo. El nivel medio es obligatorio.
- B2. El beneficio puede ser un descuento en pesos o un producto de regalo. El precio normal del producto no puede superar el descuento del nivel, y la compra mínima se mantiene.
- B3. Cada canje descuenta del cupo del comercio el valor del nivel ($1.000, $2.000 o $4.000), sea descuento o producto.
- B4. El dueño puede bajar la compra mínima de su local para ser más atractivo. No puede subirla sobre 5 veces el descuento.

**Sobre qué productos aplica**

- B5. Por defecto el descuento aplica al total de la compra, sin contar los productos excluidos de la regla A12 y A13.
- B6. El comercio puede poner una sola restricción por beneficio, escrita en el texto que ve el vecino. Ejemplos: “no acumulable con la oferta de la semana”, “solo de lunes a jueves”. Debe valer al menos 4 días a la semana.
- B7. El operador aprueba cada beneficio antes de publicarlo. No se aceptan restricciones que lo vuelvan inalcanzable.
- B8. No se regalan cigarros ni alcohol como beneficio.

**Cómo se usa el cupón**

- B9. El vecino pide el canje en el chat o en su tarjeta web y elige comercio y nivel entre los que el sistema le muestra (sección 6).
- B10. Recibe un código de 6 dígitos. El código vale solo en ese comercio, por ese beneficio, una sola vez y durante 48 horas.
- B11. Al pedirlo, los puntos quedan **retenidos** y el cupo del comercio queda **reservado**. Si el código vence, puntos y cupo vuelven solos.
- B12. El código es al portador: el titular puede pasárselo a un familiar. Los límites se cuentan en la cuenta del titular.
- B13. En la caja, el vecino muestra el código **antes** de pagar. El comercio lo ingresa en su validador, ve “válido” con el descuento y la compra mínima, y aplica el descuento.
- B14. Un código por compra. No se combina con otro código, no se cambia por dinero, no da vuelto y no se usa en parte.
- B15. El vecino paga el resto con cualquier medio de pago y esa compra suma puntos sobre lo pagado (A7).

**Límites por vecino**

- B16. Un canje cada 30 días en un mismo comercio; hasta 4 canjes cada 30 días en toda la red; 1 al día; 1 código activo a la vez (P12 a P14).
- B17. El vecino puede canjear en cualquier comercio de la red, incluido aquel donde acumuló. El costo lo asume siempre el comercio que recibe el canje (Modelo A).

## 5. Vigencias y plazos

Hay tres relojes que el vecino debe conocer: 48 horas para enviar la boleta, 90 días para usar los puntos y 48 horas para usar un código.

| Qué | Plazo | Qué pasa al vencer |
| --- | --- | --- |
| Enviar la boleta | 48 horas desde la compra | La boleta ya no suma |
| Validación de la boleta por el operador | 24 horas | Los puntos pasan de pendientes a disponibles |
| Reclamo por puntos mal calculados | 7 días desde la compra | Se cierra el registro de esa compra |
| Puntos | 90 días desde la compra | Vencen. Se gastan primero los más antiguos |
| Aviso de vencimiento | 15 y 3 días antes | Mensaje con saldo por vencer y el beneficio más cercano |
| Código de canje | 48 horas | Puntos y cupo se liberan; cuenta como código vencido (P19) |
| Cupo semanal del comercio | Lunes a domingo | Lo no usado pasa a la semana siguiente, una sola vez |
| Cambio de beneficios de un comercio | Solo los lunes, con 7 días de aviso | Los códigos ya emitidos se respetan |
| Salida de un comercio de la red | 30 días de aviso | Respeta los códigos emitidos; sus puntos ya entregados siguen valiendo en el resto |
| Cierre de la red o fin del piloto | 30 días de aviso a los vecinos | Los puntos se pueden canjear durante esos 30 días y luego se anulan |
| Cuenta sin compras | 180 días | Se cierra la cuenta y se borran sus datos |

Los 90 días tienen una función económica: los puntos sin canjear son una deuda de los comercios con los vecinos, y el vencimiento impide que crezca sin límite. Con un piloto de 60 días no alcanzará a vencer ningún punto, así que el plazo se prueba recién si la red continúa.

## 6. Algoritmo de equilibrio

El algoritmo reparte los canjes en proporción a lo que cada comercio vende dentro de la red: ningún local entrega más descuentos que su cupo, y la demanda que sobra se dirige a los locales con cupo libre.

La lógica es la del Modelo B de la propuesta, pero sin mover dinero entre comercios. Cada local emite puntos al vender; su obligación de recibir canjes crece con esas mismas ventas.

### 6.1 Cupo semanal de cada comercio

Se calcula cada lunes con las ventas registradas de los últimos 28 días:

```latex
\text{Cupo}_i = \max\left(\$5.000,\ \frac{3\% \times V_i}{4}\right) + \text{Extra}_i + \text{Arrastre}_i
```

- **V** son las ventas con boleta validada del comercio en los últimos 28 días. En las primeras 4 semanas se proyecta con los días que haya.
- **Extra** es cupo adicional que el dueño agrega por decisión propia, por ejemplo para una campaña. Es el único ajuste que puede hacer: no puede bajar su cupo.
- **Arrastre** es lo que no usó la semana anterior. Se pierde si tampoco se usa esta semana.

### 6.2 Qué beneficios ve el vecino

Cuando un vecino pide canjear, el sistema hace tres pasos:

1. **Revisa al vecino.** Tiene al menos una boleta validada, no tiene un código activo, no canjeó hoy, lleva menos de 4 canjes en 30 días y no está suspendido.
2. **Filtra los beneficios.** Un beneficio se muestra solo si el saldo disponible alcanza, el comercio tiene cupo libre para ese nivel esta semana, el vecino no canjeó ahí en los últimos 30 días y el beneficio vale en las próximas 48 horas.
3. **Ordena lo que queda.** Primero los comercios donde el vecino nunca ha comprado; después, de mayor a menor porcentaje de cupo libre. Se muestran los 3 primeros y un “ver todos”.

Un comercio sin cupo aparece al final como “Cupo de la semana agotado, vuelve el lunes”. El vecino entiende que el beneficio existe y el local no recibe más canjes.

### 6.3 Reserva, uso y liberación

- Al emitir el código se reserva el cupo y se retienen los puntos.
- Al validarlo en caja, el cupo se consume y los puntos se descuentan.
- Si vence a las 48 horas, ambos se liberan.

```
cada lunes:
  para cada comercio i:
    base[i]  = max(5000, 0.03 * ventas_28d[i] / 4)
    cupo[i]  = base[i] + extra[i] + min(libre_semana_anterior[i], base_anterior[i])

al pedir canje (vecino v):
  si no cumple_limites(v): responder motivo y terminar
  opciones = []
  para cada comercio i, nivel n:
    si saldo[v] >= puntos[n]
       y cupo_libre[i] >= valor[n]
       y dias_desde_ultimo_canje(v, i) >= 30
       y vigente_48h(i, n):
         opciones.agregar(i, n)
  ordenar opciones por (ya_compro(v, i) ascendente, pct_cupo_libre[i] descendente)
  mostrar primeras 3

al elegir (i, n):
  codigo = generar(); vence en 48 h
  saldo_retenido[v] += puntos[n]; cupo_libre[i] -= valor[n]

al validar en caja:  quemar puntos, marcar codigo usado, registrar monto del ticket
al vencer:           devolver puntos y cupo, sumar 1 a codigos_vencidos[v]
```

### 6.4 Ejemplo con la red de 6 comercios

Con 4 semanas de ventas registradas por $8.800.000, la red emite 88.000 puntos ($352.000 a valor de referencia) y los cupos suman $275.000, un 78% de lo emitido. Supongamos que los vecinos quieren canjear $250.000 y que, sin reglas, el 40% iría a la panadería porque su beneficio es el más atractivo.

| Comercio | Ventas registradas | Canjes sin reglas | % de sus ventas | Cupo de 4 semanas | Canjes con cupo | % de sus ventas |
| --- | --- | --- | --- | --- | --- | --- |
| Minimarket Don Luis | $4.000.000 | $50.000 | 1,3% | $120.000 | $100.000 | 2,5% |
| Carnicería El Novillo | $1.500.000 | $38.000 | 2,5% | $45.000 | $43.000 | 2,9% |
| Panadería La Espiga | $1.200.000 | $100.000 | 8,3% | $36.000 | $36.000 | 3,0% |
| Botillería Los Aromos | $1.000.000 | $26.000 | 2,6% | $30.000 | $29.000 | 2,9% |
| Verdulería Doña Ana | $800.000 | $20.000 | 2,5% | $24.000 | $23.000 | 2,9% |
| Barbería Central | $300.000 | $16.000 | 5,3% | $20.000 (piso) | $19.000 | 6,3% |
| **Total** | **$8.800.000** | **$250.000** | **2,8%** | **$275.000** | **$250.000** | **2,8%** |

Sin reglas, la panadería entrega el 8,3% de sus ventas en descuentos; con cupo, el 3,0%. Los $64.000 que sobran se reparten entre los demás según su cupo libre, sobre todo hacia el minimarket, que es quien más puntos emite. La barbería supera el 3% porque está en el piso: es su inversión de captación y está acotada a $20.000 al mes.

Cifras ficticias para ilustrar. En la práctica una parte de esos $64.000 no se redirige: algunos vecinos esperan al lunes siguiente.

### 6.5 Qué pasa si la red entera se queda corta

Si la suma de cupos baja del 70% del valor de los puntos emitidos (P18), los vecinos acumulan sin poder canjear. El operador sube la tasa de cupo para todos por igual, o pide cupo extra voluntario. Nunca se sube solo a un comercio.

## 7. Caso real en el local

En la caja el comercio hace una sola cosa nueva: ingresar un código de 6 dígitos antes de cobrar. Acumular no le pide nada al cajero.

### 7.1 Rosa acumula en el minimarket

1. Rosa compra $7.850 en el Minimarket Don Luis y recibe su boleta, como siempre. El cajero no hace nada distinto.
2. Saliendo, o en su casa esa noche, manda la foto de la boleta al chat de Red Vecina.
3. Respuesta inmediata: *“Recibimos tu boleta de Minimarket Don Luis por $7.850. Tienes 78 puntos pendientes; te confirmamos en menos de 24 horas.”*
4. El operador revisa comercio, fecha (menos de 48 horas), monto y folio no repetido, y la aprueba en la planilla.
5. Rosa recibe: *“Listo: +78 puntos. Saldo disponible: 450. Te alcanza para $1.000 de descuento en Panadería La Espiga, a media cuadra.”*

### 7.2 Rosa canjea en la panadería

1. Rosa escribe “canjear”. El sistema aplica la sección 6.2 y le muestra tres opciones. La primera es la panadería, porque nunca ha comprado ahí y tiene cupo libre.
2. Rosa elige *“$1.000 de descuento en compras sobre $5.000, Panadería La Espiga, 250 puntos”*.
3. Recibe: *“Tu código es 482 913. Muéstralo en la caja antes de pagar. Vale hasta el viernes a las 18:30.”* Quedan 250 puntos retenidos y $1.000 de cupo reservado en la panadería.
4. Al día siguiente Rosa lleva $6.200 en pan y pasteles y muestra el código antes de pagar.
5. La cajera abre el validador del local en su celular (un enlace con clave), escribe 482913 y ve: *“Válido. $1.000 de descuento. Compra mínima $5.000.”*
6. Confirma que la compra supera $5.000, cobra $5.200, emite la boleta por lo pagado y toca “Usar”. El código queda quemado.
7. Rosa recibe: *“Canje usado en Panadería La Espiga. Saldo: 200 puntos. Manda la boleta de esta compra y suma más.”* Envía la boleta de $5.200 y suma 52 puntos: saldo 252.

### 7.3 Qué quedó registrado

| Para quién | Registro |
| --- | --- |
| Panadería | Una venta de $5.200, $1.000 de su cupo semanal usado y un **cliente derivado** (Rosa se inscribió en Don Luis y compró aquí por primera vez) |
| Minimarket | Rosa aparece como vecina de origen que visitó otro comercio de la red |
| Operador | $300 por cliente derivado a cobrar a la panadería después del piloto, una sola vez por cada par vecino y comercio |
| Rosa | No puede volver a canjear en la panadería durante 30 días, pero sí comprar y sumar |

Si Rosa vuelve a la panadería la semana siguiente sin código y manda la boleta, el reporte la cuenta como “volvió sin usar puntos”. Ese es el número que le demuestra a la panadería que el descuento valió la pena.

### 7.4 Lo que opera el equipo en el piloto

- Boletas: revisión manual dos veces al día, por ejemplo a las 13:00 y a las 20:00.
- Códigos: los genera la planilla o el backend simple. El validador web evita que el equipo tenga que responder en vivo a cada caja.
- Plan B sin validador: el cajero manda el código por WhatsApp al operador. Esto exige un turno de respuesta en menos de 2 minutos durante el horario de los locales, así que conviene construir el validador.

## 8. Casos borde

Cada situación tiene una respuesta única para que el cajero y el operador no improvisen.

| Situación | Regla |
| --- | --- |
| La compra no llega al mínimo | No se aplica el descuento. El código sigue vigente hasta sus 48 horas; el vecino puede agregar productos o volver |
| El vecino muestra el código después de pagar | No se aplica a esa compra. Puede usarlo en otra dentro del plazo |
| El código venció | El validador dice “vencido”. Los puntos ya volvieron al saldo; el vecino pide otro |
| El código es de otro comercio | El validador dice “no corresponde a este local”. No se acepta |
| El código ya fue usado | El validador dice “ya usado” con fecha y hora. No se acepta |
| El local no tiene internet | El cajero aplica el descuento, anota código y monto, y lo ingresa cuando vuelva la señal, ese mismo día. Si el código resulta inválido, ese canje no se descuenta del cupo del local y el operador lo revisa |
| El cajero no conoce el programa | En la caja hay una tarjeta de 3 pasos y el contacto del operador. El alta incluye capacitar a todos los turnos |
| El producto de regalo está agotado | El comercio entrega el descuento equivalente en pesos del mismo nivel |
| El comercio se quedó sin cupo después de emitir el código | No ocurre: el cupo se reserva al emitir |
| El local está cerrado durante las 48 horas | El código vence, puntos y cupo vuelven, y no cuenta como código vencido del vecino |
| El comercio se niega a respetar un código válido | El vecino avisa por el chat; el operador devuelve los puntos y contacta al dueño. Dos casos en un mes suspenden al comercio |
| La foto de la boleta es ilegible | Se pide otra foto dentro del mismo plazo de 48 horas |
| El vecino no pidió boleta | Sin boleta o comprobante no hay puntos. El comercio debe entregarla siempre |
| Dos vecinos mandan la misma boleta | Suma el primero. El segundo recibe “esta boleta ya fue registrada” y una advertencia |
| El vecino cambia de número | El operador traspasa el saldo si el vecino escribe desde el número antiguo, o valida datos de sus últimas dos compras |
| El vecino pide salir del programa | Se borran sus datos y sus puntos se anulan, previa confirmación |
| El vecino devuelve una compra hecha con canje | El comercio devuelve solo lo pagado. Los puntos del canje no se reponen; los ganados en esa compra se restan |
| Un comercio sale de la red | Regla de los 30 días de la sección 5. Su cupo desaparece y se revisa la cobertura (P18) |
| Entra un comercio nuevo | Parte con el piso de cupo y se muestra primero a casi todos, porque nadie ha comprado ahí |
| El vecino tiene puntos pero ninguna opción disponible | Mensaje con la fecha en que se libera cupo y los beneficios que verá el lunes. Si pasa a más del 10% de los pedidos, se aplica la sección 6.5 |

## 9. Fraude y abuso

El fraude más probable en este modelo es interno: un cajero que registra a su nombre las boletas que los clientes dejan en el mesón.

| Riesgo | Control |
| --- | --- |
| Cajero o dueño suma boletas de clientes | No suman en su propio local (A3); máximo 2 boletas al día por comercio (P5); alerta si una cuenta concentra más de 10 boletas a la semana en un local |
| Boleta repetida o compartida | Folio único por comercio (A9) |
| Boleta ajena recogida del suelo o del basurero | Límites P4 a P6 y plazo de 48 horas; alerta si los horarios de compra de una cuenta se superponen en dos locales |
| Boleta adulterada | El operador compara monto y folio; en la revisión mensual el comercio confirma una muestra de 10 boletas |
| Comercio y vecino inventan compras para inflar el cupo | Cada boleta tiene costo tributario para el local; alerta si las ventas registradas de un comercio suben más de 50% de una semana a otra sin más vecinos |
| Código usado dos veces | Un solo uso; el validador lo quema en el momento |
| Vecino reserva cupo y no va | Código de 48 horas, 1 activo a la vez, y pausa de 7 días tras 3 vencidos (P19) |
| Cuentas múltiples de una misma persona | Una cuenta por número; los límites por boleta y por día vuelven poco rentable abrir varias |
| Comercio marca canjes que no ocurrieron | No gana nada: el canje consume su propio cupo y no recibe dinero de la red |
| Comercio no ofrece boleta para que no se registren ventas | Sus ventas registradas bajan y con ellas su visibilidad; el vecino puede reportarlo por el chat |

**Sanciones**

- Vecino: primera vez, advertencia y anulación de los puntos mal obtenidos. Segunda vez, cierre de la cuenta y pérdida del saldo.
- Comercio: primera vez, advertencia escrita. Segunda vez en 60 días, suspensión de sus beneficios por 2 semanas. Tercera, salida de la red.
- Toda sanción la decide el operador y queda anotada con fecha y evidencia.

## 10. Indicadores y revisión semanal

Cada lunes, al recalcular los cupos, el operador mira cinco números por comercio y dos de la red.

| Indicador | Cómo se calcula | Señal de alerta | Acción |
| --- | --- | --- | --- |
| Costo de canjes sobre ventas | Canjes recibidos ÷ ventas registradas, 28 días | Sobre 3% en un comercio que no está en el piso | Revisar el cálculo del cupo: no debería ocurrir |
| Uso del cupo semanal | Cupo usado ÷ cupo de la semana | 100% antes del jueves, 2 semanas seguidas | Ofrecer cupo extra voluntario; el beneficio atrae más de lo que el local puede absorber |
| Uso del cupo semanal | Ídem | Bajo 25%, 2 semanas seguidas | El beneficio no atrae: mejorarlo o destacarlo en el mensaje semanal |
| Ticket promedio con canje | Suma de tickets con código ÷ canjes | Muy cerca de la compra mínima | Normal al inicio; si persiste, el vecino solo viene por el descuento |
| Clientes derivados | Vecinos de otro comercio de origen con primera compra en el local | 0 en 2 semanas | Destacar el local; revisar su beneficio |
| Recompra sin canje | Derivados que vuelven a comprar sin código en 30 días | Bajo 30% | Es el indicador que justifica el costo; conversar con el dueño |
| Cobertura de la red | Suma de cupos ÷ valor de puntos emitidos, 28 días | Bajo 70% | Sección 6.5 |
| Puntos vigentes sin canjear | Saldo total de la red × $4 | Más de 3 meses de cupo total | Semana de canje con mensaje a todos los vecinos |

El reporte mensual del comercio agrega tres líneas a lo que ya definía la propuesta: su cupo y cuánto usó, su costo de canjes como porcentaje de ventas registradas, y la recompra sin canje.

## 11. Cambios frente a la propuesta y decisiones pendientes

Estas reglas modifican cinco puntos de la versión 1.0 de la propuesta y dejan cinco decisiones abiertas para el equipo.

**Qué cambia**

| Tema | Propuesta 1.0 | Estas reglas | Por qué |
| --- | --- | --- | --- |
| Beneficio sin compra | “Marraqueta gratis con 300 puntos” | Todo beneficio exige compra mínima de 5 veces su valor | Es lo que impide que un local regale sin vender |
| Catálogo | Cada comercio define 1 a 3 beneficios libres | Tres niveles iguales para todos: 250, 500 y 1.000 puntos | Permite calcular cupos y comparar comercios |
| Tope de canjes | Lo fija cada dueño | Fórmula: 3% de ventas registradas, piso de $20.000 al mes; el dueño solo puede agregar | Un tope libre deja a la red sin dónde canjear o carga a los más generosos |
| Validación en caja | Clic en un enlace o WhatsApp con el operador | El validador web pasa a ser pieza del MVP | Sin él, el equipo debe responder en vivo a cada caja |
| Vigencia de puntos | No definida | 90 días | Acota la deuda en puntos de la red |

**Decisiones pendientes**

- [x] **Valor del punto.** A $4, el vecino recupera 4% de lo que compra y el cupo de 3% supone que cerca de una cuarta parte de los puntos nunca se canjea. La alternativa conservadora es $2 por punto con cupo de 1,5%: menos riesgo para los comercios y beneficios más lentos para el vecino.
- [ ] **Piso de cupo.** Los $20.000 al mes son lo mínimo que todo socio acepta invertir. Conviene preguntarlo en la Parte C de la entrevista, junto a la pregunta sobre qué beneficio daría.
- [ ] **Canje en el comercio de origen.** La regla B17 lo permite porque también fideliza. Prohibirlo daría una red más pura de derivación, pero menos opciones al vecino.
- [x] **Quién construye el validador** y si la planilla basta para generar códigos, o hace falta un backend simple desde el primer día.
- [ ] **Revisión legal.** No soy abogado y estos puntos necesitan validación antes del piloto: puntos y descuentos sobre alcohol si entra una botillería; exclusión de tabaco; consentimiento y uso de datos personales (leyes 19.628 y 21.719, ya citadas en la propuesta); condiciones del programa informadas al vecino según la Ley del Consumidor; y cómo se refleja el descuento en la boleta.

**Para el prototipo en Lovable**, estas reglas agregan tres elementos a las pantallas ya definidas: la compra mínima y la vigencia en cada beneficio de la tarjeta del vecino, el estado “cupo agotado, vuelve el lunes”, y una pantalla de validador para el comercio.

## Anexo A: aclaraciones

Nov 14, 2026. Respuestas del equipo a las ambigüedades detectadas al construir la fase 1. Tienen la misma fuerza que el resto del documento.

**A.1 Umbrales.** Todo número de negocio que no sea P1 a P20 vive en la misma tabla de parámetros, en un segundo grupo de **umbrales (U1, U2…)**, con historial y editable solo por el administrador, separado de P1 a P20 en `/admin/parametros`.

| # | Umbral | Valor inicial | Origen |
| --- | --- | --- | --- |
| U1 | Uso de cupo alto | 100% antes del jueves, 2 semanas seguidas | Sección 10 |
| U2 | Uso de cupo bajo | Bajo 25%, 2 semanas seguidas | Sección 10 |
| U3 | Ticket promedio cercano a la compra mínima | Sin valor: pendiente de definir; mientras no tenga valor, el indicador se calcula pero no alerta | Sección 10 (“muy cerca”) |
| U4 | Clientes derivados en cero | 2 semanas | Sección 10 |
| U5 | Recompra sin canje | Bajo 30%, ventana de 30 días | Sección 10 |
| U6 | Puntos vigentes sin canjear | Más de 12 semanas de cupo total (“3 meses”) | Sección 10 |
| U7 | Semáforo de cupo | Verde bajo 70% usado, ámbar de 70% a 99%, rojo 100% | Anexo A |
| U8 | Opciones destacadas al pedir canje | 3 | Sección 6.2 |
| U9 | Días mínimos que debe valer una restricción | 4 a la semana | B6 |
| U10 | Máximo de beneficios por comercio | 3 | B1 |
| U11 | Plazo de validación de boletas | 24 horas | A8 |
| U12 | Alerta de boletas de una cuenta en un local | Más de 10 a la semana | Sección 9 |
| U13 | Alerta de horarios superpuestos en dos locales | Sin valor: pendiente de definir la ventana en minutos; mientras no tenga valor, no alerta | Sección 9 |
| U14 | Alerta de alza de ventas registradas | Más de 50% de una semana a otra | Sección 9 |
| U15 | Pedidos sin opción disponible | Más de 10% de los pedidos | Sección 8 |
| U16 | Avisos de vencimiento | 15 y 3 días antes | Sección 5 |
| U17 | Plazo de reclamo | 7 días desde la compra | A17 |
| U18 | Cierre de cuenta sin compras | 180 días | Sección 5 |
| U19 | Cobro por cliente derivado | $300, solo informativo: el MVP no cobra | Sección 7.3 |
| U20 | Comercio que se niega a respetar códigos | 2 casos en 30 días suspenden | Sección 8 |
| U21 | Reincidencia de sanciones a comercios | Segunda vez en 60 días; suspensión de 2 semanas | Sección 9 |
| U22 | Historia mínima para proyectar ventas | 7 días | A.4 |
| U23 | Aviso para cambiar beneficios | 7 días, rigen desde un lunes | Sección 5 |
| U24 | Aviso de salida de un comercio | 30 días | Sección 5 |
| U25 | Aviso de cierre de la red | 30 días | Sección 5 |

**A.2 Qué cuenta como canje en P12 y P13.** Cuentan los códigos emitidos que no vencieron (activos y usados), por fecha de emisión. “Al día” es el día calendario en hora de Santiago; “30 días” es una ventana móvil. Los códigos vencidos no cuentan para P12 ni P13.

**A.3 Día de P5 y P6, y orden de cálculo de una boleta.** El día es el de la fecha de compra, en hora de Santiago. El cálculo se aplica en este orden: (1) se descuentan los productos excluidos y queda el monto válido; (2) P3 se evalúa sobre el monto válido; (3) tope por boleta P4; (4) tope diario P6: si se excede, se acredita solo lo que falta para llegar al tope (ámbar). Si se excede P5, la boleta se rechaza (rojo).

**A.4 Ventas registradas y proyección.** V es la suma del monto válido de las boletas aprobadas del comercio, por fecha de compra, en los últimos 28 días, con el monto completo aunque la boleta supere P4. Si el comercio tiene menos de 28 días desde su alta, se proyecta: V × 28 ÷ días desde el alta, con los días topados en 28. Con menos de 7 días de historia (U22), el comercio queda en el piso.

**A.5 Cupo extra y arrastre.** El cupo extra vale solo la semana en que se agrega y no se arrastra. El arrastre sale únicamente de la base no usada, con tope de la base anterior. Dentro de la semana el cupo se consume en este orden: primero arrastre, luego base, al final extra.

**A.6 Códigos que cruzan el lunes.** La reserva pertenece a la semana en que se emitió el código. Al calcular el arrastre, lo reservado al cierre cuenta como usado. B11 (“el cupo vuelve”) aplica solo si el código vence dentro de la misma semana en que se emitió; si vence después, ese cupo no vuelve a ninguna semana.

**A.7 Días permitidos.** Cada beneficio guarda sus días permitidos (al menos U9) y el texto visible de la restricción. Un beneficio vale en las próximas 48 horas si está aprobado, rige desde una fecha ya pasada, su comercio está activo y hay al menos un día permitido dentro de la vigencia del código. Al emitir, si el beneficio tiene días restringidos, el código debe alcanzar al menos un día permitido dentro de su vigencia. El validador del comercio también revisa el día: si hoy no es un día permitido responde “válido solo <días>” y no deja usarlo.

**A.8 Orden de las opciones.** En las primeras U8 opciones aparece como máximo una por comercio: la del nivel más alto que el saldo alcance y para la que haya cupo libre. Desempates, en este orden: comercio donde el vecino nunca ha comprado; mayor porcentaje de cupo libre; menos canjes recibidos esta semana; id del comercio. En “ver todos” aparecen todos los niveles.

**A.9 Primera compra, cliente derivado y recompra.** La primera compra de un vecino en un comercio es su primera boleta aprobada o su primer canje usado allí, lo que ocurra antes. Es cliente derivado si ese comercio no es su comercio de origen, y se cuenta una sola vez por par vecino-comercio, para siempre. Recompra sin canje: una boleta aprobada posterior, dentro de 30 días (U5) desde la primera compra, sin canje asociado. Una boleta en el mismo comercio y el mismo día calendario que un canje usado se considera asociada a ese canje y no cuenta como recompra.

**A.10 Pausa de P19.** Dura 7 días desde el vencimiento que deja 3 o más códigos vencidos en 30 días. Cada nuevo vencimiento en esa situación reinicia la pausa. Los vencidos que el operador marque como “local cerrado” no cuentan.

**A.11 Puntos retenidos que vencen.** Si la fecha de vencimiento de puntos retenidos pasa mientras el código está activo: si el código se usa, los puntos se consumen normalmente; si el código vence, los puntos se devuelven y vencen de inmediato.

**A.12 Supuestos aprobados.** P2 = $4 y P15 = 3% como valores iniciales. El descuento de cada nivel es sus puntos × P2 y la compra mínima tope es el descuento × P10. La cobertura (P18) suma base más extra de las últimas 4 semanas, sin arrastre. Las contraseñas iniciales se leen de variables de entorno y se guardan cifradas.

**A.13 Datos de demostración.** Unos 200 vecinos sintéticos con 4 semanas de boletas sin imagen, respetando todos los límites, con ventas por comercio cercanas a las proporciones de la tabla 6.4; 12 vecinos “con nombre” con historial detallado; unas 10 boletas pendientes con imagen de ejemplo. Todo marcado como demostración.

**A.14 Criterios de implementación** (derivados de las reglas; corregir aquí si no corresponden)

- Un ajuste positivo de puntos crea puntos con vencimiento a P8 días desde el ajuste.
- La recompra exige un día calendario posterior al de la primera compra.
- Un comercio aparece como “cupo agotado, vuelve el lunes” cuando tiene beneficios vigentes pero su cupo libre no alcanza para el menor de ellos.
- Un cambio de beneficios aprobado rige desde el primer lunes que esté a U23 días o más de la solicitud.

**A.15 Aprobación de beneficios** (Nov 15, 2026, al construir la fase 2)

- Los beneficios los aprueba el operador o el administrador (B7). Crear comercios y usuarios, suspender comercios y cambiar parámetros sigue siendo solo del administrador.
- Los primeros beneficios de un comercio rigen al aprobarse: sin beneficios anteriores no hay nada que avisar.
- Si un cambio se aprueba cuando el lunes calculado desde la solicitud (A.14) ya pasó, rige desde el lunes siguiente a la aprobación.
- Cada propuesta es el conjunto completo de beneficios del comercio (B1). Al regir, reemplaza entero al conjunto anterior. Una propuesta nueva reemplaza a la que seguía pendiente.
- En la landing, el beneficio destacado de cada comercio es el del nivel obligatorio (P9).
