"""Modelos de respuesta de la API (los de datos se añaden en las tareas siguientes)."""
from typing import Literal

from pydantic import BaseModel


class Salud(BaseModel):
    estado: Literal["ok"]
    version: str
    proveedor: str
    origen_tipo: Literal["sintetico", "real", "mixto"]


class ErrorDto(BaseModel):
    mensaje: str
