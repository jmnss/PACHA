import json

import numpy as np
import pytest

from preparacion.entrada import descubrir
from preparacion.salida import cuantizar, descuantizar, escribir_sitio, tamano_mb
from preparacion.sitios import cargar_sitios

from .conftest import ALTO, ANCHO, escribir

PROV = {"granulos": ["NISAR_X"], "fecha_adquisicion_utc": "2026-10-29T23:31:00Z", "producto": "GCOV",
        "coleccion": "NISAR_L2_GCOV_V1", "madurez": "VALIDATED", "frecuencia": "A",
        "polarizaciones": ["HH", "HV"], "unidades_stack": "gamma0 dB",
        "metodo": {"nombre": "k-medias", "clases": 2, "parametros": {}},
        "autor": "equipo", "fecha_proceso": "2026-11-14"}


@pytest.fixture
def entrega(tmp_path, valores):
    for f in ("20260701", "20261029"):
        d = tmp_path / "mazar" / f
        d.mkdir(parents=True)
        escribir(d / "mascara.tif", np.where(valores == 3, 255, valores).astype(np.uint8))
    (tmp_path / "mazar" / "20261029" / "procedencia.json").write_text(json.dumps(PROV), encoding="utf-8")
    return tmp_path


def test_cuantizacion_ida_y_vuelta():
    v = np.array([-12.3, np.nan, -25.0, 0.0, 5.0], np.float32)
    q = cuantizar(v, -25.0, 0.0)
    assert q.dtype == np.uint8 and q[1] == 0 and q[2] == 1 and q[3] == 255 and q[4] == 255
    assert abs(descuantizar(q, -25.0, 0.0)[0] - -12.3) <= 25 / 254
    assert np.isnan(descuantizar(q, -25.0, 0.0)[1])


def test_escribir_sitio_formato(entrega, tmp_path):
    s = cargar_sitios()["mazar"]
    dest = tmp_path / "out" / "mazar"
    sj = escribir_sitio(s, descubrir(entrega, "mazar"), dest)
    assert sj == json.loads((dest / "sitio.json").read_text(encoding="utf-8"))
    assert [f["fecha"] for f in sj["fechas"]] == ["2026-07-01", "2026-10-29"]
    assert [f["procedencia_completa"] for f in sj["fechas"]] == [False, True]
    assert [f["faltan"] for f in sj["fechas"]] == [["procedencia.json"], []]
    assert sj["fechas"][1]["instante"] == "2026-10-29T23:31:00Z" and sj["fechas"][0]["instante"] is None
    assert sj["leyenda"][0][0] == "agua" and sj["dem"] is None and sj["curva"] is None
    assert sj["epsg"] == 32717 and sj["version"] == 1
    z = np.load(dest / "20261029.npz")
    assert z["mascara"].shape == tuple(sj["forma"]) and z["mascara"].dtype == np.uint8
    assert set(np.unique(z["mascara"])) <= {0, 1, 2}
    assert sj["fechas"][1]["superficie_km2"]["agua"] > 0
    assert (dest / "contorno.geojson").exists() and tamano_mb(dest) > 0


def test_no_sobrescribe_contorno(entrega, tmp_path):
    s = cargar_sitios()["mazar"]
    dest = tmp_path / "out" / "mazar"
    fechas = descubrir(entrega, "mazar")
    escribir_sitio(s, fechas, dest)
    marcado = {"type": "FeatureCollection", "features": [], "marca": "mio"}
    (dest / "contorno.geojson").write_text(json.dumps(marcado), encoding="utf-8")
    escribir_sitio(s, fechas, dest)
    assert json.loads((dest / "contorno.geojson").read_text(encoding="utf-8"))["marca"] == "mio"
    escribir_sitio(s, fechas, dest, regenerar_contorno=True)
    assert "marca" not in json.loads((dest / "contorno.geojson").read_text(encoding="utf-8"))


def test_sitio_sin_entregas_solo_dem(tmp_path):
    s = cargar_sitios()["mazar"]
    def dem_fn(rej):
        yy, xx = np.mgrid[0:rej.alto, 0:rej.ancho]
        return (2400 + 3.0 * np.hypot(yy - rej.alto / 2, xx - rej.ancho / 2)).astype(np.float32)
    # la semilla del sitio cae en el centro aproximado de la caja; la cuenca es un cuenco con agua al centro
    sj = escribir_sitio(s, [], tmp_path / "m", dem_fn=dem_fn)
    assert sj["fechas"] == [] and sj["dem"] == "dem.npz" and sj["curva"] == "curva.json"
    z = np.load(tmp_path / "m" / "dem.npz")
    assert z["dem"].dtype == np.int16 and z["dem"].shape == tuple(sj["forma"])
    assert np.unpackbits(z["agua_dem"]).size >= sj["forma"][0] * sj["forma"][1]
    assert json.loads((tmp_path / "m" / "curva.json").read_text(encoding="utf-8"))["cota_dem_m"] > 0
    assert (tmp_path / "m" / "contorno.geojson").exists()


def test_dem_con_semilla_sin_cota_no_aborta(tmp_path):
    s = cargar_sitios()["mazar"]
    sj = escribir_sitio(s, [], tmp_path / "m", dem_fn=lambda r: np.full((r.alto, r.ancho), np.nan, np.float32))
    assert sj["dem"] is None and sj["curva"] is None


def test_superficie_en_la_rejilla_original(tmp_path):
    from affine import Affine
    from rasterio.warp import transform_bounds
    o, _, _, n = transform_bounds("EPSG:4326", "EPSG:32717", *cargar_sitios()["mazar"].bbox)
    m = np.zeros((100, 120), np.uint8)
    m[20:80, 20:100] = 1
    d = tmp_path / "e" / "mazar" / "20261029"
    d.mkdir(parents=True)
    escribir(d / "mascara.tif", m, transform=Affine(10.063, 0, o + 500, 0, -9.950, n - 500))
    sj = escribir_sitio(cargar_sitios()["mazar"], descubrir(tmp_path / "e", "mazar"), tmp_path / "out")
    exacta = int((m == 1).sum()) * 10.063 * 9.950 / 1e6
    assert sj["fechas"][0]["superficie_km2"]["agua"] == pytest.approx(exacta, abs=1e-4)
