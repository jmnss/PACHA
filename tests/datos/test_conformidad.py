"""Suite de conformidad del contrato: las mismas pruebas para el proveedor demo y uno ficticio."""
import math

import pytest

from datos.contrato import CapaRaster, CapacidadNoDisponible, Medicion, ProveedorDatos, ResultadoCambio
from datos.proveedores.demo import ProveedorDemostracion
from datos.proveedores.derivados import ProveedorDerivados
from datos.proveedores.mixto import ProveedorMixto
from tests.datos.derivados_prueba import escribir_sitio_prueba
from tests.datos.proveedor_ficticio import ProveedorFicticio


@pytest.fixture(scope="module", params=["demo", "ficticio", "derivados", "mixto"])
def proveedor(request, tmp_path_factory):
    if request.param == "derivados":
        raiz = tmp_path_factory.mktemp("derivados")
        escribir_sitio_prueba(raiz)
        return ProveedorDerivados(raiz)
    if request.param == "mixto":
        return ProveedorMixto()
    return ProveedorDemostracion() if request.param == "demo" else ProveedorFicticio()


def _casos(proveedor):
    """(escenario, antes, despues, polarizacion) para cada escenario del proveedor."""
    for e in proveedor.escenarios():
        ids = [a.id for a in e.adquisiciones]
        pol = e.polarizaciones[0] if e.polarizaciones else None
        if proveedor.nombre() in {"demo", "mixto"}:
            antes, despues = proveedor.intervalo_por_defecto(e.id)
        else:
            antes, despues = ids[0], ids[-1]
        yield e, antes, despues, pol


def _capas(r: ResultadoCambio) -> list[CapaRaster]:
    return [c for c in (r.antes, r.despues, r.cambio, r.clasificacion, *r.capas_extra) if c is not None]


def _origenes(proveedor, e, antes, despues, pol):
    """Todos los orígenes que el proveedor devuelve para un escenario."""
    r = proveedor.cambio(e.id, antes, despues, pol)
    out = [e.origen, proveedor.capa(e.id, antes, e.variables[0], pol).origen, r.origen]
    out += [c.origen for c in _capas(r)] + [t.origen for t in r.tablas] + [s.origen for s in r.series]
    if r.vectores is not None:
        out.append(r.vectores.origen)
    out.append(proveedor.medir(e.id, antes, despues, punto=(1, 1)).origen)
    out.append(proveedor.medir(e.id, antes, despues, cuadrante=(0, 4, 0, 4)).origen)
    return out


def test_origenes_validos_y_coherentes_con_el_proveedor(proveedor):
    for e, antes, despues, pol in _casos(proveedor):
        for o in _origenes(proveedor, e, antes, despues, pol):
            assert o.tipo in {"real", "sintetico"}
            assert o.fuente.strip()
            if o.clase is not None:
                assert (o.clase == "sintetico") == (o.tipo == "sintetico")
            if o.clase == "nisar":
                assert o.procedencia is not None
            if proveedor.nombre() == "demo":
                assert o.tipo == "sintetico"
            elif proveedor.nombre() != "mixto":  # el mixto mezcla escenarios sintéticos (sustitutos, demo) y reales
                assert o.tipo != "sintetico"


def test_cumple_el_protocolo(proveedor):
    assert isinstance(proveedor, ProveedorDatos)
    assert proveedor.escenarios()


def test_cada_capa_tiene_origen(proveedor):
    for e, antes, despues, pol in _casos(proveedor):
        assert e.origen is not None
        capa = proveedor.capa(e.id, antes, e.variables[0], pol)
        assert capa.origen is not None and capa.origen.fuente
        r = proveedor.cambio(e.id, antes, despues, pol)
        assert r.origen is not None
        for c in _capas(r):
            assert c.origen is not None and c.origen.fuente


def test_cambio_devuelve_tres_capas_coherentes(proveedor):
    for e, antes, despues, pol in _casos(proveedor):
        r = proveedor.cambio(e.id, antes, despues, pol)
        assert r.antes.datos.shape == r.despues.datos.shape == r.cambio.datos.shape
        assert r.antes.bbox == r.despues.bbox == r.cambio.bbox == e.bbox
        if r.clasificacion is not None:
            assert r.clasificacion.datos.shape == r.cambio.datos.shape
            assert r.clasificacion.bbox == e.bbox


def test_medir_cuadrante_y_punto(proveedor):
    for e, antes, despues, _ in _casos(proveedor):
        m = proveedor.medir(e.id, antes, despues, cuadrante=(2, 12, 3, 20))
        assert isinstance(m, Medicion) and m.cuadrante == (2, 12, 3, 20) and m.punto is None
        assert m.origen is not None
        p = proveedor.medir(e.id, antes, despues, punto=(5, 7))
        assert p.punto == (5, 7) and p.cuadrante is None and p.origen is not None
        with pytest.raises(ValueError):
            proveedor.medir(e.id, antes, despues)
        with pytest.raises(ValueError):
            proveedor.medir(e.id, antes, despues, cuadrante=(0, 1, 0, 1), punto=(0, 0))
        with pytest.raises(ValueError):
            proveedor.medir(e.id, antes, despues, punto=(10**6, 0))
        with pytest.raises(ValueError):
            proveedor.medir(e.id, antes, despues, cuadrante=(0, 10**6, 0, 5))
        with pytest.raises(ValueError):
            proveedor.medir(e.id, antes, despues, punto=(-1, 0))
        with pytest.raises(ValueError):
            proveedor.medir(e.id, antes, despues, cuadrante=(5, 5, 0, 5))
        for med in (m, p):
            assert med.metricas or med.tabla
            for fila in med.tabla:
                for v in fila.values():
                    if isinstance(v, float):
                        assert math.isfinite(v)


def test_simular_sin_capacidad_lanza_CapacidadNoDisponible(proveedor):
    if proveedor.nombre() == "demo":
        pytest.skip("el demo sí ofrece simulación")
    e = proveedor.escenarios()[0]  # en el mixto, un sustituto
    assert not (e.capacidades.simulacion or e.capacidades.modelo_continuo or e.capacidades.verdad_terreno)
    with pytest.raises(CapacidadNoDisponible):
        proveedor.simular(e.id, {})
    with pytest.raises(CapacidadNoDisponible):
        proveedor.fotogramas(e.id, {}, None, None, 60)


def test_ficticio_tiene_la_forma_pedida():
    p = ProveedorFicticio()
    assert len(p.escenarios()) == 2
    for e in p.escenarios():
        assert e.polarizaciones == ["P1", "P2"] and len(e.adquisiciones) == 5
        assert not (e.capacidades.simulacion or e.capacidades.modelo_continuo or e.capacidades.verdad_terreno)
        assert e.origen.tipo == "real" and e.origen.fuente == "ficticio de pruebas"
        assert p.capa(e.id, e.adquisiciones[0].id, "intensidad", "P1").datos.shape == (2048, 2048)


def test_sinteticos_siempre_marcados(proveedor):
    if proveedor.nombre() != "demo":
        pytest.skip("solo aplica al demo")
    for e, antes, despues, pol in _casos(proveedor):
        assert e.origen.tipo == "sintetico"
        assert proveedor.capa(e.id, antes, e.variables[0], pol).origen.tipo == "sintetico"
        r = proveedor.cambio(e.id, antes, despues, pol)
        assert r.origen.tipo == "sintetico"
        for c in _capas(r):
            assert c.origen.tipo == "sintetico"
        for t in r.tablas:
            assert t.origen.tipo == "sintetico"
        if r.vectores is not None:
            assert r.vectores.origen.tipo == "sintetico"
        for s in r.series:
            assert s.origen.tipo == "sintetico"
        assert proveedor.medir(e.id, antes, despues, punto=(1, 1)).origen.tipo == "sintetico"
