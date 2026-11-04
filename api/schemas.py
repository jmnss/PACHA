"""Modelos de petición y respuesta de la API."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from datos.contrato import CampoVectorial, Metrica, Origen, Paleta, SerieTemporal, TablaResultado


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


# --- Capas, cambio y medición -------------------------------------------------------------------

class CapaDto(BaseModel):
    """Metadatos de una `CapaRaster` más su rejilla cuantizada (vmin/vmax de la capa)."""
    escenario_id: str
    adquisicion_id: str | None
    variable: str
    polarizacion: str | None
    unidad: str
    paleta: Paleta
    leyenda: list[tuple[str, str]] | None
    instante: datetime | None
    rejilla: Rejilla
    origen: Origen


class ResultadoCambioDto(BaseModel):
    antes: CapaDto
    despues: CapaDto
    cambio: CapaDto
    clasificacion: CapaDto | None
    metricas: list[Metrica]
    series: list[SerieTemporal]
    notas: list[str]
    tablas: list[TablaResultado]
    vectores: CampoVectorial | None
    capas_extra: list[CapaDto]
    origen: Origen


class PeticionCambio(BaseModel):
    antes: str
    despues: str
    polarizacion: str | None = None


class PeticionMedicion(BaseModel):
    """`cuadrante` = [x0, y0, x1, y1] y `punto` = [x, y], normalizados 0–1 sobre la imagen.

    x crece hacia la derecha (columnas); y=0 es la fila superior (norte) y crece hacia abajo.
    """
    antes: str
    despues: str
    cuadrante: tuple[float, float, float, float] | None = None
    punto: tuple[float, float] | None = None

    @model_validator(mode="after")
    def _valido(self) -> "PeticionMedicion":
        if (self.cuadrante is None) == (self.punto is None):
            raise ValueError("Indica exactamente uno de `cuadrante` o `punto`.")
        valores = self.cuadrante if self.cuadrante is not None else self.punto
        if not all(0.0 <= v <= 1.0 for v in valores):
            raise ValueError("El cuadrante o el punto deben estar entre 0 y 1.")
        return self


class MedicionDto(BaseModel):
    cuadrante: tuple[int, int, int, int] | None
    punto: tuple[int, int] | None
    metricas: list[Metrica]
    tabla: list[dict[str, str | float | None]]
    origen: Origen
