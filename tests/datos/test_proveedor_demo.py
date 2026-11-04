"""Pruebas del proveedor de demostración (datos/proveedores/demo.py)."""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pytest

from datos.contrato import CapaRaster, CapacidadNoDisponible, Medicion, ProveedorDatos, ResultadoCambio
from datos.generador import ESCENARIOS_DEMO, PARAMETROS_DEMO, generar_escena
from datos.proveedores.demo import ProveedorDemostracion
from modelo import nisar

DORADOS = json.loads((Path(__file__).parents[1] / "modelo" / "dorados.json").read_text(encoding="utf-8"))["sitios"]


@pytest.fixture(scope="module")
def prov() -> ProveedorDemostracion:
    return ProveedorDemostracion()


def _por_defecto(prov, esc_id):
    return prov.intervalo_por_defecto(esc_id)


def test_cumple_el_protocolo_y_las_capacidades(prov):
    assert isinstance(prov, ProveedorDatos)
    assert prov.nombre() == "demo"
    for e in prov.escenarios():
        assert (e.capacidades.simulacion, e.capacidades.modelo_continuo, e.capacidades.verdad_terreno) == (True, True, True)


def test_escenarios_son_seis_y_sinteticos(prov):
    esc = prov.escenarios()
    assert [e.id for e in esc] == list(ESCENARIOS_DEMO)
    assert len(esc) == 6
    for e in esc:
        assert e.id.startswith("ec_")
        assert e.origen.tipo == "sintetico"
        assert e.historia == ESCENARIOS_DEMO[e.id]["historia"]
        assert e.resolucion_m > 0
        assert len(e.adquisiciones) == 30
        ids = [a.id for a in e.adquisiciones]
        assert len(set(ids)) == 30
        for a in e.adquisiciones:
            assert a.instante.utcoffset() == timedelta(0)
            assert a.direccion_orbital == "Ascendente"
    assert prov.escenario("ec_loja").tipo_cambio == "incendios"
    with pytest.raises(KeyError):
        prov.escenario("no_existe")


def test_polarizaciones_segun_el_tipo(prov):
    assert prov.escenario("ec_la_segua").polarizaciones == ["HH", "HV"]
    assert prov.escenario("ec_daule").polarizaciones == ["HH", "HV"]
    assert prov.escenario("ec_pedernales").polarizaciones == []


def test_cambio_la_segua_coincide_con_dorados(prov):
    antes, despues = _por_defecto(prov, "ec_la_segua")
    r = prov.cambio("ec_la_segua", antes, despues, None)
    assert isinstance(r, ResultadoCambio)
    mostradas = [f"{m.valor} {m.unidad}".strip() for m in r.metricas]
    assert mostradas == [v for _, v in DORADOS["ec_la_segua"]["metricas"]]
    assert [m.etiqueta for m in r.metricas] == [e for e, _ in DORADOS["ec_la_segua"]["metricas"]]
    assert float(np.nansum(r.cambio.datos)) == pytest.approx(DORADOS["ec_la_segua"]["paneles"]["Cambio de inundación"])
    assert r.cambio.paleta == "categorias" and r.cambio.leyenda
    for capa in (r.antes, r.despues, r.cambio):
        assert capa.origen.tipo == "sintetico"
        assert capa.escenario_id == "ec_la_segua"
    assert r.origen.tipo == "sintetico"
    assert r.series and all(s.origen.tipo == "sintetico" for s in r.series)
    assert all(p[0].tzinfo is not None for s in r.series for p in s.puntos)


@pytest.mark.parametrize("esc_id", list(ESCENARIOS_DEMO))
def test_cambio_de_los_seis_coincide_con_dorados(prov, esc_id):
    antes, despues = _por_defecto(prov, esc_id)
    r = prov.cambio(esc_id, antes, despues, None)
    assert [f"{m.valor} {m.unidad}".strip() for m in r.metricas] == [v for _, v in DORADOS[esc_id]["metricas"]]
    for capa in (r.antes, r.despues, r.cambio) + ((r.clasificacion,) if r.clasificacion else ()):
        assert capa.datos.dtype == np.float32
        assert not np.isinf(capa.datos).any()
        assert capa.paleta in ("gris", "secuencial", "divergente", "ciclico", "categorias")


def test_capa_normaliza_nan_y_rango_comun(prov):
    e = prov.escenario("ec_pedernales")
    a0, a1 = e.adquisiciones[0].id, e.adquisiciones[5].id
    c0 = prov.capa("ec_pedernales", a0, "desplazamiento_los", None)
    c1 = prov.capa("ec_pedernales", a1, "desplazamiento_los", None)
    assert np.isnan(c0.datos).any()  # píxeles incoherentes = sin dato
    assert (c0.vmin, c0.vmax) == (c1.vmin, c1.vmax)
    assert c0.paleta == "divergente" and c0.unidad == "cm" and c0.polarizacion is None
    assert np.isfinite(c0.datos).any()


def test_capa_validaciones(prov):
    e = prov.escenario("ec_la_segua")
    a = e.adquisiciones[0].id
    assert prov.capa("ec_la_segua", a, "sigma0", "HV").polarizacion == "HV"
    assert prov.capa("ec_la_segua", a, "sigma0", None).polarizacion == "HH"
    with pytest.raises(ValueError, match="polarización"):
        prov.capa("ec_la_segua", a, "sigma0", "VV")
    with pytest.raises(ValueError, match="variable"):
        prov.capa("ec_la_segua", a, "nada", None)
    with pytest.raises(KeyError):
        prov.capa("ec_la_segua", "no-existe", "sigma0", None)
    with pytest.raises(ValueError, match="después"):
        prov.cambio("ec_la_segua", e.adquisiciones[5].id, e.adquisiciones[2].id, None)


def test_simular_con_parametros_devuelve_origen_con_parametros(prov):
    e = prov.simular("ec_la_segua", {"semilla": 3, "orbita": "Descendente", "fraccion_inundada": 30})
    assert e.origen.tipo == "sintetico"
    assert e.origen.semilla == 3
    assert "semilla=3" in e.origen.notas and "fraccion_inundada" in e.origen.notas
    assert {a.direccion_orbital for a in e.adquisiciones} == {"Descendente"}
    assert e.id.startswith("ec_la_segua~")
    base = prov.simular("ec_la_segua", {})
    assert base.id == "ec_la_segua"  # parámetros vacíos o iguales a los de demostración = escena por defecto
    assert prov.simular("ec_la_segua", {"semilla": 7, "orbita": "Ascendente"}).id == "ec_la_segua"
    assert base.origen.semilla == PARAMETROS_DEMO["semilla"]


def test_simular_valida_rangos_en_espanol(prov):
    with pytest.raises(ValueError, match="Superficie inundada"):
        prov.simular("ec_la_segua", {"fraccion_inundada": 95})
    with pytest.raises(ValueError, match="Mecanismo de la falla"):
        prov.simular("ec_pedernales", {"rake": 45})
    with pytest.raises(ValueError, match="Hora de ignición"):
        prov.simular("ec_loja", {"hora_evento": 25})
    with pytest.raises(ValueError, match="orbita"):
        prov.simular("ec_loja", {"orbita": "Polar"})
    with pytest.raises(ValueError, match="desconocido"):
        prov.simular("ec_loja", {"fraccion_inundada": 30})  # control de otro tipo
    with pytest.raises(ValueError, match="número"):
        prov.simular("ec_loja", {"radio_km": "grande"})
    with pytest.raises(ValueError):
        prov.simular("ec_loja", {"radio_km": float("nan")})
    with pytest.raises(ValueError, match="lat"):
        prov.simular("ec_loja", {"lat": -1.0})  # lat sin lon
    with pytest.raises(ValueError, match="lat"):
        prov.simular("ec_loja", {"lat": 95.0, "lon": -80.0})


def test_simular_en_punto_del_mapa_usa_sitio_en_mapa(prov):
    lat, lon = -0.70, -80.20  # Manabí
    e = prov.simular("ec_la_segua", {"lat": lat, "lon": lon})
    assert e.nombre == "Punto en Manabí"
    o, s, es, n = e.bbox
    assert o < lon < es and s < lat < n
    assert abs((o + es) / 2 - lon) < 1e-6 and abs((s + n) / 2 - lat) < 1e-6
    base = prov.escenario("ec_la_segua")
    assert [a.id for a in e.adquisiciones] == [a.id for a in base.adquisiciones]  # misma fecha de referencia
    assert e.tipo_cambio == "humedales" and e.id.startswith("ec_la_segua~")
    assert e.origen.tipo == "sintetico" and "lat" in e.origen.notas


def test_fotogramas_respetan_el_paso(prov):
    t0 = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    caps = prov.fotogramas("ec_loja", {}, t0, t0 + timedelta(hours=6), 60)
    assert len(caps) == 7
    assert all(isinstance(c, CapaRaster) for c in caps)
    assert len({(c.vmin, c.vmax) for c in caps}) == 1
    assert all(c.origen.tipo == "sintetico" for c in caps)
    assert all(c.adquisicion_id is None for c in caps)
    instantes = [c.instante for c in caps]
    assert instantes[0] == t0 and all(i.utcoffset() == timedelta(0) for i in instantes)
    assert [b - a for a, b in zip(instantes, instantes[1:])] == [timedelta(minutes=60)] * 6
    assert len(prov.fotogramas("ec_loja", {}, t0, t0 + timedelta(minutes=90), 60)) == 2  # sin pasarse del fin
    assert prov.fotogramas("ec_loja", {}, t0, t0, 30)[0].datos.shape[0] > 0


def test_fotogramas_validaciones_y_parametros(prov):
    t0 = datetime(2026, 9, 10, 0, 0, tzinfo=timezone.utc)
    with pytest.raises(ValueError, match="zona"):
        prov.fotogramas("ec_loja", {}, datetime(2026, 9, 10), t0 + timedelta(hours=1), 60)
    with pytest.raises(ValueError, match="paso"):
        prov.fotogramas("ec_loja", {}, t0, t0 + timedelta(hours=1), 0)
    with pytest.raises(ValueError, match="fin"):
        prov.fotogramas("ec_loja", {}, t0 + timedelta(hours=1), t0, 60)
    with pytest.raises(ValueError, match="fotogramas"):
        prov.fotogramas("ec_loja", {}, t0, t0 + timedelta(days=365), 1)
    t1 = t0 + timedelta(days=1)
    a = prov.fotogramas("ec_loja", {}, t1, t1, 60)[0]
    b = prov.fotogramas("ec_loja", {"radio_km": 1.0}, t1, t1, 60)[0]
    assert not np.array_equal(np.nan_to_num(a.datos), np.nan_to_num(b.datos))
    assert "radio_km" in b.origen.notas


def test_medir_cuadrante_y_punto(prov):
    antes, despues = _por_defecto(prov, "ec_la_segua")
    m = prov.medir("ec_la_segua", antes, despues, cuadrante=(10, 40, 20, 60))
    assert isinstance(m, Medicion) and m.cuadrante == (10, 40, 20, 60)
    assert m.metricas[0].etiqueta == "Área del cuadrante" and m.metricas[0].unidad == "km²"
    assert m.tabla and {"Capa", "Medida", "Valor"} <= set(m.tabla[0])
    assert m.origen.tipo == "sintetico"
    p = prov.medir("ec_la_segua", antes, despues, punto=(30, 40))
    assert p.punto == (30, 40) and p.tabla and p.tabla[0]["Capa"]
    with pytest.raises(ValueError):
        prov.medir("ec_la_segua", antes, despues)
    with pytest.raises(ValueError):
        prov.medir("ec_la_segua", antes, despues, cuadrante=(0, 1, 0, 1), punto=(0, 0))
    with pytest.raises(ValueError, match="fuera"):
        prov.medir("ec_la_segua", antes, despues, punto=(500, 3))
    with pytest.raises(ValueError, match="fuera"):
        prov.medir("ec_la_segua", antes, despues, cuadrante=(0, 500, 0, 5))


def test_medir_tabla_sin_nan(prov):
    antes, despues = _por_defecto(prov, "ec_antisana")
    m = prov.medir("ec_antisana", antes, despues, cuadrante=(0, 160, 0, 160))
    for fila in m.tabla:
        for v in fila.values():
            assert v is None or isinstance(v, (str, float))
            assert not (isinstance(v, float) and np.isnan(v))
    m.model_dump_json()  # serializable


def test_serie_seleccion(prov):
    s = prov.serie_seleccion("ec_la_segua", punto=(30, 40), cuadrante=(10, 40, 20, 60))
    assert s is not None and s.origen.tipo == "sintetico"
    assert {p[2] for p in s.puntos} == {"Punto seleccionado (3×3 px)", "Media del cuadrante"}
    assert all(np.isfinite(p[1]) and p[0].tzinfo is not None for p in s.puntos)
    assert prov.serie_seleccion("ec_la_segua") is None


def test_escena_demo_es_la_del_generador(prov):
    assert generar_escena("ec_la_segua") is generar_escena("ec_la_segua", dict(PARAMETROS_DEMO))
    assert nisar.intervalo_por_defecto(generar_escena("ec_la_segua")) == (10, 29)


# --- ronda de corrección 1 -----------------------------------------------------------------------

def test_cambio_glaciares_lleva_vectores(prov):
    antes, despues = _por_defecto(prov, "ec_antisana")
    r = prov.cambio("ec_antisana", antes, despues, None)
    v = r.vectores
    assert v is not None and v.origen.tipo == "sintetico" and v.unidad == "m/día"
    assert len(v.x) == len(v.y) == len(v.u) == len(v.v) > 0
    assert all(np.isfinite(v.u)) and all(np.isfinite(v.v))
    v.model_dump_json()
    assert r.clasificacion is not None
    assert r.tablas == [] and r.capas_extra == []


def test_cambio_agricultura_lleva_tabla_por_parcela(prov):
    antes, despues = _por_defecto(prov, "ec_daule")
    r = prov.cambio("ec_daule", antes, despues, None)
    assert len(r.tablas) == 1
    t = r.tablas[0]
    assert t.origen.tipo == "sintetico" and "Parcela" in t.columnas and "Cosecha real" in t.columnas
    assert len(t.filas) == 464 and all(len(f) == len(t.columnas) for f in t.filas)
    for fila in t.filas:
        for c in fila:
            assert c is None or isinstance(c, (str, float))
            assert not (isinstance(c, float) and np.isnan(c))
    t.model_dump_json()
    assert r.vectores is None


def test_cambio_terremotos_y_subsidencia_llevan_capas_extra(prov):
    a, d = _por_defecto(prov, "ec_pedernales")
    r = prov.cambio("ec_pedernales", a, d, None)
    assert [c.variable for c in r.capas_extra] == ["interferograma_envuelto_1_ciclo_11_9_cm", "coherencia_interferometrica"]
    assert any(c.paleta == "ciclico" for c in r.capas_extra)
    assert all(c.origen.tipo == "sintetico" for c in r.capas_extra)
    a, d = _por_defecto(prov, "ec_guayaquil")
    r = prov.cambio("ec_guayaquil", a, d, None)
    assert [c.variable for c in r.capas_extra] == ["desplazamiento_los_acumulado", "error_frente_a_la_verdad_sintetica"]


def test_escenario_simulado_se_puede_consultar(prov):
    sim = prov.simular("ec_la_segua", {"fraccion_inundada": 30})
    assert sim.id.startswith("ec_la_segua~") and sim.id != "ec_la_segua"
    assert prov.escenario(sim.id).id == sim.id
    assert prov.simular("ec_la_segua", {"fraccion_inundada": 30}).id == sim.id  # determinista
    a = sim.adquisiciones[15].id
    c_sim = prov.capa(sim.id, a, "sigma0", "HH")
    c_base = prov.capa("ec_la_segua", a, "sigma0", "HH")
    assert c_sim.escenario_id == sim.id
    assert not np.array_equal(np.nan_to_num(c_sim.datos), np.nan_to_num(c_base.datos))
    antes, despues = sim.adquisiciones[10].id, sim.adquisiciones[29].id
    assert prov.cambio(sim.id, antes, despues, None).cambio.escenario_id == sim.id
    assert prov.medir(sim.id, antes, despues, punto=(5, 5)).punto == (5, 5)
    t = datetime(2026, 5, 1, tzinfo=timezone.utc)
    assert prov.fotogramas(sim.id, None, t, t, 60)[0].escenario_id == sim.id
    with pytest.raises(ValueError, match="parámetros"):
        prov.fotogramas(sim.id, {"semilla": 1}, t, t, 60)
    with pytest.raises(KeyError):
        prov.escenario("ec_la_segua~noexiste")
    with pytest.raises(KeyError):
        prov.capa("ec_la_segua~noexiste", a, "sigma0", None)
    with pytest.raises(KeyError):
        prov.escenario("otro~abc")


def test_cache_y_registro_acotados():
    from datos.proveedores.demo import MAX_CACHE
    p = ProveedorDemostracion()
    assert MAX_CACHE == 32
    ids = [p.simular("ec_pedernales", {"deslizamiento_m": 0.5 + 0.1 * k}).id for k in range(40)]
    assert len(set(ids)) == 40
    assert len(p._cache) <= MAX_CACHE and len(p._simulados) <= MAX_CACHE and len(p._analisis_cache) <= MAX_CACHE
    with pytest.raises(KeyError):
        p.escenario(ids[0])  # el más antiguo salió del registro
    assert p.escenario(ids[-1]).id == ids[-1]
    a, d = p.intervalo_por_defecto("ec_pedernales")
    for k in range(40):
        p.simular("ec_pedernales", {"deslizamiento_m": 0.5 + 0.1 * k})
        p.cambio("ec_pedernales", a, d, None)
    assert len(p._analisis_cache) <= MAX_CACHE


def test_analisis_se_cachea(prov, monkeypatch):
    llamadas = []
    original = nisar.analizar
    monkeypatch.setattr(nisar, "analizar", lambda *a, **k: llamadas.append(a) or original(*a, **k))
    a, d = _por_defecto(prov, "ec_loja")
    prov.cambio("ec_loja", a, d, None)
    prov.medir("ec_loja", a, d, punto=(1, 1))
    prov.cambio("ec_loja", a, d, None)
    assert len(llamadas) <= 1


def test_clave_de_cache_usa_parametros_normalizados(prov):
    a = prov.simular("ec_loja", {"radio_km": 3, "semilla": 5})
    b = prov.simular("ec_loja", {"semilla": 5, "radio_km": 3.0})
    assert a.id == b.id
    assert prov.simular("ec_loja", {"radio_km": 3.0, "looks": 12}).id == prov.simular("ec_loja", {"radio_km": 3}).id


def test_huella_del_id_derivado_es_de_12_hex(prov):
    sufijo = prov.simular("ec_loja", {"radio_km": 2.5}).id.split("~")[1]
    assert len(sufijo) == 12 and int(sufijo, 16) >= 0


def test_concurrencia_sin_excepciones_ni_perdida_de_topes():
    from concurrent.futures import ThreadPoolExecutor
    from datos.proveedores.demo import MAX_CACHE
    p = ProveedorDemostracion()
    a, d = p.intervalo_por_defecto("ec_pedernales")

    def trabajo(k):
        e = p.simular("ec_pedernales", {"deslizamiento_m": 0.5 + 0.1 * (k % 45)})
        try:
            p.capa(e.id, e.adquisiciones[3].id, "desplazamiento_los", None)
            p.cambio(e.id, a, d, None)
        except KeyError:
            pass  # caducó del registro por otro hilo: comportamiento previsto del LRU
        return e.id

    with ThreadPoolExecutor(max_workers=8) as ex:
        ids = list(ex.map(trabajo, range(90)))  # sin excepciones: ex.map las relanza
    assert len(set(ids)) == 45
    assert len(p._cache) <= MAX_CACHE and len(p._simulados) <= MAX_CACHE and len(p._analisis_cache) <= MAX_CACHE
    # el mismo id siempre da la misma escena
    assert p.simular("ec_pedernales", {"deslizamiento_m": 0.5}).id == ids[0]


def test_simular_fuera_de_ecuador_valueerror():
    import pytest
    from datos.geografia import en_ecuador
    assert en_ecuador(-2.0, -79.9) and not en_ecuador(50.0, 0.0)
    with pytest.raises(ValueError, match="fuera de Ecuador"):
        ProveedorDemostracion().simular("ec_la_segua", {"lat": 50.0, "lon": 0.0})


def _textos_sin_notas(r) -> list[str]:
    """Todo texto de un ResultadoCambio salvo las notas (que llevan su propio aviso)."""
    t = [m.etiqueta for m in r.metricas] + [m.ayuda for m in r.metricas]
    for s in r.series:
        t += [s.titulo, s.unidad] + [p[2] for p in s.puntos]
    for tb in r.tablas:
        t += [tb.titulo] + list(tb.columnas) + [c for f in tb.filas for c in f if isinstance(c, str)]
    for capa in [r.cambio, r.clasificacion, *r.capas_extra]:
        if capa is not None:
            t += [capa.variable, capa.unidad] + [x for par in (capa.leyenda or []) for x in par]
    return [x for x in t if isinstance(x, str)]


def test_ninguna_etiqueta_del_demo_atribuye_a_nisar_una_deteccion(prov):
    for e in prov.escenarios():
        a, d = _por_defecto(prov, e.id)
        r = prov.cambio(e.id, a, d, None)
        for texto in _textos_sin_notas(r):
            assert "NISAR" not in texto.upper(), f"{e.id}: «{texto}»"


def test_la_serie_detectada_se_llama_detectada_por_el_modelo(prov):
    a, d = _por_defecto(prov, "ec_la_segua")
    r = prov.cambio("ec_la_segua", a, d, None)
    nombres = {p[2] for s in r.series for p in s.puntos}
    assert "Detectada por el modelo (simulación)" in nombres
