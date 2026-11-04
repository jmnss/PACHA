"""Contexto climático de un punto. Única ruta de la API que usa `modelo/` (datos reales complementarios)."""
from datetime import date, datetime, timezone

from fastapi import APIRouter, Query

from api.schemas import ContextoDto
from datos.contrato import Origen
from modelo import estaciones

router = APIRouter()

FUENTE = "NASA POWER (climatología 2001–2025) y geoBoundaries"
NOTAS = "Contexto climático real complementario; no es una observación de NISAR."


def _origen() -> Origen:
    return Origen(tipo="real", fuente=FUENTE, fecha_generacion=datetime.now(timezone.utc), notas=NOTAS)


@router.get("/contexto", response_model=ContextoDto | None)
def contexto(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180),
             fecha: date | None = None) -> ContextoDto | None:
    dia = fecha or datetime.now(timezone.utc).date()
    r = estaciones.resumen(lat, lon, dia)
    if r is None:
        return None
    clim = r["climatologia"]
    return ContextoDto(
        origen=_origen(), lat=lat, lon=lon, fecha=dia, mes_actual=dia.month,
        region=r["region"], provincia=r["provincia"], estacion_astronomica=r["astronomia"],
        temporada=r["temporada"], humedad_suelo=float(r["humedad_suelo"]),
        elevacion_malla_m=float(clim.elev_malla_m), metodo_climatologia=clim.metodo,
        clima_mensual=estaciones.tabla_mensual(clim).to_dict("records"))
