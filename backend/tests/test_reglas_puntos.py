"""Libro de puntos: saldo, retención, vencimiento a P8 días y deuda (A16)."""

from datetime import timedelta

from app.modulos.puntos.esquemas import TipoMovimiento as T
from app.modulos.puntos.reglas import Mov, calcular_lotes, saldos
from tests.utiles import local


def mov(tipo: T, puntos: int, momento, vence=None, canje=None, id_=0) -> Mov:
    return Mov(tipo=tipo, puntos=puntos, creado_en=momento, vence_en=vence, canje_id=canje, id=id_)


def gana(puntos, momento, p):
    return mov(T.GANA, puntos, momento, momento + timedelta(days=p.P8.dias))


def comprobar(movs, disponible, retenido=0):
    s = saldos(movs)
    assert (s.disponible, s.retenido) == (disponible, retenido)
    assert calcular_lotes(movs).disponible == disponible  # ambas cuentas coinciden


def test_caso_de_rosa(p):
    """Sección 7: 450 disponibles, canje de 250 → 200, canjea, suma 52 → 252."""
    movs = [gana(372, local(10), p), gana(78, local(16, 20), p)]
    comprobar(movs, 450)
    movs.append(mov(T.RETIENE, 250, local(17, 9), canje=1))
    comprobar(movs, 200, 250)  # 250 retenidos
    movs.append(mov(T.CANJEA, 250, local(18, 11), canje=1))
    comprobar(movs, 200, 0)
    movs.append(gana(52, local(18, 11, 5), p))
    comprobar(movs, 252, 0)


def test_codigo_vencido_devuelve_los_puntos(p):
    movs = [
        gana(450, local(10), p),
        mov(T.RETIENE, 250, local(16), canje=1),
        mov(T.LIBERA, 250, local(18), canje=1),
    ]
    comprobar(movs, 450)


def test_se_gastan_primero_los_mas_antiguos(p):
    """La retención toma del lote que vence antes, aunque se haya registrado después."""
    nuevo = gana(100, local(15), p)
    antiguo = mov(T.GANA, 100, local(16), vence=local(1, mes=12))  # vence antes
    movs = [nuevo, antiguo, mov(T.RETIENE, 150, local(17), canje=1)]
    lotes = calcular_lotes(movs).lotes
    por_fecha = {lote.vence_en: lote for lote in lotes}
    assert por_fecha[local(1, mes=12)].disponibles == 0
    assert por_fecha[nuevo.vence_en].disponibles == 50


def test_vencimiento_a_90_dias(p):
    compra = local(1, mes=8)
    movs = [gana(300, compra, p), gana(200, local(1, mes=10), p)]
    vence = compra + timedelta(days=90)
    estado = calcular_lotes(movs)
    assert estado.por_vencer(vence - timedelta(seconds=1)) == 0
    assert estado.por_vencer(vence) == 300
    movs.append(mov(T.VENCE, 300, vence))
    comprobar(movs, 200)
    assert calcular_lotes(movs).por_vencer(vence) == 0  # vencer dos veces no duplica


def test_retenidos_no_vencen_mientras_el_codigo_esta_activo(p):
    """Anexo A.11: si el código se usa, se consumen; si vence, vuelven y vencen de inmediato."""
    compra = local(1, mes=8)
    vence = compra + timedelta(days=90)
    base = [gana(250, compra, p), mov(T.RETIENE, 250, vence - timedelta(hours=1), canje=7)]
    assert calcular_lotes(base).por_vencer(vence + timedelta(hours=1)) == 0

    usado = [*base, mov(T.CANJEA, 250, vence + timedelta(hours=2), canje=7)]
    assert calcular_lotes(usado).por_vencer(vence + timedelta(hours=3)) == 0
    comprobar(usado, 0)

    liberado = [*base, mov(T.LIBERA, 250, vence + timedelta(hours=2), canje=7)]
    assert calcular_lotes(liberado).por_vencer(vence + timedelta(hours=3)) == 250


def test_ajuste_negativo_deja_deuda_que_pagan_las_compras_siguientes(p):
    """A16: devolución de una compra cuyos puntos ya se gastaron."""
    movs = [gana(100, local(10), p), mov(T.AJUSTA, -150, local(11))]
    comprobar(movs, -50)
    movs.append(gana(80, local(12), p))
    comprobar(movs, 30)
    assert calcular_lotes(movs).deuda == 0


def test_proximos_vencimientos(p):
    movs = [gana(100, local(1, mes=9), p), gana(40, local(2, mes=9), p)]
    estado = calcular_lotes(movs)
    ahora = local(16)
    proximos = estado.proximos(ahora, ahora + timedelta(days=15))
    assert [puntos for _, puntos in proximos] == [100, 40]
