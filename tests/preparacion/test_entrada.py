import json
import re
from pathlib import Path

import numpy as np
import pytest
import rasterio

from preparacion.entrada import descubrir, leer_mascara, leer_stack, validar_procedencia
from preparacion.sitios import cargar_sitios

from .conftest import ALTO, ANCHO, TRANSFORM, escribir

RAIZ = Path(__file__).resolve().parents[2]


def test_leer_mascara_2bits_nodata_3(mascara_2bits):
    r = leer_mascara(mascara_2bits)
    assert r.datos.dtype == np.uint8
    assert set(np.unique(r.datos)) == {0, 1, 255}
    assert r.crs == "EPSG:32717" and r.nodata == 255


def test_leer_mascara_nodata_256_no_rompe(mascara_nodata_256):
    r = leer_mascara(mascara_nodata_256)
    assert set(np.unique(r.datos)) == {0, 1}


def test_borde_sin_dato_del_stack(mascara_2bits):
    hh = np.full((ALTO, ANCHO), -8.0, dtype=np.float32)
    hh[:, :3] = 0.0
    r = leer_mascara(mascara_2bits, stack_hh=hh)
    assert (r.datos[:, :3] == 255).all()
    assert (r.datos[5:15, 5:20] == 1).all()


def _escribir_stack(ruta, hh, hv):
    with rasterio.open(ruta, "w", driver="GTiff", height=ALTO, width=ANCHO, count=2, dtype="float32",
                       crs="EPSG:32717", transform=TRANSFORM) as d:
        d.write(hh, 1)
        d.write(hv, 2)
    return ruta


def test_borde_via_leer_stack(tmp_path, mascara_2bits):
    hh = np.full((ALTO, ANCHO), -8.0, dtype=np.float32)
    hh[:, :3] = 0.0
    ruta = _escribir_stack(tmp_path / "s.tif", hh, hh)
    hh_r, _ = leer_stack(ruta)
    r = leer_mascara(mascara_2bits, hh_r.datos)
    assert (r.datos[:, :3] == 255).all()


def test_descubrir_procedencia_ilegible_no_aborta(tmp_path, valores):
    d = tmp_path / "mazar" / "20261029"
    d.mkdir(parents=True)
    escribir(d / "mascara.tif", valores)
    (d / "procedencia.json").write_text("{no es json", encoding="utf-8")
    (f,) = descubrir(tmp_path, "mazar")
    assert f.procedencia is None and f.faltan == ["procedencia.json (ilegible)"]


def test_descubrir_sitio_inexistente(tmp_path):
    assert descubrir(tmp_path, "nada") == []


def test_validar_procedencia_fecha_mala():
    p = _ejemplo_del_doc()
    p["fecha_adquisicion_utc"] = "ayer"
    assert validar_procedencia(p) == ["fecha_adquisicion"]


def test_leer_stack_cero_es_nan(tmp_path):
    hh = np.full((ALTO, ANCHO), -8.0, dtype=np.float32)
    hh[0, 0] = 0.0
    hv = np.full((ALTO, ANCHO), -15.0, dtype=np.float32)
    ruta = _escribir_stack(tmp_path / "stack.tif", hh, hv)
    a, b = leer_stack(ruta)
    assert np.isnan(a.datos[0, 0]) and a.datos[1, 1] == -8.0 and b.datos[0, 0] == -15.0


def test_descubrir_ordena_y_marca_faltantes(tmp_path, valores):
    for f in ("20261029", "20260701"):
        d = tmp_path / "mazar" / f
        d.mkdir(parents=True)
        escribir(d / "mascara.tif", valores)
    (tmp_path / "mazar" / "otra").mkdir()
    (tmp_path / "mazar" / "20261029" / "procedencia.json").write_text("{}", encoding="utf-8")
    fechas = descubrir(tmp_path, "mazar")
    assert [str(f.fecha) for f in fechas] == ["2026-07-01", "2026-10-29"]
    assert fechas[0].faltan == ["procedencia.json"] and fechas[1].faltan == []
    assert fechas[0].stack is None and fechas[1].procedencia == {}


def _ejemplo_del_doc():
    texto = (RAIZ / "docs" / "datos-equipo-embalses.md").read_text(encoding="utf-8")
    return json.loads(re.search(r"```json\n(.*?)```", texto, re.S).group(1))


def test_validar_procedencia_ejemplo_del_doc():
    assert validar_procedencia(_ejemplo_del_doc()) == []


def test_validar_procedencia_ausente_o_incompleta():
    assert validar_procedencia(None) == ["procedencia.json"]
    p = _ejemplo_del_doc()
    del p["madurez"]   # opcional desde la decisión del 2026-11-15
    assert validar_procedencia(p) == []
    del p["producto"]
    assert validar_procedencia(p) == ["producto"]


def test_sitios():
    s = cargar_sitios()
    assert set(s) == {"mazar", "daule-peripa", "casitagua"}
    assert s["mazar"].tipo == "embalse" and s["casitagua"].tipo == "incendio"
    o, su, e, n = s["mazar"].bbox
    lat, lon = s["mazar"].semilla
    assert o < lon < e and su < lat < n and s["mazar"].epsg == 32717


def _solo_stack(raiz, sitio):
    d = raiz / sitio / "20260913"
    d.mkdir(parents=True)
    _escribir_stack(d / "stack.tif", np.full((ALTO, ANCHO), -7.0, np.float32), np.full((ALTO, ANCHO), -13.0, np.float32))


def test_descubrir_incendio_sin_mascara(tmp_path):
    _solo_stack(tmp_path, "casitagua")
    (f,) = descubrir(tmp_path, "casitagua", "incendio")
    assert f.mascara is None and f.stack is not None and "mascara.tif" not in f.faltan


def test_descubrir_embalse_sin_mascara_falta(tmp_path):
    _solo_stack(tmp_path, "mazar")
    (f,) = descubrir(tmp_path, "mazar", "embalse")
    assert "mascara.tif" in f.faltan
