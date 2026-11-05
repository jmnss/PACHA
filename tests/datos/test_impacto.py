"""Resumen de impacto: cifras coherentes, evolución y honestidad."""
import numpy as np
import pytest

from datos import impacto
from datos.contrato import EntradaNoValida
from datos.proveedores.demo import ProveedorDemostracion


@pytest.fixture(scope="module")
def prov():
    return ProveedorDemostracion()


def _r(prov, id, pol=None):
    a, b = prov.intervalo_por_defecto(id)
    return impacto.resumen(prov, id, a, b, pol)


def test_inundacion_cifras_coherentes(prov):
    r = _r(prov, "ec_la_segua")
    assert r["tipo"] == "inundacion" and r["origen"].tipo == "sintetico"
    nueva, perdida, persistente = (c["ha"] for c in r["categorias"])
    assert float(r["cifras"][0].valor.replace(" ", "")) == pytest.approx(nueva + persistente, abs=1)
    assert sum(c["pct_escena"] for c in r["categorias"]) <= 100
    assert 1 <= len(r["evolucion"]) <= impacto.MAX_PUNTOS_EVOLUCION
    assert all(p["ha"] >= 0 for p in r["evolucion"])


def test_incendio_cifras_y_lectura_como_ejemplo(prov):
    r = _r(prov, "ec_loja", "HV")
    assert r["tipo"] == "incendio" and r["categorias"][-1]["ha"] <= r["categorias"][0]["ha"] + r["categorias"][-1]["ha"]
    assert r["lectura"][0].startswith("En este escenario de demostración,")
    assert r["acciones"][0].startswith("Si esto fuera un evento real,")
    assert "," in r["lectura"][0]  # las comas del texto se conservan


def test_area_de_pixel_razonable(prov):
    r = _r(prov, "ec_la_segua")
    esc_km2 = r["area_escena_km2"]
    assert esc_km2 == pytest.approx(prov.escenario("ec_la_segua").resolucion_m ** 2 * 1e-6 * 160 * 160, rel=0.15)


@pytest.mark.parametrize("id", ["ec_pedernales", "ec_antisana", "ec_daule", "ec_guayaquil"])
def test_otros_escenarios_no_aplican(prov, id):
    a, b = prov.intervalo_por_defecto(id)
    with pytest.raises(EntradaNoValida):
        impacto.resumen(prov, id, a, b, None)
