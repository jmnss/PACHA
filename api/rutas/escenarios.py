"""Tipos de cambio y escenarios (sin datos ráster)."""
from fastapi import APIRouter, Depends

from api.deps import obtener
from datos.contrato import Escenario, ProveedorDatos, TipoCambio

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
