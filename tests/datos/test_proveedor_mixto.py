"""ProveedorMixto (por defecto): solo los datos reales del equipo, sin sustitutos ni demo (decisión 2026-11-15)."""
import json

import pytest

from datos.contrato import CapacidadNoDisponible, NoEncontrado
from datos.proveedores.derivados import DIR_DATOS
from datos.proveedores.mixto import ProveedorMixto
from datos.seleccion import obtener_proveedor
from tests.datos.derivados_prueba import escribir_sitio_prueba

REALES = ["embalse-daule-peripa", "embalse-mazar", "incendio-casitagua"]


def test_por_defecto_solo_los_tres_sitios_reales():
    p = ProveedorMixto(DIR_DATOS)
    assert sorted(e.id for e in p.escenarios()) == REALES
    for i in REALES:
        e = p.escenario(i)
        assert e.origen.tipo == "real" and e.origen.clase == "nisar"
        assert all(not a.hora_conocida and a.fecha is not None for a in e.adquisiciones)
    with pytest.raises(NoEncontrado):
        p.escenario("ec_la_segua")


def test_sello_sin_granulo_no_lleva_campos_vacios():
    proc = ProveedorMixto(DIR_DATOS).escenario("embalse-mazar").origen.model_dump(mode="json")["procedencia"]
    assert proc["producto"] == "GCOV" and proc["polarizaciones"] == ["HH", "HV"] and proc["autor"] == "equipo PACHA"
    assert proc["fecha"] == "2026-10-29"
    for campo in ("granulos", "coleccion", "frecuencia", "madurez", "fecha_adquisicion"):
        assert campo not in proc


def test_sitio_sin_fechas_mostrables_se_omite(tmp_path):
    escribir_sitio_prueba(tmp_path, sitio="lago")
    carpeta = tmp_path / "embalses" / "lago"
    j = json.loads((carpeta / "sitio.json").read_text())
    j["fechas"] = []
    (carpeta / "sitio.json").write_text(json.dumps(j))
    assert ProveedorMixto(tmp_path).escenarios() == []


def test_capacidades(tmp_path):
    escribir_sitio_prueba(tmp_path, sitio="lago")
    p = ProveedorMixto(tmp_path)
    assert p.nombre() == "mixto" and len(p.intervalo_por_defecto("embalse-lago")) == 2
    with pytest.raises(CapacidadNoDisponible):
        p.simular("embalse-lago", {})


def test_seleccion_por_defecto_mixto(monkeypatch):
    monkeypatch.delenv("NISAR_PROVEEDOR", raising=False)
    p = obtener_proveedor()
    assert isinstance(p, ProveedorMixto)
    assert obtener_proveedor() is p
