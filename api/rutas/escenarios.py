"""Tipos de cambio y escenarios (sin datos ráster)."""
from fastapi import APIRouter, Depends

from api.deps import obtener
from api.schemas import ErrorDto
from datos.contrato import CapacidadNoDisponible, Escenario, ProveedorDatos, TipoCambio
from datos.resumen import ComparacionEmbalses, ResumenSitio

router = APIRouter()


def _tipos(prov: ProveedorDatos) -> list[TipoCambio]:
    escenarios = prov.escenarios()
    if escenarios and any(e.capacidades.simulacion for e in escenarios) and hasattr(prov, "tipos"):
        return prov.tipos()
    vistos: dict[str, TipoCambio] = {}
    for e in escenarios:
        vistos.setdefault(e.tipo_cambio, TipoCambio(id=e.tipo_cambio, nombre=e.tipo_cambio))
    return list(vistos.values())


@router.get("/tipos", response_model=list[TipoCambio])
def tipos(prov: ProveedorDatos = Depends(obtener)) -> list[TipoCambio]:
    return _tipos(prov)


@router.get("/escenarios", response_model=list[Escenario])
def escenarios(prov: ProveedorDatos = Depends(obtener)) -> list[Escenario]:
    return prov.escenarios()


@router.get("/escenarios/{id}", response_model=Escenario)
def escenario(id: str, prov: ProveedorDatos = Depends(obtener)) -> Escenario:
    return prov.escenario(id)


def _capacidad(prov: ProveedorDatos, metodo: str):
    f = getattr(prov, metodo, None)
    if f is None:
        raise CapacidadNoDisponible(f"Este proveedor de datos no ofrece «{metodo}».")
    return f


@router.get("/escenarios/{id}/resumen", response_model=ResumenSitio, responses={409: {"model": ErrorDto}})
def resumen(id: str, prov: ProveedorDatos = Depends(obtener)) -> ResumenSitio:
    """Resumen científico de un sitio del equipo: superficies, retrodispersión, ΔRFDI, ficha con fuentes y lecturas."""
    return _capacidad(prov, "resumen")(id)


@router.get("/comparacion/embalses", response_model=ComparacionEmbalses, responses={409: {"model": ErrorDto}})
def comparacion_embalses(prov: ProveedorDatos = Depends(obtener)) -> ComparacionEmbalses:
    """Mazar frente a Daule-Peripa: la misma métrica en cada embalse y el desfase entre sus fechas."""
    return _capacidad(prov, "comparacion_embalses")()
