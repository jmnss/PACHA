"""Prepara los derivados de embalses e incendio a partir de las entregas del equipo y el DEM Copernicus.

Uso: python scripts/preparar_embalses.py [--sitio mazar|daule-peripa|casitagua|todos] [--entrada datos_imagenes]
     [--salida data] [--regenerar-contorno] [--sin-dem]
Fuera de línea: no lo importa la app. Solo el DEM usa red (Copernicus GLO-30 en AWS, abierto)."""
import argparse
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from preparacion.entrada import descubrir  # noqa: E402
from preparacion.relieve import dem_en_rejilla  # noqa: E402
from preparacion.salida import CARPETAS, escribir_sitio, tamano_mb  # noqa: E402
from preparacion.sitios import cargar_sitios  # noqa: E402

PRESUPUESTO_MB = 10.0
CRUDO = RAIZ / "data" / "nisar" / "crudo"  # en .gitignore


def main(argv: list[str] | None = None) -> int:
    sitios = cargar_sitios()
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--sitio", default="todos", choices=[*sitios, "todos"])
    ap.add_argument("--entrada", default="datos_imagenes")
    ap.add_argument("--salida", default="data")
    ap.add_argument("--regenerar-contorno", action="store_true")
    ap.add_argument("--sin-dem", action="store_true", help="no descarga el DEM (sin curva ni agua del DEM)")
    a = ap.parse_args(argv)
    elegidos = list(sitios.values()) if a.sitio == "todos" else [sitios[a.sitio]]
    salida = Path(a.salida)
    for s in elegidos:
        dem_fn = None if a.sin_dem else (lambda rej, s=s: dem_en_rejilla(s.bbox, rej, CRUDO))
        destino = salida / CARPETAS[s.tipo] / s.sitio
        entregas = descubrir(Path(a.entrada), s.sitio, s.tipo)
        sj = escribir_sitio(s, entregas, destino, dem_fn=dem_fn,
                            regenerar_contorno=a.regenerar_contorno)
        print(f"== {s.nombre} ({s.sitio}) -> {destino}")
        if not sj["fechas"]:
            print("   sin entregas del equipo: solo relieve y contorno" if sj["dem"] else "   sin entregas ni relieve")
        escritas = {f["fecha"] for f in sj["fechas"]}
        for e in entregas:
            if e.fecha.isoformat() not in escritas:
                print(f"   {e.fecha}  OMITIDA (no se pudo leer; ver avisos). Falta: {', '.join(e.faltan) or 'nada declarado'}")
        for f in sj["fechas"]:
            sup = ", ".join("sin máscara" if v is None else f"{k} {v:.2f} km2" for k, v in f["superficie_km2"].items())
            falta = "completa" if f["procedencia_completa"] else "falta: " + ", ".join(f["faltan"])
            print(f"   {f['fecha']}  {sup}  procedencia {falta}")
            if f["faltan"]:
                print(f"      faltan: {f['faltan']}")
        print(f"   relieve: {'si' if sj['dem'] else 'no'}  contorno: {'si' if sj['contorno'] else 'no'}  "
              f"escrito: {tamano_mb(destino):.2f} MB")
    total = sum(tamano_mb(salida / c) for c in CARPETAS.values())
    print(f"Total en {salida}: {total:.2f} MB de {PRESUPUESTO_MB:.0f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
