"""Sustitutos sintéticos con la forma del sitio (Tarea 8): sintéticos siempre, sobre el relieve del equipo."""
import json
from datetime import datetime, timezone

import numpy as np
import pytest

from datos.contrato import CapacidadNoDisponible, EntradaNoValida, NoEncontrado
from datos.proveedores.demo import ProveedorDemostracion
from datos.proveedores.sustituto import SustitutoEmbalse, SustitutoIncendio
from tests.datos.derivados_prueba import BBOX, FORMA, escribir_sitio_prueba

SIN_DATO = -32768


def _sitio_v(tmp_path, con_nodata=False):
    """Embalse de prueba con DEM en V (el valle baja hacia la columna central) y agua del DEM en el fondo."""
    carpeta = escribir_sitio_prueba(tmp_path)
    ny, nx = FORMA
    col = np.abs(np.arange(nx) - nx // 2)
    dem = np.tile(100 + 2.0 * col, (ny, 1))  # cota 100 en el eje, +2 m por columna hacia los lados
    agua = dem <= 101.0
    d16 = np.rint(dem).astype(np.int16)
    if con_nodata:
        d16[0, 0] = SIN_DATO
    np.savez_compressed(carpeta / "dem.npz", dem=d16, agua_dem=np.packbits(agua))
    niveles = [90.0 + 0.5 * k for k in range(0, 80)]
    sup = [max(float((dem <= n).sum()) * 9e-4, 0.01) for n in niveles]  # píxel de 30 m = 9e-4 km²
    # por debajo de la cota la curva real es una extrapolación lineal al 30 %: aquí, una caída sencilla
    curva = {"cota_dem_m": 101.0, "niveles_m": niveles, "superficie_km2": sup, "volumen_hm3": [0.0] * len(niveles),
             "extrapolado": [n < 101 for n in niveles]}
    (carpeta / "curva.json").write_text(json.dumps(curva))
    sj = json.loads((carpeta / "sitio.json").read_text())
    sj["dem"], sj["curva"] = "dem.npz", "curva.json"
    (carpeta / "sitio.json").write_text(json.dumps(sj))
    return carpeta, sj, agua


def test_sustituto_embalse_forma_del_vaso(tmp_path):
    carpeta, sj, agua = _sitio_v(tmp_path)
    p = SustitutoEmbalse(sj, carpeta)
    e = p.escenarios()[0]
    assert e.id == "embalse-lago" and e.historia == "embalse"
    assert [a.id for a in e.adquisiciones] == ["sim-alta", "sim-baja"]
    assert e.adquisiciones[0].instante == datetime(2026, 6, 17, tzinfo=timezone.utc)
    alta = p.capa("embalse-lago", "sim-alta", "mascara", None).datos
    baja = p.capa("embalse-lago", "sim-baja", "mascara", None).datos
    assert (alta[agua] == 1).all()                      # el agua de sim-alta contiene el agua del DEM
    assert (alta == 1).sum() > (baja == 1).sum()
    s = p.serie_superficie("embalse-lago")
    assert s.puntos[0][1] > s.puntos[1][1]
    r = p.cambio("embalse-lago", "sim-alta", "sim-baja", "HH")
    assert {m.etiqueta for m in r.metricas} >= {"Variación de superficie"}
    assert r.clasificacion.leyenda[2][0] == "Agua perdida"
    assert p.medir("embalse-lago", "sim-alta", "sim-baja", cuadrante=(0, 10, 0, 10)).metricas
    assert p.medir("embalse-lago", "sim-alta", "sim-baja", punto=(5, 20)).tabla
    with pytest.raises(EntradaNoValida):
        p.medir("embalse-lago", "sim-alta", "sim-baja")
    with pytest.raises(EntradaNoValida):
        p.cambio("embalse-lago", "sim-baja", "sim-alta", "HH")
    with pytest.raises(NoEncontrado):
        p.capa("embalse-otro", "sim-alta", "mascara", None)


def test_sustituto_embalse_gamma0_agua_oscura_y_determinista(tmp_path):
    carpeta, sj, agua = _sitio_v(tmp_path, con_nodata=True)
    p = SustitutoEmbalse(sj, carpeta)
    hh = p.capa("embalse-lago", "sim-alta", "gamma0", "HH")
    hv = p.capa("embalse-lago", "sim-alta", "gamma0", "HV")
    assert hh.datos.dtype == np.float32 and np.isnan(hh.datos[0, 0])
    assert np.nanmean(hh.datos[agua]) < np.nanmean(hh.datos[~agua]) - 5
    assert np.nanmean(hv.datos[agua]) < np.nanmean(hv.datos[~agua]) - 5
    assert (SustitutoEmbalse(sj, carpeta).capa("embalse-lago", "sim-alta", "gamma0", "HH").datos[1:, 1:]
            == hh.datos[1:, 1:]).all()
    with pytest.raises(EntradaNoValida):
        p.capa("embalse-lago", "sim-alta", "gamma0", "VV")
    with pytest.raises(CapacidadNoDisponible):
        p.simular("embalse-lago", None)


def test_sustituto_embalse_es_sintetico(tmp_path):
    carpeta, sj, _ = _sitio_v(tmp_path)
    p = SustitutoEmbalse(sj, carpeta)
    e = p.escenarios()[0]
    origenes = [e.origen, p.serie_superficie(e.id).origen]
    for a in e.adquisiciones:
        for var, pol in (("mascara", None), ("gamma0", "HH"), ("gamma0", "HV")):
            origenes.append(p.capa(e.id, a.id, var, pol).origen)
    r = p.cambio(e.id, "sim-alta", "sim-baja", None)
    origenes += [r.origen, r.antes.origen, r.despues.origen, r.cambio.origen]
    origenes.append(p.medir(e.id, "sim-alta", "sim-baja", punto=(1, 1)).origen)
    for o in origenes:
        assert o.tipo == "sintetico" and o.clase == "sintetico" and o.procedencia is None
        assert o.generador == "datos/proveedores/sustituto.py" and o.semilla is not None
        assert o.notas == "Sustituto de demostración sobre el relieve real; no son observaciones."


def _incendio(tmp_path, demo):
    carpeta = escribir_sitio_prueba(tmp_path, sitio="casitagua", tipo="incendio")
    sj = json.loads((carpeta / "sitio.json").read_text())
    sj["nombre"], sj["bbox"] = "Casitagua", [-78.56, -0.08, -78.47, 0.02]
    return SustitutoIncendio(sj, demo)


def test_sustituto_incendio_id_estable(tmp_path):
    demo = ProveedorDemostracion()
    p = _incendio(tmp_path, demo)
    e = p.escenarios()[0]
    assert (e.id, e.historia, e.sitio, e.nombre) == ("incendio-casitagua", "incendio", "casitagua", "Casitagua")
    a0, a1 = e.adquisiciones[0].id, e.adquisiciones[-1].id
    c1 = p.capa("incendio-casitagua", a0, "gamma0" if "gamma0" in e.variables else e.variables[0],
                None if "gamma0" not in e.variables else e.polarizaciones[0])
    assert c1.escenario_id == "incendio-casitagua"
    demo._cache = type(demo._cache)()      # vaciar la caché LRU del demo
    demo._simulados = type(demo._simulados)()
    c2 = p.capa("incendio-casitagua", a0, "gamma0" if "gamma0" in e.variables else e.variables[0],
                None if "gamma0" not in e.variables else e.polarizaciones[0])
    assert c2.escenario_id == "incendio-casitagua" and np.array_equal(c1.datos, c2.datos, equal_nan=True)
    r = p.cambio("incendio-casitagua", a0, a1, None)
    assert r.cambio.escenario_id == "incendio-casitagua" and r.antes.escenario_id == "incendio-casitagua"
    assert p.escenario("incendio-casitagua").id == "incendio-casitagua"
    with pytest.raises(NoEncontrado):
        p.escenario("incendio-otro")
    with pytest.raises(CapacidadNoDisponible):
        p.simular("incendio-casitagua", None)


def _sitio_plano_ruidoso(tmp_path):
    """DEM como los reales: plano y con ruido sobre el agua (agua_dem NO es exactamente dem <= nivel)."""
    carpeta, sj, _ = _sitio_v(tmp_path)
    ny, nx = FORMA
    rng = np.random.default_rng(3)
    yy, xx = np.mgrid[0:ny, 0:nx]
    agua = ((yy - 15) ** 2 / 100 + (xx - 20) ** 2 / 225) <= 1
    dem = np.where(agua, 100 + rng.integers(0, 6, FORMA), 120 + rng.integers(0, 15, FORMA)).astype(np.int16)
    np.savez_compressed(carpeta / "dem.npz", dem=dem, agua_dem=np.packbits(agua))
    curva = json.loads((carpeta / "curva.json").read_text())
    curva["cota_dem_m"] = 102.0
    (carpeta / "curva.json").write_text(json.dumps(curva))
    return carpeta, sj, agua


def _comprobar_anidado(p, agua):
    alta = p.capa("embalse-lago", "sim-alta", "mascara", None).datos == 1
    baja = p.capa("embalse-lago", "sim-baja", "mascara", None).datos == 1
    assert (alta[agua & p._dentro]).all()      # sim-alta contiene el agua del DEM
    assert not (baja & ~alta).any()            # sim-baja es subconjunto de sim-alta
    assert alta.sum() > baja.sum() > 0
    r = p.cambio("embalse-lago", "sim-alta", "sim-baja", None)
    assert not (r.cambio.datos == 2).any()     # sin «agua ganada» en una bajada


def test_sustituto_embalse_anidado_con_dem_plano_ruidoso(tmp_path):
    carpeta, sj, agua = _sitio_plano_ruidoso(tmp_path)
    _comprobar_anidado(SustitutoEmbalse(sj, carpeta), agua)


def test_sustituto_embalse_anidado_con_datos_reales():
    from datos.proveedores.derivados import DIR_DATOS
    for sitio in ("mazar", "daule-peripa"):
        carpeta = DIR_DATOS / "embalses" / sitio
        if not (carpeta / "dem.npz").exists():
            pytest.skip("derivados reales no presentes")
        sj = json.loads((carpeta / "sitio.json").read_text())
        p = SustitutoEmbalse(sj, carpeta)
        alta = p.capa(f"embalse-{sitio}", "sim-alta", "mascara", None).datos == 1
        baja = p.capa(f"embalse-{sitio}", "sim-baja", "mascara", None).datos == 1
        assert alta[p._agua_dem & p._dentro & p._valido].all()
        assert not (baja & ~alta).any() and alta.sum() > baja.sum() > 0
