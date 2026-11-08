"""Las plantillas de `datos/claves_demo.py` siguen el texto que escribe `modelo/` (solo se lee)."""
import re

import numpy as np
import pytest

from datos.claves import REGISTRO, buscar_texto, reconocer
from datos.claves_demo import COBERTURAS_ES, PELIGROS_ES, PERCEPCIONES_ES
from modelo import desastres
from modelo.desastres import _fmt


def test_coberturas_copiadas_coinciden_con_el_modelo():
    assert COBERTURAS_ES == tuple(c["nombre"] for c in desastres.COBERTURAS.values())


def test_celdas_de_percepcion_y_peligro_se_reconocen():
    for t in (*COBERTURAS_ES, *PERCEPCIONES_ES, *PELIGROS_ES):
        assert buscar_texto("api.sim.celda.", t) is not None, t


def test_modelos_de_la_erupcion_se_reconocen_con_punto_decimal():
    tc = buscar_texto("api.sim.celda.", f"Cono de energía H/L = {0.3:.2f}, Hc = {3000:.0f} m")
    assert tc.valores_texto == {"hl_punto": 0.3, "hc": 3000.0} and tc.decimales_texto == {"hl_punto": 2, "hc": 0}
    assert buscar_texto("api.sim.celda.", f"LAHARZ, V = {10:g} hm³ por cauce").valores_texto == {"v_punto": 10.0}
    assert buscar_texto("api.sim.celda.", f"LAHARZ, V = {2.5:g} hm³ por cauce").valores_texto == {"v_punto": 2.5}


def test_notas_de_marejada_y_tsunami_se_reconocen():
    marejada = f"Nivel del mar elevado hasta {_fmt(2.5, 1)} m durante {_fmt(12)} h (pulso senoidal)."
    assert buscar_texto("api.sim.nota.", marejada).valores_texto == {"m": 2.5, "h": 12.0}
    tsunami = (f"Tsunami: el levantamiento del fondo marino (hasta {_fmt(3.4, 1)} m) "
               "se propaga con aguas someras; la batimetría se limita a 1 500 m para acelerar el cálculo. "
               "La mortalidad de Jonkman (zona restante) subestima la de un tsunami.")
    assert buscar_texto("api.sim.nota.", tsunami).valores_texto == {"m": 3.4}


def reconstruir(tc) -> str:
    """Texto en español que resulta de rellenar la plantilla de `tc` con sus valores y decimales (ida y vuelta)."""
    d = tc if isinstance(tc, dict) else tc.model_dump()
    dec = d.get("decimales_texto") or {}
    val = d.get("valores_texto") or {}

    def trozo(m):
        k = m.group(1)
        v = val[k]
        if k.startswith("fecha"):
            a, mes, dia = v.split("-")
            return f"{dia}/{mes}/{a}"
        n = dec.get(k, 0)
        if k.endswith("_punto"):
            return f"{v:+.{n}f}" if k.endswith("_signo_punto") else f"{v:.{n}f}"
        return f"{v:,.{n}f}".replace(",", " ").replace(".", ",")
    return re.sub(r"\{(\w+)\}", trozo, REGISTRO[d["clave_texto"]])


def test_reconstruir_es_la_inversa_de_buscar_texto():
    for t in ("Lluvia de 150,0 mm", "Media · Velocidad · 27/12/2026", "Vector +0.64 m", "Volumen 1 500 hm³"):
        assert t  # solo documenta los casos; las pruebas reales usan las plantillas registradas
    tc = buscar_texto("api.sim.nota.", "Nivel del mar elevado hasta 2,5 m durante 12 h (pulso senoidal).")
    assert reconstruir(tc) == "Nivel del mar elevado hasta 2,5 m durante 12 h (pulso senoidal)."


def test_marcador_repetido_exige_el_mismo_texto():
    assert reconocer("La celda ({i}, {j}) queda fuera de la malla de {n}×{n}.", "La celda (3, 4) queda fuera de la malla de 128×128.") == {"i": 3, "j": 4, "n": 128}
    assert reconocer("La celda ({i}, {j}) queda fuera de la malla de {n}×{n}.", "La celda (3, 4) queda fuera de la malla de 128×64.") is None
    assert reconocer(REGISTRO["api.error.celda_fuera_malla"], "La celda (3, 4) queda fuera de la malla de 128×64.") is None


def test_fecha_inexistente_no_encaja():
    assert reconocer("Media · {fecha}", "Media · 29/02/2024") == {"fecha": "2024-02-29"}
    assert reconocer("Media · {fecha}", "Media · 31/02/2024") is None


def test_miles_solo_con_espacio_y_ascii():
    assert reconocer("{v} m", "1 500 m") == {"v": 1500}
    assert reconocer("{v} m", "1\u2009500 m") == {"v": 1500}
    assert reconocer("{v} m", "1\n500 m") is None
    assert reconocer("{v} m", "١٢ m") is None   # dígitos no ASCII: no son cifras del modelo
