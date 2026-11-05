def _pareja(c, id):
    e = c.get(f"/api/escenarios/{id}").json()
    ids = [a["id"] for a in e["adquisiciones"]]
    return ids[0], ids[-1]


def test_impacto_inundacion(cliente_demo):
    a, b = _pareja(cliente_demo, "ec_la_segua")
    r = cliente_demo.get(f"/api/escenarios/ec_la_segua/impacto?antes={a}&despues={b}")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["origen"]["tipo"] == "sintetico" and d["capa"]["origen"]["tipo"] == "sintetico" and d["cifras"] and d["acciones"]


def test_impacto_no_aplica_422(cliente_demo):
    a, b = _pareja(cliente_demo, "ec_antisana")
    r = cliente_demo.get(f"/api/escenarios/ec_antisana/impacto?antes={a}&despues={b}")
    assert r.status_code == 422 and "inundaciones e incendios" in r.json()["mensaje"]


def test_impacto_fechas_iguales_422(cliente_demo):
    a, _ = _pareja(cliente_demo, "ec_la_segua")
    assert cliente_demo.get(f"/api/escenarios/ec_la_segua/impacto?antes={a}&despues={a}").status_code == 422


def test_impacto_escenario_inexistente_404(cliente_demo):
    assert cliente_demo.get("/api/escenarios/nada/impacto?antes=a&despues=b").status_code == 404
