import numpy as np
import pytest
from affine import Affine
from rasterio.transform import from_origin
from rasterio.warp import Resampling, calculate_default_transform, reproject

from preparacion.entrada import Raster
from preparacion.rejilla import (Rejilla, rejilla_derivados, rejilla_referencia, reducir_categorica,
                                 reducir_continua, remuestrear_categorica)
from preparacion.sitios import cargar_sitios

X0, Y0 = 750000.0, 9700000.0


def _ref(ancho=100, alto=100):
    return Rejilla(from_origin(X0, Y0, 10.0, 10.0), ancho, alto)


def test_remuestreo_rejilla_no_cuadrada():
    # píxel 10,063 × 9,950 m desplazado 2 m; bloque de agua de 100 × 100 m en (x 300..400, y 300..400 desde el origen)
    tr = Affine(10.063, 0, X0 + 2.0, 0, -9.950, Y0 - 2.0)
    datos = np.zeros((100, 100), np.uint8)
    for j in range(100):
        for i in range(100):
            x, y = X0 + 2.0 + (i + 0.5) * 10.063, Y0 - 2.0 - (j + 0.5) * 9.950
            if X0 + 300 <= x < X0 + 400 and Y0 - 400 <= y < Y0 - 300:
                datos[j, i] = 1
    out = remuestrear_categorica(Raster(datos, tr, "EPSG:32717"), _ref())
    filas, cols = np.where(out == 1)
    assert abs((filas.max() - filas.min() + 1) - 10) <= 1
    assert abs((cols.max() - cols.min() + 1) - 10) <= 1
    assert abs(cols.min() - 30) <= 1 and abs(filas.min() - 30) <= 1


def test_remuestreo_desde_utm18():
    ref = _ref()
    datos = np.zeros((100, 100), np.uint8)
    datos[30:60, 20:70] = 1
    tr18, w, h = calculate_default_transform("EPSG:32717", "EPSG:32718", 100, 100, *ref.transform * (0, 100),
                                             *ref.transform * (100, 0), resolution=10)
    d18 = np.full((h, w), 255, np.uint8)
    reproject(datos, d18, src_transform=ref.transform, src_crs="EPSG:32717", dst_transform=tr18,
              dst_crs="EPSG:32718", resampling=Resampling.nearest, src_nodata=255, dst_nodata=255)
    out = remuestrear_categorica(Raster(d18, tr18, "EPSG:32718"), ref)
    agua = datos == 1
    assert (out[agua] == 1).mean() >= 0.95
    assert out[0, 0] in (0, 255)


def test_sin_dato_fuera_de_la_extension():
    r = Raster(np.ones((5, 5), np.uint8), from_origin(X0 + 5000, Y0, 10.0, 10.0), "EPSG:32717")
    assert (remuestrear_categorica(r, _ref()) == 255).all()


def test_rejilla_referencia_primera_valida_y_respaldo():
    sitio = cargar_sitios()["mazar"]
    no_cuadrada = Raster(np.zeros((4, 4), np.uint8), Affine(10.063, 0, X0, 0, -9.95, Y0), "EPSG:32717")
    utm18 = Raster(np.zeros((4, 4), np.uint8), from_origin(X0, Y0, 10, 10), "EPSG:32718")
    buena = Raster(np.zeros((7, 9), np.uint8), from_origin(X0, Y0, 10, 10), "EPSG:32717")
    r = rejilla_referencia(sitio, [no_cuadrada, utm18, buena])
    assert (r.ancho, r.alto, r.crs) == (9, 7, "EPSG:32717") and r.transform == buena.transform
    r0 = rejilla_referencia(sitio, [no_cuadrada])
    assert r0.resolucion_m == 10 and r0.crs == "EPSG:32717" and r0.ancho > 100
    o, s, e, n = r0.bbox_wgs84()
    assert o == pytest.approx(sitio.bbox[0], abs=0.01) and n == pytest.approx(sitio.bbox[3], abs=0.01)


def test_rejilla_derivados():
    d = rejilla_derivados(_ref(3000, 2500), 1024)  # factor 3
    assert d.transform.a == 30 and (d.ancho, d.alto) == (1000, 834)
    assert d.resolucion_m == 30
    assert rejilla_derivados(_ref(500, 500)).transform.a == 10


def test_reducir_categorica_moda():
    ref, dest = _ref(4, 4), Rejilla(from_origin(X0, Y0, 20.0, 20.0), 2, 2)
    d = np.array([[1, 1, 0, 0], [1, 0, 0, 255], [255, 255, 255, 255], [255, 255, 1, 255]], np.uint8)
    out = reducir_categorica(d, ref, dest)
    assert out.tolist() == [[1, 0], [255, 1]]


def test_reducir_continua_promedia_en_lineal():
    ref, dest = _ref(2, 2), Rejilla(from_origin(X0, Y0, 20.0, 20.0), 1, 1)
    d = np.array([[-10, -20], [-10, -20]], np.float32)
    assert reducir_continua(d, ref, dest)[0, 0] == pytest.approx(-12.6, abs=0.05)
    d[:] = np.nan
    assert np.isnan(reducir_continua(d, ref, dest)[0, 0])
