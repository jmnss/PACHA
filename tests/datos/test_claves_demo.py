"""Las plantillas de `datos/claves_demo.py` siguen el texto que escribe `modelo/` (solo se lee)."""
from datos.claves import buscar_texto
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
