"""Contrato de datos genérico: lo que la interfaz necesita, venga de donde venga.

Los proveedores (`demo`, `real`) devuelven estos modelos; la API solo habla con ellos.
Todo dato lleva su `Origen`. Ver docs/contrato-datos.md.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Protocol, runtime_checkable

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, model_validator

BBox = tuple[float, float, float, float]  # (oeste, sur, este, norte) en WGS84
Paleta = Literal["gris", "secuencial", "divergente", "ciclico", "categorias"]
PALETAS: tuple[str, ...] = ("gris", "secuencial", "divergente", "ciclico", "categorias")


class DatosRealesNoDisponibles(RuntimeError):
    """El proveedor real aún no está integrado (o no hay datos reales accesibles)."""


class CapacidadNoDisponible(RuntimeError):
    """El proveedor activo no ofrece esta capacidad (p. ej. simular)."""


def validar_bbox(bbox: BBox) -> BBox:
    oeste, sur, este, norte = bbox
    if not oeste < este:
        raise ValueError(f"bbox inválido: oeste ({oeste}) debe ser menor que este ({este})")
    if not sur < norte:
        raise ValueError(f"bbox inválido: sur ({sur}) debe ser menor que norte ({norte})")
    return bbox


class Origen(BaseModel):
    """De dónde sale un dato. `tipo="sintetico"` activa la banda de demostración."""
    model_config = ConfigDict(frozen=True)

    tipo: Literal["sintetico", "real"]
    fuente: str
    producto: str | None = None
    generador: str | None = None
    version: str | None = None
    semilla: int | None = None
    fecha_generacion: datetime
    notas: str | None = None


class Adquisicion(BaseModel):
    id: str
    instante: datetime  # UTC
    direccion_orbital: str | None = None
    polarizaciones: list[str]


class Capacidades(BaseModel):
    simulacion: bool
    modelo_continuo: bool
    verdad_terreno: bool


class Escenario(BaseModel):
    id: str
    nombre: str
    tipo_cambio: str
    historia: Literal["inundacion", "incendio"] | None = None
    region: str
    bbox: BBox
    resolucion_m: float = Field(gt=0)
    polarizaciones: list[str]
    variables: list[str]
    adquisiciones: list[Adquisicion] = Field(min_length=1)
    capacidades: Capacidades
    origen: Origen

    @model_validator(mode="after")
    def _bbox_ordenado(self) -> "Escenario":
        validar_bbox(self.bbox)
        return self


@dataclass(frozen=True)
class CapaRaster:
    """Rejilla 2D float32 (NaN = sin dato). Dataclass: lleva np.ndarray, que pydantic no valida."""
    escenario_id: str
    adquisicion_id: str | None
    variable: str
    polarizacion: str | None
    unidad: str
    paleta: str
    vmin: float
    vmax: float
    leyenda: list[tuple[str, str]] | None
    datos: np.ndarray
    bbox: BBox
    origen: Origen

    def __post_init__(self) -> None:
        arr = np.asarray(self.datos)
        if arr.ndim != 2:
            raise ValueError(f"CapaRaster.datos debe ser 2D, recibió {arr.ndim}D")
        if arr.size == 0:
            raise ValueError("CapaRaster.datos no puede estar vacío")
        object.__setattr__(self, "datos", arr.astype(np.float32, copy=False))
        if self.paleta not in PALETAS:
            raise ValueError(f"paleta inválida: {self.paleta!r}; válidas: {PALETAS}")
        if not self.vmin <= self.vmax:
            raise ValueError(f"vmin ({self.vmin}) no puede superar vmax ({self.vmax})")
        validar_bbox(self.bbox)


class SerieTemporal(BaseModel):
    titulo: str
    unidad: str
    puntos: list[tuple[datetime, float, str]]  # (instante, valor, serie)
    origen: Origen


class Metrica(BaseModel):
    etiqueta: str
    valor: str
    unidad: str
    ayuda: str


@dataclass(frozen=True)
class ResultadoCambio:
    antes: CapaRaster
    despues: CapaRaster
    cambio: CapaRaster
    clasificacion: CapaRaster | None
    metricas: list[Metrica]
    series: list[SerieTemporal]
    notas: list[str]
    origen: Origen


class Medicion(BaseModel):
    """Medición sobre un cuadrante o un punto del par antes/después.

    `cuadrante` = (fila0, fila1, col0, col1) en píxeles, como `nisar.medir_cuadrante`;
    `punto` = (fila, columna), como `nisar.valores_en_punto`. Exactamente uno de los dos.
    `tabla`: filas {columna: texto | número}, p. ej. {"Capa": ..., "Valor": ...}.
    """
    cuadrante: tuple[int, int, int, int] | None = None
    punto: tuple[int, int] | None = None
    metricas: list[Metrica]
    tabla: list[dict[str, str | float]]
    origen: Origen

    @model_validator(mode="after")
    def _uno_solo(self) -> "Medicion":
        if (self.cuadrante is None) == (self.punto is None):
            raise ValueError("Medicion exige exactamente uno de `cuadrante` o `punto`")
        return self


@runtime_checkable
class ProveedorDatos(Protocol):
    def nombre(self) -> str: ...
    def escenarios(self) -> list[Escenario]: ...
    def escenario(self, id: str) -> Escenario: ...
    def capa(self, escenario_id: str, adquisicion_id: str, variable: str,
             polarizacion: str | None) -> CapaRaster: ...
    def cambio(self, escenario_id: str, antes_id: str, despues_id: str,
               polarizacion: str | None) -> ResultadoCambio: ...
    def medir(self, escenario_id: str, antes_id: str, despues_id: str,
              cuadrante: tuple[int, int, int, int] | None = None,
              punto: tuple[int, int] | None = None) -> Medicion: ...
    # Opcionales si `capacidades.simulacion` (si no, CapacidadNoDisponible):
    #   simular(escenario_id, parametros) -> Escenario
    #   fotogramas(escenario_id, parametros, inicio, fin, paso_min) -> list[CapaRaster]
