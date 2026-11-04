"""Modelos de respuesta de la API (los de datos se añaden en las tareas siguientes)."""
from typing import Literal

from pydantic import BaseModel, Field


class Salud(BaseModel):
    estado: Literal["ok"]
    version: str
    proveedor: str
    # Informativo. "mixto" solo si hay escenarios reales y sintéticos; "desconocido" si no hay escenarios.
    origen_tipo: Literal["sintetico", "real", "mixto", "desconocido"]
    # La banda «DATOS DE DEMOSTRACIÓN» depende de este campo: true si CUALQUIER escenario es sintético.
    hay_sinteticos: bool


class ErrorDto(BaseModel):
    mensaje: str


class Rejilla(BaseModel):
    """Ráster cuantizado a uint8: 0 = sin dato, 1..255 = lineal entre vmin y vmax. Máximo 512 por lado."""
    filas: int = Field(ge=1, le=512)
    columnas: int = Field(ge=1, le=512)
    vmin: float
    vmax: float
    bbox: tuple[float, float, float, float]  # (oeste, sur, este, norte) en WGS84
    datos_b64: str
