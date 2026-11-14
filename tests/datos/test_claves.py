from datos.claves import REGISTRO, slug, texto
import pytest


def test_slug():
    assert slug("Cobertura de nubes (%)") == "cobertura_de_nubes"
    assert slug("Área quemada") == "area_quemada"


def test_texto_formatea():
    assert texto("api.error.nubes_rango", min=0, max=100) == "La cobertura de nubes va de 0 a 100 %."


def test_clave_desconocida():
    with pytest.raises(KeyError):
        texto("api.error.no_existe_esta")


def test_claves_de_error_llevan_prefijo():
    assert all(k.startswith("api.") for k in REGISTRO)
