"""Genera la instantánea publicada del conjunto sintético en data/demo/ (fuera de git).

Uso: python scripts/generar_datos_demo.py
"""
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from datos.generador import exportar  # noqa: E402

if __name__ == "__main__":
    t0 = time.time()
    ruta = exportar(RAIZ / "data" / "demo")
    print(f"Datos de DEMOSTRACIÓN (sintéticos) escritos en {ruta.parent} ({time.time() - t0:.1f} s)")
