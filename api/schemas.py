"""Modelos de respuesta de la API (los de datos se añaden en las tareas siguientes)."""
from typing import Literal

from pydantic import BaseModel


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
