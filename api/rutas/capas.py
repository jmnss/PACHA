"""Capas ráster, resultado de cambio y mediciones."""
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


def _pixel(v: float, n: int) -> int:
    return min(n, max(0, int(round(v * n))))


@router.post("/escenarios/{id}/medicion", response_model=MedicionDto)
def medicion(id: str, cuerpo: PeticionMedicion, prov: ProveedorDatos = Depends(obtener)) -> MedicionDto:
    _distintas(cuerpo.antes, cuerpo.despues)
    esc = prov.escenario(id)
    # Tamaño de la rejilla COMPLETA (no la reducida) para convertir 0–1 a píxeles del contrato.
    ref = prov.capa(id, cuerpo.antes, esc.variables[0], esc.polarizaciones[0] if esc.polarizaciones else None)
    ny, nx = ref.datos.shape
    cuadrante = punto = None
    if cuerpo.cuadrante is not None:
        x0, y0, x1, y1 = cuerpo.cuadrante
        c0, c1 = sorted((_pixel(x0, nx), _pixel(x1, nx)))
        f0, f1 = sorted((_pixel(y0, ny), _pixel(y1, ny)))
        if c1 <= c0 or f1 <= f0:
            raise ValueError("El cuadrante no tiene área.")
        cuadrante = (f0, f1, c0, c1)
    else:
        x, y = cuerpo.punto
        punto = (min(ny - 1, _pixel(y, ny)), min(nx - 1, _pixel(x, nx)))
    m = prov.medir(id, cuerpo.antes, cuerpo.despues, cuadrante=cuadrante, punto=punto)
    return MedicionDto(cuadrante=m.cuadrante, punto=m.punto, metricas=m.metricas, tabla=m.tabla,
                       origen=m.origen)
