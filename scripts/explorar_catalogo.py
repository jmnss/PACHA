"""Reconocimiento del catálogo NISAR sobre Ecuador: SOLO METADATOS, no descarga nada.

Consulta el catálogo de ASF con `asf_search` (sin cuenta ni credenciales) para las zonas de las dos historias
(La Segua, Manabí; Loja, Sierra) y para el resto de Ecuador, y escribe un resumen en `docs/catalogo-ecuador.md`:
por zona, número de granulos GCOV y GUNW, fechas, órbita y track, polarizaciones, frecuencias A/B, madurez
(BETA, PROVISIONAL o VALIDATED) y tamaño.

Uso:
    python -m pip install -r requirements-preparacion.txt
    python scripts/explorar_catalogo.py [--salida docs/catalogo-ecuador.md] [--json ruta.json]

Las convenciones que usa (nombres de colección, campos del granulo, patrón de nombre del GUNW) están verificadas
en `docs/nisar-verificado.md`.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PRODUCTOS = ("GCOV", "GUNW")
MARCA_NOTAS = "<!-- notas-a-mano: lo que sigue lo conserva explorar_catalogo.py al regenerar -->"


@dataclass(frozen=True)
class Zona:
    id: str
    nombre: str
    bbox: tuple[float, float, float, float]   # (oeste, sur, este, norte), WGS84
    detalle: bool                              # True: lista cada granulo; False: solo resumen por track/frame

    def wkt(self) -> str:
        o, s, e, n = self.bbox
        return f"POLYGON(({o} {s},{e} {s},{e} {n},{o} {n},{o} {s}))"


# Las dos zonas de las historias usan el centro de su escenario de demostración (data/nisar_sample.csv)
# con una caja de ±0,1° (~22 km): cabe holgada en un frame de NISAR (~240 km de franja).
ZONAS = (
    Zona("la_segua", "Humedal La Segua (Manabí)", (-80.30, -0.80, -80.10, -0.60), True),
    Zona("loja", "Bosques andinos de Loja (Sierra)", (-79.35, -4.15, -79.15, -3.95), True),
    Zona("ecuador_continental", "Resto de Ecuador continental (caja aproximada)", (-81.1, -5.1, -75.2, 1.5), False),
    Zona("galapagos", "Galápagos (caja aproximada)", (-92.1, -1.5, -89.2, 0.7), False),
)

_RE_FECHA = re.compile(r"(\d{8}T\d{6})")
_RE_COLECCION = re.compile(r"^NISAR_L\d_[A-Z0-9]+_(?:(BETA|PROVISIONAL)_)?V\d+$")


def madurez(coleccion: str) -> str:
    """BETA o PROVISIONAL si lo dice el nombre de la colección; sin marca es VALIDATED (GU availability-overview).
    Las colecciones de respuesta urgente (`NISAR_UR_L<n>`, GU urgent-response) no son una madurez: se marcan «UR»."""
    if re.match(r"^NISAR_UR_L\d$", coleccion or ""):
        return "UR"
    m = _RE_COLECCION.match(coleccion or "")
    if not m:
        return "desconocida"
    return m.group(1) or "VALIDATED"


def _fecha(texto: str) -> datetime:
    return datetime.strptime(texto, "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)


@dataclass(frozen=True)
class Granulo:
    producto: str
    granulo: str
    coleccion: str
    madurez: str
    inicio: datetime                 # UTC; en un GUNW, la fecha de referencia
    secundaria: datetime | None      # solo GUNW: fecha de la segunda pasada
    direccion: str                   # ASCENDING | DESCENDING
    track: int | None
    frame: int | None
    pol_a: tuple[str, ...]           # polarizaciones de la Frecuencia A (banda principal)
    pol_b: tuple[str, ...]           # de la Frecuencia B (banda lateral); vacío si no hay
    ancho_banda: str                 # p. ej. «40+5» (MHz de A + B)
    cobertura: str                   # Full | Partial
    crid: str
    tamano_gb: float | None          # solo el .h5
    centro: tuple[float, float] | None = None   # (lon, lat) medio de la huella, para ubicar el track


def _centro(geometria: dict | None) -> tuple[float, float] | None:
    try:
        anillo = geometria["coordinates"][0][:-1]
        return (round(sum(c[0] for c in anillo) / len(anillo), 2), round(sum(c[1] for c in anillo) / len(anillo), 2))
    except (TypeError, KeyError, IndexError, ZeroDivisionError):
        return None


def normalizar(props: dict, geometria: dict | None = None) -> Granulo:
    """Convierte las propiedades (y la huella GeoJSON) de un resultado de `asf_search` en un `Granulo`."""
    nombre = props.get("sceneName") or props.get("fileID") or ""
    producto = props.get("processingLevel") or ""
    fechas = _RE_FECHA.findall(nombre)
    if producto == "GUNW" and len(fechas) >= 4:
        inicio, secundaria = _fecha(fechas[0]), _fecha(fechas[2])
    else:
        inicio = datetime.fromisoformat(props["startTime"].replace("Z", "+00:00"))
        secundaria = None
    bytes_ = props.get("bytes") or {}
    tamano = sum(v.get("bytes", 0) for k, v in bytes_.items() if k.endswith(".h5")) if isinstance(bytes_, dict) else 0
    coleccion = props.get("collectionName") or ""
    return Granulo(
        producto=producto, granulo=nombre, coleccion=coleccion, madurez=madurez(coleccion),
        inicio=inicio, secundaria=secundaria,
        direccion=props.get("flightDirection") or "", track=props.get("pathNumber"), frame=props.get("frameNumber"),
        pol_a=tuple(props.get("mainBandPolarization") or ()), pol_b=tuple(props.get("sideBandPolarization") or ()),
        ancho_banda="/".join(props.get("rangeBandwidth") or ()), cobertura=props.get("frameCoverage") or "",
        crid=props.get("crid") or "", tamano_gb=round(tamano / 1e9, 2) if tamano else None,
        centro=_centro(geometria),
    )


def deduplicar(granulos: list[Granulo]) -> tuple[list[Granulo], int]:
    """Una entrada por adquisición (producto, track, frame, fechas, cobertura): se queda la de CRID y nombre mayores
    (el contador final del nombre sube al reprocesar). Devuelve la lista ordenada por fecha y cuántas se quitaron."""
    mejores: dict[tuple, Granulo] = {}
    for g in granulos:
        clave = (g.producto, g.track, g.frame, g.inicio, g.secundaria, g.cobertura, g.direccion)
        actual = mejores.get(clave)
        if actual is None or (g.crid, g.granulo) > (actual.crid, actual.granulo):
            mejores[clave] = g
    unicos = sorted(mejores.values(), key=lambda g: (g.producto, g.inicio, g.track or 0, g.frame or 0))
    return unicos, len(granulos) - len(unicos)


def buscar(zona: Zona) -> list[Granulo]:
    """Consulta de metadatos (sin credenciales). `asf_search` se importa aquí: solo lo necesita este script."""
    import asf_search as asf

    resultados = asf.search(dataset="NISAR", processingLevel=list(PRODUCTOS), intersectsWith=zona.wkt())
    return [normalizar(r.properties, r.geometry) for r in resultados if r.properties.get("processingLevel") in PRODUCTOS]


# ----------------------------------------------------------------------------- informe

def _d(f: datetime | None) -> str:
    return f.strftime("%Y-%m-%d") if f else "—"


def _pol(g: Granulo) -> str:
    a = "+".join(g.pol_a) or "—"
    return f"A: {a}" + (f" · B: {'+'.join(g.pol_b)}" if g.pol_b else "")


def _dir(d: str) -> str:
    return {"ASCENDING": "asc.", "DESCENDING": "desc."}.get(d, d or "—")


def resumen_zona(zona: Zona, granulos: list[Granulo], duplicados: int) -> list[str]:
    lineas = [f"## {zona.nombre}", "", f"Caja (oeste, sur, este, norte): `{zona.bbox}`.", ""]
    if not granulos:
        return lineas + ["Sin granulos GCOV ni GUNW en el catálogo.", ""]
    lineas += ["| Producto | Granulos | Primera | Última | BETA | PROVISIONAL | VALIDATED | UR | Tamaño total (GB) |",
               "|---|---:|---|---|---:|---:|---:|---:|---:|"]
    for prod in PRODUCTOS:
        gs = [g for g in granulos if g.producto == prod]
        if not gs:
            lineas.append(f"| {prod} | 0 | — | — | 0 | 0 | 0 | 0 | — |")
            continue
        m = Counter(g.madurez for g in gs)
        total = sum(g.tamano_gb or 0 for g in gs)
        lineas.append(f"| {prod} | {len(gs)} | {_d(min(g.inicio for g in gs))} | {_d(max(g.inicio for g in gs))} | "
                      f"{m['BETA']} | {m['PROVISIONAL']} | {m['VALIDATED']} | {m['UR']} | {total:.1f} |")
    lineas.append("")
    if duplicados:
        lineas += [f"Se quitaron {duplicados} granulos repetidos (misma adquisición reprocesada).", ""]

    # Geometrías: cada (dirección, track, frame) con sus polarizaciones y anchos de banda.
    geo: dict[tuple, list[Granulo]] = defaultdict(list)
    for g in granulos:
        geo[(g.direccion, g.track, g.frame)].append(g)
    lineas += ["| Dirección | Track | Frame | Centro (lon, lat) | GCOV | GUNW | Polarizaciones (frecuencia) | "
               "Ancho de banda (MHz) | Fechas GCOV |",
               "|---|---:|---:|---|---:|---:|---|---|---|"]
    for (d, t, f), gs in sorted(geo.items(), key=lambda kv: (kv[0][0], kv[0][1] or 0, kv[0][2] or 0)):
        gcov = [g for g in gs if g.producto == "GCOV"]
        gunw = [g for g in gs if g.producto == "GUNW"]
        pols = sorted({_pol(g) for g in gcov or gs})
        bandas = sorted({g.ancho_banda for g in gs if g.ancho_banda})
        fechas = (f"{_d(min(g.inicio for g in gcov))} → {_d(max(g.inicio for g in gcov))}" if gcov else "—")
        centros = [g.centro for g in gs if g.centro]
        centro = (f"{sum(c[0] for c in centros) / len(centros):.2f}, {sum(c[1] for c in centros) / len(centros):.2f}"
                  if centros else "—")
        lineas.append(f"| {_dir(d)} | {t} | {f} | {centro} | {len(gcov)} | {len(gunw)} | {'; '.join(pols)} | "
                      f"{', '.join(bandas) or '—'} | {fechas} |")
    lineas.append("")

    if zona.detalle:
        lineas += ["<details><summary>Lista de granulos GCOV</summary>", "",
                   "| Fecha (UTC) | Dir. | Track/frame | Madurez | Polarizaciones | Cobertura | GB | Granulo |",
                   "|---|---|---|---|---|---|---:|---|"]
        for g in (g for g in granulos if g.producto == "GCOV"):
            lineas.append(f"| {g.inicio:%Y-%m-%d %H:%M} | {_dir(g.direccion)} | {g.track}/{g.frame} | {g.madurez} | "
                          f"{_pol(g)} | {g.cobertura} | {g.tamano_gb or '—'} | `{g.granulo}` |")
        lineas += ["", "</details>", "", "<details><summary>Pares GUNW (referencia → secundaria)</summary>", "",
                   "| Referencia | Secundaria | Días | Dir. | Track/frame | Madurez | Pol. | GB |",
                   "|---|---|---:|---|---|---|---|---:|"]
        for g in (g for g in granulos if g.producto == "GUNW"):
            dias = (g.secundaria - g.inicio).days if g.secundaria else "—"
            lineas.append(f"| {_d(g.inicio)} | {_d(g.secundaria)} | {dias} | {_dir(g.direccion)} | {g.track}/{g.frame} | "
                          f"{g.madurez} | {'+'.join(g.pol_a) or '—'} | {g.tamano_gb or '—'} |")
        lineas += ["", "</details>", ""]
    return lineas


def informe(resultados: dict[str, tuple[Zona, list[Granulo], int]], consulta: datetime) -> str:
    cab = [
        "# Catálogo NISAR sobre Ecuador (solo metadatos)",
        "",
        f"Generado por `scripts/explorar_catalogo.py` el {consulta:%Y-%m-%d %H:%M} UTC con `asf_search` "
        "(`dataset='NISAR'`, productos GCOV y GUNW, sin cuenta). **No se descargó ningún granulo.** "
        "Madurez según el nombre de la colección: con `BETA` o `PROVISIONAL` en el nombre, esa; sin marca, "
        "VALIDATED (`docs/nisar-verificado.md` §2). Frecuencia A = banda principal (`mainBandPolarization`); "
        "B = banda lateral (`sideBandPolarization`). Tamaño = el archivo `.h5`. Fechas en UTC. "
        "«UR» = respuesta urgente (`NISAR_UR_L2`): órbita de pronóstico, menos correcciones, y el archivo los borra a "
        "los 30 días (GU `urgent-response`); no sirven de base para la app.",
        "",
        "Las cajas de «resto de Ecuador» y Galápagos son aproximadas: un granulo que solo roza el mar también cuenta.",
        "",
    ]
    cuerpo: list[str] = []
    for zona, granulos, dup in resultados.values():
        cuerpo += resumen_zona(zona, granulos, dup)
    return "\n".join(cab + cuerpo).rstrip() + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--salida", type=Path, default=RAIZ / "docs" / "catalogo-ecuador.md")
    ap.add_argument("--json", type=Path, default=None, help="además, vuelca los granulos normalizados en JSON")
    args = ap.parse_args(argv)
    consulta = datetime.now(timezone.utc)
    resultados = {}
    for zona in ZONAS:
        unicos, dup = deduplicar(buscar(zona))
        resultados[zona.id] = (zona, unicos, dup)
        print(f"{zona.id}: {sum(g.producto == 'GCOV' for g in unicos)} GCOV, "
              f"{sum(g.producto == 'GUNW' for g in unicos)} GUNW ({dup} repetidos)")
    texto = informe(resultados, consulta)
    previo = args.salida.read_text(encoding="utf-8") if args.salida.exists() else ""
    if MARCA_NOTAS in previo:
        texto += "\n" + previo[previo.index(MARCA_NOTAS):]
    args.salida.write_text(texto, encoding="utf-8")
    if args.json:
        datos = {zid: [asdict(g) for g in gs] for zid, (_, gs, _) in resultados.items()}
        args.json.write_text(json.dumps({"consulta": consulta.isoformat(), "zonas": datos}, default=str, indent=1),
                             encoding="utf-8")
    print(f"Escrito {args.salida}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
