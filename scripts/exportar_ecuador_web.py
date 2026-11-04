"""Exporta el mapa base local del frontend: frontend/src/mapa/ecuador.geojson.

Lee data/ecuador_provincias.geojson (geoBoundaries gbOpen ECU ADM1, CC0) y escribe una FeatureCollection
simplificada (< 300 KB) con tres tipos de elemento, distinguibles por `properties.capa`:
  - "provincia": una por provincia (propiedades: nombre, region natural);
  - "contorno": la frontera del país (continente y Galápagos);
  - "exterior": polígono que cubre todo lo que NO es Ecuador (para atenuarlo).
Es un script offline y reproducible: `python scripts/exportar_ecuador_web.py`. Usa shapely (ya instalado
para el núcleo) y modelo/estaciones.py solo aquí; el frontend no depende de nada externo para dibujar.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from shapely.geometry import mapping, shape  # noqa: E402

from modelo import estaciones  # noqa: E402

SALIDA = RAIZ / "frontend" / "src" / "mapa" / "ecuador.geojson"
LIMITE_BYTES = 300 * 1024
TOLERANCIA_PROVINCIAS = 0.004   # grados (~450 m)
DECIMALES = 4                   # ~11 m


def redondear(coords):
    if isinstance(coords[0], (int, float)):
        return [round(c, DECIMALES) for c in coords]
    return [redondear(c) for c in coords]


def geometria(g) -> dict:
    m = mapping(g)
    return {"type": m["type"], "coordinates": redondear(m["coordinates"])}


def main() -> None:
    entrada = estaciones.provincias_geojson()
    features = []
    for f in entrada["features"]:
        g = shape(f["geometry"]).simplify(TOLERANCIA_PROVINCIAS, preserve_topology=True)
        features.append({
            "type": "Feature",
            "properties": {"capa": "provincia", "nombre": f["properties"]["provincia"], "region": f["properties"]["region"]},
            "geometry": geometria(g),
        })
    contorno = estaciones.contorno_geojson()
    exterior = estaciones.mascara_exterior_geojson()
    features.append({"type": "Feature", "properties": {"capa": "contorno"}, "geometry": geometria(shape(contorno["geometry"]))})
    features.append({"type": "Feature", "properties": {"capa": "exterior"}, "geometry": geometria(shape(exterior["geometry"]))})
    texto = json.dumps(
        {"type": "FeatureCollection", "fuente": entrada.get("fuente", ""), "features": features},
        ensure_ascii=False, separators=(",", ":"),
    )
    if len(texto.encode()) >= LIMITE_BYTES:
        raise SystemExit(f"El GeoJSON pesa {len(texto.encode())} bytes (límite {LIMITE_BYTES}).")
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(texto, encoding="utf-8")
    print(f"{SALIDA.relative_to(RAIZ)}: {len(texto.encode()) / 1024:.0f} KB, {len(features)} elementos")


if __name__ == "__main__":
    main()
