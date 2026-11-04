"""Capas ráster, resultado de cambio y mediciones."""
import math

from fastapi import APIRouter, Depends, Query

from api.deps import obtener
from api.encoding import a_rejilla
from api.schemas import (CapaDto, MedicionDto, PeticionCambio, PeticionMedicion,
                         ResultadoCambioDto)
from datos.contrato import CapaRaster, ProveedorDatos

router = APIRouter()


def _dto(capa: CapaRaster) -> CapaDto:
    return CapaDto(
        escenario_id=capa.escenario_id, adquisicion_id=capa.adquisicion_id, variable=capa.variable,
        polarizacion=capa.polarizacion, unidad=capa.unidad, paleta=capa.paleta, leyenda=capa.leyenda,
        instante=capa.instante, rejilla=a_rejilla(capa), origen=capa.origen)


def _distintas(antes: str, despues: str) -> None:
    if antes == despues:
        raise ValueError("Elige dos fechas distintas.")


@router.get("/escenarios/{id}/capa", response_model=CapaDto)
def capa(id: str, adquisicion: str = Query(...), variable: str = Query(...),
         polarizacion: str | None = None, prov: ProveedorDatos = Depends(obtener)) -> CapaDto:
    return _dto(prov.capa(id, adquisicion, variable, polarizacion))


@router.post("/escenarios/{id}/cambio", response_model=ResultadoCambioDto)
def cambio(id: str, cuerpo: PeticionCambio, prov: ProveedorDatos = Depends(obtener)) -> ResultadoCambioDto:
    _distintas(cuerpo.antes, cuerpo.despues)
    r = prov.cambio(id, cuerpo.antes, cuerpo.despues, cuerpo.polarizacion)
    return ResultadoCambioDto(
        antes=_dto(r.antes), despues=_dto(r.despues), cambio=_dto(r.cambio),
        clasificacion=_dto(r.clasificacion) if r.clasificacion is not None else None,
        metricas=r.metricas, series=r.series, notas=r.notas, tablas=r.tablas, vectores=r.vectores,
        capas_extra=[_dto(c) for c in r.capas_extra], origen=r.origen)


def _forma_de_medicion(prov: ProveedorDatos, id: str, antes: str, despues: str) -> tuple[int, int]:
    """Forma (filas, columnas) de la malla de análisis, la misma sobre la que `prov.medir` mide.

    El proveedor debe medir sobre esa malla (la de `cambio.cambio.datos`), no sobre otra resolución.
    """
    esc = prov.escenario(id)
    pol = esc.polarizaciones[0] if esc.polarizaciones else None
    ny, nx = prov.cambio(id, antes, despues, pol).cambio.datos.shape
    return ny, nx


def _indice(v: float, n: int) -> int:
    return min(n - 1, int(math.floor(v * n)))


def _intervalo(a: float, b: float, n: int) -> tuple[int, int]:
    """Intervalo normalizado -> píxeles [inicio, fin): inicio floor, fin ceil, mínimo 1 píxel."""
    lo, hi = sorted((a, b))
    if lo == hi:
        raise ValueError("El cuadrante no tiene área.")
    i0 = min(n - 1, int(math.floor(lo * n)))
    i1 = max(i0 + 1, min(n, int(math.ceil(hi * n))))
    return i0, i1


@router.post("/escenarios/{id}/medicion", response_model=MedicionDto)
def medicion(id: str, cuerpo: PeticionMedicion, prov: ProveedorDatos = Depends(obtener)) -> MedicionDto:
    _distintas(cuerpo.antes, cuerpo.despues)
    ny, nx = _forma_de_medicion(prov, id, cuerpo.antes, cuerpo.despues)
    cuadrante = punto = None
    if cuerpo.cuadrante is not None:
        x0, y0, x1, y1 = cuerpo.cuadrante
        c0, c1 = _intervalo(x0, x1, nx)
        f0, f1 = _intervalo(y0, y1, ny)
        cuadrante = (f0, f1, c0, c1)
    else:
        x, y = cuerpo.punto
        punto = (_indice(y, ny), _indice(x, nx))
    m = prov.medir(id, cuerpo.antes, cuerpo.despues, cuadrante=cuadrante, punto=punto)
    return MedicionDto(cuadrante=m.cuadrante, punto=m.punto, metricas=m.metricas, tabla=m.tabla,
                       origen=m.origen)
