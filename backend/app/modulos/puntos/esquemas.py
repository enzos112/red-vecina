import enum


class TipoMovimiento(enum.StrEnum):
    GANA = "gana"  # boleta aprobada: + disponible, con vencimiento
    RETIENE = "retiene"  # código emitido: disponible → retenido
    LIBERA = "libera"  # código vencido: retenido → disponible
    CANJEA = "canjea"  # código usado: sale de retenido
    VENCE = "vence"  # P8: sale de disponible
    AJUSTA = "ajusta"  # corrección del operador, con signo y motivo
