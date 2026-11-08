"""Capas ráster, resultado de cambio y mediciones."""
import math

from fastapi import APIRouter, Depends, Query
from pydantic import ValidationError

from api.deps import obtener
from api.encoding import a_rejilla
from api.schemas import (CapaDto, MedicionDto, PeticionCambio, PeticionMedicion,
                         PeticionSerieSeleccion, ResultadoCambioDto)
from datos.contrato import (CapaRaster, CapacidadNoDisponible, EntradaNoValida, ProveedorDatos,
                            SerieTemporal)

router = APIRouter()


def _dto(capa: CapaRaster) -> CapaDto:
    return CapaDto(
        escenario_id=capa.escenario_id, adquisicion_id=capa.adquisicion_id, variable=capa.variable,
        polarizacion=capa.polarizacion, unidad=capa.unidad, paleta=capa.paleta, leyenda=capa.leyenda,
        instante=capa.instante, rejilla=a_rejilla(capa), origen=capa.origen)


def _distintas(antes: str, despues: str) -> None:
    if antes == despues:
        raise EntradaNoValida.con("api.error.fechas_distintas")


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
        raise EntradaNoValida.con("api.error.cuadrante_sin_area")
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


def _numeros(texto: str | None, n: int, nombre: str) -> tuple[float, ...] | None:
    """`"0.5,0.5"` -> (0.5, 0.5); `None` si no se pidió. Error 422 con clave si no son `n` números."""
    if texto is None:
        return None
    try:
        v = tuple(float(t) for t in texto.split(","))
    except ValueError:
        v = ()
    if len(v) != n or not all(math.isfinite(x) for x in v):
        raise EntradaNoValida.con("api.error.serie_sel_formato", nombre=nombre, n=n)
    return v


@router.get("/escenarios/{id}/serie-seleccion", response_model=SerieTemporal | None)
def serie_seleccion(id: str, punto: str | None = None, cuadrante: str | None = None,
                    prov: ProveedorDatos = Depends(obtener)) -> SerieTemporal | None:
    """Evolución del observable en un punto y/o cuadrante (coordenadas normalizadas 0–1)."""
    try:
        pet = PeticionSerieSeleccion(punto=_numeros(punto, 2, "punto"), cuadrante=_numeros(cuadrante, 4, "cuadrante"))
    except ValidationError:
        raise EntradaNoValida.con("api.error.serie_sel_rango") from None
    if not hasattr(prov, "serie_seleccion"):
        raise CapacidadNoDisponible("Este proveedor de datos no ofrece la serie de una selección.")
    esc = prov.escenario(id)
    pol = esc.polarizaciones[0] if esc.polarizaciones else None
    ny, nx = prov.capa(id, esc.adquisiciones[0].id, esc.variables[0], pol).datos.shape
    cuad = pt = None
    if pet.cuadrante is not None:
        x0, y0, x1, y1 = pet.cuadrante
        c0, c1 = _intervalo(x0, x1, nx)
        f0, f1 = _intervalo(y0, y1, ny)
        cuad = (f0, f1, c0, c1)
    if pet.punto is not None:
        x, y = pet.punto
        pt = (_indice(y, ny), _indice(x, nx))
    return prov.serie_seleccion(id, cuadrante=cuad, punto=pt)
