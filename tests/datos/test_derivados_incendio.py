"""Incendio con «antes» sin máscara y ΔRFDI en `ProveedorDerivados` (sitio.json v2 escrito en tmp_path)."""
import json

import numpy as np
import pytest

from datos.contrato import EntradaNoValida
from datos.proveedores.derivados import ProveedorDerivados
from datos.proveedores.mixto import ProveedorMixto
from datos.proveedores.demo import ProveedorDemostracion
from tests.datos.derivados_prueba import BBOX, FORMA, LEYENDAS, TRANSFORM, procedencia_prueba, rectangulo_lonlat

ID = "incendio-casitagua"


def _sitio(raiz, completa_despues=True):
    c = raiz / "incendios" / "casitagua"
    c.mkdir(parents=True)
    rng = np.random.default_rng(1)
    m = np.full(FORMA, 2, np.uint8)
    m[5:15, 5:20] = 1
    m[:, -3:] = 0
    q = lambda: rng.integers(1, 256, FORMA).astype(np.uint8)  # noqa: E731
    d_rfdi = np.full(FORMA, 200, np.uint8)
    d_rfdi[0, 0] = 0
    np.savez_compressed(c / "20260913.npz", HH=q(), HV=q())
    np.savez_compressed(c / "20260925.npz", mascara=m, HH=q(), HV=q(), delta_rfdi=d_rfdi)
    rangos = {"HH": [-25.0, 0.0], "HV": [-30.0, -5.0]}
    km2 = abs(TRANSFORM[0] * TRANSFORM[4]) / 1e6
    p_d = procedencia_prueba("2026-09-25")
    if not completa_despues:
        p_d["granulos"] = []
    filas = [
        {"fecha": "2026-09-13", "archivo": "20260913.npz", "mascara": False, "instante": "2026-09-13T11:30:00Z",
         "superficie_km2": {"quemado": None}, "procedencia": procedencia_prueba("2026-09-13"),
         "procedencia_completa": True, "faltan": [], "stack": rangos, "delta_rfdi": None},
        {"fecha": "2026-09-25", "archivo": "20260925.npz", "mascara": True, "instante": "2026-09-25T11:30:00Z",
         "superficie_km2": {"quemado": round(float((m == 1).sum()) * km2, 4)}, "procedencia": p_d,
         "procedencia_completa": completa_despues, "faltan": [] if completa_despues else ["granulos"],
         "stack": rangos, "delta_rfdi": [-1.0, 1.0]}]
    (c / "contorno.geojson").write_text(json.dumps(rectangulo_lonlat(-78.75, -2.57, -78.72, -2.54)))
    (c / "sitio.json").write_text(json.dumps({
        "version": 2, "sitio": "casitagua", "tipo": "incendio", "nombre": "Cerro Casitagua", "region": "Pichincha",
        "epsg": 32717, "transform": TRANSFORM, "forma": list(FORMA), "resolucion_m": 30.0, "bbox": BBOX,
        "leyenda": LEYENDAS["incendio"], "fechas": filas, "contorno": "contorno.geojson", "dem": None, "curva": None,
        "fecha_preparacion": "2026-11-15T12:00:00Z"}))
    return m


def test_variables_incendio(tmp_path):
    _sitio(tmp_path)
    assert ProveedorDerivados(tmp_path).escenario(ID).variables == ["mascara", "gamma0", "delta_rfdi"]


def test_capa_delta_rfdi(tmp_path):
    _sitio(tmp_path)
    c = ProveedorDerivados(tmp_path).capa(ID, "20260925", "delta_rfdi", None)
    assert c.variable == "delta_rfdi" and c.paleta == "divergente" and (c.vmin, c.vmax) == (-1.0, 1.0)
    assert c.origen.clase == "nisar" and c.leyenda is None
    v = c.datos[np.isfinite(c.datos)]
    assert v.min() >= -1.0 and v.max() <= 1.0 and np.isnan(c.datos[0, 0])


def test_variable_ausente_es_400(tmp_path):
    _sitio(tmp_path)
    p = ProveedorDerivados(tmp_path)
    with pytest.raises(EntradaNoValida):
        p.capa(ID, "20260913", "mascara", None)
    with pytest.raises(EntradaNoValida):
        p.capa(ID, "20260913", "delta_rfdi", None)


def test_cambio_incendio_sin_mascara_antes(tmp_path):
    m = _sitio(tmp_path)
    r = ProveedorDerivados(tmp_path).cambio(ID, "20260913", "20260925", "HH")
    cod = r.cambio.datos
    dentro_1 = (m == 1) & (cod != 0)
    assert dentro_1.any() and (cod[dentro_1] == 2).all()  # «quemado nuevo»
    assert (cod[m == 0] == 0).all()
    assert (cod[(m == 2) & (cod != 0)] == 4).all()
    antes = next(x for x in r.metricas if x.clave_texto.endswith(".antes"))
    assert antes.valor == "0,00"


def test_serie_omite_null(tmp_path):
    _sitio(tmp_path)
    s = ProveedorDerivados(tmp_path).serie_superficie(ID)
    assert len(s.puntos) == 1 and s.puntos[0][1] > 0


def test_procedencia_incompleta_no_se_muestra(tmp_path):
    _sitio(tmp_path, completa_despues=False)
    d = ProveedorDerivados(tmp_path)
    assert [e.id for e in d.escenarios()] == [ID]  # «antes» sigue siendo mostrable
    assert [a.id for a in d.escenario(ID).adquisiciones] == ["20260913"]
    with pytest.raises(Exception):
        d.capa(ID, "20260925", "delta_rfdi", None)


def test_sin_ninguna_fecha_completa_mixto_sirve_sustituto(tmp_path):
    _sitio(tmp_path, completa_despues=False)
    j = json.loads((tmp_path / "incendios" / "casitagua" / "sitio.json").read_text())
    j["fechas"] = j["fechas"][1:]
    (tmp_path / "incendios" / "casitagua" / "sitio.json").write_text(json.dumps(j))
    assert ID not in {e.id for e in ProveedorDerivados(tmp_path).escenarios()}
    assert ProveedorMixto(tmp_path, ProveedorDemostracion()).escenario(ID).origen.tipo == "sintetico"
