"""Comandos del proyecto.

python -m app.cli base               parámetros, plantillas y primer administrador
python -m app.cli demo [--reiniciar] datos de demostración (en producción pide --en-produccion)
python -m app.cli tareas [--forzar]  corre las tareas pendientes del día
python -m app.cli openapi <archivo>  exporta el esquema OpenAPI
python -m app.cli cliente-ts         regenera el cliente tipado del frontend
"""

import argparse
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, select, text

from app.core.config import obtener_configuracion
from app.core.db import Base, SesionLocal, motor
from app.core.tiempo import ahora_utc

RAIZ_BACKEND = Path(__file__).resolve().parents[1]


def _migrar() -> None:
    config = Config(str(RAIZ_BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(RAIZ_BACKEND / "migrations"))
    command.upgrade(config, "head")


def _contrasena(nombre: str) -> str:
    valor = getattr(obtener_configuracion(), nombre)
    if valor is None or not valor.get_secret_value():
        sys.exit(f"Falta la variable de entorno {nombre}. Agrégala en el archivo .env.")
    return valor.get_secret_value()


def base(_: argparse.Namespace) -> None:
    from app.modulos.cuentas import servicio as cuentas
    from app.modulos.cuentas.esquemas import Rol
    from app.modulos.cuentas.modelos import Usuario
    from app.modulos.mensajes import servicio as mensajes
    from app.modulos.parametros import servicio as parametros

    _migrar()
    config = obtener_configuracion()
    with SesionLocal.begin() as sesion:
        nuevos = parametros.inicializar(sesion)
        plantillas = mensajes.inicializar(sesion)
        print(f"Parámetros nuevos: {nuevos}. Plantillas nuevas: {plantillas}.")
        if config.ADMIN_EMAIL and not sesion.scalar(
            select(Usuario.id).where(Usuario.rol == Rol.ADMIN)
        ):
            cuentas.crear_usuario(
                sesion,
                config.ADMIN_EMAIL,
                "Administración",
                _contrasena("ADMIN_PASSWORD"),
                Rol.ADMIN,
            )
            print(f"Administrador creado: {config.ADMIN_EMAIL}")


def demo(args: argparse.Namespace) -> None:
    from app.demo.generador import Contrasenas, generar
    from app.modulos.comercios.modelos import Comercio

    config = obtener_configuracion()
    if config.es_produccion and not args.en_produccion:
        sys.exit(
            "Estás apuntando a producción. Si de verdad quieres datos de demostración ahí"
            " (por ejemplo, para mostrar la app), agrega --en-produccion."
        )
    claves = Contrasenas(
        admin=_contrasena("ADMIN_PASSWORD"),
        operador=_contrasena("OPERADOR_PASSWORD"),
        comercio=_contrasena("COMERCIO_PASSWORD"),
    )
    if args.reiniciar:
        import app.modelos  # noqa: F401

        Base.metadata.drop_all(motor)
        with motor.begin() as conexion:
            conexion.execute(text("DROP TABLE IF EXISTS alembic_version"))
    _migrar()
    with SesionLocal.begin() as sesion:
        if "comercios" in inspect(motor).get_table_names() and sesion.scalar(select(Comercio.id)):
            sys.exit("La base ya tiene datos. Usa --reiniciar para borrarla y crearla de nuevo.")
        print("Generando 4 semanas de demostración (tarda un poco)...")
        r = generar(sesion, claves, ahora_utc(), semilla=args.semilla)
    _imprimir(r, config.ADMIN_EMAIL)


def _imprimir(r: dict, _admin: str | None) -> None:
    from app.core.formato import pesos

    print(f"\nListo. Vecinos: {r['vecinos']}. Desde: {r['desde']:%Y-%m-%d}.")
    for clave, valor in r["estadisticas"].items():
        print(f"  {clave}: {valor}")
    print("\nCupo de esta semana por comercio:")
    for c in r["comercios"]:
        piso = " (piso)" if c["en_piso"] else ""
        print(
            f"  {c['comercio']:<24} ventas 28 d {pesos(c['ventas_ventana']):>12}  "
            f"base {pesos(c['cupo_base']):>9}{piso}  arrastre {pesos(c['arrastre']):>8}  "
            f"libre {pesos(c['libre']):>8}"
        )
    print("\nSaldos de los vecinos con nombre:")
    for nombre, saldo in r["saldos_con_nombre"].items():
        print(f"  {nombre:<20} {saldo:>6} puntos")
    print("\nUsuarios: admin@redvecina.test, operador@redvecina.test y <slug>@redvecina.test")
    print("por comercio, con las contraseñas de ADMIN_PASSWORD, OPERADOR_PASSWORD")
    print("y COMERCIO_PASSWORD.")


def tareas(args: argparse.Namespace) -> None:
    from app.tareas import servicio

    with SesionLocal.begin() as sesion:
        resultado = servicio.ejecutar(sesion, ahora_utc(), forzar=args.forzar)
    print(resultado or "No había tareas pendientes hoy.")


def openapi(args: argparse.Namespace) -> None:
    """Escribe el esquema OpenAPI; el frontend genera sus tipos desde ahí."""
    import json

    from app.main import crear_app

    esquema = crear_app().openapi()
    destino = Path(args.salida)
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(esquema, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Esquema escrito en {destino}")


def cliente_ts(_: argparse.Namespace) -> None:
    from app.herramientas import cliente_ts as generador
    from app.main import crear_app

    print(f"Cliente escrito en {generador.escribir(crear_app().openapi())}")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli", description="Comandos de Red Vecina")
    sub = parser.add_subparsers(required=True)
    sub.add_parser("base", help="Parámetros, plantillas y primer administrador").set_defaults(
        f=base
    )
    p_demo = sub.add_parser("demo", help="Datos de demostración")
    p_demo.add_argument("--reiniciar", action="store_true", help="Borra la base y la crea de nuevo")
    p_demo.add_argument("--semilla", type=int, default=7)
    p_demo.add_argument(
        "--en-produccion", action="store_true", help="Permite cargarlos con ENTORNO=produccion"
    )
    p_demo.set_defaults(f=demo)
    p_tareas = sub.add_parser("tareas", help="Tareas pendientes del día")
    p_tareas.add_argument("--forzar", action="store_true")
    p_tareas.set_defaults(f=tareas)
    p_openapi = sub.add_parser("openapi", help="Exporta el esquema OpenAPI de la API")
    p_openapi.add_argument("salida", help="Ruta del archivo JSON")
    p_openapi.set_defaults(f=openapi)
    sub.add_parser(
        "cliente-ts", help="Genera frontend/src/lib/api-generada.ts desde el OpenAPI"
    ).set_defaults(f=cliente_ts)
    args = parser.parse_args()
    args.f(args)


if __name__ == "__main__":
    main()
