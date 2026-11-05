"""Laboratorio del radar: radar frente a óptico con nubes, y respuesta por polarización y banda. Sintético."""
from fastapi import APIRouter, Query

from api.rutas.capas import _dto
from api.schemas_laboratorio import NubesDto, RespuestaDto
from datos import laboratorio

router = APIRouter(prefix="/laboratorio")


@router.get("/nubes", response_model=NubesDto)
def nubes(cobertura: float = Query(0, description="Cobertura de nubes, % (0–100)"),
          semilla: int = Query(1, ge=0, le=999)) -> NubesDto:
    r = laboratorio.nubes(cobertura, semilla)
    return NubesDto(**{k: _dto(v) for k, v in r["capas"].items()}, metricas=r["metricas"],
                    porcentaje_radar=r["porcentaje_radar"], porcentaje_optico=r["porcentaje_optico"],
                    cobertura_real=r["cobertura_real"], origen=r["origen"])


@router.get("/respuesta", response_model=RespuestaDto)
def respuesta(banda: str = "L", pol: str = "HH") -> RespuestaDto:
    r = laboratorio.respuesta(banda, pol)
    return RespuestaDto(**{**r, "capa": _dto(r["capa"]), "superficies": _dto(r["superficies"])})
