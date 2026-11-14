"""Reconocimiento de texto del modelo contra plantillas (decimales, fechas, números con punto)."""
from datos import claves
from datos.claves import buscar_texto, reconocer, reconocer_con_decimales


def test_reconocer_con_decimales():
    r = reconocer_con_decimales("Lluvia de {mm} mm en {km} km", "Lluvia de 150,0 mm en 15 km")
    assert r == ({"mm": 150.0, "km": 15.0}, {"mm": 1, "km": 0})


def test_reconocer_fecha_a_iso():
    assert reconocer("Media · Velocidad · {fecha}", "Media · Velocidad · 27/12/2026") == {"fecha": "2026-12-27"}


def test_reconocer_numero_con_punto_y_signo():
    assert reconocer("Levantamiento de +{le_punto} m", "Levantamiento de +0.42 m") == {"le_punto": 0.42}
    assert reconocer("Levantamiento de {le_punto} m", "Levantamiento de +0.42 m") == {"le_punto": 0.42}


def test_reconocer_no_encaja():
    assert reconocer("Lluvia de {mm} mm", "Otra cosa") is None
    assert reconocer_con_decimales("Lluvia de {mm} mm", "Otra cosa") is None


def test_buscar_texto_sin_plantilla_es_none():
    assert buscar_texto("api.prueba.", "texto que no encaja") is None


def test_buscar_texto_con_plantilla_y_literal(monkeypatch):
    monkeypatch.setitem(claves.REGISTRO, "api.prueba.a", "Caudal de {q} m³/s")
    monkeypatch.setitem(claves.REGISTRO, "api.prueba.b", "Caudal de {q} m³/s en total")
    monkeypatch.setitem(claves.REGISTRO, "api.prueba.fijo", "Texto fijo")
    tc = buscar_texto("api.prueba.", "Caudal de 12,5 m³/s")
    assert tc.clave_texto == "api.prueba.a" and tc.valores_texto == {"q": 12.5} and tc.decimales_texto == {"q": 1}
    assert buscar_texto("api.prueba.", "Texto fijo").clave_texto == "api.prueba.fijo"
    assert buscar_texto("api.prueba.", "Texto fijo").valores_texto == {}
