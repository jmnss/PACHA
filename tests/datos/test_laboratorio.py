"""Laboratorio del radar: determinismo, cobertura exacta y honestidad (todo sintético)."""
import numpy as np
import pytest

from datos import laboratorio as lab
from datos.contrato import EntradaNoValida


def test_nubes_es_determinista():
    a, b = lab.nubes(40, 3), lab.nubes(40, 3)
    assert np.array_equal(a["capas"]["optico"].datos, b["capas"]["optico"].datos)


@pytest.mark.parametrize("pct", [0, 25, 60, 100])
def test_cobertura_exacta(pct):
    assert lab.nubes(pct)["cobertura_real"] == pytest.approx(pct / 100, abs=1 / lab.N ** 2)


def test_el_radar_no_depende_de_las_nubes():
    assert lab.nubes(0)["porcentaje_radar"] == lab.nubes(100)["porcentaje_radar"]
    assert np.array_equal(lab.nubes(0)["capas"]["radar"].datos, lab.nubes(100)["capas"]["radar"].datos)


def test_el_optico_pierde_con_las_nubes_y_nunca_ve_bajo_el_dosel():
    p = [lab.nubes(c)["porcentaje_optico"] for c in (0, 30, 60, 100)]
    assert p == sorted(p, reverse=True) and p[-1] == 0
    assert p[0] < lab.nubes(0)["porcentaje_radar"]


def test_todo_es_sintetico_con_origen():
    r = lab.nubes(10)
    assert r["origen"].tipo == "sintetico" and all(c.origen.tipo == "sintetico" for c in r["capas"].values())
    assert lab.respuesta("S", "HV")["capa"].origen.tipo == "sintetico"


def test_respuesta_calcula_la_polarizacion_que_resalta():
    c = {x["cambio"]: x["mejor_pol"] for x in lab.respuesta("L", "HH")["cambios"]}
    assert c["Inundación bajo dosel"] == "HH" and c["Quema del bosque"] == "HV"


def test_banda_s_lleva_aviso():
    assert "pendiente de confirmar" in lab.respuesta("S", "HH")["aviso_banda"]
    assert lab.respuesta("L", "HH")["aviso_banda"] is None


@pytest.mark.parametrize("args", [("X", "HH"), ("L", "ZZ")])
def test_entradas_invalidas(args):
    with pytest.raises(EntradaNoValida):
        lab.respuesta(*args)


def test_cobertura_fuera_de_rango():
    with pytest.raises(EntradaNoValida):
        lab.nubes(120)


def test_las_falsas_alarmas_del_radar_se_muestran_y_se_cuentan():
    r = lab.nubes(0)
    cambio = r["capas"]["cambio_radar"].datos
    assert (cambio == 5).any()  # el moteado produce píxeles sin cambio marcados como cambio
    m = {x.etiqueta: x for x in r["metricas"]}["Falsas alarmas del radar"]
    assert 0 < float(m.valor.replace(",", ".")) < 20
