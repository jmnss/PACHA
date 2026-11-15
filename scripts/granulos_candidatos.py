"""Granulos GCOV candidatos para completar la procedencia de las entregas del equipo: SOLO METADATOS del catálogo
de ASF (sin cuenta; no descarga nada). Por sitio y fecha del manifiesto, lista los granulos cuya huella cubre la caja
del sitio y cuya adquisición cae ese día (UTC). NUNCA escribe en el manifiesto: el equipo confirma cuál usó.

Uso: python scripts/granulos_candidatos.py [--manifiesto preparacion/entregas.json] [--sitio ...] [--salida tabla.md]
Fuera de línea para la app: requiere `asf_search` (requirements-preparacion.txt)."""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

_spec = importlib.util.spec_from_file_location("explorar_catalogo", RAIZ / "scripts" / "explorar_catalogo.py")
_ec = importlib.util.module_from_spec(_spec)
sys.modules.setdefault("explorar_catalogo", _ec)  # dataclasses lo necesita al cargar el módulo
_spec.loader.exec_module(_ec)

N_MUESTRA = 40  # puntos por lado para medir qué parte de la caja cubre la huella


def _dentro(punto: tuple[float, float], anillo: list[tuple[float, float]]) -> bool:
    x, y = punto
    d = False
    for (x1, y1), (x2, y2) in zip(anillo, anillo[1:] + anillo[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            d = not d
    return d


def cobertura_bbox(huella: list[tuple[float, float]], bbox: tuple[float, float, float, float]) -> float:
    """Fracción (0–1) de la caja (oeste, sur, este, norte) cubierta por la huella, muestreada en una rejilla."""
    o, s, e, n = bbox
    cuenta = 0
    for i in range(N_MUESTRA):
        for j in range(N_MUESTRA):
            cuenta += _dentro((o + (e - o) * (i + 0.5) / N_MUESTRA, s + (n - s) * (j + 0.5) / N_MUESTRA), huella)
    return cuenta / N_MUESTRA ** 2


def candidatos(granulos: list[dict], bbox: tuple[float, float, float, float], dia: date) -> list[dict]:
    """Granulos (dicts con `id`, `inicio` datetime con zona, `huella` [(lon, lat), ...], y los demás campos que se
    quieran conservar) adquiridos el `dia` UTC y cuya huella cubre parte de `bbox`, de mayor a menor cobertura.
    Cada resultado lleva `cobertura` (0–1). Función pura, sin red."""
    salida = []
    for g in granulos:
        if g["inicio"].astimezone(timezone.utc).date() != dia:
            continue
        c = cobertura_bbox(g["huella"], bbox)
        if c > 0:
            salida.append({**g, "cobertura": c})
    return sorted(salida, key=lambda g: (-g["cobertura"], g["inicio"], g["id"]))


def buscar(bbox: tuple[float, float, float, float], dia: date) -> list[dict]:
    """Metadatos GCOV del catálogo de ASF para el día UTC (sin credenciales)."""
    import asf_search as asf

    o, s, e, n = bbox
    wkt = f"POLYGON(({o} {s},{e} {s},{e} {n},{o} {n},{o} {s}))"
    ini = datetime(dia.year, dia.month, dia.day, tzinfo=timezone.utc)
    resultados = asf.search(dataset="NISAR", processingLevel="GCOV", intersectsWith=wkt,
                            start=ini, end=ini + timedelta(days=1))
    salida = []
    for r in resultados:
        try:
            g = _ec.normalizar(r.properties, r.geometry)
            anillo = [tuple(c) for c in r.geometry["coordinates"][0][:-1]]
        except (KeyError, TypeError, IndexError):
            continue
        salida.append({"id": g.granulo, "inicio": g.inicio, "coleccion": g.coleccion, "madurez": g.madurez,
                       "pol_a": g.pol_a, "pol_b": g.pol_b, "cobertura_frame": g.cobertura, "huella": anillo})
    return salida


def tabla(sitio: str, dia: date, lista: list[dict]) -> str:
    cab = f"**{sitio} · {dia.isoformat()}**\n\n"
    if not lista:
        return cab + "Sin granulos GCOV en el catálogo para ese día UTC sobre la caja del sitio (¿fecha mal transcrita?).\n"
    filas = ["| Granulo (id) | Instante UTC | Colección | Frecuencias (pol.) | Madurez | % de la caja |", "|---|---|---|---|---|---|"]
    for g in lista:
        f = f"A: {'+'.join(g['pol_a']) or '—'}" + (f"; B: {'+'.join(g['pol_b'])}" if g["pol_b"] else "")
        filas.append(f"| `{g['id']}` | {g['inicio']:%Y-%m-%dT%H:%M:%SZ} | {g['coleccion']} | {f} | {g['madurez']} | "
                     f"{g['cobertura'] * 100:.0f} % |")
    return cab + "\n".join(filas) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--manifiesto", default=str(RAIZ / "preparacion" / "entregas.json"))
    ap.add_argument("--sitio", default="todos")
    ap.add_argument("--salida", default=None, help="archivo donde escribir las tablas (por defecto, la pantalla)")
    a = ap.parse_args(argv)
    from preparacion.sitios import cargar_sitios
    sitios = cargar_sitios()
    man = json.loads(Path(a.manifiesto).read_text(encoding="utf-8"))
    bloques = []
    for sitio, cfg in man["sitios"].items():
        if a.sitio not in ("todos", sitio):
            continue
        for e in cfg["fechas"]:
            if not e.get("fecha"):
                continue
            dia = date.fromisoformat(e["fecha"])
            bbox = tuple(sitios[sitio].bbox)
            bloques.append(tabla(sitio, dia, candidatos(buscar(bbox, dia), bbox, dia)))
    texto = "\n".join(bloques)
    if a.salida:
        Path(a.salida).write_text(texto, encoding="utf-8")
    else:
        print(texto)
    return 0


if __name__ == "__main__":
    sys.exit(main())
