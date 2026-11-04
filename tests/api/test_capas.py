import pytest


def _par(cliente):
    esc = cliente.get("/api/escenarios").json()[0]
    ids = [a["id"] for a in esc["adquisiciones"]]
    return esc, ids[0], ids[-1]


def _pedir_cambio(cliente):
    esc, a, d = _par(cliente)
    pol = esc["polarizaciones"][0]
    return esc, a, d, cliente.post(f"/api/escenarios/{esc['id']}/cambio",
                                   json={"antes": a, "despues": d, "polarizacion": pol})


def test_capa_devuelve_rejilla_con_origen(cliente):
    esc, a, _ = _par(cliente)
    r = cliente.get(f"/api/escenarios/{esc['id']}/capa",
                    params={"adquisicion": a, "variable": esc["variables"][0],
                            "polarizacion": esc["polarizaciones"][0]})
    assert r.status_code == 200
    j = r.json()
    assert j["origen"]["tipo"] in ("sintetico", "real")
    assert 1 <= j["rejilla"]["filas"] <= 512 and j["rejilla"]["datos_b64"]


def test_cambio_devuelve_antes_despues_cambio_con_origen(cliente):
    _, _, _, r = _pedir_cambio(cliente)
    assert r.status_code == 200
    j = r.json()
    for k in ("antes", "despues", "cambio"):
        assert j[k]["rejilla"]["datos_b64"] and j[k]["origen"]["tipo"]
    assert j["origen"]["tipo"] in ("sintetico", "real")
    assert isinstance(j["metricas"], list) and "capas_extra" in j and "tablas" in j


def test_antes_igual_despues_422(cliente):
    esc, a, _ = _par(cliente)
    for ruta, cuerpo in (("cambio", {"antes": a, "despues": a}),
                         ("medicion", {"antes": a, "despues": a, "punto": [0.5, 0.5]})):
        r = cliente.post(f"/api/escenarios/{esc['id']}/{ruta}", json=cuerpo)
        assert r.status_code == 422 and "Elige dos fechas distintas" in r.json()["mensaje"]


def test_cuadrante_vacio_422(cliente):
    esc, a, d = _par(cliente)
    r = cliente.post(f"/api/escenarios/{esc['id']}/medicion",
                     json={"antes": a, "despues": d, "cuadrante": [0.5, 0.2, 0.5, 0.8]})
    assert r.status_code == 422 and "El cuadrante no tiene área" in r.json()["mensaje"]


@pytest.mark.parametrize("cuerpo", [{"punto": [1.2, 0.5]}, {"punto": [-0.1, 0.5]},
                                    {"cuadrante": [0.1, 0.1, 1.5, 0.9]}, {},
                                    {"punto": [0.5, 0.5], "cuadrante": [0.1, 0.1, 0.9, 0.9]}])
def test_entrada_invalida_422(cliente, cuerpo):
    esc, a, d = _par(cliente)
    r = cliente.post(f"/api/escenarios/{esc['id']}/medicion", json={"antes": a, "despues": d, **cuerpo})
    assert r.status_code == 422 and r.json()["mensaje"]


def test_punto_fuera_de_0_1_422(cliente):
    esc, a, d = _par(cliente)
    r = cliente.post(f"/api/escenarios/{esc['id']}/medicion",
                     json={"antes": a, "despues": d, "punto": [1.5, 0.5]})
    assert r.status_code == 422


def test_medicion_devuelve_tabla(cliente):
    esc, a, d = _par(cliente)
    r = cliente.post(f"/api/escenarios/{esc['id']}/medicion",
                     json={"antes": a, "despues": d, "cuadrante": [0.2, 0.2, 0.6, 0.7]})
    assert r.status_code == 200
    j = r.json()
    assert j["tabla"] and j["cuadrante"] is not None and j["origen"]["tipo"]
    p = cliente.post(f"/api/escenarios/{esc['id']}/medicion",
                     json={"antes": a, "despues": d, "punto": [1.0, 1.0]})
    assert p.status_code == 200 and p.json()["punto"] is not None


def test_escenario_inexistente_404(cliente):
    r = cliente.post("/api/escenarios/no-existe/cambio", json={"antes": "a", "despues": "b"})
    assert r.status_code == 404


class _Espia:
    """Envuelve un proveedor y registra los argumentos de `medir`."""
    def __init__(self, base):
        self._b, self.llamadas = base, []

    def __getattr__(self, n):
        return getattr(self._b, n)

    def medir(self, *a, **k):
        self.llamadas.append(k)
        return self._b.medir(*a, **k)


@pytest.fixture
def espia():
    from fastapi.testclient import TestClient
    from api.app import create_app
    from tests.datos.proveedor_ficticio import ProveedorFicticio
    e = _Espia(ProveedorFicticio())
    with TestClient(create_app(e)) as c:
        esc = c.get("/api/escenarios").json()[0]
        ids = [a["id"] for a in esc["adquisiciones"]]
        yield c, e, esc["id"], ids[0], ids[-1]


def _med(espia, **cuerpo):
    c, e, i, a, d = espia
    r = c.post(f"/api/escenarios/{i}/medicion", json={"antes": a, "despues": d, **cuerpo})
    return r, e.llamadas


def test_punto_usa_floor(espia):
    r, ll = _med(espia, punto=[0.0004, 0.0])  # 0.0004*2048 = 0.8 -> columna 0
    assert r.status_code == 200 and ll[-1]["punto"] == (0, 0)
    r, ll = _med(espia, punto=[1.0, 1.0])
    assert ll[-1]["punto"] == (2047, 2047)


def test_cuadrante_igual_a_un_pixel(espia):
    r, ll = _med(espia, cuadrante=[3 / 2048, 5 / 2048, 4 / 2048, 6 / 2048])
    assert r.status_code == 200 and ll[-1]["cuadrante"] == (5, 6, 3, 4)


def test_cuadrante_subpixel_vale_un_pixel(espia):
    r, ll = _med(espia, cuadrante=[0.0001, 0.0001, 0.0002, 0.0002])
    assert r.status_code == 200 and ll[-1]["cuadrante"] == (0, 1, 0, 1)


def test_cuadrante_area_cero_422(espia):
    r, _ = _med(espia, cuadrante=[0.2, 0.3, 0.6, 0.3])
    assert r.status_code == 422 and "El cuadrante no tiene área" in r.json()["mensaje"]


def test_mensajes_422_en_espanol(cliente):
    esc, a, d = _par(cliente)
    r = cliente.post(f"/api/escenarios/{esc['id']}/medicion", json={"antes": a, "despues": d, "punto": [1.5, 0.5]})
    m = r.json()["mensaje"]
    assert "entre 0 y 1" in m and "Value error" not in m
    r = cliente.post(f"/api/escenarios/{esc['id']}/medicion", json={"antes": a})
    assert "Falta el campo" in r.json()["mensaje"] and "despues" in r.json()["mensaje"]
    r = cliente.post(f"/api/escenarios/{esc['id']}/medicion", json={"antes": a, "despues": d, "punto": "x"})
    assert "no es válido" in r.json()["mensaje"]


@pytest.mark.parametrize("id", ["ec_guayaquil", "ec_pedernales", "ec_antisana", "ec_daule"])
def test_demo_sintetico_en_todo(cliente_demo, id):
    esc = cliente_demo.get(f"/api/escenarios/{id}").json()
    a, d = esc["adquisiciones"][0]["id"], esc["adquisiciones"][-1]["id"]
    pol = esc["polarizaciones"][0] if esc["polarizaciones"] else None
    c = cliente_demo.get(f"/api/escenarios/{id}/capa",
                         params={"adquisicion": a, "variable": esc["variables"][0], **({"polarizacion": pol} if pol else {})})
    assert c.status_code == 200 and c.json()["origen"]["tipo"] == "sintetico"
    j = cliente_demo.post(f"/api/escenarios/{id}/cambio", json={"antes": a, "despues": d, "polarizacion": pol}).json()
    assert j["origen"]["tipo"] == "sintetico"
    for k in ("antes", "despues", "cambio"):
        assert j[k]["origen"]["tipo"] == "sintetico"
    for c in j["capas_extra"] + j["series"] + j["tablas"] + ([j["vectores"]] if j["vectores"] else []):
        assert c["origen"]["tipo"] == "sintetico"
    m = cliente_demo.post(f"/api/escenarios/{id}/medicion", json={"antes": a, "despues": d, "punto": [0.5, 0.5]}).json()
    assert m["origen"]["tipo"] == "sintetico"
