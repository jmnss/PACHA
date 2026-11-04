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
    assert e.id == "ec_la_segua"
    base = prov.simular("ec_la_segua", {})
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
    assert e.tipo_cambio == "humedales"
    assert e.origen.tipo == "sintetico" and "lat" in e.origen.notas


def test_fotogramas_respetan_el_paso(prov):
    t0 = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    caps = prov.fotogramas("ec_loja", {}, t0, t0 + timedelta(hours=6), 60)
    assert len(caps) == 7
    assert all(isinstance(c, CapaRaster) for c in caps)
    assert len({(c.vmin, c.vmax) for c in caps}) == 1
    assert all(c.origen.tipo == "sintetico" for c in caps)
    instantes = [datetime.fromisoformat(c.adquisicion_id.replace("Z", "+00:00")) for c in caps]
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
