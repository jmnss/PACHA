"""Suite de conformidad del contrato: las mismas pruebas para el proveedor demo y uno ficticio."""
import pytest

from datos.contrato import CapaRaster, CapacidadNoDisponible, Medicion, ProveedorDatos, ResultadoCambio
from datos.proveedores.demo import ProveedorDemostracion
from tests.datos.proveedor_ficticio import ProveedorFicticio


@pytest.fixture(scope="module", params=["demo", "ficticio"])
def proveedor(request):
    return ProveedorDemostracion() if request.param == "demo" else ProveedorFicticio()


def _casos(proveedor):
    """(escenario, antes, despues, polarizacion) para cada escenario del proveedor."""
    for e in proveedor.escenarios():
        ids = [a.id for a in e.adquisiciones]
        pol = e.polarizaciones[0] if e.polarizaciones else None
        if hasattr(proveedor, "intervalo_por_defecto"):
            antes, despues = proveedor.intervalo_por_defecto(e.id)
        else:
            antes, despues = ids[0], ids[-1]
        yield e, antes, despues, pol


def _capas(r: ResultadoCambio) -> list[CapaRaster]:
    return [c for c in (r.antes, r.despues, r.cambio, r.clasificacion, *r.capas_extra) if c is not None]


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


def test_simular_sin_capacidad_lanza_CapacidadNoDisponible(proveedor):
    if proveedor.nombre() == "demo":
        pytest.skip("el demo sí ofrece simulación")
    e = proveedor.escenarios()[0]
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
