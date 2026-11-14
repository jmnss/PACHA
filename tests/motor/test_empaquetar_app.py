"""`scripts/empaquetar_app.py` produce un zip determinista con lo justo para el motor."""
import importlib.util
import io
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("empaquetar_app", RAIZ / "scripts" / "empaquetar_app.py")
empaquetar_app = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(empaquetar_app)


def _nombres():
    return zipfile.ZipFile(io.BytesIO(empaquetar_app.construir_zip(RAIZ))).namelist()


def test_zip_determinista():
    assert empaquetar_app.construir_zip(RAIZ) == empaquetar_app.construir_zip(RAIZ)


def test_incluye_lo_necesario():
    nombres = set(_nombres())
    for esperado in ("api/app.py", "datos/proveedores/demo.py", "modelo/desastres.py",
                     "data/nisar_sample.csv", "data/clima_ecuador_power.csv",
                     "data/ecuador_provincias.geojson", "arranque.py"):
        assert esperado in nombres, esperado


def test_excluye_lo_que_no_hace_falta():
    for n in _nombres():
        assert not n.startswith("data/demo/") and not n.startswith("data/terreno/"), n
        assert "__pycache__" not in n, n
