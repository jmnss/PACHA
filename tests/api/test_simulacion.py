import time

from fastapi.testclient import TestClient

from api.app import create_app
from datos.proveedores.demo import ProveedorDemostracion

INI, FIN = "2026-03-01T00:00:00Z", "2026-03-01T06:00:00Z"
ESC = "ec_loja"  # incendios


def _foto(**kw):
    cuerpo = {"escenario_id": ESC, "parametros": {}, "inicio": INI, "fin": FIN, "paso_min": 60}
    cuerpo.update(kw)
    return cuerpo


def test_parametro_fuera_de_rango_422(cliente_demo):
    r = cliente_demo.post("/api/simulacion/escenario",
                          json={"escenario_id": ESC, "parametros": {"radio_km": 99}})
    assert r.status_code == 422
    assert "entre" in r.json()["mensaje"]


def test_lat_lon_fuera_de_ecuador_422(cliente_demo):
    r = cliente_demo.post("/api/simulacion/escenario",
                          json={"escenario_id": ESC, "parametros": {"lat": 50.0, "lon": 0.0}})
    assert r.status_code == 422
    assert "fuera de Ecuador" in r.json()["mensaje"]
    ok = cliente_demo.post("/api/simulacion/escenario",
                           json={"escenario_id": ESC, "parametros": {"lat": -2.0, "lon": -79.9}})
    assert ok.status_code == 200 and ok.json()["id"].startswith(ESC)


def test_lote_mayor_de_120_422(cliente_demo):
    r = cliente_demo.post("/api/simulacion/fotogramas",
                          json=_foto(fin="2026-03-01T03:00:00Z", paso_min=1))  # 181 fotogramas
    assert r.status_code == 422
    assert "Pide como máximo 120 fotogramas" in r.json()["mensaje"]
    r = cliente_demo.post("/api/simulacion/fotogramas", json=_foto(paso_min=0))
    assert r.status_code == 422
    r = cliente_demo.post("/api/simulacion/fotogramas", json=_foto(inicio="2026-03-01T00:00:00"))
    assert r.status_code == 422
    r = cliente_demo.post("/api/simulacion/fotogramas", json=_foto(fin=INI))
    assert r.status_code == 422


def test_mismo_rango_de_color_en_el_lote(cliente_demo):
    r = cliente_demo.post("/api/simulacion/fotogramas", json=_foto())
    assert r.status_code == 200
    capas = r.json()
    assert len(capas) == 7
    assert len({(c["rejilla"]["vmin"], c["rejilla"]["vmax"]) for c in capas}) == 1
    assert all(c["instante"] and c["origen"]["tipo"] for c in capas)


def test_ficticio_da_409(cliente_ficticio):
    for ruta, cuerpo in (("escenario", {"escenario_id": "x", "parametros": {}}),
                         ("fotogramas", _foto(escenario_id="x"))):
        r = cliente_ficticio.post(f"/api/simulacion/{ruta}", json=cuerpo)
        assert r.status_code == 409 and r.json()["mensaje"]


class _Cuenta(ProveedorDemostracion):
    def __init__(self):
        super().__init__()
        self.llamadas = 0

    def fotogramas(self, *a, **k):
        self.llamadas += 1
        return super().fotogramas(*a, **k)


def test_misma_peticion_usa_cache():
    prov = _Cuenta()
    with TestClient(create_app(prov)) as c:
        a = c.post("/api/simulacion/fotogramas", json=_foto())
        b = c.post("/api/simulacion/fotogramas", json=_foto())
        assert a.status_code == b.status_code == 200 and a.json() == b.json()
        assert prov.llamadas == 1
        c.post("/api/simulacion/fotogramas", json=_foto(paso_min=30))
        assert prov.llamadas == 2


def test_lote_de_120_tamano_y_tiempo(cliente_demo):
    t = time.perf_counter()
    r = cliente_demo.post("/api/simulacion/fotogramas",
                          json=_foto(fin="2026-03-01T01:59:00Z", paso_min=1))
    assert r.status_code == 200 and len(r.json()) == 120
    print(f"120 fotogramas: {time.perf_counter() - t:.1f} s, {len(r.content)} bytes sin comprimir, {len(__import__("gzip").compress(r.content))} con gzip")
