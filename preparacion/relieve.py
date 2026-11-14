"""Relieve (DEM Copernicus GLO-30), superficie de agua en el DEM y curva nivel-superficie-volumen."""
import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import Resampling, reproject
from scipy import ndimage

from preparacion.disco import comprobar_espacio
from preparacion.rejilla import Rejilla

BASE = "https://copernicus-dem-30m.s3.amazonaws.com"


def teselas_copernicus(bbox: tuple) -> list[str]:
    """URLs de las teselas de 1° (COG, AWS Open Data) que cubren bbox = (oeste, sur, este, norte) en WGS84."""
    oeste, sur, este, norte = bbox
    urls = []
    for lat in range(math.floor(sur), math.ceil(norte)):
        for lon in range(math.floor(oeste), math.ceil(este)):
            nombre = (f"Copernicus_DSM_COG_10_{'S' if lat < 0 else 'N'}{abs(lat):02d}_00_"
                      f"{'W' if lon < 0 else 'E'}{abs(lon):03d}_00_DEM")
            urls.append(f"{BASE}/{nombre}/{nombre}.tif")
    return urls


def _ventana(url: str, bbox: tuple, margen: float = 0.01) -> tuple[np.ndarray, rasterio.Affine]:
    o, s, e, n = bbox
    with rasterio.open(f"/vsicurl/{url}" if url.startswith("http") else url) as d:
        w = d.window(o - margen, s - margen, e + margen, n + margen).round_offsets().round_lengths()
        w = w.intersection(rasterio.windows.Window(0, 0, d.width, d.height))
        return d.read(1, window=w).astype(np.float32), d.window_transform(w)


def dem_en_rejilla(bbox: tuple, destino: Rejilla, crudo: Path) -> np.ndarray:
    """DEM (m) remuestreado bilineal a `destino`. Lee por ventana vía /vsicurl/; si falla, descarga la tesela
    a `crudo/` (tras comprobar el espacio) y la borra al terminar."""
    trozos = []
    for url in teselas_copernicus(bbox):
        try:
            trozos.append(_ventana(url, bbox))
        except Exception:  # sin /vsicurl/ o sin red parcial: descarga la tesela y la borra al acabar
            trozos.append(_ventana_descargando(url, bbox, crudo))
    out = np.full((destino.alto, destino.ancho), np.nan, np.float32)
    for datos, transform in trozos:
        parcial = np.full_like(out, np.nan)
        reproject(datos, parcial, src_transform=transform, src_crs="EPSG:4326", dst_transform=destino.transform,
                  dst_crs=destino.crs, resampling=Resampling.bilinear, src_nodata=None, dst_nodata=np.nan)
        out = np.where(np.isnan(out), parcial, out)
    return out


def _ventana_descargando(url: str, bbox: tuple, crudo: Path):
    import urllib.request
    crudo.mkdir(parents=True, exist_ok=True)
    comprobar_espacio(crudo)
    local = crudo / url.rsplit("/", 1)[-1]
    try:
        urllib.request.urlretrieve(url, local)
        return _ventana(str(local), bbox)
    finally:
        local.unlink(missing_ok=True)


def superficie_agua_dem(dem: np.ndarray, semilla_rc: tuple[int, int], tol_m: float = 0.5) -> tuple[np.ndarray, float]:
    """Región conectada (4 vecinos) a la semilla con cota <= cota(semilla) + tol_m. Devuelve (máscara, cota)."""
    cota = float(dem[semilla_rc])
    etiquetas, _ = ndimage.label(dem <= cota + tol_m)
    et = etiquetas[semilla_rc]
    if et == 0:
        raise ValueError("La semilla no tiene cota válida en el DEM.")
    return etiquetas == et, cota


def _conectada(mascara: np.ndarray, agua: np.ndarray) -> np.ndarray:
    """Partes de `mascara` que tocan el agua."""
    etiquetas, _ = ndimage.label(mascara)
    return np.isin(etiquetas, np.setdiff1d(np.unique(etiquetas[agua]), [0]))


def curva_nivel_superficie(dem: np.ndarray, agua_dem: np.ndarray, area_px_km2: float, paso_m: float = 0.5,
                           subida_max_m: float = 40.0, bajada_max_m: float = 30.0) -> dict:
    """Curva nivel-superficie-volumen. Sobre la cota del agua en el DEM: celdas <= nivel conectadas al agua.
    Bajo ella no hay batimetría: extrapolación ilustrativa (la superficie cae linealmente al 30 % en
    `bajada_max_m`) y volumen relativo negativo. 1 km² por 1 m = 1 hm³."""
    cota = float(np.median(dem[agua_dem]))
    n_sube, n_baja = int(round(subida_max_m / paso_m)), int(round(bajada_max_m / paso_m))
    niveles = [cota + k * paso_m for k in range(-n_baja, n_sube + 1)]

    def sobre(nivel: float) -> tuple[float, float]:
        m = _conectada((dem <= nivel) | agua_dem, agua_dem)
        prof = np.clip(nivel - dem[m], 0, None)
        return float(m.sum() * area_px_km2), float(prof.sum() * area_px_km2)

    s0 = sobre(cota)[0]
    superficie, volumen, extrapolado = [], [], []
    for nivel in niveles:
        if nivel >= cota:
            s, v = sobre(nivel)
            ex = False
        else:
            s = s0 * (1 - 0.7 * (cota - nivel) / bajada_max_m)
            ex = True
            v = None
        superficie.append(s)
        volumen.append(v)
        extrapolado.append(ex)
    # Bajo la cota: V(nivel) = -integral de S entre nivel y cota (trapecios), siempre negativo.
    acumulado = 0.0
    for i in range(n_baja - 1, -1, -1):
        acumulado += 0.5 * (superficie[i] + superficie[i + 1]) * paso_m
        volumen[i] = -acumulado
    return {"cota_dem_m": cota, "niveles_m": niveles, "superficie_km2": superficie, "volumen_hm3": volumen,
            "extrapolado": extrapolado}
