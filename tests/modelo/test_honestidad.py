"""Honestidad de los textos del núcleo: nada sintético se presenta como real."""
import re

from modelo import nisar


def _ecuador():
    df = nisar.cargar_sitios()
    return df[df["pais"] == "Ecuador"]


def test_descripciones_sin_eventos_reales():
    sitios = _ecuador()
    assert len(sitios) == 6
    for desc in sitios["descripcion"]:
        assert desc.startswith("Escenario ilustrativo: ")
        assert "reproduce" not in desc.lower()
        assert "sismo de 2016" not in desc.lower()
        anios = [int(a) for a in re.findall(r"\b\d{4}\b", desc)]
        assert not any(1900 <= a <= 2025 for a in anios)


def test_metricas_no_dicen_real():
    for _, fila in _ecuador().iterrows():
        esc = nisar.simular(fila.to_dict(), semilla=7, looks=12.0, orbita="Ascendente", estacional=True)
        i0, i1 = nisar.intervalo_por_defecto(esc)
        a = nisar.analizar(esc, i0, i1)
        for m in a.metricas:
            assert not re.search(r"\breal\b", str(m[0]).lower()), m[0]
            assert "Exactitud vs. verdad" not in str(m[0])


def test_mision_marcada_sin_verificar():
    assert nisar.MISION_VERIFICADA is False
