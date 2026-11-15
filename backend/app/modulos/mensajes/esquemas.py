from datetime import datetime

from pydantic import BaseModel, Field

# --- API ---


class PlantillaSalida(BaseModel):
    clave: str
    momento: str
    texto: str
    texto_base: str  # el de plantillas.json, para volver atrás
    variables: list[str]  # las que admite esta plantilla
    ejemplo: dict[str, str]  # datos de ejemplo para la vista previa
    vista_previa: str
    editada: bool
    actualizado_en: datetime | None
    actualizado_por: str | None


class PlantillaCambio(BaseModel):
    texto: str = Field(min_length=1, max_length=1000)


class VistaPrevia(BaseModel):
    texto: str = Field(max_length=1000)


class VistaPreviaSalida(BaseModel):
    texto: str
    error: str | None = None
