"""El contrato OpenAPI versionado en `frontend/openapi.json` debe coincidir con la API."""
import json
from pathlib import Path

from api.app import create_app

RUTA = Path(__file__).resolve().parents[2] / "frontend" / "openapi.json"


def _esperado() -> str:
    return json.dumps(create_app().openapi(), indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def test_openapi_publicado_esta_al_dia():
    assert RUTA.read_text(encoding="utf-8") == _esperado(), \
        "Ejecuta `python scripts/exportar_openapi.py` y vuelve a confirmar."


def test_esquema_contiene_los_tipos_del_contrato():
    esquemas = create_app().openapi()["components"]["schemas"]
    for nombre in ("Salud", "ContextoDto", "CapaDto", "ResultadoCambioDto", "TipoCambio"):
        assert nombre in esquemas
    assert "hay_sinteticos" in esquemas["Salud"]["properties"]


def test_operation_id_legibles():
    ids = [op["operationId"] for p in create_app().openapi()["paths"].values() for op in p.values()]
    assert len(ids) == len(set(ids))
    assert all("_api_" not in i for i in ids), ids
