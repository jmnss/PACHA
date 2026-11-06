"""Respuesta tipada del resumen de impacto."""
from datetime import datetime

from pydantic import BaseModel

from api.schemas import CapaDto
from datos.contrato import Metrica, Origen


class Frase(BaseModel):
    """Texto de la API con su clave: el cliente traduce `clave_texto` y rellena `{x}` con `valores_texto`."""
    clave_texto: str
    valores_texto: dict[str, float | int | str] = {}


class CategoriaImpactoDto(BaseModel):
    etiqueta: str
    km2: float
    ha: float
    pct_escena: float


class PuntoEvolucionDto(BaseModel):
    instante: datetime
    ha: float


class ImpactoDto(BaseModel):
    titulo: str
    tipo: str                       # inundacion | incendio
    escenario: str
    antes: str
    despues: str
    cifras: list[Metrica]
    categorias: list[CategoriaImpactoDto]
    evolucion: list[PuntoEvolucionDto]
    lectura: list[str]
    acciones: list[str]
    notas: list[str]
    titulo_frase: Frase | None = None
    lectura_frases: list[Frase] | None = None
    acciones_frases: list[Frase] | None = None
    notas_frases: list[Frase] | None = None
    capa: CapaDto
    area_escena_km2: float
    resolucion_celda_m: float
    origen: Origen
