"""La demostración deja una base utilizable y que respeta todas las reglas."""

from collections import Counter, defaultdict
from datetime import timedelta

import pytest
from sqlalchemy import select

from app.core.tiempo import ahora_utc, dia_local
from app.demo.generador import Contrasenas, generar
from app.modulos.boletas.esquemas import EstadoBoleta
from app.modulos.boletas.modelos import Boleta
from app.modulos.canjes.esquemas import EstadoCanje
from app.modulos.canjes.modelos import Canje
from app.modulos.equilibrio.modelos import CupoSemanal
from app.modulos.parametros import servicio as parametros
from app.modulos.puntos import reglas as reglas_puntos
from app.modulos.puntos import servicio as puntos
from app.modulos.vecinos.modelos import Vecino


@pytest.fixture(scope="module")
def demo():
    """Una sola generación para todas las pruebas del módulo (tarda unos segundos)."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    import app.modelos  # noqa: F401
    from app.core.db import Base

    motor = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(motor)
    sesion = sessionmaker(bind=motor, expire_on_commit=False)()
    claves = Contrasenas("clave-admin-demo", "clave-operador-demo", "clave-comercio-demo")
    resumen = generar(sesion, claves, ahora_utc(), semilla=11)
    yield sesion, resumen, parametros.cargar(sesion)
    sesion.close()


def test_volumen_de_la_demo(demo):
    sesion, r, _ = demo
    assert r["vecinos"] == 212
    assert sesion.scalars(select(Vecino)).all()[0].es_demo
    assert r["estadisticas"]["boletas_pendientes"] == 10
    assert r["estadisticas"]["codigos_usados"] > 20
    pendientes = sesion.scalars(select(Boleta).where(Boleta.estado == EstadoBoleta.PENDIENTE)).all()
    assert len(pendientes) == 10 and all(b.archivo_id for b in pendientes)


def test_cupos_distintos_y_barberia_en_el_piso(demo):
    _, r, p = demo
    bases = {c["comercio"]: c["cupo_base"] for c in r["comercios"]}
    assert bases["Barbería Central"] == p.P16.pesos_semana
    assert bases["Minimarket Don Luis"] > 3 * bases["Barbería Central"]
    assert len(set(bases.values())) >= 5


def test_saldos_coherentes_y_nunca_negativos(demo):
    sesion, _, _ = demo
    for vecino_id in sesion.scalars(select(Vecino.id)):
        movs = puntos.movimientos(sesion, vecino_id)
        s = reglas_puntos.saldos(movs)
        assert s.disponible >= 0 and s.retenido >= 0
        assert reglas_puntos.calcular_lotes(movs).disponible == s.disponible


def test_limites_por_boleta_y_por_dia(demo):
    sesion, _, p = demo
    aprobadas = sesion.scalars(select(Boleta).where(Boleta.estado == EstadoBoleta.APROBADA)).all()
    por_dia: Counter = Counter()
    por_dia_comercio: Counter = Counter()
    folios: Counter = Counter()
    for b in aprobadas:
        assert 0 < b.puntos <= p.P4.puntos
        assert b.monto_valido >= p.P3.pesos
        assert b.recibida_en - b.fecha_compra <= timedelta(hours=p.P7.horas)
        por_dia[(b.vecino_id, dia_local(b.fecha_compra))] += b.puntos
        por_dia_comercio[(b.vecino_id, b.comercio_id, dia_local(b.fecha_compra))] += 1
        folios[(b.comercio_id, b.folio)] += 1
    assert max(por_dia.values()) <= p.P6.puntos
    assert max(por_dia_comercio.values()) <= p.P5.boletas
    assert max(folios.values()) == 1


def test_canjes_respetan_limites_y_cupo(demo):
    sesion, _, p = demo
    todos = sesion.scalars(select(Canje).order_by(Canje.emitido_en)).all()
    activos = Counter(c.vecino_id for c in todos if c.estado == EstadoCanje.ACTIVO)
    assert not activos or max(activos.values()) <= p.P14.codigos
    por_vecino = defaultdict(list)
    for c in todos:
        por_vecino[c.vecino_id].append(c)
    for canjes in por_vecino.values():
        cuentan = [c for c in canjes if c.estado != EstadoCanje.VENCIDO]
        for c in cuentan:
            ventana = [
                o
                for o in cuentan
                if c.emitido_en - timedelta(days=p.P13.dias) < o.emitido_en <= c.emitido_en
            ]
            assert len(ventana) <= p.P13.canjes
            mismo = [
                o
                for o in ventana
                if o.comercio_id == c.comercio_id
                and o.emitido_en > c.emitido_en - timedelta(days=p.P12.dias)
            ]
            assert len(mismo) <= p.P12.canjes
            assert (
                sum(1 for o in cuentan if dia_local(o.emitido_en) == dia_local(c.emitido_en))
                <= p.P13.por_dia
            )
    for cupo in sesion.scalars(select(CupoSemanal)):
        usados = [
            c for c in todos if c.comercio_id == cupo.comercio_id and c.semana_cupo == cupo.semana
        ]
        assert cupo.usado == sum(c.valor_pesos for c in usados if c.estado == EstadoCanje.USADO)
        assert cupo.reservado == sum(
            c.valor_pesos for c in usados if c.estado == EstadoCanje.ACTIVO
        )
        assert cupo.usado + cupo.reservado <= cupo.total  # ningún comercio entrega más que su cupo
