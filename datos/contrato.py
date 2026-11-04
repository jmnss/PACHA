"""Contrato de datos genérico: lo que la interfaz necesita, venga de donde venga.

Los proveedores (`demo`, `real`) devuelven estos modelos; la API solo habla con ellos.
Todo dato lleva su `Origen`. Ver docs/contrato-datos.md.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, Protocol, runtime_checkable

import numpy as np
import math

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

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
    fecha_generacion: AwareDatetime  # con zona horaria; naive se rechaza
    notas: str | None = None


class Adquisicion(BaseModel):
    id: str
    instante: AwareDatetime  # con zona horaria (UTC)
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
    paleta: Paleta
    vmin: float
    vmax: float
    leyenda: list[tuple[str, str]] | None
    datos: np.ndarray
    bbox: BBox
    origen: Origen
    instante: AwareDatetime | None = None  # solo en fotogramas del modelo continuo (UTC)

    def __post_init__(self) -> None:
        if self.instante is not None and (self.instante.tzinfo is None or self.instante.utcoffset() is None):
            raise ValueError("CapaRaster.instante debe llevar zona horaria")
        arr = np.asarray(self.datos)
        if arr.ndim != 2:
            raise ValueError(f"CapaRaster.datos debe ser 2D, recibió {arr.ndim}D")
        if arr.size == 0:
            raise ValueError("CapaRaster.datos no puede estar vacío")
        copia = np.array(arr, dtype=np.float32, copy=True)
        copia.setflags(write=False)
        object.__setattr__(self, "datos", copia)
        if self.paleta not in PALETAS:
            raise ValueError(f"paleta inválida: {self.paleta!r}; válidas: {PALETAS}")
        if not (math.isfinite(self.vmin) and math.isfinite(self.vmax)):
            raise ValueError(f"vmin ({self.vmin}) y vmax ({self.vmax}) deben ser finitos")
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


class TablaResultado(BaseModel):
    """Tabla de resultados (p. ej. una fila por parcela). Celdas: texto, número o nulo (sin valor)."""
    titulo: str
    columnas: list[str]
    filas: list[list[str | float | None]]
    origen: Origen


class CampoVectorial(BaseModel):
    """Flechas de flujo: posiciones `x`, `y` en km (respecto al centro de la escena, y hacia el norte) y
    componentes `u` (este) y `v` (norte) en `unidad`."""
    x: list[float]
    y: list[float]
    u: list[float]
    v: list[float]
    unidad: str
    origen: Origen

    @model_validator(mode="after")
    def _misma_longitud(self) -> "CampoVectorial":
        if not len(self.x) == len(self.y) == len(self.u) == len(self.v):
            raise ValueError("CampoVectorial exige x, y, u y v de la misma longitud")
        return self


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
    tablas: list[TablaResultado] = field(default_factory=list)
    vectores: CampoVectorial | None = None
    capas_extra: list[CapaRaster] = field(default_factory=list)


class Medicion(BaseModel):
    """Medición sobre un cuadrante o un punto del par antes/después.

    `cuadrante` = (fila0, fila1, col0, col1) en píxeles, como `nisar.medir_cuadrante`;
    `punto` = (fila, columna), como `nisar.valores_en_punto`. Exactamente uno de los dos.
    `tabla`: filas {columna: texto | número}, p. ej. {"Capa": ..., "Valor": ...}.
    """
    cuadrante: tuple[int, int, int, int] | None = None
    punto: tuple[int, int] | None = None
    metricas: list[Metrica]
    tabla: list[dict[str, str | float | None]]
    origen: Origen

    @model_validator(mode="after")
    def _uno_solo(self) -> "Medicion":
        if (self.cuadrante is None) == (self.punto is None):
            raise ValueError("Medicion exige exactamente uno de `cuadrante` o `punto`")
        if self.cuadrante is not None:
            f0, f1, c0, c1 = self.cuadrante
            if not (0 <= f0 < f1 and 0 <= c0 < c1):
                raise ValueError(f"cuadrante inválido {self.cuadrante}: se exige 0<=fila0<fila1 y 0<=col0<col1")
        if self.punto is not None and min(self.punto) < 0:
            raise ValueError(f"punto inválido {self.punto}: fila y columna deben ser >= 0")
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
    # Opcionales de conveniencia (el proveedor demo los ofrece):
    #   intervalo_por_defecto(escenario_id) -> (antes_id, despues_id)
    #   serie_seleccion(escenario_id, cuadrante=None, punto=None) -> SerieTemporal | None
