"""Rutas del resumen de un sitio y de la comparación de embalses (proveedor por defecto: los datos del equipo)."""
import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from datos.proveedores.mixto import ProveedorMixto


@pytest.fixture(scope="module")
def cliente_mixto():
    with TestClient(create_app(ProveedorMixto())) as c:
        yield c


def test_resumen_embalse(cliente_mixto):
    r = cliente_mixto.get("/api/escenarios/embalse-mazar/resumen")
    assert r.status_code == 200
    d = r.json()
    assert d["historia"] == "embalse" and d["variacion"]["dias"] == 77 and d["ficha"]
    assert "granulos" not in d["origen"]["procedencia"]


def test_resumen_incendio(cliente_mixto):
    d = cliente_mixto.get("/api/escenarios/incendio-casitagua/resumen").json()
    assert d["incendio"]["area_marcada_ha"] == 1942 and d["lecturas"]


def test_comparacion(cliente_mixto):
    d = cliente_mixto.get("/api/comparacion/embalses").json()
    assert len(d["sitios"]) == 2 and d["dias_entre_despues"] == 17


def test_salud_y_escenarios_reales(cliente_mixto):
    s = cliente_mixto.get("/api/salud").json()
    assert s["origen_tipo"] == "real" and s["hay_sinteticos"] is False
    ids = sorted(e["id"] for e in cliente_mixto.get("/api/escenarios").json())
    assert ids == ["embalse-daule-peripa", "embalse-mazar", "incendio-casitagua"]


def test_contexto_en_los_sitios(cliente_mixto):
    for e in cliente_mixto.get("/api/escenarios").json():
        o, s, este, n = e["bbox"]
        r = cliente_mixto.get(f"/api/contexto?lat={(s + n) / 2}&lon={(o + este) / 2}&fecha=2026-10-01")
        assert r.status_code == 200 and r.json() is not None


def test_cambio_y_capa_de_los_sitios(cliente_mixto):
    for e in cliente_mixto.get("/api/escenarios").json():
        a, d = e["adquisiciones"][0]["id"], e["adquisiciones"][-1]["id"]
        r = cliente_mixto.post(f"/api/escenarios/{e['id']}/cambio", json={"antes": a, "despues": d})
        assert r.status_code == 200, r.text


def test_demo_no_ofrece_resumen(cliente_demo):
    assert cliente_demo.get("/api/escenarios/ec_la_segua/resumen").status_code == 409


def test_simulador_no_depende_del_proveedor(cliente_mixto):
    assert cliente_mixto.get("/api/simulador/catalogo").status_code == 200
