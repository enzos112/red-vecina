"""Servicios con base de datos: el caso de Rosa de punta a punta, cupos y tareas idempotentes."""

from datetime import date, timedelta

import pytest
from sqlalchemy import func, select

from app.modulos.boletas import servicio as boletas
from app.modulos.boletas.esquemas import OrigenBoleta
from app.modulos.canjes import servicio as canjes
from app.modulos.canjes.esquemas import EstadoCanje
from app.modulos.canjes.modelos import Canje
from app.modulos.comercios import servicio as comercios
from app.modulos.comercios.esquemas import TipoBeneficio
from app.modulos.comercios.reglas import BeneficioPropuesto
from app.modulos.equilibrio import servicio as equilibrio
from app.modulos.equilibrio.modelos import CupoSemanal
from app.modulos.parametros import servicio as parametros
from app.modulos.puntos import servicio as puntos
from app.modulos.puntos.modelos import MovimientoPuntos
from app.modulos.vecinos import reglas as reglas_vecinos
from app.modulos.vecinos import servicio as vecinos
from app.tareas import servicio as tareas
from tests.utiles import local

ALTA = local(1, 0)  # domingo 1 de noviembre


@pytest.fixture
def p(sesion):
    return parametros.cargar(sesion)


def beneficios(*niveles):
    minimos = {1: 5_000, 2: 10_000, 3: 20_000}
    return [
        BeneficioPropuesto(
            nivel=n, tipo=TipoBeneficio.DESCUENTO, texto=f"Nivel {n}", compra_minima=minimos[n]
        )
        for n in niveles
    ]


@pytest.fixture
def red(sesion, p):
    """Don Luis (1), la panadería (2) y Rosa, inscrita en Don Luis."""
    don_luis = comercios.crear_comercio(
        sesion, "Minimarket Don Luis", "Minimarket", "76100001-2", "Los Aromos 1", ALTA
    )
    espiga = comercios.crear_comercio(
        sesion, "Panadería La Espiga", "Panadería", "76100003-9", "El Roble 4", ALTA
    )
    comercios.publicar_beneficios(sesion, don_luis.id, beneficios(1, 2, 3), p, ALTA, 1, ALTA)
    comercios.publicar_beneficios(sesion, espiga.id, beneficios(1, 2), p, ALTA, 1, ALTA)
    rosa = vecinos.inscribir(sesion, "Rosa", "+56900010000", don_luis.id, ALTA)
    return {"don_luis": don_luis, "espiga": espiga, "rosa": rosa}


def comprar(sesion, p, vecino, comercio, momento, monto, folio):
    boleta = boletas.crear(sesion, vecino.id, OrigenBoleta.VECINO, momento + timedelta(hours=1))
    return boletas.aprobar(
        sesion,
        boleta.id,
        comercio_id=comercio.id,
        folio=folio,
        fecha_compra=momento,
        monto_total=monto,
        p=p,
        ahora=momento + timedelta(hours=2),
    )


def test_caso_de_rosa_de_punta_a_punta(sesion, p, red):
    """Sección 7: acumula en Don Luis, canjea en la panadería y termina con 252."""
    rosa, don_luis, espiga = red["rosa"], red["don_luis"], red["espiga"]
    comprar(sesion, p, rosa, don_luis, local(3, 10), 20_000, "100")
    comprar(sesion, p, rosa, don_luis, local(10, 10), 17_200, "101")
    b = comprar(sesion, p, rosa, don_luis, local(16, 20), 7_850, "102")
    assert b.puntos == 78
    assert puntos.saldos(sesion, rosa.id).disponible == 450

    # 7.2: pide canjear; la panadería sale primero porque nunca compró ahí.
    ahora = local(17, 9)
    elegibilidad, opciones = canjes.opciones(sesion, rosa.id, ahora, p)
    assert elegibilidad.puede
    primera = opciones.destacadas[0]
    assert (primera.comercio, primera.puntos, primera.valor_pesos) == (
        "Panadería La Espiga",
        250,
        1_000,
    )

    canje = canjes.emitir(sesion, rosa.id, primera.beneficio_id, ahora, p)
    assert len(canje.codigo) == 6
    assert canje.vence_en == local(19, 9)
    s = puntos.saldos(sesion, rosa.id)
    assert (s.disponible, s.retenido) == (200, 250)
    cupo = equilibrio.obtener(sesion, espiga.id, date(2026, 11, 16))
    assert cupo.reservado == 1_000

    # La cajera valida: $6.200 en pan y pasteles, sobre la compra mínima de $5.000.
    v = canjes.usar(sesion, canje.codigo, espiga.id, local(18, 11), p, monto_compra=6_200)
    assert v.se_puede_usar
    assert (cupo.reservado, cupo.usado) == (0, 1_000)
    s = puntos.saldos(sesion, rosa.id)
    assert (s.disponible, s.retenido) == (200, 0)
    # Un segundo intento dice "ya usado" con fecha y hora.
    assert (
        "ya fue usado el miércoles 18, 11:00"
        in canjes.consultar(sesion, canje.codigo, espiga.id, local(18, 12)).mensaje
    )

    # Sube la boleta de $5.200 y suma 52: saldo 252. Queda asociada al canje (Anexo A.9).
    b = comprar(sesion, p, rosa, espiga, local(18, 11), 5_200, "900")
    assert b.puntos == 52
    assert b.canje_id == canje.id
    assert puntos.saldos(sesion, rosa.id).disponible == 252

    # 7.3: es cliente derivado de la panadería y no puede volver a canjear ahí en 30 días.
    compro = vecinos.comercios_donde_compro(sesion, rosa.id)
    assert reglas_vecinos.es_cliente_derivado(
        espiga.id, rosa.comercio_origen_id, espiga.id in compro
    )
    _, opciones = canjes.opciones(sesion, rosa.id, local(19, 10), p)
    assert espiga.id not in {o.comercio_id for o in opciones.todas}


def test_codigo_vencido_devuelve_puntos_y_cupo_en_la_misma_semana(sesion, p, red):
    rosa, espiga = red["rosa"], red["espiga"]
    comprar(sesion, p, rosa, red["don_luis"], local(16, 10), 30_000, "1")
    _, opciones = canjes.opciones(sesion, rosa.id, local(16, 12), p)
    nivel_chico = next(o for o in opciones.todas if o.comercio_id == espiga.id and o.nivel == 1)
    canje = canjes.emitir(sesion, rosa.id, nivel_chico.beneficio_id, local(16, 12), p)
    cupo = equilibrio.obtener(sesion, espiga.id, date(2026, 11, 16))
    assert cupo.libre == 4_000

    assert canjes.liberar_vencidos(sesion, local(18, 13), p) == {"codigos": 1}
    assert canje.estado == EstadoCanje.VENCIDO
    assert cupo.libre == 5_000  # vence miércoles: vuelve en la misma semana (A.6)
    assert puntos.saldos(sesion, rosa.id).disponible == 300
    assert "vencido" in canjes.consultar(sesion, canje.codigo, espiga.id, local(18, 14)).mensaje


@pytest.mark.parametrize("hora_tareas", [1, 23])  # antes o después de que venza el código
def test_codigo_que_cruza_el_lunes_cuenta_como_usado_en_el_arrastre(sesion, p, red, hora_tareas):
    """Anexo A.6: el cupo no vuelve, y da igual a qué hora corrió la tarea del lunes."""
    rosa, espiga = red["rosa"], red["espiga"]
    comprar(sesion, p, rosa, red["don_luis"], local(14, 10), 30_000, "1")
    tareas.ejecutar(sesion, local(9, 0, 5))  # cupo de la semana del 9
    _, opciones = canjes.opciones(sesion, rosa.id, local(15, 20), p)  # domingo
    nivel_chico = next(o for o in opciones.todas if o.comercio_id == espiga.id and o.nivel == 1)
    canjes.emitir(sesion, rosa.id, nivel_chico.beneficio_id, local(15, 20), p)  # vence martes

    tareas.ejecutar(sesion, local(17, hora_tareas))  # primera petición del martes
    nueva = equilibrio.obtener(sesion, espiga.id, date(2026, 11, 16))
    assert nueva.arrastre == 4_000  # la base de 5.000 menos lo reservado al cierre
    canjes.liberar_vencidos(sesion, local(18), p)
    assert nueva.libre == nueva.base + nueva.arrastre  # no vuelve a la semana nueva


def test_cupo_extra_no_se_arrastra(sesion, p, red):
    """Anexo A.5: primero arrastre, luego base, al final extra; el extra no pasa."""
    rosa, espiga = red["rosa"], red["espiga"]
    comprar(sesion, p, rosa, red["don_luis"], local(9, 10), 50_000, "1")
    tareas.ejecutar(sesion, local(9, 11))
    cupo = equilibrio.agregar_extra(sesion, espiga.id, 3_000, local(10), p)
    assert cupo.total == 8_000
    _, opciones = canjes.opciones(sesion, rosa.id, local(11, 10), p)
    medio = next(o for o in opciones.todas if o.comercio_id == espiga.id and o.nivel == 2)
    canje = canjes.emitir(sesion, rosa.id, medio.beneficio_id, local(11, 10), p)
    canjes.usar(sesion, canje.codigo, espiga.id, local(12, 10), p, monto_compra=12_000)
    assert (cupo.usado, cupo.libre) == (2_000, 6_000)
    tareas.ejecutar(sesion, local(16, 0, 5))
    # Se usaron 2.000 de la base: pasan los 3.000 restantes de la base, no el extra.
    assert equilibrio.obtener(sesion, espiga.id, date(2026, 11, 16)).arrastre == 3_000
    with pytest.raises(ValueError, match="no se puede bajar"):
        equilibrio.agregar_extra(sesion, espiga.id, -1_000, local(17), p)


def test_boleta_rechazada_no_suma_y_explica_el_motivo(sesion, p, red):
    rosa, don_luis = red["rosa"], red["don_luis"]
    comprar(sesion, p, rosa, don_luis, local(16, 10), 5_000, "77")
    otra = vecinos.inscribir(sesion, "Otra", "+56900010001", don_luis.id, ALTA)
    with pytest.raises(ValueError, match="ya fue registrada"):
        comprar(sesion, p, otra, don_luis, local(16, 10), 5_000, "77")  # misma boleta


def contar(sesion, modelo):
    return sesion.scalar(select(func.count()).select_from(modelo))


def test_tareas_idempotentes(sesion, p, red):
    rosa, don_luis, espiga = red["rosa"], red["don_luis"], red["espiga"]
    # Puntos de una compra del 15 de agosto (vencen el 13 de noviembre) y un código que vence
    # el 14 con puntos de ese lote retenidos: al liberarse, vencen de inmediato (A.11).
    boleta = boletas.crear(sesion, rosa.id, OrigenBoleta.VECINO, local(15, 11, mes=8))
    boletas.aprobar(
        sesion,
        boleta.id,
        comercio_id=don_luis.id,
        folio="1",
        fecha_compra=local(15, 10, mes=8),
        monto_total=40_000,
        p=p,
        ahora=local(15, 12, mes=8),
    )
    comprar(sesion, p, rosa, don_luis, local(12, 10), 30_000, "2")
    _, opciones = canjes.opciones(sesion, rosa.id, local(12, 12), p)
    nivel = next(o for o in opciones.todas if o.comercio_id == espiga.id)
    canjes.emitir(sesion, rosa.id, nivel.beneficio_id, local(12, 12), p)

    ahora = local(16, 0, 5)
    primera = tareas.ejecutar(sesion, ahora)
    assert primera["liberar_codigos"] == {"codigos": 1}
    assert primera["vencer_puntos"]["puntos"] > 0
    assert primera["recalcular_cupos"] == {"creados": 2}
    fotos = (contar(sesion, MovimientoPuntos), contar(sesion, CupoSemanal), contar(sesion, Canje))
    saldo = puntos.saldos(sesion, rosa.id)

    assert tareas.ejecutar(sesion, ahora) == {}  # mismo día: no corre
    forzada = tareas.ejecutar(sesion, ahora + timedelta(hours=3), forzar=True)
    assert forzada == {
        "liberar_codigos": {"codigos": 0},
        "vencer_puntos": {"vecinos": 0, "puntos": 0},
        "levantar_suspensiones": {"comercios": 0},
        "cerrar_inactivas": {"cuentas": 0},
        "recalcular_cupos": {"creados": 0},
    }
    tareas.ejecutar(sesion, ahora + timedelta(days=1))  # otro día, sin efectos nuevos
    assert (
        contar(sesion, MovimientoPuntos),
        contar(sesion, CupoSemanal),
        contar(sesion, Canje),
    ) == fotos
    assert puntos.saldos(sesion, rosa.id) == saldo
