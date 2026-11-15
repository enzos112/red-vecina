# Red Vecina

Programa de puntos compartido entre comercios de barrio. Monolito modular: FastAPI (API y
frontend compilado) + React con Vite, en un solo servicio.

- Reglas de negocio: [docs/reglas-negocio.md](docs/reglas-negocio.md)
- Arquitectura y fases: [docs/construccion.md](docs/construccion.md)
- Convenciones para Claude Code: [CLAUDE.md](CLAUDE.md)

## Requisitos

Python 3.12 o superior, Node 22 o superior y npm. Docker es opcional.

## Desarrollo (Windows)

```powershell
.\dev.cmd
```

La primera vez crea `.env` desde `.env.example`, el entorno de Python en `backend\.venv` e
instala las dependencias del frontend. Luego aplica las migraciones y levanta:

- Frontend: http://localhost:5173
- API: http://127.0.0.1:8000/api/salud
- Documentación de la API: http://127.0.0.1:8000/docs

`Ctrl+C` detiene ambos.

## Datos de demostración

Completa `ADMIN_PASSWORD`, `OPERADOR_PASSWORD` y `COMERCIO_PASSWORD` en `.env` (mínimo 10
caracteres) y ejecuta:

```powershell
.\demo.cmd --reiniciar
```

Crea 6 comercios ficticios, 212 vecinos con 4 semanas de boletas y canjes, 10 boletas
pendientes con imagen y los usuarios `admin@redvecina.test`, `operador@redvecina.test` y uno
por comercio (`<slug>@redvecina.test`). `--reiniciar` borra la base de desarrollo antes.

## Verificar

```powershell
.\verificar.cmd
```

Corre ruff, pytest, oxlint y el build del frontend.

## Producción

```powershell
docker build -t red-vecina .
docker run -p 8000:8000 -e SECRET_KEY=... -e DATABASE_URL=postgresql://... red-vecina
```

La imagen compila el frontend, lo sirve desde FastAPI y escucha en `$PORT`. La publicación en
Render y Neon se prepara en la fase 8.
