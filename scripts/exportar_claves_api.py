"""Escribe `api/claves.json`: todas las claves de texto de la API con su texto en español (determinista)."""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from datos.catalogo_claves import generar  # noqa: E402

DESTINO = RAIZ / "api" / "claves.json"


def texto_claves() -> str:
    return json.dumps(generar(), ensure_ascii=False, indent=2) + "\n"


def main() -> None:
    DESTINO.write_text(texto_claves(), encoding="utf-8")
    print(f"Claves escritas en {DESTINO}")


if __name__ == "__main__":
    main()
