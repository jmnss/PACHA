"""Funciones puras de scripts/explorar_catalogo.py (sin red: no importa asf_search)."""
import importlib.util
import sys
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("explorar_catalogo", RAIZ / "scripts" / "explorar_catalogo.py")
ec = importlib.util.module_from_spec(_spec)
sys.modules["explorar_catalogo"] = ec   # dataclasses lo necesita al cargar el módulo
_spec.loader.exec_module(ec)

NOMBRE_GCOV = "NISAR_L2_PR_GCOV_034_112_D_089_4005_DHDH_A_20261031T233908_20261031T233945_P05036_N_F_J_001"
NOMBRE_GUNW = ("NISAR_L2_PR_GUNW_032_112_D_089_033_4000_SH_20261007T233908_20261007T233945_"
               "20261019T233908_20261019T233945_P05023_N_F_J_001")


def _props(nombre=NOMBRE_GCOV, producto="GCOV", coleccion="NISAR_L2_GCOV_V1", crid="P05036", **extra):
    p = {"sceneName": nombre, "processingLevel": producto, "collectionName": coleccion,
         "startTime": "2026-10-31T23:39:08Z", "flightDirection": "DESCENDING", "pathNumber": 112,
         "frameNumber": 89, "mainBandPolarization": ["HH", "HV"], "sideBandPolarization": ["HH", "HV"],
         "rangeBandwidth": ["40+5"], "frameCoverage": "Full", "crid": crid,
         "bytes": {nombre + ".h5": {"bytes": 7_402_946_560}, nombre + "_LATLON.png": {"bytes": 5_070_410}}}
    p.update(extra)
    return p


def test_madurez_por_coleccion():
    assert ec.madurez("NISAR_L2_GCOV_V1") == "VALIDATED"
    assert ec.madurez("NISAR_L2_GCOV_PROVISIONAL_V1") == "PROVISIONAL"
    assert ec.madurez("NISAR_L2_GUNW_BETA_V1") == "BETA"
    assert ec.madurez("") == "desconocida"
    assert ec.madurez("OTRA_COSA") == "desconocida"
    assert ec.madurez("NISAR_UR_L2") == "UR"


def test_centro_de_la_huella():
    geo = {"type": "Polygon", "coordinates": [[[-80.0, 0.0], [-81.0, -2.0], [-79.0, -2.0], [-78.0, 0.0], [-80.0, 0.0]]]}
    assert ec.normalizar(_props(), geo).centro == (-79.5, -1.0)
    assert ec.normalizar(_props()).centro is None


def test_normalizar_gcov_suma_solo_el_h5():
    g = ec.normalizar(_props())
    assert g.madurez == "VALIDATED" and g.producto == "GCOV"
    assert g.inicio == datetime(2026, 10, 31, 23, 39, 8, tzinfo=timezone.utc)
    assert g.secundaria is None
    assert g.pol_a == ("HH", "HV") and g.pol_b == ("HH", "HV")
    assert g.tamano_gb == 7.4


def test_normalizar_gunw_lee_las_dos_fechas_del_nombre():
    g = ec.normalizar(_props(NOMBRE_GUNW, "GUNW", "NISAR_L2_GUNW_PROVISIONAL_V1", "P05023",
                             startTime="2026-10-07T23:39:08Z"))
    assert g.inicio.date().isoformat() == "2026-10-07"
    assert g.secundaria.date().isoformat() == "2026-10-19"
    assert g.madurez == "PROVISIONAL"


def test_deduplicar_se_queda_con_el_reprocesado():
    a = ec.normalizar(_props(crid="P05023"))
    b = ec.normalizar(_props(nombre=NOMBRE_GCOV[:-3] + "002", crid="P05023"))
    c = ec.normalizar(_props(startTime="2026-10-19T23:39:08Z"))
    unicos, quitados = ec.deduplicar([a, b, c])
    assert quitados == 1 and len(unicos) == 2
    assert unicos[1].granulo.endswith("_002")


def test_informe_marca_que_no_se_descarga_nada():
    zona = ec.ZONAS[0]
    g = ec.normalizar(_props())
    texto = ec.informe({zona.id: (zona, [g], 0)}, datetime(2026, 11, 14, tzinfo=timezone.utc))
    assert "No se descargó ningún granulo" in texto
    assert NOMBRE_GCOV in texto and "VALIDATED" in texto


def test_el_modulo_no_importa_asf_search_al_cargarse():
    assert "asf_search" not in vars(ec)
    fuente = (RAIZ / "scripts" / "explorar_catalogo.py").read_text(encoding="utf-8")
    nivel_modulo = [ln for ln in fuente.splitlines() if ln.startswith(("import asf", "from asf"))]
    assert not nivel_modulo


def test_main_conserva_las_notas_a_mano(tmp_path, monkeypatch):
    salida = tmp_path / "catalogo.md"
    salida.write_text("viejo\n" + ec.MARCA_NOTAS + "\n## Lectura\nnota\n", encoding="utf-8")
    monkeypatch.setattr(ec, "buscar", lambda zona: [ec.normalizar(_props())])
    assert ec.main(["--salida", str(salida)]) == 0
    texto = salida.read_text(encoding="utf-8")
    assert "viejo" not in texto and texto.count(ec.MARCA_NOTAS) == 1 and texto.endswith("nota\n")
