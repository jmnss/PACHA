"""Proveedor de derivados: solo expone fechas con procedencia completa; nunca inventa una fecha ni mezcla orígenes."""
import numpy as np
import pytest

from datos.contorno_raster import lonlat_a_utm, rasterizar_contorno
from datos.contrato import CapacidadNoDisponible, EntradaNoValida, NoEncontrado, ProveedorDatos
from datos.proveedores.derivados import ProveedorDerivados
from tests.datos.derivados_prueba import (CENTRO, FORMA, TRANSFORM, escribir_sitio_prueba, mascara_con_celdas,
                                          rectangulo_lonlat)


@pytest.fixture
def raiz(tmp_path):
    escribir_sitio_prueba(tmp_path)
    return tmp_path


def test_fecha_sin_procedencia_no_se_expone(raiz):
    p = ProveedorDerivados(raiz)
    esc = p.escenario("embalse-lago")
    assert [a.id for a in esc.adquisiciones] == ["20261029", "20261110"]
    with pytest.raises(NoEncontrado):
        p.capa("embalse-lago", "20261122", "mascara", None)
    assert len(p.sitios()["embalse-lago"]["fechas"]) == 3  # el sitio.json se lee entero, mostrable o no


def test_sitio_sin_fechas_mostrables_no_tiene_escenario(tmp_path):
    escribir_sitio_prueba(tmp_path, fechas=[{"fecha": "2026-10-29", "mascara": mascara_con_celdas(range(5)), "procedencia": False}])
    p = ProveedorDerivados(tmp_path)
    assert p.escenarios() == [] and "embalse-lago" in p.sitios()
    with pytest.raises(NoEncontrado):
        p.escenario("embalse-lago")


def test_procedencia_incompleta_aunque_el_json_diga_completa(tmp_path):
    carpeta = escribir_sitio_prueba(tmp_path)
    import json
    sj = json.loads((carpeta / "sitio.json").read_text())
    sj["fechas"][1]["procedencia"].pop("madurez")  # el proveedor no se fía de la bandera
    (carpeta / "sitio.json").write_text(json.dumps(sj))
    assert [a.id for a in ProveedorDerivados(tmp_path).escenario("embalse-lago").adquisiciones] == ["20261029"]


def test_ids_exactos_del_plan(tmp_path):
    escribir_sitio_prueba(tmp_path, sitio="mazar", tipo="embalse")
    escribir_sitio_prueba(tmp_path, sitio="casitagua", tipo="incendio")
    assert {e.id for e in ProveedorDerivados(tmp_path).escenarios()} == {"embalse-mazar", "incendio-casitagua"}


def test_forma_del_escenario(raiz):
    p = ProveedorDerivados(raiz)
    assert isinstance(p, ProveedorDatos) and p.nombre() == "derivados"
    e = p.escenario("embalse-lago")
    assert (e.tipo_cambio, e.historia, e.sitio, e.resolucion_m) == ("embalses", "embalse", "lago", 30.0)
    assert e.polarizaciones == ["HH", "HV"] and e.variables == ["mascara", "gamma0"]
    assert not (e.capacidades.simulacion or e.capacidades.modelo_continuo or e.capacidades.verdad_terreno)
    assert e.origen.tipo == "real" and e.origen.clase == "nisar" and e.origen.fuente == "equipo PACHA"
    assert e.origen.procedencia.fecha_adquisicion.day == 10  # la de la última fecha mostrable
    assert e.adquisiciones[0].instante.isoformat() == "2026-10-29T11:30:00+00:00"
    assert p.intervalo_por_defecto("embalse-lago") == ("20261029", "20261110")


def test_sin_stack_solo_mascara(tmp_path):
    escribir_sitio_prueba(tmp_path, tipo="incendio", fechas=[
        {"fecha": "2026-10-01", "mascara": mascara_con_celdas(range(10))},
        {"fecha": "2026-10-13", "mascara": mascara_con_celdas(range(20))}])
    e = ProveedorDerivados(tmp_path).escenario("incendio-lago")
    assert e.polarizaciones == [] and e.variables == ["mascara"] and e.historia == "incendio"
    assert e.tipo_cambio == "incendios"


def test_capa_mascara_codigos_contrato(raiz):
    c = ProveedorDerivados(raiz).capa("embalse-lago", "20261029", "mascara", None)
    assert set(np.unique(c.datos)) <= {0, 1, 2}
    assert c.leyenda[0][0] == "agua" and c.paleta == "categorias" and (c.vmin, c.vmax) == (0, 2)
    assert c.datos.shape == FORMA and c.bbox == tuple(ProveedorDerivados(raiz).escenario("embalse-lago").bbox)


def test_capa_gamma0_db(raiz):
    c = ProveedorDerivados(raiz).capa("embalse-lago", "20261029", "gamma0", "HV")
    assert c.unidad == "dB" and c.paleta == "gris" and c.polarizacion == "HV"
    assert np.isnan(c.datos).any() and np.nanmin(c.datos) >= -30.0 and np.nanmax(c.datos) <= -5.0
    with pytest.raises(EntradaNoValida):
        ProveedorDerivados(raiz).capa("embalse-lago", "20261029", "gamma0", "VV")
    with pytest.raises(EntradaNoValida):
        ProveedorDerivados(raiz).capa("embalse-lago", "20261029", "otra", None)


def test_origen_lleva_procedencia_de_su_fecha(raiz):
    p = ProveedorDerivados(raiz)
    assert p.capa("embalse-lago", "20261029", "mascara", None).origen.procedencia.fecha_adquisicion.day == 29
    assert p.capa("embalse-lago", "20261110", "mascara", None).origen.procedencia.fecha_adquisicion.day == 10


def test_cambio_categorias_y_metricas(tmp_path):
    escribir_sitio_prueba(tmp_path, fechas=[
        {"fecha": "2026-10-29", "mascara": mascara_con_celdas(range(100)), "superficie_km2": 0.09},
        {"fecha": "2026-11-10", "mascara": mascara_con_celdas(range(40, 120)), "superficie_km2": 0.072}])
    r = ProveedorDerivados(tmp_path).cambio("embalse-lago", "20261029", "20261110", None)
    cls = r.clasificacion
    assert [int((cls.datos == k).sum()) for k in (1, 2, 3)] == [60, 20, 40]
    assert [n for n, _ in cls.leyenda][:3] == ["Agua persistente", "Agua ganada", "Agua perdida"]
    assert cls.vmax == 4 and r.cambio.datos.shape == FORMA
    var = [m for m in r.metricas if "ariaci" in m.etiqueta]
    assert var and var[0].valor == "-0.02"  # 0.072 - 0.09 del sitio.json
    assert len(r.series) == 1 and len(r.series[0].puntos) == 2
    assert r.origen.procedencia.fecha_adquisicion.day == 10


def test_cambio_con_gamma0_si_ambas_fechas_tienen_stack(raiz):
    r = ProveedorDerivados(raiz).cambio("embalse-lago", "20261029", "20261110", "HH")
    assert r.antes.variable == "gamma0" and r.despues.polarizacion == "HH"
    assert r.clasificacion.paleta == "categorias"


def test_clasificacion_incendio(tmp_path):
    escribir_sitio_prueba(tmp_path, tipo="incendio", fechas=[
        {"fecha": "2026-10-01", "mascara": mascara_con_celdas(range(10))},
        {"fecha": "2026-10-13", "mascara": mascara_con_celdas(range(5, 25))}])
    r = ProveedorDerivados(tmp_path).cambio("incendio-lago", "20261001", "20261013", None)
    assert [n for n, _ in r.clasificacion.leyenda] == ["Quemado en ambas", "Quemado nuevo", "Recuperado", "Sin quemar"]


def test_cambio_restringido_al_contorno(tmp_path):
    lon, lat = CENTRO
    d = 0.0045
    escribir_sitio_prueba(tmp_path, contorno=rectangulo_lonlat(lon - d, lat - d, lon + d, lat + d))
    r = ProveedorDerivados(tmp_path).cambio("embalse-lago", "20261029", "20261110", None)
    sin_dato = int((r.clasificacion.datos == 0).sum())
    assert 0 < sin_dato < FORMA[0] * FORMA[1]
    assert r.clasificacion.datos[0, 0] == 0 and r.clasificacion.datos[15, 20] != 0


def test_una_sola_fecha_cambio_409(tmp_path):
    escribir_sitio_prueba(tmp_path, fechas=[
        {"fecha": "2026-10-29", "mascara": mascara_con_celdas(range(10))},
        {"fecha": "2026-11-10", "mascara": mascara_con_celdas(range(10)), "procedencia": False}])
    p = ProveedorDerivados(tmp_path)
    assert [a.id for a in p.escenario("embalse-lago").adquisiciones] == ["20261029"]
    with pytest.raises(CapacidadNoDisponible, match="segunda fecha con procedencia"):
        p.cambio("embalse-lago", "20261029", "20261029", None)
    with pytest.raises(NoEncontrado):  # la fecha sin procedencia no existe: nada de inventarla
        p.cambio("embalse-lago", "20261029", "20261110", None)
    assert p.intervalo_por_defecto("embalse-lago") == ("20261029", "20261029")


def test_antes_posterior_a_despues_se_rechaza(raiz):
    p = ProveedorDerivados(raiz)
    with pytest.raises(EntradaNoValida) as e:
        p.cambio("embalse-lago", "20261110", "20261029", None)
    assert e.value.clave == "api.error.fecha_despues_antes"
    with pytest.raises(EntradaNoValida):
        p.medir("embalse-lago", "20261110", "20261029", punto=(0, 0))


def test_mismo_nombre_de_sitio_en_embalse_e_incendio_no_colisiona(tmp_path):
    escribir_sitio_prueba(tmp_path, tipo="embalse")
    escribir_sitio_prueba(tmp_path, tipo="incendio")
    p = ProveedorDerivados(tmp_path)
    assert {e.id for e in p.escenarios()} == {"embalse-lago", "incendio-lago"}
    assert set(p.sitios()) == {"embalse-lago", "incendio-lago"}


def test_antes_igual_despues_409(raiz):
    with pytest.raises(CapacidadNoDisponible):
        ProveedorDerivados(raiz).cambio("embalse-lago", "20261029", "20261029", None)


def test_serie_superficie(raiz):
    s = ProveedorDerivados(raiz).serie_superficie("embalse-lago")
    assert [v for _, v, _ in s.puntos] == [0.09, 0.072] and s.unidad == "km²"
    assert s.origen.tipo == "real"


def test_medir_cuadrante_y_punto(raiz):
    p = ProveedorDerivados(raiz)
    m = p.medir("embalse-lago", "20261029", "20261110", cuadrante=(0, 30, 0, 40))
    assert m.origen.procedencia.fecha_adquisicion.day == 10
    km2 = {f["Medida"]: f["Valor"] for f in m.tabla if f["Capa"] == "Después"}
    assert km2["agua"] == pytest.approx(80 * 0.0009) and km2["no agua"] == pytest.approx((1200 - 80) * 0.0009)
    pt = p.medir("embalse-lago", "20261029", "20261110", punto=(0, 0))
    assert {f["Capa"] for f in pt.tabla} >= {"Antes", "Después"}
    with pytest.raises(EntradaNoValida):
        p.medir("embalse-lago", "20261029", "20261110")


def test_sin_capacidades_de_simulacion(raiz):
    p = ProveedorDerivados(raiz)
    with pytest.raises(CapacidadNoDisponible):
        p.simular("embalse-lago", {})
    with pytest.raises(CapacidadNoDisponible):
        p.fotogramas("embalse-lago", {}, None, None, 60)


def test_derivados_reales_sin_procedencia_no_dan_escenario(tmp_path):
    """Copia de Mazar con la procedencia quitada: no hay fecha mostrable, no hay escenario."""
    import json
    import shutil
    from pathlib import Path
    origen = Path(__file__).resolve().parents[2] / "data" / "embalses" / "mazar"
    if not origen.exists():
        pytest.skip("no hay derivados de Mazar")
    destino = tmp_path / "embalses" / "mazar"
    shutil.copytree(origen, destino)
    sj = json.loads((destino / "sitio.json").read_text())
    for f in sj["fechas"]:
        f.update(procedencia=None, procedencia_completa=False)
    (destino / "sitio.json").write_text(json.dumps(sj))
    p = ProveedorDerivados(tmp_path)
    assert p.escenarios() == [] and "embalse-mazar" in p.sitios()


def test_utm_coincide_con_pyproj():
    e, n = lonlat_a_utm(-78.6, -2.6, 32717)
    assert (float(e), float(n)) == pytest.approx((766865.0835, 9712366.2440), abs=0.01)
    e, n = lonlat_a_utm(-78.6, 2.6, 32617)
    assert (float(e), float(n)) == pytest.approx((766865.0835, 287633.7560), abs=0.01)


def test_rasterizador_par_impar_con_hueco():
    lon, lat = CENTRO
    exterior = [[lon - .0045, lat - .0045], [lon + .0045, lat - .0045], [lon + .0045, lat + .0045], [lon - .0045, lat + .0045], [lon - .0045, lat - .0045]]
    hueco = [[lon - .001, lat - .001], [lon + .001, lat - .001], [lon + .001, lat + .001], [lon - .001, lat + .001], [lon - .001, lat - .001]]
    gj = {"type": "Polygon", "coordinates": [exterior, hueco]}
    m = rasterizar_contorno(gj, 32717, TRANSFORM, FORMA)
    assert m[15, 20] == False and m[15, 8] and not m[0, 0]  # noqa: E712
