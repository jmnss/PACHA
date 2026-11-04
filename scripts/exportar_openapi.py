"""Escribe el contrato OpenAPI de la API en `frontend/openapi.json` (determinista)."""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from api.app import create_app  # noqa: E402


def main() -> None:
    # openapi() no ejecuta el lifespan: no se crea ningún proveedor ni se generan escenas.
    texto = json.dumps(create_app().openapi(), indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    destino = RAIZ / "frontend" / "openapi.json"
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(texto, encoding="utf-8")
    print(f"Contrato escrito en {destino}")


if __name__ == "__main__":
    main()
