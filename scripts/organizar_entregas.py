"""Normaliza las entregas sueltas del equipo a datos_imagenes/<sitio>/<AAAAMMDD>/ según un manifiesto.

Uso: python scripts/organizar_entregas.py [--manifiesto preparacion/entregas.json] [--entrada datos_imagenes]
     [--salida datos_imagenes]
Fuera de línea: no lo importa la app."""
import argparse
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from preparacion.normalizar import organizar  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--manifiesto", default=str(RAIZ / "preparacion" / "entregas.json"))
    ap.add_argument("--entrada", default="datos_imagenes")
    ap.add_argument("--salida", default="datos_imagenes")
    a = ap.parse_args(argv)
    man = json.loads(Path(a.manifiesto).read_text(encoding="utf-8"))
    for linea in organizar(man, Path(a.entrada), Path(a.salida)):
        print(linea)
    for nombre, motivo in man.get("descartados", {}).items():
        print(f"descartado: {nombre} ({motivo})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
