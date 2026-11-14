"""Empaqueta la app Python (api/, datos/, modelo/ y los datos mínimos) en `app-<hash>.zip` para el motor del navegador.

Uso: python scripts/empaquetar_app.py --salida <dir>
El zip es determinista (orden alfabético, fecha fija): el mismo código da los mismos bytes y el mismo nombre.
"""
import argparse
import hashlib
import io
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DATOS = ("data/clima_ecuador_power.csv", "data/ecuador_provincias.geojson", "data/nisar_sample.csv")
FECHA = (1980, 1, 1, 0, 0, 0)


def _archivos(raiz: Path) -> dict[str, Path]:
    """Nombre dentro del zip → archivo en disco."""
    salida: dict[str, Path] = {}
    for carpeta in ("api", "datos", "modelo"):
        for f in (raiz / carpeta).rglob("*.py"):
            if "__pycache__" not in f.parts:
                salida[f.relative_to(raiz).as_posix()] = f
    for nombre in DATOS:
        salida[nombre] = raiz / nombre
    for carpeta in ("data/embalses", "data/incendios"):  # derivados del equipo (nunca data/crudo/)
        for f in (raiz / carpeta).rglob("*"):
            if f.is_file():
                salida[f.relative_to(raiz).as_posix()] = f
    for f in (raiz / "frontend" / "src" / "motor" / "python").glob("*.py"):
        salida[f.name] = f
    return salida


def construir_zip(raiz: Path = RAIZ) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for nombre, f in sorted(_archivos(raiz).items()):
            info = zipfile.ZipInfo(nombre, FECHA)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, f.read_bytes())
    return buf.getvalue()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--salida", required=True, type=Path)
    args = ap.parse_args()
    datos = construir_zip()
    args.salida.mkdir(parents=True, exist_ok=True)
    for viejo in args.salida.glob("app-*.zip"):
        viejo.unlink()
    destino = args.salida / f"app-{hashlib.sha256(datos).hexdigest()[:12]}.zip"
    destino.write_bytes(datos)
    print(destino)


if __name__ == "__main__":
    main()
