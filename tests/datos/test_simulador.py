"""Simulador de eventos: mundos y eventos sintéticos, deterministas y sin red (usar_dem=False)."""
from datetime import date

import pytest
from pydantic import ValidationError

from datos import simulador
from datos.contrato import EntradaNoValida
from datos.simulador import PeticionMundo

FECHA = date(2026, 8, 15)


def mundo(**kw):
    base = dict(lat=-1.40, lon=-78.45, extension_km=60, fecha=FECHA, usar_dem=False)
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


# --- Eventos ----------------------------------------------------------------------------------------

from datos.simulador import PeticionEvento  # noqa: E402


def evento(herramienta, celda=(80, 80), parametros=None, **kw):
    return simulador.desatar(PeticionEvento(mundo=mundo(**kw), herramienta=herramienta, celda=celda,
                                            parametros=parametros or {}))


def celda_en_tierra():
    m, _ = simulador.crear(mundo())
    i, j = next((i, j) for i in range(50, 80) for j in range(50, 80) if not m.mar[i, j])
    return (i, j)


@pytest.mark.parametrize("herramienta", ["incendio", "tormenta", "inundacion", "terremoto", "erupcion"])
def test_cada_herramienta_devuelve_cuadros_y_origen_sintetico(herramienta):
    rapidos = {"tormenta": {"duracion_h": 2}, "inundacion": {"duracion_h": 2}}
    ev = evento(herramienta, celda_en_tierra(), rapidos.get(herramienta))
    assert ev["origen"].tipo == "sintetico"
    assert ev["cuadros_png_b64"] and len(ev["cuadros_png_b64"]) == len(ev["tiempos"]) <= 48
    assert ev["metricas"] and ev["paneles"]
    assert all(p.origen.tipo == "sintetico" for p in ev["paneles"])


def test_incendio_es_comparable_en_hv():
    ev = evento("incendio", celda_en_tierra())
    assert ev["comparable"] is True and ev["polarizacion"] == "HV"


def test_paneles_llevan_su_titulo():
    ev = evento("incendio", celda_en_tierra())
    assert len(ev["titulos_paneles"]) == len(ev["paneles"]) and "HV antes" in ev["titulos_paneles"][0]


def test_terremoto_no_comparable():
    assert evento("terremoto", celda_en_tierra())["comparable"] is False


def test_espera_radar_determinista_y_no_verificada():
    a = evento("incendio", celda_en_tierra(), {"horas": 12})
    b = evento("incendio", celda_en_tierra(), {"horas": 12})
    assert a["espera_radar"] == b["espera_radar"]
    e = a["espera_radar"]
    assert e["verificado"] is False and e["ciclo_dias"] == 12 and e["medio_dias"] == 6.0
    assert (e["minimo_dias"], e["maximo_dias"], e["duracion_evento_h"]) == (0, 12, 12.0)
    assert not any("días después del evento" in n for n in a["notas"])


def test_evento_determinista_por_semilla():
    a = evento("incendio", celda_en_tierra(), {"semilla": 3})
    b = evento("incendio", celda_en_tierra(), {"semilla": 3})
    assert a["cuadros_png_b64"] == b["cuadros_png_b64"]


def test_celda_fuera_de_malla_rechazada():
    with pytest.raises(EntradaNoValida, match="celda"):
        evento("incendio", (999, 5))


def test_herramienta_desconocida_rechazada():
    with pytest.raises(EntradaNoValida, match="herramienta"):
        evento("meteorito")


def test_valueerror_del_modelo_se_vuelve_entrada_no_valida(monkeypatch):
    def falla(*a, **k):
        raise ValueError("No hay combustible en este mundo.")
    monkeypatch.setitem(simulador.desastres.DESASTRES, "incendio", falla)
    with pytest.raises(EntradaNoValida, match="combustible"):
        evento("incendio", celda_en_tierra(), {"semilla": 11})


def test_parametro_fuera_de_rango_rechazado():
    with pytest.raises(EntradaNoValida, match="viento_ms"):
        evento("incendio", celda_en_tierra(), {"viento_ms": 99})
    with pytest.raises(EntradaNoValida, match="no existe"):
        evento("incendio", celda_en_tierra(), {"inventado": 1})
    with pytest.raises(EntradaNoValida, match="mecanismo"):
        evento("terremoto", celda_en_tierra(), {"mecanismo": "mágico"})


def test_ciudad_en_el_mar_rechazada_y_en_tierra_agrega():
    m, _ = simulador.crear(mundo())
    i, j = celda_en_tierra()
    nueva = simulador.fundar_ciudad(mundo(), i, j, "Nueva Esperanza", 50_000)
    assert len(nueva.ciudades) == 1 and nueva.ciudades[0].nombre == "Nueva Esperanza"
