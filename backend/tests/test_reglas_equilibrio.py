"""Cupo semanal (6.1, Anexo A.4 a A.6) y opciones de canje (6.2, Anexo A.7 y A.8)."""

from datetime import date

import pytest

from app.modulos.equilibrio.reglas import (
    BeneficioOferta,
    ComercioOferta,
    Semaforo,
    arrastre_siguiente,
    calcular_base,
    desglosar_consumo,
    opciones_canje,
    semaforo,
    ventas_proyectadas,
)
from tests.utiles import local

# Tabla 6.4: ventas registradas de 4 semanas y cupo de 4 semanas.
TABLA_6_4 = [
    ("Minimarket Don Luis", 4_000_000, 120_000),
    ("Carnicería El Novillo", 1_500_000, 45_000),
    ("Panadería La Espiga", 1_200_000, 36_000),
    ("Botillería Los Aromos", 1_000_000, 30_000),
    ("Verdulería Doña Ana", 800_000, 24_000),
    ("Barbería Central", 300_000, 20_000),  # piso
]


@pytest.mark.parametrize(("nombre", "ventas", "cupo_4_semanas"), TABLA_6_4)
def test_cupos_de_la_tabla_6_4(p, nombre, ventas, cupo_4_semanas):
    base = calcular_base(ventas, dias_historia=28, p=p)
    assert base.base * 4 == cupo_4_semanas
    assert base.en_piso is (nombre == "Barbería Central")


def test_total_de_la_tabla_6_4(p):
    total = sum(calcular_base(v, 28, p).base * 4 for _, v, _ in TABLA_6_4)
    assert total == 275_000


def test_proyeccion_con_dos_semanas_de_historia(p):
    """Anexo A.4: $2.000.000 en 14 días se proyectan a $4.000.000 en 28."""
    assert ventas_proyectadas(2_000_000, 14, p) == 4_000_000
    assert calcular_base(2_000_000, 14, p).base == 30_000


def test_dias_de_historia_topados_en_28(p):
    assert ventas_proyectadas(4_000_000, 60, p) == 4_000_000


def test_menos_de_7_dias_de_historia_queda_en_el_piso(p):
    """Anexo A.4: proyectar con 1 o 2 días da cupos disparatados."""
    base = calcular_base(1_000_000, dias_historia=6, p=p)
    assert (base.base, base.ventas, base.en_piso) == (5_000, None, True)
    assert calcular_base(1_000_000, dias_historia=7, p=p).base == 30_000


def test_comercio_nuevo_parte_con_el_piso(p):
    """Sección 8: entra un comercio nuevo."""
    assert calcular_base(0, 0, p).base == p.P16.pesos_semana


def test_consumo_va_arrastre_base_extra(p):
    """Anexo A.5."""
    c = desglosar_consumo(base=30_000, extra=10_000, arrastre=5_000, consumido=38_000)
    assert (c.de_arrastre, c.de_base, c.de_extra) == (5_000, 30_000, 3_000)


@pytest.mark.parametrize(
    ("consumido", "arrastre"),
    [
        (0, 30_000),  # pasa toda la base; ni el extra ni el arrastre anterior
        (20_000, 15_000),  # 5.000 del arrastre, 15.000 de la base
        (35_000, 0),  # la base se usó completa
        (45_000, 0),
    ],
)
def test_arrastre_solo_de_la_base_no_usada(p, consumido, arrastre):
    assert arrastre_siguiente(30_000, 10_000, 5_000, consumido) == arrastre


@pytest.mark.parametrize(
    ("consumido", "color"),
    [
        (6_900, Semaforo.VERDE),
        (7_000, Semaforo.AMBAR),
        (9_900, Semaforo.AMBAR),
        (10_000, Semaforo.ROJO),
    ],
)
def test_semaforo_de_cupo(p, consumido, color):
    assert semaforo(consumido, 10_000, p) == color


# --- Opciones de canje ---


def beneficios(*niveles: int, dias=None) -> list[BeneficioOferta]:
    puntos = {1: 250, 2: 500, 3: 1_000}
    return [
        BeneficioOferta(
            beneficio_id=n * 10,
            nivel=n,
            puntos=puntos[n],
            valor_pesos=puntos[n] * 4,
            compra_minima=puntos[n] * 4 * 5,
            texto=f"Nivel {n}",
            dias_permitidos=dias,
        )
        for n in niveles
    ]


def comercio(id_, nombre, total, libre, canjes=0, niveles=(1, 2, 3), dias=None):
    return ComercioOferta(
        comercio_id=id_,
        nombre=nombre,
        cupo_total=total,
        cupo_libre=libre,
        canjes_semana=canjes,
        beneficios=beneficios(*niveles, dias=dias),
    )


RED = [
    comercio(1, "Minimarket Don Luis", 30_000, 20_000),
    comercio(3, "Panadería La Espiga", 9_000, 6_000),
    comercio(2, "Carnicería El Novillo", 11_250, 10_000),
    comercio(6, "Barbería Central", 5_000, 500, niveles=(1, 2)),
]


def test_caso_de_rosa_la_panaderia_primero(p):
    """Sección 7.2: Rosa (450 puntos, compró en Don Luis y en la carnicería) ve primero la
    panadería, donde nunca ha compró y que tiene cupo libre."""
    r = opciones_canje(450, RED, compro_en={1, 2}, bloqueados_p12=set(), ahora=local(16), p=p)
    primera = r.destacadas[0]
    assert (primera.comercio, primera.puntos, primera.valor_pesos) == (
        "Panadería La Espiga",
        250,
        1_000,
    )
    assert primera.compra_minima == 5_000
    assert primera.nunca_compro


def test_orden_nunca_compro_y_luego_porcentaje_libre(p):
    r = opciones_canje(450, RED, compro_en=set(), bloqueados_p12=set(), ahora=local(16), p=p)
    # Todos nuevos: carnicería 89% libre, minimarket 67%, panadería 67% (empate → id), barbería 20%.
    assert [o.comercio_id for o in r.destacadas] == [2, 1, 3]


def test_desempate_por_canjes_de_la_semana(p):
    red = [comercio(1, "A", 10_000, 5_000, canjes=3), comercio(2, "B", 10_000, 5_000, canjes=1)]
    r = opciones_canje(300, red, set(), set(), local(16), p)
    assert [o.comercio_id for o in r.destacadas] == [2, 1]


def test_destacadas_una_por_comercio_con_el_nivel_mas_alto_posible(p):
    """Anexo A.8: el nivel más alto que alcance el saldo y el cupo libre."""
    red = [comercio(1, "A", 10_000, 3_000)]  # 4.000 del nivel grande no caben
    r = opciones_canje(1_200, red, set(), set(), local(16), p)
    assert [(o.comercio_id, o.nivel) for o in r.destacadas] == [(1, 2)]
    assert [o.nivel for o in r.todas] == [2, 1]  # "ver todos" muestra todos los niveles


def test_maximo_u8_destacadas(p):
    red = [comercio(i, f"C{i}", 10_000, 10_000) for i in range(1, 6)]
    r = opciones_canje(300, red, set(), set(), local(16), p)
    assert len(r.destacadas) == p.U8.cantidad == 3
    assert len(r.todas) == 5


def test_comercio_sin_cupo_aparece_como_agotado(p):
    """Sección 6.2: "Cupo de la semana agotado, vuelve el lunes"."""
    r = opciones_canje(2_000, RED, set(), set(), local(16), p)
    assert r.agotados == ["Barbería Central"]
    assert 6 not in {o.comercio_id for o in r.todas}


def test_p12_no_muestra_comercios_donde_ya_canjeo(p):
    r = opciones_canje(450, RED, set(), bloqueados_p12={3}, ahora=local(16), p=p)
    assert 3 not in {o.comercio_id for o in r.todas}


def test_saldo_insuficiente_no_muestra_el_nivel(p):
    r = opciones_canje(249, RED, set(), set(), local(16), p)
    assert r.todas == []
    assert r.proxima_liberacion == date(2026, 11, 23)
    assert "lunes 23 de noviembre" in r.mensaje_sin_opciones


def test_dias_permitidos_dentro_de_las_48_horas(p):
    """Anexo A.7: un beneficio solo de lunes no aparece un miércoles, sí un domingo en la noche."""
    red = [comercio(1, "Solo lunes", 10_000, 10_000, dias=[0])]
    assert opciones_canje(300, red, set(), set(), local(18), p).todas == []  # miércoles
    assert opciones_canje(300, red, set(), set(), local(22, 20), p).todas  # domingo 20:00


def test_comercio_nuevo_se_muestra_primero(p):
    """Sección 8: parte con el piso y nadie ha comprado ahí."""
    red = [*RED, comercio(7, "Nuevo", 5_000, 5_000, niveles=(2,))]
    r = opciones_canje(600, red, compro_en={1, 2, 3, 6}, bloqueados_p12=set(), ahora=local(16), p=p)
    assert r.destacadas[0].comercio == "Nuevo"


def test_explicacion_del_cupo_sale_de_los_parametros(p):
    from app.modulos.equilibrio.reglas import explicacion_cupo

    texto = explicacion_cupo(False, 60, p)
    assert texto.startswith(
        "Cada lunes se calcula como el 3% de tus ventas registradas de los últimos 28 días "
        "repartido en 4 semanas, con un piso de $5.000"
    )
    assert "proyectan" not in texto
    assert explicacion_cupo(True, 10, p).endswith(
        "tus ventas se proyectan con los días que llevas. Hoy estás en el piso."
    )
