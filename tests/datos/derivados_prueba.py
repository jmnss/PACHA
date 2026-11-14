"""Genera en una carpeta de prueba un sitio de derivados (formato de la Tarea 5) sin rasterio: solo numpy y json.

La procedencia que escribe es SINTÉTICA DE PRUEBA y completa; no representa ningún granulo real de NISAR.
"""
import json
from pathlib import Path

import numpy as np

FORMA = (30, 40)
TRANSFORM = [30.0, 0.0, 751240.0, 0.0, -30.0, 9717930.0]  # UTM 17S; el centro de la rejilla es lon -78.73513, lat -2.55402
BBOX = [-78.7400, -2.5600, -78.7300, -2.5500]
CENTRO = (-78.73513, -2.55402)
LEYENDAS = {"embalse": [["agua", "#2a6fb0"], ["no agua", "#6f6d7a"]],
            "incendio": [["quemado", "#6b4a3a"], ["no quemado", "#6f6d7a"]]}


def mascara_con_celdas(celdas, forma=FORMA) -> np.ndarray:
    """Códigos del contrato: 1 = clase en las celdas (índices planos, `range` o lista), 2 = resto."""
    m = np.full(forma[0] * forma[1], 2, np.uint8)
    m[list(celdas)] = 1
    return m.reshape(forma)


def procedencia_prueba(fecha: str) -> dict:
    return {"producto": "GCOV de prueba", "coleccion": "NISAR_L2_GCOV_BETA_V1 (prueba)", "granulos": [f"granulo-prueba-{fecha}"],
            "fecha_adquisicion_utc": f"{fecha}T11:30:00Z", "polarizaciones": ["HH", "HV"], "frecuencia": "A",
            "madurez": "BETA", "autor": "pruebas", "fecha_proceso": "2026-11-14"}


def rectangulo_lonlat(oeste, sur, este, norte) -> dict:
    anillo = [[oeste, sur], [este, sur], [este, norte], [oeste, norte], [oeste, sur]]
    return {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [anillo]}}]}


def escribir_sitio_prueba(raiz: Path, sitio: str = "lago", tipo: str = "embalse", fechas: list[dict] | None = None,
                          contorno: dict | None = None) -> Path:
    """`fechas`: dicts con `fecha` (AAAA-MM-DD), `mascara` (uint8, códigos 0/1/2), `procedencia` (bool, por defecto
    True), `stack` (bool) y `superficie_km2`. Devuelve la carpeta del sitio (`raiz/embalses|incendios/<sitio>`)."""
    carpeta = Path(raiz) / ("embalses" if tipo == "embalse" else "incendios") / sitio
    carpeta.mkdir(parents=True, exist_ok=True)
    if fechas is None:
        fechas = [{"fecha": "2026-10-29", "mascara": mascara_con_celdas(range(100)), "stack": True},
                  {"fecha": "2026-11-10", "mascara": mascara_con_celdas(range(40, 120)), "stack": True},
                  {"fecha": "2026-11-22", "mascara": mascara_con_celdas(range(60, 150)), "procedencia": False}]
    rangos = {"HH": [-25.0, 0.0], "HV": [-30.0, -5.0]}
    filas = []
    for f in fechas:
        compacta = f["fecha"].replace("-", "")
        m = np.asarray(f["mascara"], np.uint8)
        arrays = {"mascara": m}
        if f.get("stack"):
            rng = np.random.default_rng(int(compacta))
            arrays["HH"] = rng.integers(1, 256, m.shape).astype(np.uint8)
            arrays["HV"] = rng.integers(0, 256, m.shape).astype(np.uint8)  # 0 = sin dato
        np.savez_compressed(carpeta / f"{compacta}.npz", **arrays)
        con_prov = f.get("procedencia", True)
        prov = procedencia_prueba(f["fecha"]) if con_prov else None
        pixel_km2 = abs(TRANSFORM[0] * TRANSFORM[4]) / 1e6
        filas.append({"fecha": f["fecha"], "archivo": f"{compacta}.npz",
                      "instante": prov["fecha_adquisicion_utc"] if prov else None,
                      "superficie_km2": {LEYENDAS[tipo][0][0]: f.get("superficie_km2", round(float((m == 1).sum()) * pixel_km2, 4))},
                      "procedencia": prov, "procedencia_completa": con_prov, "faltan": [] if con_prov else ["procedencia.json"],
                      "stack": rangos if f.get("stack") else None})
    (carpeta / "contorno.geojson").write_text(json.dumps(contorno or rectangulo_lonlat(-78.75, -2.57, -78.72, -2.54)))
    (carpeta / "sitio.json").write_text(json.dumps({
        "version": 1, "sitio": sitio, "tipo": tipo, "nombre": f"Sitio de prueba {sitio}", "region": "Región de prueba",
        "epsg": 32717, "transform": TRANSFORM, "forma": list(FORMA), "resolucion_m": 30.0, "bbox": BBOX,
        "leyenda": LEYENDAS[tipo], "fechas": filas, "contorno": "contorno.geojson", "dem": None, "curva": None,
        "fecha_preparacion": "2026-11-14T19:25:40Z"}))
    return carpeta
