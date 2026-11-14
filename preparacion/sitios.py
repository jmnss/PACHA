"""Sitios de estudio (embalses e incendios): caja, semilla y clases por defecto."""
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal


@dataclass(frozen=True)
class Sitio:
    sitio: str
    tipo: Literal["embalse", "incendio"]
    nombre: str
    region: str
    bbox: tuple[float, float, float, float]  # oeste, sur, este, norte (WGS84)
    semilla: tuple[float, float]  # lat, lon
    epsg: int
    clases_defecto: dict[str, str]


def cargar_sitios() -> dict[str, Sitio]:
    crudo = json.loads((Path(__file__).with_name("sitios.json")).read_text(encoding="utf-8"))
    return {s["sitio"]: Sitio(**{**s, "bbox": tuple(s["bbox"]), "semilla": tuple(s["semilla"])}) for s in crudo}
