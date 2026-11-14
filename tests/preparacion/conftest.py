"""GeoTIFF pequeños (EPSG:32717, 10 m, 40 × 30 px) para probar la lectura de las entregas del equipo."""
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin

ALTO, ANCHO = 30, 40
TRANSFORM = from_origin(750000.0, 9700000.0, 10.0, 10.0)


def escribir(ruta, datos, **extra):
    perfil = dict(driver="GTiff", height=datos.shape[0], width=datos.shape[1], count=1, dtype=str(datos.dtype),
                  crs="EPSG:32717", transform=TRANSFORM)
    perfil.update(extra)
    with rasterio.open(ruta, "w", **perfil) as d:
        d.write(datos, 1)
    return ruta


@pytest.fixture
def valores():
    v = np.zeros((ALTO, ANCHO), dtype=np.uint8)
    v[5:15, 5:20] = 1
    v[:, -4:] = 3
    return v


@pytest.fixture
def mascara_2bits(tmp_path, valores):
    return escribir(tmp_path / "m2.tif", valores, nbits=2, nodata=3)


@pytest.fixture
def mascara_nodata_256(tmp_path, valores):
    v = np.where(valores == 3, 0, valores).astype(np.uint8)
    ruta = escribir(tmp_path / "m256.tif", v)
    with rasterio.open(ruta, "r+") as d:
        d.update_tags(**{"GDAL_NODATA": "256"})  # etiqueta cruda, como la deja ArcGIS
    return ruta
