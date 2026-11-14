"""La versión optimizada de `aguas_someras` debe dar lo mismo que la original (copia congelada en
`_referencia_aguas_someras.py`), salvo redondeo de punto flotante, en los cuatro modos en que la usa el simulador."""
import math
from datetime import date

import numpy as np
import pytest

from modelo import desastres
from modelo.desastres import Mundo, aguas_someras, crear_mundo
from tests.modelo._referencia_aguas_someras import aguas_someras as referencia

CLAVES_MALLA = ("h", "hmax", "vmax", "llegada")


@pytest.fixture(scope="module")
def costa() -> Mundo:
    # El relieve sintético no trae mar: se hunde el tercio oeste (rampa de -40 m a 0 m) para tener costa.
    m = crear_mundo(-0.95, -80.75, extension_km=20.0, n=48, fecha=date(2026, 8, 15), usar_dem=False)
    z = m.z.astype(float).copy()
    z[:, :16] = np.linspace(-40.0, -0.5, 16)[None, :]
    return Mundo(**{**m.__dict__, "z": z, "mar": z <= 0.0})


def _iguales(a: dict, b: dict) -> None:
    for k in CLAVES_MALLA:
        np.testing.assert_allclose(a[k], b[k], rtol=1e-9, atol=1e-12, err_msg=k)
    assert len(a["cuadros"]) == len(b["cuadros"])
    np.testing.assert_allclose(a["tiempos"], b["tiempos"], rtol=1e-12)
    for x, y in zip(a["cuadros"], b["cuadros"]):
        assert x.dtype == y.dtype == np.float32
        np.testing.assert_allclose(x, y, rtol=1e-6, atol=1e-7)


def _ambos(*args, **kw) -> tuple[dict, dict]:
    return aguas_someras(*args, **kw), referencia(*args, **kw)


def test_hay_mar_y_tierra(costa):
    assert 0.05 < costa.mar.mean() < 0.95


def test_lluvia_con_mar_en_reposo(costa):
    lluvia = desastres.campo_lluvia(costa, 24, 30, 150.0, 6.0) / 1000.0

    def fuente(t, dt):
        return np.where(costa.mar, 0.0, lluvia * dt / 3600.0)

    a, b = _ambos(costa, 1.0, fuente=fuente, nivel_mar=lambda t: 0.0, cuadros=6)
    assert float(a["hmax"].max()) > 0.0
    _iguales(a, b)


def test_marejada_con_nivel_variable(costa):
    def nivel(t):
        return 2.5 * math.sin(math.pi * min(t / 1800.0, 1.0))

    a, b = _ambos(costa, 0.75, nivel_mar=nivel, cuadros=5)
    _iguales(a, b)


def test_oceano_activo(costa):
    h0 = np.where(costa.mar, -np.maximum(costa.z, -1500.0) + 0.5, 0.0)
    a, b = _ambos(costa, 0.1, h0=h0, oceano_activo=True, cuadros=3, alfa=0.5)
    _iguales(a, b)


def test_cuenca_cerrada_sin_fuente(costa):
    n = costa.n
    cuenca = Mundo(**{**costa.__dict__, "z": np.zeros((n, n)), "mar": np.zeros((n, n), bool)})
    cuenca.z[[0, -1], :] = cuenca.z[:, [0, -1]] = 100.0
    h0 = np.zeros((n, n))
    h0[15:25, 15:25] = 2.0
    a, b = _ambos(cuenca, 0.3, h0=h0, cuadros=2)
    _iguales(a, b)


def test_no_modifica_h0(costa):
    h0 = np.where(costa.mar, 10.0, 0.0)
    copia = h0.copy()
    aguas_someras(costa, 0.05, h0=h0, oceano_activo=True, cuadros=1)
    np.testing.assert_array_equal(h0, copia)
