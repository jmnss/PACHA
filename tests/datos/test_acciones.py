"""Acciones sugeridas del Simulador: reglas por gravedad y fuentes obligatorias (sin red)."""
import re

import pytest

from datos import acciones
from datos.claves import REGISTRO

FENOMENOS = ("incendio", "tormenta", "inundacion", "terremoto", "erupcion")

LEVE = {
    "incendio": dict(area_km2=0.2, expuestos=0),
    "tormenta": dict(area_km2=0.5, expuestos=10, victimas=0),
    "inundacion": dict(area_km2=0.5, expuestos=10, victimas=0),
    "terremoto": dict(mmi_max=4.5, expuestos=0, victimas=0, tsunami=False),
    "erupcion": dict(vei=2, expuestos=0, victimas=0, lahar=False),
}
GRAVE = {
    "incendio": dict(area_km2=25, expuestos=4000),
    "tormenta": dict(area_km2=30, expuestos=20000, victimas=12),
    "inundacion": dict(area_km2=30, expuestos=20000, victimas=12),
    "terremoto": dict(mmi_max=8.6, expuestos=300000, victimas=200, tsunami=True),
    "erupcion": dict(vei=5, expuestos=50000, victimas=300, lahar=True),
}


@pytest.mark.parametrize("h", FENOMENOS)
def test_toda_regla_tiene_fuente_https_cita_y_fecha(h):
    assert len(acciones.REGLAS[h]) >= 3
    for r in acciones.REGLAS[h]:
        f = r.fuente
        assert re.match(r"^https://[\w.-]+\.(gov|gob\.ec)/", f.url), f.url
        assert f.nombre and len(f.cita) >= 15 and f.idioma in ("es", "en")
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", f.consultado)
        assert r.momento in acciones.MOMENTOS


@pytest.mark.parametrize("h", FENOMENOS)
def test_cada_accion_tiene_texto_y_porque_registrados(h):
    for r in acciones.REGLAS[h]:
        base = f"api.sim.accion.{h}.{r.id}"
        assert base in REGISTRO and f"{base}.porque" in REGISTRO


@pytest.mark.parametrize("h", FENOMENOS)
def test_gravedad_sube_con_el_escenario(h):
    assert acciones.gravedad(h, LEVE[h]) == "baja"
    assert acciones.gravedad(h, GRAVE[h]) == "alta"


@pytest.mark.parametrize("h", FENOMENOS)
def test_lo_grave_trae_mas_acciones_y_mas_urgentes(h):
    leve, grave = acciones.sugerir(h, LEVE[h]), acciones.sugerir(h, GRAVE[h])
    urgentes = lambda r: sum(a["prioridad"] == "alta" for a in r["acciones"])  # noqa: E731
    assert len(grave["acciones"]) > len(leve["acciones"])
    assert urgentes(grave) > urgentes(leve)


@pytest.mark.parametrize("h", FENOMENOS)
@pytest.mark.parametrize("escenario", ("leve", "grave"))
def test_ordenadas_por_momento_y_prioridad_con_fuente(h, escenario):
    r = acciones.sugerir(h, (LEVE if escenario == "leve" else GRAVE)[h])
    momentos = [acciones.MOMENTOS.index(a["momento"]) for a in r["acciones"]]
    assert momentos == sorted(momentos)
    for m in acciones.MOMENTOS:
        prios = [a["prioridad"] for a in r["acciones"] if a["momento"] == m]
        assert prios == sorted(prios, key=lambda p: p != "alta")
        assert prios, f"{h}: falta el momento {m}"
    for a in r["acciones"]:
        assert a["fuente"]["url"].startswith("https://")
        assert "{" not in a["porque"] and "{" not in a["texto"]


def test_tsunami_y_lahar_solo_si_el_modelo_los_genera():
    ids = lambda h, ind: {a["id"] for a in acciones.sugerir(h, ind)["acciones"]}  # noqa: E731
    assert "tsunami" in ids("terremoto", GRAVE["terremoto"])
    assert "tsunami" not in ids("terremoto", {**GRAVE["terremoto"], "tsunami": False})
    assert "lahar_alto" in ids("erupcion", GRAVE["erupcion"])
    assert "lahar_alto" not in ids("erupcion", LEVE["erupcion"])


def test_porque_cita_las_personas_del_escenario():
    r = acciones.sugerir("incendio", GRAVE["incendio"])
    evacuar = next(a for a in r["acciones"] if a["id"] == "evacuar")
    assert "4 000" in evacuar["porque"] and evacuar["porque_texto"]["valores_texto"] == {"personas": 4000}


def test_herramienta_sin_reglas_no_sugiere_nada():
    assert acciones.sugerir("ciudad", {}) == {"gravedad": "baja", "acciones": []}
