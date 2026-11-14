import json
from pathlib import Path

DORADO = json.loads((Path(__file__).parent.parent / "modelo" / "dorados.json").read_text(encoding="utf-8"))["resumen"]


def test_la_segua_coincide_con_dorado(cliente_demo):
    r = cliente_demo.get("/api/contexto", params={"lat": -0.70, "lon": -80.20, "fecha": "2026-05-01"})
    assert r.status_code == 200
    c = r.json()
    assert c["region"] == DORADO["region"]
    assert c["provincia"] == DORADO["provincia"]
    assert c["estacion_astronomica"]["estacion"] == DORADO["estacion"]
    assert c["temporada"]["temporada"] == DORADO["temporada"]
    assert round(c["humedad_suelo"], 3) == DORADO["humedad_suelo"]
    assert c["origen"]["tipo"] == "real"
    assert "NASA POWER" in c["origen"]["fuente"]
    assert len(c["clima_mensual"]) == 12 and c["mes_actual"] == 5


def test_el_contexto_es_real_aunque_el_proveedor_sea_demo(cliente_demo):
    # No activa la banda de demostración: el origen del contexto es "real" y no es NISAR.
    r = cliente_demo.get("/api/contexto", params={"lat": -0.70, "lon": -80.20})
    assert r.status_code == 200 and r.json()["origen"]["tipo"] == "real"


def test_fuera_de_malla_es_null_con_200(cliente_demo):
    r = cliente_demo.get("/api/contexto", params={"lat": 40.0, "lon": -3.7, "fecha": "2026-05-01"})
    assert r.status_code == 200
    assert r.json() is None


def test_fecha_invalida_422(cliente_demo):
    r = cliente_demo.get("/api/contexto", params={"lat": -0.7, "lon": -80.2, "fecha": "no-es-fecha"})
    assert r.status_code == 422
    assert "mensaje" in r.json()


def test_lat_lon_fuera_de_rango_422(cliente_demo):
    assert cliente_demo.get("/api/contexto", params={"lat": 95, "lon": 0}).status_code == 422
    assert cliente_demo.get("/api/contexto", params={"lat": 0, "lon": 200}).status_code == 422
    assert cliente_demo.get("/api/contexto", params={"lon": 0}).status_code == 422


def test_sello_del_contexto_lleva_fecha_fija_de_preparacion(cliente_demo):
    a = cliente_demo.get("/api/contexto", params={"lat": -0.70, "lon": -80.20}).json()["origen"]
    b = cliente_demo.get("/api/contexto", params={"lat": -0.70, "lon": -80.20}).json()["origen"]
    assert a["fecha_generacion"] == b["fecha_generacion"]
    assert a["fecha_generacion"].startswith("2026-11-01")
