import json

from scripts.exportar_combinaciones_demo import DESTINO, combinaciones


def test_fixture_de_combinaciones_al_dia():
    """Si falla: python scripts/exportar_combinaciones_demo.py"""
    assert json.loads(DESTINO.read_text(encoding="utf-8")) == combinaciones()
