"""El cliente tipado del frontend debe coincidir con la API actual."""

from app.herramientas import cliente_ts
from app.main import crear_app


def test_cliente_ts_al_dia():
    esperado = cliente_ts.generar(crear_app().openapi())
    actual = cliente_ts.DESTINO.read_text(encoding="utf-8")
    assert actual == esperado, (
        "frontend/src/lib/api-generada.ts está desactualizado. "
        "Regenéralo con: python -m app.cli cliente-ts"
    )


def test_tipos_basicos():
    assert cliente_ts.tipo({"anyOf": [{"type": "integer"}, {"type": "null"}]}) == "number | null"
    assert cliente_ts.tipo({"type": "array", "items": {"$ref": "#/x/Opcion"}}) == "Opcion[]"
    assert cliente_ts.tipo({"enum": ["a", "b"]}) == "'a' | 'b'"
    assert cliente_ts.camel("boleta_id") == "boletaId"
