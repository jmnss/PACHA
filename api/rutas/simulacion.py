"""Simulación con parámetros propios y lotes de fotogramas del modelo continuo."""
import json
import threading
from collections import OrderedDict
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import AwareDatetime, BaseModel, StrictInt, model_validator

from api.deps import obtener
from api.rutas.capas import _dto
from api.schemas import CapaDto
from datos.contrato import Escenario, ProveedorDatos

router = APIRouter()

MAX_FOTOGRAMAS = 120
MAX_CACHE = 12
# Ecuador continental y Galápagos (WGS84): oeste, sur, este, norte.
_ECUADOR = (-92.2, -5.1, -75.1, 1.8)


class CacheLRU:
    """LRU pequeño y seguro entre hilos; la clave es el JSON canónico de la petición."""

    def __init__(self, capacidad: int = MAX_CACHE) -> None:
        self._capacidad = capacidad
        self._datos: OrderedDict[str, Any] = OrderedDict()
        self._cerrojo = threading.Lock()

    def obtener(self, clave: str) -> Any | None:
        with self._cerrojo:
            if clave not in self._datos:
                return None
            self._datos.move_to_end(clave)
            return self._datos[clave]

    def guardar(self, clave: str, valor: Any) -> None:
        with self._cerrojo:
            self._datos[clave] = valor
            self._datos.move_to_end(clave)
            while len(self._datos) > self._capacidad:
                self._datos.popitem(last=False)


class PeticionEscenario(BaseModel):
    escenario_id: str
    parametros: dict[str, float] = {}

    @model_validator(mode="after")
    def _en_ecuador(self) -> "PeticionEscenario":
        lat, lon = self.parametros.get("lat"), self.parametros.get("lon")
        if lat is not None and lon is not None:
            oeste, sur, este, norte = _ECUADOR
            if not (sur <= lat <= norte and oeste <= lon <= este):
                raise ValueError("El punto elegido queda fuera de Ecuador: elige una latitud y una "
                                 "longitud dentro del país.")
        return self


class PeticionFotogramas(PeticionEscenario):
    inicio: AwareDatetime
    fin: AwareDatetime
    paso_min: StrictInt

    @model_validator(mode="after")
    def _intervalo(self) -> "PeticionFotogramas":
        if self.paso_min < 1:
            raise ValueError("El paso debe ser un número entero de minutos mayor o igual que 1.")
        if self.fin <= self.inicio:
            raise ValueError("El fin debe ser posterior al inicio.")
        return self


def _canonica(cuerpo: BaseModel) -> str:
    return json.dumps(cuerpo.model_dump(mode="json"), sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False)


def _cache(request: Request) -> CacheLRU:
    cache = getattr(request.app.state, "cache_simulacion", None)
    if cache is None:
        cache = request.app.state.cache_simulacion = CacheLRU()
    return cache


def _numero(inicio: datetime, fin: datetime, paso_min: int) -> int:
    return int((fin - inicio).total_seconds() // (paso_min * 60)) + 1


@router.post("/simulacion/escenario", response_model=Escenario)
def simular(cuerpo: PeticionEscenario, request: Request,
            prov: ProveedorDatos = Depends(obtener)) -> Escenario:
    cache, clave = _cache(request), "escenario:" + _canonica(cuerpo)
    hit = cache.obtener(clave)
    if hit is None:
        hit = prov.simular(cuerpo.escenario_id, dict(cuerpo.parametros))
        cache.guardar(clave, hit)
    return hit


@router.post("/simulacion/fotogramas", response_model=list[CapaDto])
def fotogramas(cuerpo: PeticionFotogramas, request: Request,
               prov: ProveedorDatos = Depends(obtener)) -> list[CapaDto]:
    n = _numero(cuerpo.inicio, cuerpo.fin, cuerpo.paso_min)
    if n > MAX_FOTOGRAMAS:
        raise ValueError(f"Pide como máximo {MAX_FOTOGRAMAS} fotogramas por vez; esta petición "
                         f"pedía {n}. Amplía el paso o acorta el intervalo.")
    cache, clave = _cache(request), "fotogramas:" + _canonica(cuerpo)
    hit = cache.obtener(clave)
    if hit is None:
        capas = prov.fotogramas(cuerpo.escenario_id, dict(cuerpo.parametros), cuerpo.inicio,
                                cuerpo.fin, cuerpo.paso_min)
        hit = [_dto(c) for c in capas]
        cache.guardar(clave, hit)
    return hit
