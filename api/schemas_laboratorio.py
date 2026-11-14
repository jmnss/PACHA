"""Respuestas tipadas del laboratorio del radar."""
from pydantic import BaseModel

from api.schemas import CapaDto
from datos.contrato import Metrica, Origen


class NubesDto(BaseModel):
    optico: CapaDto
    radar: CapaDto
    cambio_optico: CapaDto
    cambio_radar: CapaDto
    metricas: list[Metrica]
    porcentaje_radar: float
    porcentaje_optico: float
    cobertura_real: float           # fracción 0..1 realmente tapada
    origen: Origen


class RespuestaSuperficieDto(BaseModel):
    superficie: str
    pol: str
    db: float


class CambioResaltadoDto(BaseModel):
    cambio: str
    mejor_pol: str
    contraste_db: float
    contrastes: dict[str, float]


class RespuestaDto(BaseModel):
    banda: str
    pol: str
    capa: CapaDto
    superficies: CapaDto
    respuestas: list[RespuestaSuperficieDto]
    cambios: list[CambioResaltadoDto]
    aviso_banda: str | None
    origen: Origen
