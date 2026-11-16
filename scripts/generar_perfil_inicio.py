"""Perfil de Inicio desde Copernicus DEM GLO-30 (fuera de línea; no lo importa la app).

Corte por tramos rectos que pasa por los tres sitios del equipo: mar frente a la Costa → Daule-Peripa → Casitagua →
Mazar → Amazonía. Lee cada tesela COG de 1° de AWS Open Data por `/vsicurl/` en su vista general más reducida
(1/8, ~240 m), sin bajar teselas enteras; muestrea cada `PASO_KM` con interpolación bilineal y redondea al metro.
Salida: `frontend/src/pantallas/inicio/perfil.json` (< 50 KB) con su fuente.

Uso: python scripts/generar_perfil_inicio.py
"""
from __future__ import annotations

import json
import math
from datetime import date
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Geod

BASE = "https://copernicus-dem-30m.s3.amazonaws.com"
SALIDA = Path(__file__).resolve().parents[1] / "frontend/src/pantallas/inicio/perfil.json"
PASO_KM = 1.0
NIVEL_VISTA = 2          # índice de la vista general: 0 → 1/2, 1 → 1/4, 2 → 1/8
COTA_SIERRA_M = 1000     # criterio de dibujo para situar los rótulos de región (no es un límite oficial)

# Vértices del corte (lon, lat). Los sitios son un punto interior (`representative_point`) del contorno de análisis
# del equipo (data/<tema>/<sitio>/contorno.geojson), para que el corte pase por el agua o el área marcada y no por una
# ladera del recuadro. Los extremos: unos 25 km mar adentro frente a la Costa (la costa a −0,80° está en −80,52°) y
# −77,0° en la Amazonía (la frontera a −2,68° está en −76,89°, geoBoundaries de data/ecuador_provincias.geojson).
VERTICES = [
    ("mar", -80.75, -0.80),
    ("daule", -79.6125, -0.8453),
    ("casitagua", -78.4614, -0.0357),
    ("mazar", -78.6185, -2.6699),
    ("amazonia", -77.00, -2.6699),
]

_GEOD = Geod(ellps="WGS84")


def _nombre_tesela(lat0: int, lon0: int) -> str:
    return (f"Copernicus_DSM_COG_10_{'S' if lat0 < 0 else 'N'}{abs(lat0):02d}_00_"
            f"{'W' if lon0 < 0 else 'E'}{abs(lon0):03d}_00_DEM")


class Teselas:
    """Caché de teselas leídas en su vista general (una lectura por tesela)."""

    def __init__(self) -> None:
        self._c: dict[tuple[int, int], tuple[np.ndarray, rasterio.Affine] | None] = {}

    def _tesela(self, lat0: int, lon0: int):
        k = (lat0, lon0)
        if k not in self._c:
            n = _nombre_tesela(lat0, lon0)
            try:
                with rasterio.open(f"/vsicurl/{BASE}/{n}/{n}.tif", overview_level=NIVEL_VISTA) as d:
                    self._c[k] = (d.read(1).astype(np.float32), d.transform)
            except rasterio.errors.RasterioIOError:
                self._c[k] = None   # sin tesela: océano abierto
        return self._c[k]

    def cota(self, lon: float, lat: float) -> float:
        t = self._tesela(math.floor(lat), math.floor(lon))
        if t is None:
            return 0.0
        datos, tr = t
        col, fila = ~tr * (lon, lat)
        c, f = col - 0.5, fila - 0.5
        c0, f0 = int(np.clip(math.floor(c), 0, datos.shape[1] - 2)), int(np.clip(math.floor(f), 0, datos.shape[0] - 2))
        dc, df = float(np.clip(c - c0, 0, 1)), float(np.clip(f - f0, 0, 1))
        v = datos[f0:f0 + 2, c0:c0 + 2]
        return float(v[0, 0] * (1 - dc) * (1 - df) + v[0, 1] * dc * (1 - df) + v[1, 0] * (1 - dc) * df + v[1, 1] * dc * df)


def main() -> None:
    teselas = Teselas()
    alturas: list[int] = []
    vertices = []
    km_total = 0.0
    for (n1, lon1, lat1), (n2, lon2, lat2) in zip(VERTICES, VERTICES[1:]):
        if not vertices:
            vertices.append({"id": n1, "lon": lon1, "lat": lat1, "km": 0.0})
        _, _, largo_m = _GEOD.inv(lon1, lat1, lon2, lat2)
        n = max(1, round(largo_m / 1000 / PASO_KM))
        puntos = _GEOD.npts(lon1, lat1, lon2, lat2, n - 1)   # intermedios geodésicos
        tramo = [(lon1, lat1), *puntos]
        alturas.extend(max(0, round(teselas.cota(lo, la))) for lo, la in tramo)
        km_total += n * PASO_KM
        vertices.append({"id": n2, "lon": lon2, "lat": lat2, "km": round(km_total, 1)})
    alturas.append(max(0, round(teselas.cota(VERTICES[-1][1], VERTICES[-1][2]))))

    a = np.array(alturas)
    costa_km = float(np.argmax(a > 0)) * PASO_KM
    sobre = np.flatnonzero(a >= COTA_SIERRA_M)
    sierra = [float(sobre[0]) * PASO_KM, float(sobre[-1]) * PASO_KM]
    lugares = {v["id"]: {"km": v["km"], "altura_m": int(a[round(v["km"] / PASO_KM)])}
               for v in vertices if v["id"] in ("daule", "casitagua", "mazar")}
    salida = {
        "fuente": {
            "nombre": "Copernicus DEM GLO-30 (ESA; AWS Open Data)",
            "url": "https://registry.opendata.aws/copernicus-dem/",
            "licencia": "© DLR e.V. 2010-2014 y © Airbus Defence and Space GmbH 2014-2018, proporcionado bajo "
                        "COPERNICUS por la Unión Europea y la ESA; todos los derechos reservados",
            "consulta": date.today().isoformat(),
            "metodo": f"vista general 1/8 de las teselas COG (~240 m), interpolación bilineal cada {PASO_KM:g} km "
                      "a lo largo de tramos geodésicos; alturas en m redondeadas (el mar, a 0)",
        },
        "paso_km": PASO_KM,
        "largo_km": round(km_total, 1),
        "vertices": vertices,
        "lugares": lugares,
        "costa_km": costa_km,
        "sierra_km": sierra,
        "cota_sierra_m": COTA_SIERRA_M,
        "max_m": int(a.max()),
        "alturas_m": alturas,
    }
    SALIDA.write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{SALIDA} · {SALIDA.stat().st_size / 1024:.1f} KB · {len(alturas)} puntos · máx {a.max()} m · "
          f"lugares {lugares} · costa {costa_km} km · sierra {sierra}")


if __name__ == "__main__":
    main()
