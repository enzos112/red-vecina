from datetime import datetime

from app.core.tiempo import ZONA_LOCAL

# Semana de referencia: el lunes 16 de noviembre de 2026.
LUNES = 16


def local(dia: int, hora: int = 12, minuto: int = 0, mes: int = 11) -> datetime:
    """Fecha y hora de Santiago en noviembre de 2026."""
    return datetime(2026, mes, dia, hora, minuto, tzinfo=ZONA_LOCAL)
