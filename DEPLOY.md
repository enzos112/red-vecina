# Publicar Red Vecina

Todo corre gratis: la app (API + frontend) en **Render** y la base de datos en **Neon**.
Tú creas las cuentas y haces los clics; el repositorio ya trae lo demás:

| Archivo | Para qué |
| --- | --- |
| `Dockerfile` | Compila el frontend y arma una imagen liviana de Python. Al arrancar aplica las migraciones y luego levanta el servidor en `$PORT`, con un usuario sin privilegios. |
| `render.yaml` | Blueprint de Render: Web Service con Docker, plan gratuito, salud en `/api/salud`. Lista las variables sin valores. |
| `.env.produccion.example` | Plantilla de las variables de producción para correr comandos desde tu PC. |
| `produccion.cmd` | Corre `base`, `demo` y `tareas` contra Neon desde tu PC, o levanta la imagen en modo producción. |

Nada carga datos al iniciar el servicio: los datos iniciales y los de demostración se cargan
a mano con `produccion.cmd`, una sola vez.

Tiempo total: unos 30 minutos.

---

## 1. Neon: la base de datos

1. Entra a <https://neon.tech> y crea una cuenta (puedes entrar con GitHub).
2. **Create project**:
   - Nombre: `red-vecina`.
   - Postgres: la versión que venga por defecto.
   - Región: **AWS US East (N. Virginia)**. Queda junto al servicio de Render (paso 4).
3. En el panel del proyecto, aprieta **Connect**:
   - Base: `neondb`. Rol: el que viene (`neondb_owner`).
   - Activa **Connection pooling**. El host debe terminar en `-pooler`.
   - Copia la cadena completa. Se ve así:
     `postgresql://neondb_owner:XXXX@ep-algo-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
4. Guárdala: es tu `DATABASE_URL`. **No la pegues en ningún archivo del repositorio.**

> La app usa pocas conexiones, sin sentencias preparadas (el pooler de Neon no las comparte)
> y descarta las conexiones que murieron mientras Neon dormía. La base se suspende sola
> a los 5 minutos sin uso y despierta en la siguiente consulta.

## 2. Tu archivo `.env.produccion` (en tu PC)

En la raíz del repo:

```powershell
Copy-Item .env.produccion.example .env.produccion
notepad .env.produccion
```

Completa:

| Variable | Valor |
| --- | --- |
| `ENTORNO` | `produccion` (ya viene así) |
| `DATABASE_URL` | La cadena de Neon del paso 1 |
| `SECRET_KEY` | Genera una: `backend\.venv\Scripts\python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `LECTOR_PROVEEDOR` | `manual` para partir. `gemini` o `anthropic` si vas a usar lectura automática |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | Solo la del proveedor que elijas |
| `CONTACTO_WHATSAPP` | El WhatsApp del equipo, p. ej. `+56 9 1234 5678` |
| `ADMIN_EMAIL` | Tu correo de administración |
| `ADMIN_PASSWORD` | Una contraseña de 10 caracteres o más. Guárdala en tu gestor de contraseñas |
| `OPERADOR_PASSWORD`, `COMERCIO_PASSWORD` | Solo si vas a cargar los datos de demostración |

`.env.produccion` está en `.gitignore`: no se sube a GitHub. Revísalo con `git status`
antes de cada commit.

## 3. Cargar los datos iniciales en Neon (desde tu PC)

Necesitas haber corrido `.\dev.cmd` al menos una vez (crea el entorno de Python).

```powershell
.\produccion.cmd base
```

Hace tres cosas, y se puede repetir sin duplicar nada:

1. Aplica las migraciones (crea las tablas).
2. Carga los parámetros P1 a P20 con sus umbrales, y las plantillas de mensajes.
3. Crea el primer administrador con `ADMIN_EMAIL` y `ADMIN_PASSWORD`, si todavía no hay uno.

Debe terminar con `Parámetros nuevos: N. Plantillas nuevas: N.` y
`Administrador creado: <tu correo>`. Si lo repites, los números salen en 0.

**Datos de demostración (opcional, aparte).** Sirven para mostrar la app al docente o a un dueño
antes de tener comercios reales. Solo funcionan con la base sin comercios:

```powershell
.\produccion.cmd demo --en-produccion
```

Crea 4 semanas de actividad marcada como demostración (`es_demo`), con usuarios
`admin@redvecina.test`, `operador@redvecina.test` y `<slug>@redvecina.test`, que usan las
contraseñas de `ADMIN_PASSWORD`, `OPERADOR_PASSWORD` y `COMERCIO_PASSWORD`. Para partir
de cero antes del piloto real, usa `.\produccion.cmd demo --en-produccion --reiniciar`:
**borra toda la base**. Después corre `.\produccion.cmd base` de nuevo.

## 4. GitHub: subir el repositorio

1. En <https://github.com/new> crea un repositorio **privado** llamado `red-vecina`, vacío:
   sin README, sin .gitignore y sin licencia.
2. En la raíz del repo, en tu PC:

   ```powershell
   git status            # no debe aparecer .env ni .env.produccion
   git remote add origin https://github.com/<tu-usuario>/red-vecina.git
   git push -u origin main
   ```

El historial ya está revisado: no tiene claves ni contraseñas. Solo trae los valores
de ejemplo de `.env.example`.

## 5. Render: el servicio web

1. Entra a <https://render.com> con tu cuenta de GitHub. Autoriza a Render a ver el repositorio
   `red-vecina` (puedes darle acceso solo a ese).
2. **New → Blueprint**, elige `red-vecina`. Render lee `render.yaml` y muestra el servicio
   `red-vecina` (Docker, plan Free, región Virginia).
3. Te pide los valores de las variables marcadas sin valor. Copia los mismos de tu
   `.env.produccion`:

   | Variable | Obligatoria |
   | --- | --- |
   | `DATABASE_URL` | Sí |
   | `SECRET_KEY` | Sí |
   | `LECTOR_PROVEEDOR` | Sí (`manual`, `gemini` o `anthropic`) |
   | `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | Solo la de tu proveedor. Deja la otra vacía |
   | `CONTACTO_WHATSAPP` | Recomendada |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Opcionales en Render: el admin ya lo creaste en el paso 3 |

   `ENTORNO=produccion` ya viene en el blueprint. `PORT` lo pone Render.
4. **Apply**. El primer build tarda entre 5 y 10 minutos. En **Logs** debes ver:
   - `Running upgrade ...` o nada de Alembic, si la base ya estaba al día.
   - `Uvicorn running on http://0.0.0.0:10000`.
   - Render marca el servicio como **Live** cuando `/api/salud` responde.
5. Tu dirección queda como `https://red-vecina.onrender.com` (o con un sufijo si el nombre
   estaba tomado). Prueba `https://<tu-servicio>.onrender.com/api/salud`. Debe responder
   `{"estado":"ok","entorno":"produccion"}`.

**Si el build falla**, en **Events → Deploy** está el log completo. Errores típicos:

- `La SECRET_KEY de desarrollo no sirve en producción`: falta `SECRET_KEY` en Render.
- `connection ... timeout` o `password authentication failed`: revisa `DATABASE_URL`.
  Copia la cadena con pooling, completa y sin comillas.
- `Falta GEMINI_API_KEY` (o la de Anthropic): falta la clave del proveedor que elegiste.

Cada `git push` a `main` vuelve a publicar solo (`autoDeploy`). Las migraciones nuevas se
aplican al arrancar.

> Si prefieres no usar Blueprint: **New → Web Service**, elige el repo, Language
> **Docker**, plan **Free**, y en **Advanced** pon Health Check Path `/api/salud`.
> Carga las variables en **Environment** con los mismos nombres, incluida
> `ENTORNO=produccion`.

## 6. Monitor: que la caja no espere

El plan gratuito de Render duerme el servicio tras 15 minutos sin visitas y tarda cerca de un
minuto en despertar. Un monitor lo mantiene despierto. `/api/salud` no consulta la base, así
que Neon sigue durmiendo y no gasta horas de cómputo.

1. Crea una cuenta en <https://uptimerobot.com> (plan Free).
2. **New monitor**:
   - Tipo: **HTTP(s)**.
   - Nombre: `Red Vecina`.
   - URL: `https://<tu-servicio>.onrender.com/api/salud`.
   - Intervalo: **10 minutos**.
3. Activa el aviso por correo: si el servicio se cae, te llega un mensaje.

Las 750 horas gratis al mes de Render alcanzan para un servicio despierto todo el mes.
Antes de una demostración importante, abre la web un par de minutos antes.

## 7. Primeros pasos en producción

1. Entra a `https://<tu-servicio>.onrender.com/acceso` con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
2. En **Tareas, datos y equipo → Equipo**, crea la cuenta del operador.
3. En **Comercios**, crea cada comercio y su usuario (en la ficha del comercio).
4. Imprime la tarjeta de 3 pasos de cada comercio desde su portal.

## 8. Probar la app en modo producción en tu PC (opcional)

Con Docker Desktop abierto:

```powershell
.\produccion.cmd local
```

Construye la misma imagen que usa Render y la levanta en <http://localhost:8000> con las
variables de `.env.produccion`. **Apunta a tu base de Neon**: lo que hagas ahí queda en
producción. La cookie de sesión es `Secure`; Chrome, Edge y Firefox la aceptan en
`localhost` aunque no tenga https, así que el login también funciona.

## 9. Lista final, por rol

Hazla en el celular, con datos móviles (no con la wifi de la casa).

**Público y vecino**

- [ ] `/` carga la landing, con los comercios de la red.
- [ ] `/comercios` y `/condiciones` abren.
- [ ] `/unirme/<slug>` permite inscribirse y entrega el enlace personal.
- [ ] El enlace personal (`/t/...`) muestra la tarjeta con el saldo.
- [ ] Subir la foto de una boleta desde el celular la deja pendiente.
- [ ] Con saldo suficiente, pedir un código muestra el código y su plazo.

**Comercio**

- [ ] Login en `/acceso` con el usuario del comercio. Entra al portal del comercio.
- [ ] El validador acepta el código del vecino y descuenta el beneficio.
- [ ] Se ven el cupo de la semana, el reporte y los beneficios.
- [ ] La tarjeta de 3 pasos se descarga en PDF con el WhatsApp del equipo.

**Operador**

- [ ] Login con la cuenta creada en el paso 7. Entra a `/admin`.
- [ ] La boleta subida aparece en la cola. Se puede aprobar y el vecino ve sus puntos.
- [ ] Vecinos, Canjes, Comercios y Red abren.
- [ ] No ve Parámetros, Mensajes ni Tareas en el menú.

**Administrador**

- [ ] Parámetros: muestra P1 a P20. Un cambio queda en el historial con tu nombre.
- [ ] Mensajes: la vista previa se llena con datos de ejemplo.
- [ ] Tareas: **Ejecutar tareas ahora** corre y muestra la hora de la última ejecución.
- [ ] Exportar a CSV descarga boletas, canjes y el reporte por comercio.
- [ ] Equipo: crear y desactivar una cuenta funciona.

**Seguridad**

- [ ] `https://<tu-servicio>.onrender.com/api/openapi.json` responde "No encontramos esta ruta
      de la API": la documentación interactiva está apagada en producción.
- [ ] La dirección abre con candado (https). En las herramientas del navegador, la cookie
      `rv_sesion` aparece como `Secure` y `HttpOnly`.
- [ ] UptimeRobot muestra el monitor en verde.

## Mantención

| Qué | Cómo |
| --- | --- |
| Publicar un cambio | `git push`. Render compila y publica solo |
| Correr las tareas del día a mano | En la web: Tareas → Ejecutar tareas ahora. O `.\produccion.cmd tareas --forzar` |
| Ver errores | Render → tu servicio → Logs |
| Respaldar la base | Neon → Branches → crea una rama (es una copia instantánea) |
| Cambiar una clave | Render → Environment → Save. El servicio se reinicia solo |
| Cambiar `SECRET_KEY` | Cierra la sesión de todos: tendrán que volver a entrar |
