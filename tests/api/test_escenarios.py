
def test_lista_escenarios_con_origen(cliente):
    r = cliente.get("/api/escenarios")
    assert r.status_code == 200
    lista = r.json()
    assert lista
    for e in lista:
        assert e["origen"]["tipo"] in ("sintetico", "real")
        assert e["adquisiciones"]
        assert "datos" not in e
    uno = cliente.get(f"/api/escenarios/{lista[0]['id']}")
    assert uno.status_code == 200 and uno.json()["id"] == lista[0]["id"]


def test_tipos_traen_controles_si_simula(cliente_demo):
    tipos = cliente_demo.get("/api/tipos").json()
    assert {t["id"] for t in tipos} == {"humedales", "incendios", "terremotos", "glaciares",
                                        "agricultura", "subsidencia"}
    por_id = {t["id"]: t for t in tipos}
    assert all(t["controles"] for t in tipos)
    horas = [c for c in por_id["incendios"]["controles"] if c["tipo"] == "hora"]
    assert horas and horas[0]["id"] == "hora_evento"
    sel = [c for c in por_id["terremotos"]["controles"] if c["tipo"] == "selector"]
    assert sel and len(sel[0]["opciones"]) == 4


def test_tipos_sin_controles_si_no_simula(cliente_ficticio):
    tipos = cliente_ficticio.get("/api/tipos").json()
    assert [t["id"] for t in tipos] == ["inundaciones"]
    assert tipos[0]["controles"] == [] and tipos[0]["nombre"] == "inundaciones"


def test_escenario_inexistente_404(cliente):
    r = cliente.get("/api/escenarios/no-existe")
    assert r.status_code == 404 and "no-existe" in r.json()["mensaje"]


def test_tipos_traen_observable_y_no_exponen_producto(cliente_demo):
    r = cliente_demo.get("/api/tipos")
    tipos = {t["id"]: t for t in r.json()}
    assert all(t["observable"] for t in tipos.values())
    assert tipos["humedales"]["observable"] == "σ⁰ HH y HV (dB)"
    for t in tipos.values():
        assert "producto" not in t
    # El producto de NISAR (GCOV/GUNW/GOFF) no se verificó con la documentación oficial: no sale de la API.
    assert not any(p in r.text for p in ("GCOV", "GUNW", "GOFF"))
