"""Control de espacio en disco antes de descargar."""
import shutil
from collections import namedtuple
from pathlib import Path

import pytest

from preparacion.disco import comprobar_espacio

Uso = namedtuple("Uso", "total used free")


def test_comprobar_espacio_aborta(monkeypatch):
    monkeypatch.setattr(shutil, "disk_usage", lambda ruta: Uso(10e9, 9e9, 1e9))
    with pytest.raises(SystemExit) as e:
        comprobar_espacio(Path("."), minimo_gb=2.0)
    assert "espacio" in str(e.value).lower()


def test_comprobar_espacio_pasa(monkeypatch):
    monkeypatch.setattr(shutil, "disk_usage", lambda ruta: Uso(10e9, 5e9, 5e9))
    comprobar_espacio(Path("."), minimo_gb=2.0)
