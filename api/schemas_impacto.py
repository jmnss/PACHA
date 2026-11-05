"""Respuesta tipada del resumen de impacto."""
from datetime import datetime

from pydantic import BaseModel

from api.schemas import CapaDto
from datos.contrato import Metrica, Origen


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
    capa: CapaDto
    area_escena_km2: float
    resolucion_celda_m: float
    origen: Origen
