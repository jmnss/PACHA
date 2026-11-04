"""Pruebas del contrato de datos genérico (datos/contrato.py)."""
from dataclasses import FrozenInstanceError
from datetime import datetime, timezone

import numpy as np
import pytest
from pydantic import ValidationError

from datos.contrato import (
    Adquisicion, CapaRaster, Capacidades, CapacidadNoDisponible, DatosRealesNoDisponibles,
    Escenario, Medicion, Metrica, Origen, ProveedorDatos, SerieTemporal,
)

AHORA = datetime(2026, 1, 1, tzinfo=timezone.utc)
BBOX = (-80.0, -3.0, -79.0, -2.0)


def origen(tipo: str = "sintetico") -> Origen:
    return Origen(tipo=tipo, fuente="prueba", fecha_generacion=AHORA)


def escenario(adquisiciones=None, bbox=BBOX) -> Escenario:
    if adquisiciones is None:
        adquisiciones = [Adquisicion(id="a1", instante=AHORA, polarizaciones=["HH"])]
    return Escenario(
        id="e", nombre="E", tipo_cambio="inundacion", historia="inundacion", region="Costa",
        bbox=bbox, resolucion_m=30.0, polarizaciones=["HH"], variables=["sigma0"],
        adquisiciones=adquisiciones,
        capacidades=Capacidades(simulacion=False, modelo_continuo=False, verdad_terreno=False),
        origen=origen(),
    )


def capa(datos, bbox=BBOX) -> CapaRaster:
    return CapaRaster(
        escenario_id="e", adquisicion_id="a1", variable="sigma0", polarizacion="HH", unidad="dB",
        paleta="gris", vmin=-25.0, vmax=0.0, leyenda=None, datos=datos, bbox=bbox, origen=origen(),
    )


def test_origen_exige_tipo_valido():
    with pytest.raises(ValidationError):
        origen("otro")
    assert origen("real").tipo == "real"


def test_capa_rechaza_datos_no_2d():
    with pytest.raises(ValueError):
        capa(np.zeros((3,), dtype=np.float32))
    with pytest.raises(ValueError):
        capa(np.zeros((2, 2, 2), dtype=np.float32))
    assert capa(np.zeros((2, 2), dtype=np.float32)).datos.shape == (2, 2)


def test_capa_normaliza_a_float32_y_es_inmutable():
    c = capa(np.ones((2, 2), dtype=np.float64))
    assert c.datos.dtype == np.float32
    with pytest.raises(FrozenInstanceError):
        c.vmin = 1.0  # type: ignore[misc]


def test_capa_rechaza_vmin_mayor_que_vmax_y_paleta_invalida():
    with pytest.raises(ValueError):
        CapaRaster("e", None, "v", None, "", "gris", 5.0, 1.0, None,
                   np.zeros((2, 2), dtype=np.float32), BBOX, origen())
    with pytest.raises(ValueError):
        CapaRaster("e", None, "v", None, "", "arcoiris", 0.0, 1.0, None,
                   np.zeros((2, 2), dtype=np.float32), BBOX, origen())


def test_bbox_valida_orden():
    with pytest.raises(ValidationError):
        escenario(bbox=(-79.0, -3.0, -80.0, -2.0))  # oeste > este
    with pytest.raises(ValidationError):
        escenario(bbox=(-80.0, -2.0, -79.0, -3.0))  # sur > norte
    with pytest.raises(ValueError):
        capa(np.zeros((2, 2), dtype=np.float32), bbox=(-79.0, -3.0, -80.0, -2.0))
    assert escenario().bbox == BBOX


def test_escenario_sin_adquisiciones_es_invalido():
    with pytest.raises(ValidationError):
        escenario(adquisiciones=[])


def test_serie_metrica_medicion_se_construyen():
    s = SerieTemporal(titulo="t", unidad="dB", puntos=[(AHORA, 1.0, "a")], origen=origen())
    assert s.puntos[0][2] == "a"
    m = Metrica(etiqueta="Área", valor="1,2", unidad="km²", ayuda="x")
    med = Medicion(cuadrante=(0, 2, 0, 2), metricas=[m], tabla=[{"Capa": "x", "Valor": 1.0}], origen=origen())
    assert med.punto is None
    with pytest.raises(ValidationError):
        Medicion(metricas=[], tabla=[], origen=origen())  # ni cuadrante ni punto
    with pytest.raises(ValidationError):
        Medicion(cuadrante=(0, 1, 0, 1), punto=(0, 0), metricas=[], tabla=[], origen=origen())


def test_excepciones_y_protocolo():
    assert issubclass(DatosRealesNoDisponibles, RuntimeError)
    assert issubclass(CapacidadNoDisponible, RuntimeError)
    assert hasattr(ProveedorDatos, "escenarios") and hasattr(ProveedorDatos, "medir")


def test_tabla_acepta_celdas_none():
    med = Medicion(cuadrante=(0, 1, 0, 1), metricas=[],
                   tabla=[{"Categoría": "x", "% del cuadrante": None, "km²": 1.5}], origen=origen())
    assert med.tabla[0]["% del cuadrante"] is None


def test_fechas_naive_se_rechazan_y_aware_serializa_con_zona():
    with pytest.raises(ValidationError, match="zona|timezone|aware"):
        Origen(tipo="real", fuente="x", fecha_generacion=datetime(2026, 1, 1))
    with pytest.raises(ValidationError):
        Adquisicion(id="a", instante=datetime(2026, 1, 1), polarizaciones=[])
    j = Adquisicion(id="a", instante=AHORA, polarizaciones=[]).model_dump_json()
    assert "Z" in j or "+00:00" in j


def test_vmin_vmax_deben_ser_finitos():
    for vmin, vmax in [(float("nan"), 1.0), (0.0, float("inf")), (float("-inf"), 0.0)]:
        with pytest.raises(ValueError):
            CapaRaster("e", None, "v", None, "", "gris", vmin, vmax, None,
                       np.zeros((2, 2), dtype=np.float32), BBOX, origen())


def test_datos_son_solo_lectura_y_copia():
    fuente = np.ones((2, 2), dtype=np.float32)
    c = capa(fuente)
    assert not c.datos.flags.writeable
    with pytest.raises(ValueError):
        c.datos[0, 0] = 5.0
    fuente[0, 0] = 9.0  # mutar el original no afecta a la capa
    assert c.datos[0, 0] == 1.0


@pytest.mark.parametrize("cuad", [(-1, 2, 0, 2), (2, 2, 0, 2), (3, 2, 0, 2), (0, 2, 2, 2), (0, 2, -1, 1)])
def test_cuadrante_invalido(cuad):
    with pytest.raises(ValidationError):
        Medicion(cuadrante=cuad, metricas=[], tabla=[], origen=origen())


def test_punto_negativo_invalido():
    with pytest.raises(ValidationError):
        Medicion(punto=(-1, 0), metricas=[], tabla=[], origen=origen())
    assert Medicion(punto=(0, 0), metricas=[], tabla=[], origen=origen()).punto == (0, 0)


# --- ampliaciones aditivas (ronda de corrección de la Tarea 1.3) ---------------------------------

def test_capa_instante_opcional_exige_zona():
    ok = CapaRaster("e", None, "v", None, "u", "gris", 0.0, 1.0, None, np.zeros((2, 2)), BBOX, origen(),
                    instante=AHORA)
    assert ok.instante == AHORA
    assert capa(np.zeros((2, 2), dtype=np.float32)).instante is None
    with pytest.raises(ValueError):
        CapaRaster("e", None, "v", None, "u", "gris", 0.0, 1.0, None, np.zeros((2, 2)), BBOX, origen(),
                   instante=datetime(2026, 1, 1))


def test_resultado_cambio_campos_nuevos_son_opcionales():
    from datos.contrato import CampoVectorial, ResultadoCambio, TablaResultado
    c = capa(np.zeros((2, 2), dtype=np.float32))
    r = ResultadoCambio(c, c, c, None, [], [], [], origen())
    assert r.tablas == [] and r.vectores is None and r.capas_extra == []
    TablaResultado(titulo="t", columnas=["a"], filas=[["x"], [1.5], [None]], origen=origen())
    CampoVectorial(x=[0.0], y=[0.0], u=[1.0], v=[2.0], unidad="m/día", origen=origen())
    with pytest.raises(ValidationError):
        CampoVectorial(x=[0.0], y=[], u=[1.0], v=[2.0], unidad="m/día", origen=origen())
