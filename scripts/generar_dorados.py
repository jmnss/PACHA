"""Genera tests/modelo/dorados.json: valores de referencia del núcleo científico (caracterización).

Ejecutar solo cuando un cambio del modelo sea intencional: python scripts/generar_dorados.py
"""
import json
import sys
from datetime import date
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from modelo import estaciones, nisar  # noqa: E402

SALIDA = RAIZ / "tests" / "modelo" / "dorados.json"


def calcular() -> dict:
    sitios = nisar.cargar_sitios()
    sitios = sitios[sitios["pais"] == "Ecuador"]
    dorados = {"sitios": {}}
    for _, fila in sitios.iterrows():
        sitio = fila.to_dict()
        esc = nisar.simular(sitio, semilla=7, looks=12.0, orbita="Ascendente", estacional=True)
        i0, i1 = nisar.intervalo_por_defecto(esc)
        a = nisar.analizar(esc, i0, i1)
        dorados["sitios"][str(sitio["id"])] = {
            "metricas": [[str(m[0]), str(m[1])] for m in a.metricas],
            "paneles": {p.titulo: round(float(np.nansum(p.datos)), 3) for p in a.paneles},
        }
    r = estaciones.resumen(-0.70, -80.20, date(2026, 5, 1))
    dorados["resumen"] = {
        "region": r["region"],
        "provincia": r["provincia"],
        "estacion": r["astronomia"]["estacion"],
        "temporada": r["temporada"]["temporada"],
        "humedad_suelo": round(float(r["humedad_suelo"]), 3),
    }
    return dorados


if __name__ == "__main__":
    SALIDA.write_text(json.dumps(calcular(), ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Escrito {SALIDA}")
