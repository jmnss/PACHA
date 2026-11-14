"""ProveedorMixto: reales donde hay fechas mostrables, sustitutos donde no, y siempre el demo."""
import json

import pytest

from datos.contrato import CapacidadNoDisponible, NoEncontrado
from datos.proveedores.mixto import ProveedorMixto
from datos.proveedores.demo import ProveedorDemostracion
from datos.proveedores.derivados import DIR_DATOS
from datos.seleccion import obtener_proveedor
from tests.datos.derivados_prueba import escribir_sitio_prueba

DEMO = ProveedorDemostracion()


def _con_dem(raiz, sitio="mazar"):
    """Copia el DEM, la curva y el sitio.json reales del sitio a `raiz` (sin ninguna fecha)."""
    import shutil
    origen = DIR_DATOS / "embalses" / sitio
    destino = raiz / "embalses" / sitio
    destino.mkdir(parents=True)
    for n in ("sitio.json", "dem.npz", "curva.json", "contorno.geojson"):
        shutil.copy(origen / n, destino / n)
    j = json.loads((destino / "sitio.json").read_text(encoding="utf-8"))
    j["fechas"] = []
    (destino / "sitio.json").write_text(json.dumps(j), encoding="utf-8")


def test_mixto_sustituye_si_no_hay_reales(tmp_path):
    _con_dem(tmp_path)
    p = ProveedorMixto(tmp_path, DEMO)
    assert p.escenario("embalse-mazar").origen.tipo == "sintetico"


def test_mixto_prefiere_reales(tmp_path):
    escribir_sitio_prueba(tmp_path, sitio="lago")
    p = ProveedorMixto(tmp_path, DEMO)
    e = p.escenario("embalse-lago")
    assert e.origen.clase == "nisar" and e.origen.tipo == "real"
    # nunca se mezclan fechas sintéticas con las reales
    assert all(not a.id.startswith("sim-") for a in e.adquisiciones)


def test_mixto_incluye_demo(tmp_path):
    p = ProveedorMixto(tmp_path, DEMO)
    assert p.nombre() == "mixto"
    assert "ec_la_segua" in {e.id for e in p.escenarios()}
    assert p.escenario("ec_la_segua").origen.tipo == "sintetico"


def test_mixto_con_los_datos_del_repo_sirve_los_tres_sitios():
    p = ProveedorMixto(DIR_DATOS, DEMO)
    ids = [e.id for e in p.escenarios()]
    for i in ("embalse-mazar", "embalse-daule-peripa", "incendio-casitagua"):
        assert i in ids and p.escenario(i).origen.tipo == "sintetico"
    assert ids.index("embalse-mazar") < ids.index("ec_la_segua")  # lo propio va primero


def test_delegacion_y_capacidades(tmp_path):
    escribir_sitio_prueba(tmp_path, sitio="lago")
    p = ProveedorMixto(tmp_path, DEMO)
    assert [t.id for t in p.tipos()] == [t.id for t in DEMO.tipos()]
    assert p.intervalo_por_defecto("ec_la_segua") == DEMO.intervalo_por_defecto("ec_la_segua")
    assert len(p.intervalo_por_defecto("embalse-lago")) == 2
    with pytest.raises(CapacidadNoDisponible):
        p.simular("embalse-lago", {})
    with pytest.raises(CapacidadNoDisponible):
        p.serie_seleccion("embalse-lago")
    with pytest.raises(NoEncontrado):
        p.escenario("no-existe")


def test_seleccion_por_defecto_mixto(monkeypatch):
    monkeypatch.delenv("NISAR_PROVEEDOR", raising=False)
    p = obtener_proveedor()
    assert isinstance(p, ProveedorMixto)
    assert obtener_proveedor() is p
