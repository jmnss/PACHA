"""Simulación con parámetros propios y lotes de fotogramas del modelo continuo."""
import json
import threading
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import (AwareDatetime, BaseModel, StrictBool, StrictFloat, StrictInt, StrictStr,
                      model_validator)

from api.deps import obtener
from api.rutas.capas import _dto
from api.schemas import CapaDto
from datos.contrato import EntradaNoValida, Escenario, ProveedorDatos
from datos.geografia import MENSAJE_FUERA_DE_ECUADOR, en_ecuador
from datos.proveedores.demo import MAX_FOTOGRAMAS

router = APIRouter()

MAX_CACHE = 12
MAX_PARAMETROS = 32
MAX_TEXTO = 40
ANIO_MIN, ANIO_MAX = 1900, 2100
Valor = StrictBool | StrictInt | StrictFloat | StrictStr


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
    parametros: dict[str, Valor] = {}

    @model_validator(mode="after")
    def _acotar(self) -> "PeticionEscenario":
        if len(self.escenario_id) > MAX_TEXTO:
            raise ValueError(f"El identificador del escenario admite como máximo {MAX_TEXTO} caracteres.")
        if len(self.parametros) > MAX_PARAMETROS:
            raise ValueError(f"Se admiten como máximo {MAX_PARAMETROS} parámetros por petición.")
        for k, v in self.parametros.items():
            if len(k) > MAX_TEXTO or (isinstance(v, str) and len(v) > MAX_TEXTO):
                raise ValueError(f"Los nombres y los valores de texto de los parámetros admiten como "
                                 f"máximo {MAX_TEXTO} caracteres.")
        lat, lon = self.parametros.get("lat"), self.parametros.get("lon")
        if (lat is None) != (lon is None):
            raise ValueError("Para colocar un punto en el mapa hacen falta lat y lon.")
        if lat is not None:
            if (isinstance(lat, (bool, str)) or isinstance(lon, (bool, str))):
                raise ValueError("lat y lon deben ser números.")
            if not en_ecuador(lat, lon):
                raise ValueError(MENSAJE_FUERA_DE_ECUADOR)
        return self


class PeticionFotogramas(PeticionEscenario):
    inicio: AwareDatetime
    fin: AwareDatetime
    paso_min: StrictInt

    @model_validator(mode="after")
    def _intervalo(self) -> "PeticionFotogramas":
        for t in (self.inicio, self.fin):
            if not ANIO_MIN <= t.year <= ANIO_MAX:
                raise ValueError(f"Las fechas deben estar entre los años {ANIO_MIN} y {ANIO_MAX}.")
        if self.paso_min < 1:
            raise ValueError("El paso debe ser un número entero de minutos mayor o igual que 1.")
        if self.fin <= self.inicio:
            raise ValueError("El fin debe ser posterior al inicio.")
        return self


def _canonica(cuerpo: BaseModel) -> str:
    """JSON canónico: claves ordenadas e instantes normalizados a UTC."""
    datos = cuerpo.model_dump()
    for k in ("inicio", "fin"):
        if k in datos:
            datos[k] = datos[k].astimezone(timezone.utc).isoformat()
    return json.dumps(datos, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _cache(request: Request) -> CacheLRU:
    cache = getattr(request.app.state, "cache_simulacion", None)
    if cache is None:
        cache = request.app.state.cache_simulacion = CacheLRU()
    return cache


def _numero(inicio: datetime, fin: datetime, paso_min: int) -> int:
    return int((fin - inicio).total_seconds() // (paso_min * 60)) + 1


@router.post("/simulacion/escenario", response_model=Escenario)
def simular(cuerpo: PeticionEscenario, prov: ProveedorDatos = Depends(obtener)) -> Escenario:
    # Sin caché: cada llamada refresca el registro de ids derivados del proveedor.
    return prov.simular(cuerpo.escenario_id, dict(cuerpo.parametros))


@router.post("/simulacion/fotogramas", response_model=list[CapaDto])
def fotogramas(cuerpo: PeticionFotogramas, request: Request,
               prov: ProveedorDatos = Depends(obtener)) -> list[CapaDto]:
    n = _numero(cuerpo.inicio, cuerpo.fin, cuerpo.paso_min)
    if n > MAX_FOTOGRAMAS:
        raise EntradaNoValida.con("api.error.fotogramas_por_vez", maximo=MAX_FOTOGRAMAS, n=n)
    cache, clave = _cache(request), _canonica(cuerpo)
    hit = cache.obtener(clave)
    if hit is None:
        try:
            capas = prov.fotogramas(cuerpo.escenario_id, dict(cuerpo.parametros), cuerpo.inicio,
                                    cuerpo.fin, cuerpo.paso_min)
        except OverflowError:
            raise EntradaNoValida.con("api.error.fechas_fuera_rango") from None
        hit = [_dto(c) for c in capas]
        cache.guardar(clave, hit)
    return hit
