"""Funciones puras de scripts/granulos_candidatos.py (sin red)."""
import importlib.util
import sys
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("granulos_candidatos", RAIZ / "scripts" / "granulos_candidatos.py")
gc = importlib.util.module_from_spec(_spec)
sys.modules["granulos_candidatos"] = gc
_spec.loader.exec_module(gc)

BBOX = (-78.56, -0.09, -78.43, 0.02)


def _g(id, inicio, huella):
    return {"id": id, "inicio": inicio, "huella": huella}


def _caja(o, s, e, n):
    return [(o, s), (e, s), (e, n), (o, n)]


DIA = date(2026, 9, 13)
T = datetime(2026, 9, 13, 11, 0, tzinfo=timezone.utc)
CUBRE = _caja(-79.0, -1.0, -78.0, 1.0)


def test_filtra_por_dia_utc():
    ayer = datetime(2026, 9, 12, 23, 59, tzinfo=timezone.utc)
    tarde = datetime(2026, 9, 13, 23, 59, tzinfo=timezone.utc)
    r = gc.candidatos([_g("ayer", ayer, CUBRE), _g("hoy", tarde, CUBRE)], BBOX, DIA)
    assert [g["id"] for g in r] == ["hoy"]


def test_filtra_por_huella():
    lejos = _caja(-75.0, -3.0, -74.0, -2.0)
    r = gc.candidatos([_g("lejos", T, lejos), _g("cerca", T, CUBRE)], BBOX, DIA)
    assert [g["id"] for g in r] == ["cerca"]


def test_ordena_por_cobertura():
    mitad = _caja(-79.0, -1.0, -78.495, 1.0)  # cubre ~la mitad oeste de la caja
    r = gc.candidatos([_g("mitad", T, mitad), _g("todo", T, CUBRE)], BBOX, DIA)
    assert [g["id"] for g in r] == ["todo", "mitad"]
    assert r[0]["cobertura"] > 0.99 and 0.4 < r[1]["cobertura"] < 0.6


def test_tabla_sin_candidatos_lo_dice():
    assert "Sin granulos" in gc.tabla("casitagua", DIA, [])
