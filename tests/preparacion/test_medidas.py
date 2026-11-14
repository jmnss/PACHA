import numpy as np
import pytest
from affine import Affine
from rasterio.transform import from_origin

from preparacion.entrada import Raster
from preparacion.medidas import contorno, contorno_a_geojson, geojson_a_mascara, superficie_km2
from preparacion.rejilla import Rejilla

X0, Y0 = 750000.0, 9700000.0


def test_superficie_en_rejilla_original():
    d = np.zeros((500, 500), np.uint8)
    d.ravel()[:141716] = 1
    r = Raster(d, from_origin(X0, Y0, 10, 10), "EPSG:32717")
    assert superficie_km2(r, 1, None) == pytest.approx(14.1716, abs=1e-6)
    r2 = Raster(d, Affine(10.063, 0, X0, 0, -9.950, Y0), "EPSG:32717")
    assert superficie_km2(r2, 1, None) == pytest.approx(141716 * 10.063 * 9.950 / 1e6, abs=1e-6)
    dentro = np.zeros(d.shape, bool)
    dentro[:100] = True
    assert superficie_km2(r, 1, dentro) == pytest.approx(int(d[:100].sum()) * 100 / 1e6)


def _ref():
    return Rejilla(from_origin(X0, Y0, 10.0, 10.0), 400, 400)


def test_contorno_descarta_manchas_pequenas():
    ref = _ref()
    m = np.zeros((400, 400), np.uint8)
    m[50:100, 50:100] = 1  # 2500 px = 25 ha
    rng = np.random.default_rng(0)
    centros = []
    while len(centros) < 50:
        j, i = rng.integers(2, 398, 2)
        if all(max(abs(j - a), abs(i - b)) > 25 for a, b in centros) and (j > 130 or i > 130):
            centros.append((j, i))
    for j, i in centros:
        m[j:j + 2, i:i + 2] = 1
    m[3:8, 300:310] = 1  # 50 px = 0,5 ha (a mano, lejos)
    c = contorno([m], ref, 1, 10, 150)
    assert c[50:100, 50:100].all()
    for j, i in centros:
        assert not c[j:j + 2, i:i + 2].any()
    assert c[:, :].sum() > 2500 and c[100 + 14, 70]  # margen de 150 m = 15 px


def test_contorno_union_de_fechas():
    ref = _ref()
    a, b = np.zeros((400, 400), np.uint8), np.zeros((400, 400), np.uint8)
    a[10:50, 10:50] = 1
    b[300:340, 300:340] = 1
    c = contorno([a, b], ref)
    assert c[30, 30] and c[320, 320] and not c[200, 200]


def test_geojson_ida_y_vuelta():
    ref = _ref()
    c = np.zeros((400, 400), bool)
    c[100:200, 100:250] = True
    gj = contorno_a_geojson(c, ref)
    geoms = gj["features"][0]["geometry"]
    assert geoms["type"] == "MultiPolygon"
    lon, lat = geoms["coordinates"][0][0][0]
    assert -82 < lon < -75 and -5 < lat < 2
    vuelta = geojson_a_mascara(gj, ref)
    assert (vuelta & c).sum() / c.sum() > 0.97 and (vuelta | c).sum() / c.sum() < 1.03
