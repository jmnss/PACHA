import json

import numpy as np
import rasterio
from affine import Affine

from preparacion.entrada import Raster
from preparacion.normalizar import leer_banda, organizar
from preparacion.rejilla import Rejilla, remuestrear_categorica, remuestrear_continua

from .conftest import ALTO, ANCHO, TRANSFORM, escribir

REJ = {"epsg": 32717, "transform": [10, 0, 750000, 0, -10, 9700000], "forma": [ALTO, ANCHO]}


def test_centinelas_son_nan(tmp_path):
    v = np.array([[40.0, 0.0, 1e7, -3.4e38, -7.5]], np.float32)
    r = leer_banda(escribir(tmp_path / "a.tif", v), sin_dato=[0], umbral_sin_dato=39.99)
    assert np.isnan(r.datos[0, :4]).all() and r.datos[0, 4] == np.float32(-7.5)


def test_32617_alinea_con_32717(tmp_path):
    destino = Rejilla(Affine(10, 0, 750000, 0, -10, 10000300), 40, 30, "EPSG:32717")
    patron = np.zeros((30, 40), np.uint8)
    patron[10:20, 5:15] = 1
    gemelo = np.repeat(patron, 2, axis=0)  # píxel de 10 x 5 m
    r = Raster(gemelo, Affine(10, 0, 750000, 0, -5, 300), "EPSG:32617")
    out = remuestrear_categorica(r, destino)
    assert np.array_equal(out, patron)


def test_remuestrear_continua_bilineal_y_nan():
    destino = Rejilla(Affine(10, 0, 750000, 0, -10, 9700000), 40, 30, "EPSG:32717")
    r = Raster(np.full((10, 10), -7.0, np.float32), Affine(10, 0, 750000, 0, -10, 9700000), "EPSG:32717")
    out = remuestrear_continua(r, destino)
    assert out.dtype == np.float32 and np.allclose(out[:10, :10][1:-1, 1:-1], -7.0) and np.isnan(out[20:, 20:]).all()


def _manifiesto(**fecha):
    e = {"fecha": "2026-09-25", "papel": "despues", "procedencia": {"granulos": []}}
    e.update(fecha)
    return {"sitios": {"s": {"rejilla": REJ, "fechas": [e]}}}


def test_organizar_omite_fecha_null(tmp_path):
    inf = organizar(_manifiesto(fecha=None), tmp_path, tmp_path / "o")
    assert not (tmp_path / "o").exists() and any("falta la fecha" in x for x in inf)


def test_organizar_omite_archivo_null(tmp_path):
    inf = organizar(_manifiesto(mascara={"archivo": None}), tmp_path, tmp_path / "o")
    assert not (tmp_path / "o" / "s").exists() and any("falta el archivo" in x for x in inf)


def _origenes(tmp_path):
    hh = np.full((ALTO, ANCHO), -7.0, np.float32)
    hh[0, 0] = 0
    tres = tmp_path / "img.tif"
    with rasterio.open(tres, "w", driver="GTiff", height=ALTO, width=ANCHO, count=3, dtype="float32",
                       crs="EPSG:32717", transform=TRANSFORM) as d:
        d.write(hh, 1)
        d.write(hh - 6, 2)
        d.write(hh - 99, 3)
    m = np.zeros((ALTO, ANCHO), np.uint8)
    m[5:10, 5:10] = 1
    escribir(tmp_path / "m.tif", m, nodata=255)
    escribir(tmp_path / "r.tif", np.full((ALTO, ANCHO), 0.3, np.float32))


def test_organizar_escribe_stack_mascara_delta(tmp_path):
    _origenes(tmp_path)
    man = _manifiesto(
        stack={"HH": {"archivo": "img.tif", "banda": 1, "sin_dato": [0]},
               "HV": {"archivo": "img.tif", "banda": 2, "sin_dato": [0]}},
        mascara={"archivo": "m.tif"}, delta_rfdi={"archivo": "r.tif"})
    organizar(man, tmp_path, tmp_path / "o")
    c = tmp_path / "o" / "s" / "20260925"
    with rasterio.open(c / "stack.tif") as s:
        assert s.count == 2 and s.crs.to_epsg() == 32717 and s.transform == Affine(*REJ["transform"])
        assert s.read(2)[10, 10] == np.float32(-13.0)
    with rasterio.open(c / "mascara.tif") as m:
        assert m.dtypes[0] == "uint8" and m.nodata == 255 and m.read(1)[6, 6] == 1
    assert (c / "delta_rfdi.tif").exists() and (c / "procedencia.json").exists()


def test_no_pisa_procedencia_del_equipo(tmp_path):
    _origenes(tmp_path)
    c = tmp_path / "o" / "s" / "20260925"
    c.mkdir(parents=True)
    (c / "procedencia.json").write_text('{"del": "equipo"}', encoding="utf-8")
    organizar(_manifiesto(mascara={"archivo": "m.tif"}), tmp_path, tmp_path / "o")
    assert json.loads((c / "procedencia.json").read_text(encoding="utf-8")) == {"del": "equipo"}
