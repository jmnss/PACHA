"""Simulador de eventos: mundos y eventos sintéticos, deterministas y sin red (usar_dem=False)."""
from datetime import date

import pytest
from pydantic import ValidationError

from datos import simulador
from datos.contrato import EntradaNoValida
from datos.simulador import PeticionMundo

FECHA = date(2026, 8, 15)


def mundo(**kw):
    base = dict(lat=-1.40, lon=-78.45, extension_km=20, fecha=FECHA, usar_dem=False)
    return PeticionMundo(**{**base, **kw})


def test_catalogo_trae_seis_herramientas_y_ocho_mundos():
    c = simulador.catalogo()
    assert [h["id"] for h in c["herramientas"]] == ["incendio", "tormenta", "inundacion", "terremoto", "erupcion", "ciudad"]
    assert len(c["mundos"]) == 8
    assert c["extensiones_km"] == [20, 30, 40, 60, 80, 120]
    inc = next(h for h in c["herramientas"] if h["id"] == "incendio")
    viento = next(x for x in inc["controles"] if x["id"] == "viento_ms")
    assert (viento["minimo"], viento["maximo"], viento["defecto"]) == (0.0, 20.0, 6.0)


def test_crear_mundo_es_determinista():
    _, a = simulador.crear(mundo())
    _, b = simulador.crear(mundo())
    assert a["id"] == b["id"] and a["relieve_png_b64"] == b["relieve_png_b64"]
    assert a["n"] == simulador.N_MALLA and len(a["bbox"]) == 4


def test_origen_sintetico_y_fuente_del_relieve_declarada():
    _, d = simulador.crear(mundo())
    assert d["origen"].tipo == "sintetico"
    assert "sintético" in d["fuente_dem"]


def test_fuera_de_ecuador_rechazado():
    with pytest.raises(EntradaNoValida, match="fuera de Ecuador"):
        simulador.crear(mundo(lat=40.0, lon=-3.7))


def test_extension_no_permitida_rechazada():
    with pytest.raises(EntradaNoValida, match="lado"):
        simulador.crear(mundo(extension_km=7))


def test_mas_de_8_ciudades_rechazado():
    ciudades = [dict(nombre=f"C{i}", lat=-1.4, lon=-78.4, habitantes=1000) for i in range(9)]
    with pytest.raises((EntradaNoValida, ValidationError)):
        simulador.crear(mundo(ciudades=ciudades))
