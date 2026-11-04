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
