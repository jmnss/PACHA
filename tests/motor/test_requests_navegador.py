"""Shim mínimo de `requests` para Pyodide: traducción de teselas y errores HTTP."""
import sys

import pytest

import requests_navegador as rn

M = "https://x.github.io/PACHA/motor/"


def test_ruta_local_traduce_teselas_de_aws():
    assert rn.ruta_local("https://s3.amazonaws.com/elevation-tiles-prod/terrarium/10/290/516.png", M) == M + "terreno/10_290_516.png"
    assert rn.ruta_local("https://elevation-tiles-prod.s3.amazonaws.com/terrarium/12/1160/2066.png", M) == M + "terreno/12_1160_2066.png"


def test_ruta_local_ignora_urls_ajenas():
    assert rn.ruta_local("https://example.com/otra.png", M) is None
    assert rn.ruta_local("https://s3.amazonaws.com/elevation-tiles-prod/terrarium/10/290/516.jpg", M) is None


def test_registrar_deja_import_requests_apuntando_al_shim(monkeypatch):
    monkeypatch.delitem(sys.modules, "requests", raising=False)
    anterior = rn.MOTOR_URL
    try:
        rn.registrar(M)
        import requests
        assert requests is rn and rn.MOTOR_URL == M
    finally:
        rn.MOTOR_URL = anterior   # monkeypatch restaura sys.modules["requests"]


def test_raise_for_status_lanza_http_error():
    with pytest.raises(rn.HTTPError):
        rn.Respuesta(b"", 404, "u").raise_for_status()
    rn.Respuesta(b"x", 200, "u").raise_for_status()


def test_get_prefiere_la_tesela_local_y_cae_a_la_url_original(monkeypatch):
    pedidas = []

    def falso(url):
        pedidas.append(url)
        if "motor/terreno" in url and "10_290_516" in url:
            return rn.Respuesta(b"\x89PNG\r\n\x1a\nxx", 200, url)
        if "motor/terreno" in url:
            return rn.Respuesta(b"<html>", 200, url)   # fallback SPA: 200 con HTML, no es PNG
        return rn.Respuesta(b"\x89PNG\r\n\x1a\nremoto", 200, url)

    monkeypatch.setattr(rn, "_pedir", falso)
    monkeypatch.setattr(rn, "MOTOR_URL", M)
    aws = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{}.png"
    assert rn.get(aws.format("10/290/516")).content.endswith(b"xx")
    assert rn.get(aws.format("10/290/517")).content.endswith(b"remoto")
    assert pedidas[-1] == aws.format("10/290/517")
