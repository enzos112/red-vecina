# syntax=docker/dockerfile:1

# ---- Etapa 1: compilar el frontend ----
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Etapa 2: imagen liviana de Python ----
FROM python:3.14-slim AS final
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    ENTORNO=produccion \
    FRONTEND_DIST=/app/frontend/dist \
    PORT=8000

WORKDIR /app/backend
COPY backend/pyproject.toml ./
COPY backend/app ./app
# Instala las dependencias y deja el código solo en ./app (sin copia en site-packages).
RUN pip install . && pip uninstall -y red-vecina && rm -rf build *.egg-info

COPY backend/alembic.ini ./
COPY backend/migrations ./migrations
COPY --from=frontend /frontend/dist /app/frontend/dist

# Usuario sin privilegios: no puede escribir en el código.
RUN useradd --no-create-home --uid 10001 vecina
USER vecina

EXPOSE 8000
# Primero las migraciones; si fallan, el servicio no arranca. Luego el servidor en $PORT.
# Los datos iniciales (base) y los de demostración NO se cargan aquí: ver DEPLOY.md.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*' --no-server-header"]
