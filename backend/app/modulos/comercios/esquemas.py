import enum


class EstadoComercio(enum.StrEnum):
    ACTIVO = "activo"
    SUSPENDIDO = "suspendido"
    RETIRADO = "retirado"


class TipoBeneficio(enum.StrEnum):
    DESCUENTO = "descuento"
    PRODUCTO = "producto"


class EstadoBeneficio(enum.StrEnum):
    PENDIENTE = "pendiente"  # propuesto por el comercio, espera aprobación
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"
    REEMPLAZADO = "reemplazado"  # otro beneficio del mismo nivel entró en vigencia
