import pytest
import gzip
import pytest
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
    seg, comprimido = time.perf_counter() - t, len(gzip.compress(r.content))
    print(f"120 fotogramas: {seg:.1f} s, {len(r.content)} bytes sin comprimir, {comprimido} con gzip")
    assert seg < 5 and comprimido < 500_000


def _capa_ok(c, sim_id):
    esc = c.get(f"/api/escenarios/{sim_id}").json()
    r = c.get(f"/api/escenarios/{sim_id}/capa",
              params={"adquisicion": esc["adquisiciones"][0]["id"], "variable": esc["variables"][0],
                      "polarizacion": (esc["polarizaciones"] or [None])[0]} )
    return r.status_code


def test_escenario_repetido_sigue_consultable_tras_muchas_simulaciones(cliente_demo):
    cuerpo = {"escenario_id": ESC, "parametros": {"radio_km": 2.0}}
    a = cliente_demo.post("/api/simulacion/escenario", json=cuerpo).json()
    for i in range(40):
        cliente_demo.post("/api/simulacion/escenario",
                          json={"escenario_id": ESC, "parametros": {"radio_km": 0.5 + 0.1 * i}})
        b = cliente_demo.post("/api/simulacion/escenario", json=cuerpo).json()
        assert b["id"] == a["id"]
    assert _capa_ok(cliente_demo, b["id"]) == 200


def test_fecha_extrema_422(cliente_demo):
    r = cliente_demo.post("/api/simulacion/fotogramas",
                          json=_foto(inicio="0001-01-01T00:00:00Z", fin="0001-01-01T01:00:00Z"))
    assert r.status_code == 422 and "1900" in r.json()["mensaje"]
    r = cliente_demo.post("/api/simulacion/fotogramas",
                          json=_foto(inicio="2026-03-01T00:00:00", fin=FIN))
    assert r.status_code == 422 and "zona horaria" in r.json()["mensaje"]
    assert cliente_demo.post("/api/simulacion/fotogramas", json=_foto(fin=INI)).status_code == 422


def test_peticion_acotada_422(cliente_demo):
    def pedir(par):
        return cliente_demo.post("/api/simulacion/escenario", json={"escenario_id": ESC, "parametros": par})
    assert pedir({f"p{i}": 1 for i in range(33)}).status_code == 422
    assert pedir({"x" * 41: 1}).status_code == 422
    assert pedir({"orbita": "x" * 41}).status_code == 422
    assert pedir({"radio_km": True}).status_code == 422
    assert pedir({"radio_km": [1]}).status_code == 422
    r = pedir({"lat": -2.0})
    assert r.status_code == 422 and "lat y lon" in r.json()["mensaje"]


def test_fecha_evento_simulable_y_expuesta(cliente_demo):
    r = cliente_demo.post("/api/simulacion/escenario",
                          json={"escenario_id": "ec_la_segua", "parametros": {"fecha_evento": "2026-06-01"}})
    assert r.status_code == 200
    assert r.json()["instante_evento"].startswith("2026-06-01T")


@pytest.mark.parametrize("valor", ["2023-12-31", "01/05/2026", 20260501])
def test_fecha_evento_invalida_422(cliente_demo, valor):
    r = cliente_demo.post("/api/simulacion/escenario",
                          json={"escenario_id": "ec_la_segua", "parametros": {"fecha_evento": valor}})
    assert r.status_code == 422
    assert r.json()["clave_texto"].startswith("api.error.fecha_evento")
