"""Pone `frontend/src/motor/python` en el camino de importación (arranque.py, requests_navegador.py)."""
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "frontend" / "src" / "motor" / "python"))
