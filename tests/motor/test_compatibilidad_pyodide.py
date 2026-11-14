"""Las librerías externas que importa el código del motor deben existir en Pyodide."""
import ast
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PYODIDE = {"numpy", "pandas", "PIL", "pydantic", "shapely", "fastapi", "starlette"}
SOLO_MOTOR = {"js", "pyodide"}                 # solo en frontend/src/motor/python/
PEREZOSOS = {"requests", "h5py", "pyproj"}     # solo dentro de funciones: requests lo da el shim; h5py/pyproj
                                               # son del lector de datos reales, que el motor no usa
PROPIOS = {"api", "datos", "modelo", "arranque", "requests_navegador"}
DIR_MOTOR = RAIZ / "frontend" / "src" / "motor" / "python"


def _archivos():
    fuentes = [*RAIZ.glob("api/**/*.py"), *RAIZ.glob("datos/**/*.py"), *DIR_MOTOR.glob("*.py"),
               *(RAIZ / "modelo" / n for n in ("nisar.py", "estaciones.py", "desastres.py"))]
    return [f for f in fuentes if "__pycache__" not in f.parts]


def _importaciones(arbol):
    """(modulo_raiz, a_nivel_de_modulo) de cada import."""
    salida = []

    def visitar(nodo, dentro_de_funcion):
        for hijo in ast.iter_child_nodes(nodo):
            if isinstance(hijo, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
                visitar(hijo, True)
                continue
            if isinstance(hijo, ast.Import):
                salida.extend((a.name.split(".")[0], not dentro_de_funcion) for a in hijo.names)
            elif isinstance(hijo, ast.ImportFrom) and hijo.level == 0 and hijo.module:
                salida.append((hijo.module.split(".")[0], not dentro_de_funcion))
            visitar(hijo, dentro_de_funcion)

    visitar(arbol, False)
    return salida


def _externas(f):
    permitidos_extra = SOLO_MOTOR if DIR_MOTOR in f.parents else set()
    for modulo, nivel_modulo in _importaciones(ast.parse(f.read_text(encoding="utf-8"))):
        if modulo in sys.stdlib_module_names or modulo in PROPIOS:
            continue
        yield modulo, nivel_modulo, permitidos_extra


def test_importaciones_de_nivel_de_modulo_existen_en_pyodide():
    malas = [(f.relative_to(RAIZ).as_posix(), m) for f in _archivos()
             for m, nivel, extra in _externas(f) if nivel and m not in PYODIDE | extra]
    assert not malas, f"Importaciones de nivel de módulo ausentes en Pyodide: {malas}"


def test_importaciones_perezosas_conocidas():
    malas = [(f.relative_to(RAIZ).as_posix(), m) for f in _archivos()
             for m, nivel, extra in _externas(f) if not nivel and m not in PYODIDE | PEREZOSOS | extra]
    assert not malas, f"Importaciones dentro de funciones desconocidas: {malas}"


def _solo_preparacion():
    """Paquetes de requirements-preparacion.txt (nombre de importación)."""
    alias = {"asf_search": "asf_search", "earthaccess": "earthaccess", "h5py": "h5py", "rasterio": "rasterio",
             "xarray": "xarray", "rioxarray": "rioxarray", "h5netcdf": "h5netcdf", "fsspec": "fsspec",
             "pyproj": "pyproj", "netcdf4": "netCDF4"}
    nombres = set()
    for linea in (RAIZ / "requirements-preparacion.txt").read_text(encoding="utf-8").splitlines():
        linea = linea.split("#")[0].strip()
        if linea:
            base = linea.split("[")[0].split("=")[0].split("<")[0].split(">")[0].split("~")[0].strip().lower()
            nombres.add(alias.get(base.replace("-", "_"), base.replace("-", "_")))
    return nombres


def test_dependencias_de_preparacion_fuera_de_la_app():
    """Lo de requirements-preparacion.txt solo lo usan los scripts fuera de línea: nunca api/, datos/ ni modelo/
    (ni a nivel de módulo ni dentro de funciones), salvo los lectores heredados ya conocidos (PEREZOSOS)."""
    prohibidos = _solo_preparacion() - PEREZOSOS
    assert prohibidos, "requirements-preparacion.txt debería declarar al menos una dependencia"
    malas = [(f.relative_to(RAIZ).as_posix(), m) for f in _archivos()
             for m, _nivel, _extra in _externas(f) if m in prohibidos]
    assert not malas, f"Dependencias de preparación importadas desde la app: {malas}"
