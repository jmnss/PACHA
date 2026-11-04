"""Pruebas del contrato de datos genérico (datos/contrato.py)."""
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
    with pytest.raises(Exception):
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
