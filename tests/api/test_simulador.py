"""API del simulador de eventos (sintético, sin red: usar_dem=false)."""
import pytest

MUNDO = {"lat": -1.40, "lon": -78.45, "extension_km": 60, "fecha": "2026-08-15", "usar_dem": False, "ciudades": []}


def evento(herramienta="terremoto", celda=(60, 60), parametros=None, mundo=None):
    return {"mundo": mundo or MUNDO, "herramienta": herramienta, "celda": list(celda), "parametros": parametros or {}}


def test_catalogo(cliente_demo):
    r = cliente_demo.get("/api/simulador/catalogo")
    assert r.status_code == 200
    c = r.json()
    assert len(c["herramientas"]) == 6 and len(c["mundos"]) == 8 and c["extensiones_km"][0] == 20


def test_mundo_con_origen_sintetico(cliente_demo):
    r = cliente_demo.post("/api/simulador/mundo", json=MUNDO)
    assert r.status_code == 200
    d = r.json()
    assert d["origen"]["tipo"] == "sintetico" and d["relieve_png_b64"] and d["n"] == 128
    assert cliente_demo.post("/api/simulador/mundo", json=MUNDO).json()["id"] == d["id"]


def test_evento_completo_con_paneles_de_radar(cliente_demo):
    r = cliente_demo.post("/api/simulador/evento", json=evento())
    assert r.status_code == 200, r.text
    e = r.json()
    assert e["origen"]["tipo"] == "sintetico" and e["cuadros_png_b64"]
    assert e["paneles"] and all(p["origen"]["tipo"] == "sintetico" for p in e["paneles"])
    assert e["espera_radar"]["verificado"] is False


def test_fuera_de_ecuador_422_en_espanol(cliente_demo):
    r = cliente_demo.post("/api/simulador/mundo", json={**MUNDO, "lat": 40.0, "lon": -3.7})
    assert r.status_code == 422 and "fuera de Ecuador" in r.json()["mensaje"]


def test_parametro_fuera_de_rango_422(cliente_demo):
    r = cliente_demo.post("/api/simulador/evento", json=evento("incendio", parametros={"viento_ms": 99}))
    assert r.status_code == 422 and "viento_ms" in r.json()["mensaje"]


def test_celda_fuera_de_malla_422(cliente_demo):
    r = cliente_demo.post("/api/simulador/evento", json=evento(celda=(500, 5)))
    assert r.status_code == 422 and "celda" in r.json()["mensaje"]


def test_demasiadas_ciudades_422(cliente_demo):
    ciudades = [{"nombre": f"C{i}", "lat": -1.4, "lon": -78.4, "habitantes": 1000} for i in range(9)]
    r = cliente_demo.post("/api/simulador/mundo", json={**MUNDO, "ciudades": ciudades})
    assert r.status_code == 422


def test_herramienta_desconocida_422(cliente_demo):
    assert cliente_demo.post("/api/simulador/evento", json=evento("meteorito")).status_code == 422


def test_fundar_ciudad_devuelve_el_mundo_con_la_ciudad(cliente_demo):
    r = cliente_demo.post("/api/simulador/ciudad", json={"mundo": MUNDO, "celda": [60, 60], "nombre": "Nueva Esperanza", "habitantes": 50000})
    assert r.status_code == 200
    assert r.json()["ciudades"][0]["nombre"] == "Nueva Esperanza"


def test_funciona_con_cualquier_proveedor(cliente_real):
    # El simulador es sintético por naturaleza: no depende de NISAR_PROVEEDOR.
    assert cliente_real.get("/api/simulador/catalogo").status_code == 200
