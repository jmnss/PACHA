import json
import re
from pathlib import Path

import numpy as np
import pytest

from preparacion.entrada import descubrir, leer_mascara, leer_stack, validar_procedencia
from preparacion.sitios import cargar_sitios

from .conftest import ALTO, ANCHO, escribir

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


def test_leer_stack_cero_es_nan(tmp_path):
    hh = np.full((ALTO, ANCHO), -8.0, dtype=np.float32)
    hh[0, 0] = 0.0
    hv = np.full((ALTO, ANCHO), -15.0, dtype=np.float32)
    import rasterio
    from .conftest import TRANSFORM
    ruta = tmp_path / "stack.tif"
    with rasterio.open(ruta, "w", driver="GTiff", height=ALTO, width=ANCHO, count=2, dtype="float32",
                       crs="EPSG:32717", transform=TRANSFORM) as d:
        d.write(hh, 1)
        d.write(hv, 2)
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
    del p["madurez"]
    assert validar_procedencia(p) == ["madurez"]


def test_sitios():
    s = cargar_sitios()
    assert set(s) == {"mazar", "daule-peripa", "casitagua"}
    assert s["mazar"].tipo == "embalse" and s["casitagua"].tipo == "incendio"
    o, su, e, n = s["mazar"].bbox
    lat, lon = s["mazar"].semilla
    assert o < lon < e and su < lat < n and s["mazar"].epsg == 32717
