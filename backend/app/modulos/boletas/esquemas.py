import enum


class EstadoBoleta(enum.StrEnum):
    PENDIENTE = "pendiente"
    APROBADA = "aprobada"
    RECHAZADA = "rechazada"


class OrigenBoleta(enum.StrEnum):
    VECINO = "vecino"  # subida desde la tarjeta
    OPERADOR = "operador"  # llegó por WhatsApp
    DEMO = "demo"
