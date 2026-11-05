"""Simulador de eventos: mundos, eventos físicos y ciudades. Sintético por naturaleza (no usa el proveedor)."""
from fastapi import APIRouter

from api.rutas.capas import _dto
from api.schemas_simulador import CatalogoDto, EventoDto, MundoDto, PeticionCiudad
from datos import simulador
from datos.simulador import PeticionEvento, PeticionMundo

router = APIRouter(prefix="/simulador")


@router.get("/catalogo", response_model=CatalogoDto)
def catalogo_simulador() -> dict:
    return simulador.catalogo()


@router.post("/mundo", response_model=MundoDto)
def crear_mundo(cuerpo: PeticionMundo) -> dict:
    return simulador.crear(cuerpo)[1]


@router.post("/evento", response_model=EventoDto)
def desatar_evento(cuerpo: PeticionEvento) -> dict:
    ev = dict(simulador.desatar(cuerpo))
    ev["paneles"] = [_dto(p) for p in ev["paneles"]]
    return ev


@router.post("/ciudad", response_model=PeticionMundo)
def fundar_ciudad(cuerpo: PeticionCiudad) -> PeticionMundo:
    i, j = cuerpo.celda
    return simulador.fundar_ciudad(cuerpo.mundo, i, j, cuerpo.nombre, cuerpo.habitantes)
