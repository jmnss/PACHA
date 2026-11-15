"""Resumen científico de los sitios reales del equipo y comparación de embalses (datos del repo)."""
import pytest

from datos.claves import REGISTRO
from datos.proveedores.derivados import DIR_DATOS, ProveedorDerivados

P = ProveedorDerivados(DIR_DATOS)


def _claves_validas(lecturas):
    for l in lecturas:
        assert l.clave_texto in REGISTRO and l.texto
        assert "incomplet" not in l.texto.lower()


def test_embalse_mazar_superficie_y_variacion():
    r = P.resumen("embalse-mazar")
    v = r.variacion
    assert (v.antes_km2, v.despues_km2, v.dias) == (7.08, 5.67, 77)
    assert v.absoluta_km2 == pytest.approx(-1.41) and v.relativa_pct == pytest.approx(-19.9)
    hh = next(e for e in r.fechas[0].retrodispersion if e.polarizacion == "HH")
    assert hh.p2_db < hh.mediana_db < hh.p98_db
    assert hh.mediana_clase_db < hh.mediana_resto_db   # el agua es más oscura en HH
    assert r.fechas[1].retrodispersion == []           # el 29 oct no trae stack: no se inventa
    _claves_validas(r.lecturas)
    assert r.lecturas[0].clave_texto == "api.resumen.lectura.embalse.baja"


def test_escala_db_por_percentiles_reales():
    r = P.resumen("embalse-mazar")
    capa = P.capa("embalse-mazar", "20260813", "gamma0", "HH")
    assert (capa.vmin, capa.vmax) == r.escala_db["HH"] and capa.vmin > -25 and capa.vmax < 0


def test_incendio_area_y_delta_rfdi():
    r = P.resumen("incendio-casitagua")
    i = r.incendio
    assert i.area_marcada_km2 == pytest.approx(19.42) and i.area_marcada_ha == 1942
    assert i.delta_rfdi_diferencia == pytest.approx(i.delta_rfdi_mediana_dentro - i.delta_rfdi_mediana_fuera, abs=1e-3)
    claves = [l.clave_texto for l in r.lecturas]
    assert "api.resumen.lectura.incendio.rfdi_no_separa" in claves     # |dif| < 0,05 con los datos actuales
    assert "api.resumen.lectura.incendio.publicada" in claves
    _claves_validas(r.lecturas)


def test_fichas_solo_con_fuente():
    for i in ("embalse-mazar", "embalse-daule-peripa", "incendio-casitagua"):
        for d in P.resumen(i).ficha:
            assert d.fuente.url.startswith("https://") and d.fuente.cita and d.clave_texto + ".etiqueta" in REGISTRO


def test_comparacion_mazar_daule():
    c = P.comparacion_embalses()
    assert [s.escenario_id for s in c.sitios] == ["embalse-mazar", "embalse-daule-peripa"]
    assert (c.dias_entre_antes, c.dias_entre_despues) == (48, 17)
    _claves_validas(c.lecturas)
