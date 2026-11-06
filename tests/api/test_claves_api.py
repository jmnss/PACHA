"""`api/claves.json` está al día y las respuestas solo traen claves que existen en él."""
import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
from exportar_claves_api import DESTINO, texto_claves  # noqa: E402
from datos.claves import slug  # noqa: E402

CLAVES = {c["clave"]: c["es"] for c in json.loads(DESTINO.read_text(encoding="utf-8"))}


def _variables(plantilla: str) -> set[str]:
    return set(re.findall(r"\{(\w+)\}", plantilla))


def _frase_valida(clave: str, valores: dict | None) -> None:
    assert clave in CLAVES, clave
    assert _variables(CLAVES[clave]) <= set(valores or {}), (clave, valores)


def _metrica_valida(m: dict) -> None:
    assert m["clave_texto"] is not None
    assert CLAVES[m["clave_texto"] + ".etiqueta"] == m["etiqueta"]
    assert CLAVES[m["clave_texto"] + ".ayuda"] == m["ayuda"] or _variables(CLAVES[m["clave_texto"] + ".ayuda"])
    assert set(m["valores_texto"]) >= {"valor"} or m["clave_texto"] == "api.medicion.posicion"


def test_claves_json_esta_al_dia():
    assert DESTINO.read_text(encoding="utf-8") == texto_claves(), \
        "Ejecuta `python scripts/exportar_claves_api.py` y vuelve a confirmar."


def test_claves_ordenadas_y_sin_vacios():
    claves = list(CLAVES)
    assert claves == sorted(claves) and all(CLAVES.values())


def test_laboratorio_nubes_trae_claves(cliente_demo):
    d = cliente_demo.get("/api/laboratorio/nubes?cobertura=50").json()
    assert [m["etiqueta"] for m in d["metricas"]] == [
        "Cambio visto por el radar", "Cambio visto por el óptico", "Falsas alarmas del radar", "Tapado por nubes"]
    for m in d["metricas"]:
        _metrica_valida(m)
        assert isinstance(m["valores_texto"]["valor"], float)
    for capa in ("cambio_optico", "cambio_radar"):
        for etiqueta, _ in d[capa]["leyenda"]:
            assert CLAVES[f"api.lab.leyenda.{slug(etiqueta)}"] == etiqueta


@pytest.mark.parametrize("banda", ["L", "S"])
def test_laboratorio_respuesta_trae_claves(cliente_demo, banda):
    d = cliente_demo.get(f"/api/laboratorio/respuesta?banda={banda}&pol=HH").json()
    for etiqueta, _ in d["superficies"]["leyenda"]:
        assert CLAVES[f"api.lab.leyenda.{slug(etiqueta)}"] == etiqueta
    assert {r["superficie"] for r in d["respuestas"]} == {e for e, _ in d["superficies"]["leyenda"]}
    for c in d["cambios"]:
        assert CLAVES[f"api.lab.cambio.{slug(c['cambio'])}"] == c["cambio"]
    if banda == "S":
        assert CLAVES["api.lab.aviso_banda"] == d["aviso_banda"]


def test_impacto_trae_frases(cliente_demo):
    e = cliente_demo.get("/api/escenarios/ec_la_segua").json()
    a, b = e["adquisiciones"][0]["id"], e["adquisiciones"][-1]["id"]
    d = cliente_demo.get(f"/api/escenarios/ec_la_segua/impacto?antes={a}&despues={b}").json()
    for m in d["cifras"]:
        _metrica_valida(m)
    _frase_valida(d["titulo_frase"]["clave_texto"], d["titulo_frase"]["valores_texto"])
    assert CLAVES[d["titulo_frase"]["clave_texto"]] == d["titulo"]
    for texto, frases in ((d["lectura"], d["lectura_frases"]), (d["acciones"], d["acciones_frases"]),
                          (d["notas"], d["notas_frases"])):
        assert len(texto) == len(frases) and texto
        for t, f in zip(texto, frases):
            _frase_valida(f["clave_texto"], f["valores_texto"])
            if not _variables(CLAVES[f["clave_texto"]]):
                assert CLAVES[f["clave_texto"]] == t       # sin cifras: la plantilla es el texto
    assert d["acciones"][0].startswith("Si esto fuera un evento real, contrastar")


def test_impacto_incendio_trae_frases(cliente_demo):
    e = cliente_demo.get("/api/escenarios/ec_loja").json()
    a, b = e["adquisiciones"][0]["id"], e["adquisiciones"][-1]["id"]
    d = cliente_demo.get(f"/api/escenarios/ec_loja/impacto?antes={a}&despues={b}").json()
    for m in d["cifras"]:
        _metrica_valida(m)
    for f in [*d["lectura_frases"], *d["acciones_frases"], *d["notas_frases"], d["titulo_frase"]]:
        _frase_valida(f["clave_texto"], f["valores_texto"])


def test_contexto_valores_tienen_clave(cliente_demo):
    vistos = set()
    for lat, lon in ((-0.70, -80.20), (-4.05, -79.25), (-0.18, -78.47), (-0.74, -90.31), (-1.0, -77.5)):
        for k in range(0, 365, 15):
            dia = date(2026, 1, 1) + timedelta(days=k)
            c = cliente_demo.get("/api/contexto", params={"lat": lat, "lon": lon, "fecha": dia.isoformat()}).json()
            if c is None:
                continue
            for campo, valor in (("estacion", c["estacion_astronomica"]["estacion"]),
                                 ("proximo_hito", c["estacion_astronomica"]["proximo_hito"]),
                                 ("temporada", c["temporada"]["temporada"]),
                                 ("nombre_local", c["temporada"]["nombre_local"]),
                                 ("regimen", c["temporada"]["regimen"])):
                clave = f"api.contexto.{campo}.{slug(valor)}"
                assert CLAVES.get(clave) == valor, clave
                vistos.add(clave)
    assert len(vistos) >= 8


def test_catalogo_derivado_cubre_tipos_y_escenarios(cliente_demo):
    for t in cliente_demo.get("/api/tipos").json():
        assert CLAVES[f"api.tipo.{t['id']}.nombre"] == t["nombre"]
        for c in t["controles"]:
            assert CLAVES[f"api.control.{t['id']}.{c['id']}.etiqueta"] == c["etiqueta"]
            for o in c.get("opciones") or []:
                assert CLAVES[f"api.opcion.{t['id']}.{c['id']}.{slug(o['etiqueta'])}"] == o["etiqueta"]
    for e in cliente_demo.get("/api/escenarios").json():
        assert CLAVES[f"api.escenario.{e['id']}.sitio"] == e["nombre"]
