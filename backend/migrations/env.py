"""Entorno de Alembic. Toma la URL de DATABASE_URL y los modelos de app.core.db.Base."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

import app.modelos  # noqa: E402,F401  registra todos los modelos en Base.metadata
from app.core.config import obtener_configuracion
from app.core.db import Base

config = context.config
config.set_main_option("sqlalchemy.url", obtener_configuracion().DATABASE_URL.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    conectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with conectable.connect() as conexion:
        # render_as_batch permite ALTER TABLE en SQLite.
        context.configure(
            connection=conexion, target_metadata=target_metadata, render_as_batch=True
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
