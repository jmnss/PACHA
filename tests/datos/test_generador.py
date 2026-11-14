"""Pruebas del generador sintético reproducible (datos/generador.py)."""
import hashlib
import json

from datos import generador
from datos.generador import (
    ESCENARIOS_DEMO, PARAMETROS_DEMO, _generar_sin_cache, exportar, generar_escena, origen_demo,
)


def _hash(escena) -> dict:
    return {k: hashlib.sha256(v.tobytes()).hexdigest() for k, v in escena.cubos.items()}


def test_misma_semilla_mismos_cubos():
    # Se salta la caché: dos generaciones independientes.
    a = _generar_sin_cache("ec_la_segua", dict(PARAMETROS_DEMO))
    b = _generar_sin_cache("ec_la_segua", dict(PARAMETROS_DEMO))
    assert a is not b
    assert _hash(a) == _hash(b)


def test_semilla_distinta_cambia_cubos():
    a = _generar_sin_cache("ec_la_segua", dict(PARAMETROS_DEMO))
    b = _generar_sin_cache("ec_la_segua", {**PARAMETROS_DEMO, "semilla": 8})
    assert _hash(a) != _hash(b)


def test_exportar_dos_veces_mismos_hashes_en_manifiesto(tmp_path):
    d1, d2 = tmp_path / "uno", tmp_path / "dos"
    exportar(d1, sitios=["ec_la_segua"])
    exportar(d2, sitios=["ec_la_segua"])
    m1 = json.loads((d1 / "manifest.json").read_text(encoding="utf-8"))
    m2 = json.loads((d2 / "manifest.json").read_text(encoding="utf-8"))
    assert m1["escenarios"]["ec_la_segua"]["hashes"] == m2["escenarios"]["ec_la_segua"]["hashes"]
    assert (d1 / "ec_la_segua.npz").exists()
    assert m1["origen"]["tipo"] == "sintetico"


def test_origen_demo_es_sintetico():
    o = origen_demo({**PARAMETROS_DEMO, "semilla": 3})
    assert o.tipo == "sintetico"
    assert o.semilla == 3
    assert o.fecha_generacion.tzinfo is not None
    assert "semilla" in (o.notas or "")
    assert origen_demo(dict(PARAMETROS_DEMO)).notas in (None, "")


def test_historias_asignadas():
    assert len(ESCENARIOS_DEMO) == 6
    assert ESCENARIOS_DEMO["ec_la_segua"]["historia"] == "inundacion"
    assert ESCENARIOS_DEMO["ec_loja"]["historia"] == "incendio"
    otros = [v["historia"] for k, v in ESCENARIOS_DEMO.items() if k not in ("ec_la_segua", "ec_loja")]
    assert otros == [None] * 4


def test_generar_escena_usa_cache():
    generador._generar_cacheada.cache_clear()
    a = generar_escena("ec_la_segua")
    b = generar_escena("ec_la_segua", dict(PARAMETROS_DEMO))
    assert a is b
