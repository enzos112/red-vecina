"""Red de prueba para las pruebas de la API.

- Minimarket Don Luis y Panadería La Espiga: con beneficios aprobados desde su alta.
- Barbería Central: recién creada, sin beneficios.
- Usuarios: admin, operador y un usuario por comercio, todos con la misma contraseña.
- Rosa: inscrita en Don Luis, con una boleta aprobada de $30.000 (300 puntos).
- Pedro: cuenta cerrada (su enlace no debe funcionar).
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import cache
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.modelos  # noqa: F401
from app.core.config import Configuracion
from app.core.db import Base
from app.core.dependencias import obtener_ahora
from app.core.seguridad import cifrar_contrasena
from app.main import crear_app
from app.modulos.boletas import servicio as boletas
from app.modulos.boletas.esquemas import OrigenBoleta
from app.modulos.comercios import servicio as comercios
from app.modulos.comercios.esquemas import TipoBeneficio
from app.modulos.comercios.reglas import BeneficioPropuesto
from app.modulos.cuentas import servicio as cuentas
from app.modulos.cuentas.esquemas import Rol
from app.modulos.mensajes import servicio as mensajes
from app.modulos.parametros import servicio as parametros
from app.modulos.parametros.reglas import nivel
from app.modulos.vecinos import servicio as vecinos
from app.modulos.vecinos.esquemas import EstadoVecino
from tests.utiles import local

CLAVE = "clave-de-prueba-1"
ALTA = local(1, 0)  # domingo 1 de noviembre de 2026
AHORA = local(18, 12)  # miércoles 18 de noviembre, mediodía


@dataclass
class Entorno:
    app: object
    fabrica: sessionmaker[Session]
    motor: object
    reloj: dict[str, datetime]
    ids: dict[str, int] = field(default_factory=dict)
    tokens: dict[str, str] = field(default_factory=dict)
    _clientes: list[TestClient] = field(default_factory=list)

    def cliente(self, email: str | None = None) -> TestClient:
        """Un navegador nuevo. Con `email`, entra con esa cuenta."""
        c = TestClient(self.app, raise_server_exceptions=False)
        self._clientes.append(c)
        if email:
            r = c.post("/api/acceso/login", json={"email": email, "contrasena": CLAVE})
            assert r.status_code == 200, r.text
        return c

    def avanzar(self, **delta) -> None:
        self.reloj["ahora"] += timedelta(**delta)

    def sesion(self) -> Session:
        return self.fabrica()

    def cerrar(self) -> None:
        for c in self._clientes:
            c.close()
        self.motor.dispose()


def beneficios(*niveles: int) -> list[BeneficioPropuesto]:
    from app.modulos.parametros.reglas import parametros_iniciales

    p = parametros_iniciales()
    return [
        BeneficioPropuesto(
            nivel=n,
            tipo=TipoBeneficio.DESCUENTO,
            texto=f"Descuento nivel {n}",
            compra_minima=nivel(p, n).compra_minima_tope,
        )
        for n in niveles
    ]


@cache
def _hash(contrasena: str) -> str:
    """Argon2 es lento a propósito; en las pruebas basta con cifrar cada clave una vez."""
    return cifrar_contrasena(contrasena)


def armar_entorno(tmp_path: Path, **config) -> Entorno:
    with patch.object(cuentas, "cifrar_contrasena", _hash):
        return _armar(tmp_path, **config)


def _armar(tmp_path: Path, **config) -> Entorno:
    motor = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(motor)
    fabrica = sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)
    ids: dict[str, int] = {}
    tokens: dict[str, str] = {}
    with fabrica.begin() as s:
        parametros.inicializar(s)
        mensajes.inicializar(s)
        p = parametros.cargar(s)
        admin = cuentas.crear_usuario(s, "admin@redvecina.test", "Admin", CLAVE, Rol.ADMIN)
        operador = cuentas.crear_usuario(
            s, "operador@redvecina.test", "Operador", CLAVE, Rol.OPERADOR
        )
        don_luis = comercios.crear_comercio(
            s, "Minimarket Don Luis", "Minimarket", "76100001-2", "Los Aromos 1", ALTA
        )
        espiga = comercios.crear_comercio(
            s, "Panadería La Espiga", "Panadería", "76100003-9", "El Roble 4", ALTA
        )
        barberia = comercios.crear_comercio(
            s, "Barbería Central", "Barbería", "76100005-5", "Central 10", ALTA
        )
        comercios.publicar_beneficios(s, don_luis.id, beneficios(1, 2, 3), p, ALTA, admin.id, ALTA)
        comercios.publicar_beneficios(s, espiga.id, beneficios(1, 2), p, ALTA, admin.id, ALTA)
        for c in (don_luis, espiga, barberia):
            cuentas.crear_usuario(
                s, f"{c.slug}@redvecina.test", c.nombre, CLAVE, Rol.COMERCIO, c.id
            )
        rosa = vecinos.inscribir(s, "Rosa", "+56900010000", don_luis.id, ALTA)
        compra = local(17, 10)
        boleta = boletas.crear(s, rosa.id, OrigenBoleta.VECINO, compra + timedelta(hours=1))
        boletas.aprobar(
            s,
            boleta.id,
            comercio_id=don_luis.id,
            folio="1001",
            fecha_compra=compra,
            monto_total=30_000,
            p=p,
            ahora=compra + timedelta(hours=2),
            revisor_id=operador.id,
        )
        pedro = vecinos.inscribir(s, "Pedro", "+56900010001", espiga.id, ALTA)
        pedro.estado = EstadoVecino.CERRADO
        ids.update(
            admin=admin.id,
            operador=operador.id,
            don_luis=don_luis.id,
            espiga=espiga.id,
            barberia=barberia.id,
            rosa=rosa.id,
            pedro=pedro.id,
        )
        tokens.update(rosa=rosa.token, pedro=pedro.token)

    ajustes = {"TAREAS_PEREZOSAS": False, **config}
    cfg = Configuracion(
        ENTORNO="pruebas",
        DATABASE_URL="sqlite://",
        FRONTEND_DIST=tmp_path / "sin-frontend",
        **ajustes,
    )
    aplicacion = crear_app(cfg, fabrica)
    reloj = {"ahora": AHORA}
    aplicacion.dependency_overrides[obtener_ahora] = lambda: reloj["ahora"]
    return Entorno(
        app=aplicacion, fabrica=fabrica, motor=motor, reloj=reloj, ids=ids, tokens=tokens
    )


ADMIN = "admin@redvecina.test"
OPERADOR = "operador@redvecina.test"
DON_LUIS = "minimarket-don-luis@redvecina.test"
ESPIGA = "panaderia-la-espiga@redvecina.test"
BARBERIA = "barberia-central@redvecina.test"
