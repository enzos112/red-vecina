import pytest
from pydantic import ValidationError

from app.core.config import Configuracion


@pytest.mark.parametrize("url", ["postgres://u:p@h/db", "postgresql://u:p@h/db"])
def test_normaliza_url_de_postgres(url):
    assert Configuracion(DATABASE_URL=url).DATABASE_URL == "postgresql+psycopg://u:p@h/db"


def test_produccion_exige_secret_key_propia():
    with pytest.raises(ValidationError):
        Configuracion(ENTORNO="produccion", DATABASE_URL="postgresql://u:p@h/db")


def test_produccion_rechaza_sqlite():
    with pytest.raises(ValidationError):
        Configuracion(ENTORNO="produccion", SECRET_KEY="x" * 40, DATABASE_URL="sqlite://")


def test_lector_exige_su_clave():
    with pytest.raises(ValidationError):
        Configuracion(LECTOR_PROVEEDOR="gemini", GEMINI_API_KEY=None)
