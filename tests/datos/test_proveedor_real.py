"""Pruebas del proveedor real (esqueleto) y de la selección del proveedor."""
import pytest

from datos.contrato import DatosRealesNoDisponibles, ProveedorDatos
from datos.proveedores.demo import ProveedorDemostracion
from datos.proveedores.real import MENSAJE, ProveedorReal
from datos.seleccion import obtener_proveedor


def test_por_defecto_es_demo(monkeypatch):
    monkeypatch.delenv("NISAR_PROVEEDOR", raising=False)
    p = obtener_proveedor()
    assert isinstance(p, ProveedorDemostracion)
    assert obtener_proveedor() is p  # misma instancia: conserva la caché del demo


def test_real_se_elige_por_variable(monkeypatch):
    monkeypatch.setenv("NISAR_PROVEEDOR", "real")
    p = obtener_proveedor()
    assert isinstance(p, ProveedorReal) and isinstance(p, ProveedorDatos)
    assert p.nombre() == "real"
    assert obtener_proveedor() is p


def test_real_lanza_error_legible():
    p = ProveedorReal()
    llamadas = [
        lambda: p.escenarios(),
        lambda: p.escenario("x"),
        lambda: p.capa("x", "a", "v", None),
        lambda: p.cambio("x", "a", "b", None),
        lambda: p.medir("x", "a", "b", punto=(0, 0)),
        lambda: p.simular("x", None),
        lambda: p.fotogramas("x", None, None, None, 60),
        lambda: p.intervalo_por_defecto("x"),
        lambda: p.serie_seleccion("x"),
    ]
    for llamada in llamadas:
        with pytest.raises(DatosRealesNoDisponibles) as e:
            llamada()
        assert str(e.value) == MENSAJE
    assert "aún no está implementado" in MENSAJE and "Integración de datos reales" in MENSAJE


def test_valor_desconocido_lanza_valueerror(monkeypatch):
    monkeypatch.setenv("NISAR_PROVEEDOR", "otro")
    with pytest.raises(ValueError, match="otro"):
        obtener_proveedor()
