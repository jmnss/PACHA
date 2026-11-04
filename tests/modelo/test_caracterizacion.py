"""Pruebas de caracterización del núcleo científico: fijan el comportamiento actual de modelo/."""
import json
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pytest

from modelo import estaciones, nisar

DORADOS = json.loads((Path(__file__).parent / "dorados.json").read_text(encoding="utf-8"))
SITIOS = DORADOS["sitios"]


def _sitio(id_sitio: str) -> dict:
    df = nisar.cargar_sitios()
    return df[df["id"] == id_sitio].iloc[0].to_dict()


@pytest.mark.parametrize("id_sitio", sorted(SITIOS))
def test_metricas_coinciden_con_dorados(id_sitio):
    esc = nisar.simular(_sitio(id_sitio), semilla=7, looks=12.0, orbita="Ascendente", estacional=True)
    a = nisar.analizar(esc, *nisar.intervalo_por_defecto(esc))
    esperado = SITIOS[id_sitio]
    assert [[str(m[0]), str(m[1])] for m in a.metricas] == esperado["metricas"]
    sumas = {p.titulo: round(float(np.nansum(p.datos)), 3) for p in a.paneles}
    assert sumas == pytest.approx(esperado["paneles"], abs=1e-3)


def test_hay_seis_sitios_de_ecuador():
    assert len(SITIOS) == 6


def test_estado_modelo_es_continuo():
    esc = nisar.simular(_sitio(sorted(SITIOS)[0]), semilla=7, looks=12.0, orbita="Ascendente", estacional=True)
    t0 = esc.instante_evento()
    p1, _ = nisar.estado_modelo(esc, t0)
    p2, _ = nisar.estado_modelo(esc, t0 + timedelta(minutes=1))
    assert np.all(np.isfinite(p1.datos)) and np.all(np.isfinite(p2.datos))
    assert not np.array_equal(p1.datos, p2.datos)


def test_resumen_coincide():
    r = estaciones.resumen(-0.70, -80.20, date(2026, 5, 1))
    e = DORADOS["resumen"]
    assert r["region"] == e["region"]
    assert r["provincia"] == e["provincia"]
    assert r["astronomia"]["estacion"] == e["estacion"]
    assert r["temporada"]["temporada"] == e["temporada"]
    assert round(float(r["humedad_suelo"]), 3) == e["humedad_suelo"]


def test_resumen_fuera_de_malla_es_none():
    assert estaciones.resumen(40.0, -3.7, date(2026, 5, 1)) is None
