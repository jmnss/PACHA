"""Escribe frontend/src/diseno/combinaciones-demo.json: las combinaciones (variable, paleta, leyenda)
que emite el proveedor de demostración. Lo lee la prueba de leyendas del frontend y una prueba pytest
comprueba que el archivo sigue al día. Uso: python scripts/exportar_combinaciones_demo.py"""
from __future__ import annotations

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DESTINO = RAIZ / "frontend" / "src" / "diseno" / "combinaciones-demo.json"


def combinaciones() -> list[dict]:
    from datos.proveedores.demo import ProveedorDemostracion
    p = ProveedorDemostracion()
    vistas: dict[tuple, dict] = {}
    for e in p.escenarios():
        a = e.adquisiciones
        r = p.cambio(e.id, a[0].id, a[-1].id, None)
        for c in [r.antes, r.despues, r.cambio, r.clasificacion, *r.capas_extra]:
            if c is None:
                continue
            ley = [x[0] for x in c.leyenda] if c.leyenda else None
            vistas[(c.variable, c.paleta, tuple(ley or ()))] = {
                "variable": c.variable, "paleta": c.paleta, "unidad": c.unidad, "leyenda": ley}
    return sorted(vistas.values(), key=lambda d: (d["variable"], d["paleta"]))


if __name__ == "__main__":
    sys.path.insert(0, str(RAIZ))
    DESTINO.write_text(json.dumps(combinaciones(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"escrito {DESTINO}")
