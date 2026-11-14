"""Resumen de impacto de un escenario (inundación o incendio)."""
from fastapi import APIRouter, Depends, Query

from api.deps import obtener
from api.rutas.capas import _distintas, _dto
from api.schemas_impacto import ImpactoDto
from datos import impacto
from datos.contrato import ProveedorDatos

router = APIRouter()


@router.get("/escenarios/{id}/impacto", response_model=ImpactoDto)
def resumen_impacto(id: str, antes: str = Query(...), despues: str = Query(...), polarizacion: str | None = None,
                    prov: ProveedorDatos = Depends(obtener)) -> ImpactoDto:
    _distintas(antes, despues)
    r = impacto.resumen(prov, id, antes, despues, polarizacion)
    return ImpactoDto(**{**r, "capa": _dto(r["capa"])})
