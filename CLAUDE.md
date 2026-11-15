# Red Vecina · Guía para Claude Code

Programa de puntos compartido entre comercios de barrio. Monolito modular: FastAPI entrega la
API bajo `/api` y, en producción, también el frontend de React compilado.

## Fuente de verdad

- `docs/reglas-negocio.md`: reglas de negocio, parámetros P1 a P20, algoritmo de equilibrio.
- `docs/construccion.md`: arquitectura, roles, pantallas, diseño y fases.

Léelos antes de programar. Si un pedido los contradice, avisa antes de escribir código. Si una
regla es ambigua, pregunta: no la inventes.

## Regla de oro

**Ningún número de negocio se escribe en el código. Todo sale de la tabla de parámetros
(P1 a P20 y umbrales U1…, Anexo A.1).** Eso incluye montos, puntos, porcentajes, plazos, topes
y límites. Las funciones de `reglas.py` reciben un objeto `Parametros` como argumento. Los
valores iniciales viven en `backend/app/modulos/parametros/catalogo.json` (datos, no código).
En las pruebas, los números del documento se cargan desde ese catálogo con la fixture `p`.
Un parámetro nuevo se agrega en tres lugares: el catálogo, su clase en `parametros/reglas.py`
y el Anexo A de `docs/reglas-negocio.md`.

Las plantillas de mensajes también son datos (`mensajes/plantillas.json`): si un texto menciona
un plazo o un monto, va como variable, no escrito.

## Convenciones

- Cada módulo de `backend/app/modulos/<modulo>/` tiene `modelos.py`, `esquemas.py`, `reglas.py`,
  `servicio.py` y `rutas.py`. Un módulo usa a otro solo a través de su `servicio.py`. Los
  servicios se importan como módulo (`from app.modulos.canjes import servicio as canjes`) porque
  hay dependencias cruzadas entre ellos.
- `reglas.py` no importa nada de la base de datos: recibe datos y parámetros, devuelve resultados.
  Por eso los enums viven en `esquemas.py`, no en `modelos.py`.
- Los servicios reciben `ahora` como argumento (nunca leen el reloj por su cuenta), para poder
  probarlos y simular fechas.
- Todo modelo nuevo se importa en `backend/app/modelos.py` para que Alembic lo detecte.
- Datos de demostración marcados con `es_demo`. Teléfonos ficticios en el rango +56 9 0000 xxxx
  y +56 9 0001 xxxx, y correos en el dominio reservado `redvecina.test`.
- Los puntos se llevan como un libro de movimientos (gana, retiene, libera, canjea, vence,
  ajusta). El saldo es la suma; nunca se edita un saldo a mano.
- Dinero en pesos enteros (`int`). Fechas en UTC en la base de datos y en hora de Santiago
  (`America/Santiago`) en pantalla.
- SQLite en desarrollo y pruebas; Postgres en producción. Sin tipos exclusivos de Postgres.
- Sesión de comercio y operador con cookie httpOnly. Frontend y API comparten dominio: sin CORS.
- Tareas programadas perezosas: la primera petición del día corre lo pendiente una sola vez;
  el administrador puede forzarlas. Deben ser idempotentes.
- Errores de la API con un mensaje en español que se pueda mostrar tal cual al usuario.
- Textos en español de Chile, de tú, frases cortas. Montos con punto de miles.
- Nombres de código en español, igual que el dominio (`vecino`, `comercio`, `canje`, `cupo`).
- Claves y secretos solo en variables de entorno, nunca en el repositorio.

## Stack

- Backend (`backend/`): Python 3.12+, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2 y
  pydantic-settings, pytest, ruff.
- Frontend (`frontend/`): React 19 con TypeScript, Vite, Tailwind CSS v4, shadcn/ui (radix,
  preset nova), React Router y TanStack Query. Alias `@/` apunta a `frontend/src`.
- TypeScript 7: no uses `baseUrl` en tsconfig (ya no existe); solo `paths`.
- shadcn: agrega componentes con `npx shadcn@latest add <componente>` dentro de `frontend/` y
  personalízalos por variables de tema y variantes; no crees componentes desde cero.

## Estructura

```
backend/app/main.py           crea la app, monta /api y sirve frontend/dist
backend/app/core/             config.py (variables de entorno), db.py, frontend.py
backend/app/modulos/          cuentas, vecinos, comercios, boletas, puntos, canjes,
                              equilibrio, mensajes, reportes, parametros
backend/app/servicios/        lector (gemini, anthropic, manual), archivos
backend/app/tareas/           recálculo del lunes, vencimientos, códigos vencidos
backend/migrations/           Alembic (env.py lee DATABASE_URL)
backend/tests/                pytest
frontend/src/app/             router, query client, layouts por zona
frontend/src/features/        vecino, comercio, admin, landing
frontend/src/components/ui/   componentes de shadcn
frontend/src/lib/             cliente de la API, formato de pesos y fechas
```

Al crear modelos nuevos, impórtalos en `backend/migrations/env.py` para que Alembic los detecte.

## Comandos (Windows, desde la raíz del repo)

| Qué | Comando |
| --- | --- |
| Levantar backend + frontend | `.\dev.cmd` |
| Lo mismo, abrible desde el celular en la misma wifi | `.\dev.cmd -Celular` |
| Verificar todo (ruff, pytest, oxlint, build) | `.\verificar.cmd` |
| Datos de demostración (base vacía / desde cero) | `.\demo.cmd` / `.\demo.cmd --reiniciar` |
| Parámetros, plantillas y primer admin | `cd backend; .\.venv\Scripts\python -m app.cli base` |
| Tareas del día (o forzarlas) | `cd backend; .\.venv\Scripts\python -m app.cli tareas [--forzar]` |
| Pruebas del backend | `cd backend; .\.venv\Scripts\python -m pytest` |
| Lint y formato del backend | `cd backend; .\.venv\Scripts\python -m ruff check . ; .\.venv\Scripts\python -m ruff format .` |
| Cliente tipado del frontend (tras cambiar rutas o esquemas) | `cd backend; .\.venv\Scripts\python -m app.cli cliente-ts` |
| Nueva migración | `cd backend; .\.venv\Scripts\python -m alembic revision --autogenerate -m "descripcion"` |
| Aplicar migraciones | `cd backend; .\.venv\Scripts\python -m alembic upgrade head` |
| Build del frontend | `cd frontend; npm run build` |
| Lint del frontend | `cd frontend; npm run lint` |
| Imagen Docker | `docker build -t red-vecina .` |

En desarrollo: frontend en http://localhost:5173 (proxy de `/api` a :8000), API en
http://127.0.0.1:8000, documentación interactiva en http://127.0.0.1:8000/docs.

## Variables de entorno

Ver `.env.example`. `ENTORNO`, `DATABASE_URL`, `SECRET_KEY`, `LECTOR_PROVEEDOR`
(`manual` | `gemini` | `anthropic`), `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`, `OPERADOR_PASSWORD`, `COMERCIO_PASSWORD`, `CONTACTO_WHATSAPP`, y en la imagen `PORT` y
`FRONTEND_DIST`. En producción la app se niega a arrancar con la `SECRET_KEY` de
desarrollo o con SQLite.

## API

- Rutas en `rutas.py` de cada módulo, montadas bajo `/api` en `app/main.py`. Prefijos por zona:
  `/red` (público), `/t/{token}` (vecino), `/comercio` (comercio con sesión), `/admin`
  (operador y admin), `/acceso` (login).
- Dependencias en `app/core/dependencias.py`: `SesionDB`, `Ahora`, `Params`, `Equipo`, `Admin`,
  `ComercioActual` (el comercio sale de la sesión, nunca de la petición) y `VecinoToken`.
- Los servicios lanzan `ValueError` con un mensaje para el usuario: la API responde 400 con ese
  texto. Límites de intentos y duración de sesión son configuración técnica (`config.py`).
- `frontend/src/lib/api-generada.ts` se genera; una prueba falla si queda desactualizado.

## Notas

- `/api/salud` no consulta la base a propósito: el monitor que mantiene despierto el servicio en
  Render no debe gastar las horas de cómputo de Neon.
- Trabaja por fases (sección 7 de `docs/construccion.md`). No avances a la fase siguiente sin
  que te lo pidan.
