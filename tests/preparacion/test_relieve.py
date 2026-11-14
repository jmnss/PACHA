"""Relieve: teselas Copernicus, superficie de agua en el DEM y curva nivel-superficie (sin red)."""
import numpy as np

from preparacion.relieve import curva_nivel_superficie, superficie_agua_dem, teselas_copernicus

ALTO, ANCHO = 100, 200


def dem_canon() -> np.ndarray:
    """Cañón en V: el fondo (cota 100 m) sube 1 m por columna de distancia al eje (columna 100)."""
    cols = np.abs(np.arange(ANCHO) - 100).astype(np.float32)
    dem = np.tile(100.0 + cols, (ALTO, 1)).astype(np.float32)
    return dem


def test_superficie_agua_dem_conectada():
    dem = dem_canon()
    dem[:, :] = 150.0
    dem[40:60, 20:60] = 100.0   # depresión con la semilla
    dem[40:60, 120:160] = 100.0  # otra a la misma cota, no conectada
    mascara, cota = superficie_agua_dem(dem, (50, 40), tol_m=0.5)
    assert cota == 100.0
    assert mascara[50, 40] and mascara[40:60, 20:60].all()
    assert not mascara[40:60, 120:160].any()
    assert mascara.sum() == 20 * 40


def test_curva_monotona():
    dem = dem_canon()
    agua, cota = superficie_agua_dem(dem, (50, 100), tol_m=0.5)
    c = curva_nivel_superficie(dem, agua, area_px_km2=1e-4)
    assert c["cota_dem_m"] == cota
    s, v, n, ex = (np.array(c[k]) for k in ("superficie_km2", "volumen_hm3", "niveles_m", "extrapolado"))
    assert len(s) == len(v) == len(n) == len(ex) > 10
    assert (np.diff(n) > 0).all()
    assert (np.diff(s) >= 0).all() and s[-1] > s[0]
    assert (np.diff(v) > 0).all()
    assert (ex == (n < c["cota_dem_m"])).all()
    assert ex.any() and (~ex).any()


def test_curva_extrapola_a_30_por_ciento():
    dem = dem_canon()
    agua, _ = superficie_agua_dem(dem, (50, 100))
    c = curva_nivel_superficie(dem, agua, 1e-4, bajada_max_m=30.0)
    s = np.array(c["superficie_km2"])
    i0 = int(np.argmin(np.abs(np.array(c["niveles_m"]) - c["cota_dem_m"])))
    assert abs(s[0] - 0.3 * s[i0]) < 1e-9


def test_teselas_copernicus_mazar():
    urls = teselas_copernicus((-78.74, -2.80, -78.55, -2.55))
    assert any("S03_00_W079_00" in u for u in urls)
    assert all(u.startswith("https://copernicus-dem-30m.s3.amazonaws.com/") and u.endswith("_DEM.tif") for u in urls)
    assert len(urls) == 1


def test_teselas_hemisferio_norte():
    urls = teselas_copernicus((10.2, 0.1, 10.5, 0.4))
    assert len(urls) == 1 and "N00_00_E010_00" in urls[0]


def test_curva_agua_sin_cota_valida():
    import numpy as np
    import pytest
    from preparacion.relieve import curva_nivel_superficie
    dem = np.full((4, 4), np.nan, np.float32)
    with pytest.raises(ValueError):
        curva_nivel_superficie(dem, np.ones((4, 4), bool), 0.001)
