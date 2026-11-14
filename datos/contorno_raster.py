"""Rasteriza un contorno GeoJSON (lon/lat WGS84) sobre una rejilla UTM, solo con numpy.

`datos/` no puede usar rasterio ni shapely (no están en Pyodide): la proyección UTM (series de Krüger, error de
milímetros) y el relleno de polígonos por barrido (regla par-impar, sobre los centros de píxel) se hacen aquí.
"""
from __future__ import annotations

import math

import numpy as np

_A = 6378137.0
_F = 1 / 298.257223563
_K0 = 0.9996


def lonlat_a_utm(lon, lat, epsg: int) -> tuple[np.ndarray, np.ndarray]:
    """WGS84 (grados) → (este, norte) en metros del EPSG UTM 326zz (norte) o 327zz (sur)."""
    if not (32601 <= epsg <= 32660 or 32701 <= epsg <= 32760):
        raise ValueError(f"EPSG {epsg} no es una zona UTM WGS84")
    zona, sur = epsg % 100, epsg >= 32700
    n = _F / (2 - _F)
    A = _A / (1 + n) * (1 + n ** 2 / 4 + n ** 4 / 64)
    alfa = (n / 2 - 2 * n ** 2 / 3 + 5 * n ** 3 / 16 + 41 * n ** 4 / 180,
            13 * n ** 2 / 48 - 3 * n ** 3 / 5 + 557 * n ** 4 / 1440,
            61 * n ** 3 / 240 - 103 * n ** 4 / 140,
            49561 * n ** 4 / 161280)
    phi = np.radians(np.asarray(lat, np.float64))
    dl = np.radians(np.asarray(lon, np.float64) - ((zona - 1) * 6 - 180 + 3))
    q = 2 * math.sqrt(n) / (1 + n)
    t = np.sinh(np.arctanh(np.sin(phi)) - q * np.arctanh(q * np.sin(phi)))
    xi = np.arctan2(t, np.cos(dl))
    eta = np.arctanh(np.sin(dl) / np.sqrt(1 + t * t))
    este = 500000.0 + _K0 * A * (eta + sum(a * np.cos(2 * j * xi) * np.sinh(2 * j * eta)
                                           for j, a in enumerate(alfa, 1)))
    norte = (10_000_000.0 if sur else 0.0) + _K0 * A * (xi + sum(a * np.sin(2 * j * xi) * np.cosh(2 * j * eta)
                                                                 for j, a in enumerate(alfa, 1)))
    return este, norte


def _anillos(gj: dict) -> list[list]:
    """Todos los anillos (exteriores y huecos) de un GeoJSON de polígonos."""
    geoms = []
    if gj.get("type") == "FeatureCollection":
        geoms = [f.get("geometry") for f in gj.get("features", [])]
    elif gj.get("type") == "Feature":
        geoms = [gj.get("geometry")]
    else:
        geoms = [gj]
    anillos: list[list] = []
    for g in geoms:
        if not g:
            continue
        if g.get("type") == "Polygon":
            anillos += g["coordinates"]
        elif g.get("type") == "MultiPolygon":
            for poligono in g["coordinates"]:
                anillos += poligono
    return anillos


def rasterizar_contorno(gj: dict, epsg: int, transform: list[float], forma: tuple[int, int]) -> np.ndarray:
    """Máscara bool (alto, ancho): True si el centro del píxel cae dentro del contorno (par-impar).
    `transform` = [a, b, c, d, e, f] afín de la rejilla sin rotación (b = d = 0)."""
    alto, ancho = forma
    a, b, c, d, e, f = transform[:6]
    if b != 0 or d != 0 or a == 0 or e == 0:
        raise ValueError("la rejilla debe ir alineada con los ejes")
    dentro = np.zeros((alto, ancho), bool)
    ax, ay, bx, by = [], [], [], []
    for anillo in _anillos(gj):
        pts = np.asarray(anillo, np.float64)
        if len(pts) < 3:
            continue
        x, y = lonlat_a_utm(pts[:, 0], pts[:, 1], epsg)
        col, fila = (x - c) / a, (y - f) / e  # coordenadas de píxel; el centro del píxel i está en i + 0.5
        ax.append(col[:-1]); ay.append(fila[:-1]); bx.append(col[1:]); by.append(fila[1:])
    if not ax:
        return dentro
    x1, y1, x2, y2 = (np.concatenate(v) for v in (ax, ay, bx, by))
    centros = np.arange(ancho) + 0.5
    for i in range(alto):
        yc = i + 0.5
        cruza = (y1 <= yc) != (y2 <= yc)
        if not cruza.any():
            continue
        xs = np.sort(x1[cruza] + (yc - y1[cruza]) * (x2[cruza] - x1[cruza]) / (y2[cruza] - y1[cruza]))
        dentro[i] = np.searchsorted(xs, centros, side="right") % 2 == 1
    return dentro
