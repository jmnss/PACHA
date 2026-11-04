import time

import numpy as np

from api.encoding import a_rejilla, de_rejilla
from datos.contrato import CapaRaster, Origen
from datos.proveedores.demo import ProveedorDemostracion


def _capa(datos, vmin=-20.0, vmax=0.0, bbox=(-80.0, -3.0, -79.0, -2.0)):
    base = ProveedorDemostracion()
    e = base.escenarios()[0]
    c = base.capa(e.id, e.adquisiciones[0].id, e.variables[0], e.polarizaciones[0])
    return CapaRaster(
        escenario_id=c.escenario_id, adquisicion_id=c.adquisicion_id, variable=c.variable,
        polarizacion=c.polarizacion, unidad=c.unidad, paleta="gris", vmin=vmin, vmax=vmax,
        leyenda=None, datos=datos, bbox=bbox, origen=c.origen,
    )


def test_ida_y_vuelta_dentro_del_paso():
    rng = np.random.default_rng(1)
    d = rng.uniform(-30, 10, (64, 80)).astype(np.float32)
    r = a_rejilla(_capa(d))
    v = de_rejilla(r)
    ref = np.clip(d, -20, 0)
    assert np.nanmax(np.abs(v - ref)) <= 20 / 254 + 1e-6


def test_nan_es_cero():
    d = np.full((4, 4), -10.0, dtype=np.float32)
    d[1, 2] = np.nan
    r = a_rejilla(_capa(d))
    q = np.frombuffer(__import__("base64").b64decode(r.datos_b64), dtype=np.uint8).reshape(4, 4)
    assert q[1, 2] == 0 and (q.sum() > 0) and np.count_nonzero(q) == 15
    assert np.isnan(de_rejilla(r)[1, 2])


def test_2048_se_reduce_a_512_conservando_bbox():
    d = np.random.default_rng(0).uniform(-20, 0, (2048, 2048)).astype(np.float32)
    t = time.perf_counter()
    r = a_rejilla(_capa(d))
    assert time.perf_counter() - t < 2.0
    assert (r.filas, r.columnas) == (512, 512)
    assert r.bbox == (-80.0, -3.0, -79.0, -2.0)


def test_capa_pequena_no_se_amplia():
    r = a_rejilla(_capa(np.zeros((30, 40), dtype=np.float32)))
    assert (r.filas, r.columnas) == (30, 40)


def test_bloque_todo_nan_y_promedio_ignorando_nan():
    d = np.full((1024, 1024), np.nan, dtype=np.float32)
    d[0, 0] = -10.0  # bloque 2x2 con un solo valor: el promedio es ese valor
    v = de_rejilla(a_rejilla(_capa(d)))
    assert abs(v[0, 0] - -10.0) <= 20 / 254
    assert np.isnan(v[1, 1])


def test_lado_no_multiplo_y_forma():
    r = a_rejilla(_capa(np.zeros((1000, 700), dtype=np.float32)))
    assert (r.filas, r.columnas) == (500, 350)
    r = a_rejilla(_capa(np.zeros((513, 10), dtype=np.float32)))
    assert (r.filas, r.columnas) == (257, 5)


def test_vmin_igual_vmax_no_divide_por_cero():
    d = np.array([[5.0, np.nan]], dtype=np.float32)
    v = de_rejilla(a_rejilla(_capa(d, vmin=5.0, vmax=5.0)))
    assert v[0, 0] == 5.0 and np.isnan(v[0, 1])
