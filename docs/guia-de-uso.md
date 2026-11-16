# Red Vecina · Guía de uso para el equipo

Nov 15, 2026

Esta guía explica cómo usar la web día a día. Las reglas del programa (puntos, cupos, plazos) están en `docs/reglas-negocio.md`. Aquí solo va qué hacer en cada pantalla.

## 1. Cómo entrar

| Quién | Dónde | Con qué |
| --- | --- | --- |
| Equipo (operador o administrador) | https://red-vecina.onrender.com/admin/entrar | Correo y clave que te entregó el administrador |
| Comercio | https://red-vecina.onrender.com/comercio/login | Correo y clave que crea el administrador en la ficha del comercio |
| Vecino | Su enlace personal (`/t/...`) | Sin clave: el enlace es su tarjeta |

También puedes entrar desde la web pública con el enlace “Entrar (comercios y equipo)” del pie de página, que pregunta si eres comercio o equipo.

**La primera visita puede tardar cerca de un minuto.** El servicio gratuito se duerme si nadie lo usa. Antes de mostrarle la web a un comercio o a un profesor, ábrela un par de minutos antes.

Cambia tu clave la primera vez: abajo en el menú, “Cambiar mi clave”.

**El cuadrito “i”.** Junto a títulos, parámetros e indicadores hay un cuadrito con una “i”. Tócalo y aparece la explicación. Así la pantalla queda limpia y la ayuda está a mano.

## 2. Quién hace qué

| | Operador | Administrador |
| --- | --- | --- |
| Revisar boletas, aprobar o rechazar | Sí | Sí |
| Buscar, inscribir y ajustar vecinos | Sí | Sí |
| Ver canjes | Sí | Sí |
| Aprobar beneficios de comercios | Sí | Sí |
| Seguir la red (indicadores y fraude) | Ve | Sí |
| Dar de alta comercios y sus usuarios, sanciones, estado | No | Sí |
| Parámetros, plantillas de mensajes, cuentas del equipo, reportes | No | Sí |

El menú está ordenado igual: **Tu trabajo** (Boletas, Vecinos, Canjes) es lo del día a día; **Seguimiento** (Comercios, Red) y **Administración** (Parámetros, Mensajes, Equipo y tareas) van después.

## 3. El trabajo del día: boletas

Es la tarea principal: revisar las boletas que suben los vecinos para que sumen puntos. Conviene hacerlo dos veces al día, por ejemplo a las 13:00 y a las 20:00. El número naranja junto a “Boletas” dice cuántas esperan.

**Revisar una boleta**

1. Entra a **Boletas** y abre la primera de la cola.
2. A la izquierda ves la foto (puedes acercarla). A la derecha, los datos que leyó el sistema: comercio, folio, fecha, hora, total y productos.
3. Si dice que no se leyó, toca **“Leer ahora”**. Si sigue sin leer, escribe los datos mirando la foto.
4. Mira los avisos. Solo aparecen los que tienen problema:
   - **Rojo:** la regla dice que no suma (boleta repetida, fuera de plazo, de un comercio que no es de la red, etc.). Lo normal es rechazar.
   - **Ámbar:** hay algo que mirar (un dato dudoso, productos que no suman, tope de puntos). Corrige si hace falta y aprueba.
   - Los controles que salieron bien quedan plegados en “controles sin problemas”.
   - Si la foto no parece una boleta, el sistema lo avisa.
5. Decide:
   - **Aprobar** (o “Aprobar con ajustes” si corregiste algo): los puntos pasan a disponibles.
   - **Rechazar:** elige el motivo. El sistema sugiere uno según los avisos.
6. Aparece **“Avísale a … por WhatsApp”** con el mensaje ya escrito. Toca “Abrir WhatsApp” para mandarlo desde tu teléfono o computador, o “Copiar” para pegarlo donde quieras.

**Si un vecino te manda la boleta por WhatsApp**, súbela tú desde **Boletas → Subir** y elige al vecino. Desde ahí sigue igual.

## 4. Vecinos

En **Vecinos** buscas por nombre o teléfono y abres la ficha.

- **Inscribir a mano:** para alguien que no puede escanear el QR. Léele las condiciones y el uso de datos antes de marcar que aceptó. Al terminar, mándale su enlace.
- **Mandar su enlace:** si el vecino perdió su tarjeta, se la reenvías por WhatsApp.
- **Ajustar saldo:** suma o resta puntos con un motivo. Queda registrado quién lo hizo. Úsalo solo para corregir errores.
- **Dar de baja:** cierra la cuenta si el vecino pide salir.
- Abajo ves sus **movimientos** (lo que ganó, retuvo, canjeó o venció), sus boletas y sus canjes.

## 5. Canjes

En **Canjes** ves los códigos emitidos, usados y vencidos, con filtros por estado y comercio. También aparecen los que un comercio ingresó **sin internet**, para revisarlos y dejar una nota.

## 6. Comercios

**Comercios** muestra la red y las propuestas de beneficios pendientes.

- **Aprobar beneficios:** revisa que la restricción sea razonable (que valga al menos los días mínimos de la semana) y apruébala o recházala con un comentario. Los cambios rigen desde un lunes; los primeros beneficios de un comercio rigen al aprobarse.
- La ficha de cada comercio tiene pestañas:
  - **Beneficios:** vigentes y próximos.
  - **Usuarios:** quienes entran al portal del comercio. El administrador crea usuarios nuevos y les pone una contraseña nueva aquí.
  - **Sanciones:** historial y “Registrar una sanción” (administrador). El sistema sugiere la sanción según las anteriores.
  - **Datos y estado** (administrador): nombre, rubro, RUT, dirección, y activar, suspender o retirar.
- **Nuevo comercio** (administrador): RUT tal como sale en sus boletas, porque así el sistema reconoce sus boletas.

## 7. Solo administrador

**Red.** Tres pestañas:
- **Revisión del lunes:** primero lo que pide atención, luego los indicadores de la red y el gráfico de cupos. El detalle por comercio está plegado al final.
- **Indicadores:** cada número con su señal de alerta. La acción sugerida está en el cuadrito “i”.
- **Fraude:** alertas de cuentas y comercios con comportamiento raro.

**Parámetros.** P1 a P20 y umbrales U1 a U25. “Editar” pide el nuevo valor y un motivo. El cambio rige desde ahora: lo ya otorgado no se recalcula. Todo queda en “Registro de cambios”.

**Mensajes.** Las plantillas de WhatsApp. Toca una variable para insertarla; abajo ves cómo queda.

**Equipo y tareas.** Tres pestañas:
- **Equipo:** cuentas del equipo, “Nueva cuenta del equipo”, “Nueva clave” y desactivar.
- **Tareas:** recálculo del lunes y vencimientos. Corren solas con la primera visita del día; “Ejecutar tareas ahora” las adelanta sin repetir nada.
- **Exportar:** boletas, canjes y reporte por comercio en CSV (se abre en Excel).

## 8. Cómo lo usa el comercio

Para explicárselo al dueño o a la cajera:

1. **Validar:** el vecino muestra su código de 6 dígitos **antes de pagar**. La cajera lo escribe y la pantalla dice si es válido, el descuento y la compra mínima. Si la compra cumple, aplica el descuento y toca “Usar”.
2. **Sin internet:** aplica el descuento, anota el código y el total, y lo ingresa ese mismo día en “Códigos sin internet”.
3. **Cupo:** cuánto puede entregar en descuentos esta semana y cuánto lleva. Puede agregar cupo extra, nunca bajarlo.
4. **Beneficios:** propone sus 1 a 3 beneficios. El equipo los aprueba.
5. **Reporte:** vecinos inscritos, clientes nuevos que le llegaron por la red y si volvieron.
6. **Afiche:** descarga el afiche con su QR para pegarlo en la caja.

## 9. Cómo lo usa el vecino

1. Escanea el QR en la caja de un comercio, escribe su nombre y WhatsApp, y acepta las condiciones.
2. Recibe su tarjeta: un enlace personal. Debe guardarlo, es su llave.
3. Sube la foto de cada boleta desde la tarjeta, dentro del plazo. Ve sus puntos como pendientes hasta que el equipo los aprueba.
4. Cuando le alcanzan los puntos, elige un beneficio y pide su código. Lo muestra en la caja antes de pagar.

## 10. Problemas frecuentes

| Pasa esto | Haz esto |
| --- | --- |
| La web no carga o tarda mucho | Espera un minuto: el servicio estaba dormido |
| Una boleta dice “no se leyó” | “Leer ahora”; si no, digita los datos mirando la foto |
| La boleta es de un comercio que no aparece | Revisa que el RUT del comercio esté bien escrito en su ficha |
| El vecino perdió su enlace | Ficha del vecino → “Mandar su enlace” |
| Un comercio olvidó su clave | Administrador: ficha del comercio → Usuarios → “Nueva contraseña” |
| El vecino dice que le faltan puntos | Revisa sus movimientos; si hubo un error, “Ajustar saldo” con motivo |
| El QR del afiche no abre | Descarga el afiche desde la web publicada, no desde un computador local |
