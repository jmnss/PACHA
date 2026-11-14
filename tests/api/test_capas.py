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


def test_antes_posterior_a_despues_422_con_mensaje(cliente_demo):
    # Solo el demo valida el orden: el proveedor ficticio de pruebas no lo exige.
    cliente = cliente_demo
    esc, a, d = _par(cliente)
    for ruta, extra in (("cambio", {}), ("medicion", {"punto": [0.5, 0.5]})):
        r = cliente.post(f"/api/escenarios/{esc['id']}/{ruta}", json={"antes": d, "despues": a, **extra})
        assert r.status_code == 422, ruta
        assert "posterior" in r.json()["mensaje"]


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


# --- serie de la selección -------------------------------------------------------------------

def test_serie_seleccion_punto(cliente_demo):
    r = cliente_demo.get("/api/escenarios/ec_la_segua/serie-seleccion?punto=0.5,0.5")
    assert r.status_code == 200
    s = r.json()
    assert len({p[2] for p in s["puntos"]}) == 1
    assert len(s["puntos"]) >= 20
    assert s["origen"]["tipo"] == "sintetico"


def test_serie_seleccion_punto_y_cuadrante(cliente_demo):
    r = cliente_demo.get("/api/escenarios/ec_la_segua/serie-seleccion?punto=0.5,0.5&cuadrante=0.2,0.2,0.6,0.6")
    assert r.status_code == 200
    assert len({p[2] for p in r.json()["puntos"]}) == 2


def _valores(serie) -> list[float]:
    return [round(float(p[1]), 6) for p in serie["puntos"]] if isinstance(serie, dict) else \
        [round(float(p[1]), 6) for p in serie.puntos]


def _malla(prov, id):
    esc = prov.escenario(id)
    pol = esc.polarizaciones[0] if esc.polarizaciones else None
    return prov.capa(id, esc.adquisiciones[0].id, esc.variables[0], pol).datos.shape


def test_serie_seleccion_punto_no_cruza_x_e_y(cliente_demo):
    from datos.proveedores.demo import ProveedorDemostracion
    prov = ProveedorDemostracion()
    ny, nx = _malla(prov, "ec_la_segua")
    x, y = 0.2, 0.8
    esperado = prov.serie_seleccion("ec_la_segua", punto=(int(y * ny), int(x * nx)))   # fila = y, columna = x
    cruzado = prov.serie_seleccion("ec_la_segua", punto=(int(x * ny), int(y * nx)))
    assert _valores(esperado) != _valores(cruzado)   # la prueba distingue el cruce
    r = cliente_demo.get(f"/api/escenarios/ec_la_segua/serie-seleccion?punto={x},{y}")
    assert _valores(r.json()) == _valores(esperado)


def test_serie_seleccion_cuadrante_asimetrico_no_cruza_x_e_y(cliente_demo):
    import math
    from datos.proveedores.demo import ProveedorDemostracion
    prov = ProveedorDemostracion()
    ny, nx = _malla(prov, "ec_la_segua")
    x0, y0, x1, y1 = 0.1, 0.5, 0.3, 0.9
    cuad = (int(math.floor(y0 * ny)), int(math.ceil(y1 * ny)), int(math.floor(x0 * nx)), int(math.ceil(x1 * nx)))
    cruzado = (int(math.floor(x0 * ny)), int(math.ceil(x1 * ny)), int(math.floor(y0 * nx)), int(math.ceil(y1 * nx)))
    esperado = prov.serie_seleccion("ec_la_segua", cuadrante=cuad)
    assert _valores(esperado) != _valores(prov.serie_seleccion("ec_la_segua", cuadrante=cruzado))
    r = cliente_demo.get(f"/api/escenarios/ec_la_segua/serie-seleccion?cuadrante={x0},{y0},{x1},{y1}")
    assert _valores(r.json()) == _valores(esperado)


@pytest.mark.parametrize("consulta", ["punto=1.2,0.5", "cuadrante=0.3,0.3,0.3,0.6", "", "punto=a,b",
                                      "punto=0.5", "cuadrante=0.1,0.2,0.3"])
def test_serie_seleccion_valida(cliente_demo, consulta):
    r = cliente_demo.get(f"/api/escenarios/ec_la_segua/serie-seleccion?{consulta}")
    assert r.status_code == 422
    assert r.json()["mensaje"]


def test_serie_seleccion_mar_vacia(cliente_demo):
    r = cliente_demo.get("/api/escenarios/ec_pedernales/serie-seleccion?cuadrante=0,0,0.1,0.1")
    assert r.status_code == 200
    assert r.json()["puntos"] == []


def test_serie_seleccion_sin_capacidad(cliente_ficticio):
    esc = cliente_ficticio.get("/api/escenarios").json()[0]
    r = cliente_ficticio.get(f"/api/escenarios/{esc['id']}/serie-seleccion?punto=0.5,0.5")
    assert r.status_code == 409


def test_cambio_de_agricultura_trae_textos_de_la_tabla(cliente_demo):
    esc = next(e for e in cliente_demo.get("/api/escenarios").json() if e["id"] == "ec_daule")
    ids = [a["id"] for a in esc["adquisiciones"]]
    r = cliente_demo.post("/api/escenarios/ec_daule/cambio", json={"antes": ids[0], "despues": ids[-1]})
    assert r.status_code == 200
    t = r.json()["tablas"][0]
    assert t["titulo_texto"]["clave_texto"] == "api.obs.titulo_tabla.resultados_por_parcela"
    assert len(t["columnas_texto"]) == len(t["columnas"]) and len(t["celdas_texto"]) == len(t["filas"])


def test_cambio_de_terremoto_trae_notas_texto_con_cifras(cliente_demo):
    esc = next(e for e in cliente_demo.get("/api/escenarios").json() if e["id"] == "ec_pedernales")
    ids = [a["id"] for a in esc["adquisiciones"]]
    r = cliente_demo.post("/api/escenarios/ec_pedernales/cambio", json={"antes": ids[0], "despues": ids[-1]})
    j = r.json()
    assert j["notas_texto"][0]["clave_texto"] == "api.plantilla.nota.pedernales_los" and j["notas_texto"][1] is None


def test_medicion_trae_textos_y_la_fecha_del_glaciar_en_iso(cliente_demo):
    esc = next(e for e in cliente_demo.get("/api/escenarios").json() if e["id"] == "ec_antisana")
    ids = [a["id"] for a in esc["adquisiciones"]]
    r = cliente_demo.post("/api/escenarios/ec_antisana/medicion", json={"antes": ids[0], "despues": ids[-1], "cuadrante": [0.3, 0.3, 0.7, 0.7]})
    j = r.json()
    assert len(j["textos"]) == len(j["tabla"])
    con_fecha = [m for m in j["metricas"] if m["etiqueta"].startswith("Media · Velocidad ·")]
    assert con_fecha and con_fecha[0]["clave_texto"] == "api.obs.metrica.media_velocidad_fecha"
    assert len(con_fecha[0]["valores_texto"]["fecha"]) == 10
