def test_nubes(cliente_demo):
    r = cliente_demo.get("/api/laboratorio/nubes?cobertura=50")
    assert r.status_code == 200
    d = r.json()
    assert d["origen"]["tipo"] == "sintetico" and d["optico"]["rejilla"]["filas"] == 64
    assert len(d["metricas"]) == 4 and d["porcentaje_radar"] > d["porcentaje_optico"]


def test_nubes_fuera_de_rango_422(cliente_demo):
    r = cliente_demo.get("/api/laboratorio/nubes?cobertura=150")
    assert r.status_code == 422 and "0 a 100" in r.json()["mensaje"]


def test_respuesta(cliente_demo):
    d = cliente_demo.get("/api/laboratorio/respuesta?banda=S&pol=HV").json()
    assert d["aviso_banda"] and len(d["respuestas"]) == 15 and len(d["cambios"]) == 3


def test_respuesta_invalida_422(cliente_demo):
    assert cliente_demo.get("/api/laboratorio/respuesta?banda=Q").status_code == 422
