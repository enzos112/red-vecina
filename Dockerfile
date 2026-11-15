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
RUN pip install .

COPY backend/alembic.ini ./
COPY backend/migrations ./migrations
COPY --from=frontend /frontend/dist /app/frontend/dist

RUN useradd --create-home --uid 10001 vecina
USER vecina

EXPOSE 8000
# Las migraciones al iniciar se agregan en la fase 8.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
