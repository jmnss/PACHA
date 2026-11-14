import json

import numpy as np

from scripts.preparar_embalses import main

from .conftest import escribir


def test_cli_sin_dem_en_tmp(tmp_path, valores):
    entrada, salida = tmp_path / "e", tmp_path / "s"
    d = entrada / "mazar" / "20261029"
    d.mkdir(parents=True)
    escribir(d / "mascara.tif", np.where(valores == 3, 255, valores).astype(np.uint8))
    assert main(["--sitio", "mazar", "--entrada", str(entrada), "--salida", str(salida), "--sin-dem"]) == 0
    sj = json.loads((salida / "embalses" / "mazar" / "sitio.json").read_text(encoding="utf-8"))
    assert len(sj["fechas"]) == 1


def test_cli_incendio_va_a_incendios(tmp_path):
    assert main(["--sitio", "casitagua", "--entrada", str(tmp_path), "--salida", str(tmp_path / "s"), "--sin-dem"]) == 0
    assert (tmp_path / "s" / "incendios" / "casitagua" / "sitio.json").exists()
