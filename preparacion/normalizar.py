"""Normaliza las entregas sueltas del equipo (según `preparacion/entregas.json`) a la carpeta que lee la fase 1:
<salida>/<sitio>/<AAAAMMDD>/{stack.tif, mascara.tif, delta_rfdi.tif, procedencia.json}. Fuera de línea."""
import json
import shutil
from pathlib import Path

import numpy as np
import rasterio
from affine import Affine

from preparacion.entrada import Raster, leer_mascara
from preparacion.rejilla import Rejilla, remuestrear_categorica, remuestrear_continua

LIMITE_CORRUPTO = 1e5


def leer_banda(ruta: Path, banda: int = 1, sin_dato: list[float] | None = None,
               umbral_sin_dato: float | None = None) -> Raster:
    """Banda float32; NaN en `sin_dato`, en `>= umbral_sin_dato`, en NaN/inf, en |v| > 1e5 y en el nodata declarado."""
    with rasterio.open(ruta) as src:
        b = src.read(banda).astype(np.float32)
        nd, transform, crs = src.nodata, src.transform, src.crs.to_string()
    malo = ~np.isfinite(b)
    with np.errstate(invalid="ignore"):
        malo |= np.abs(b) > LIMITE_CORRUPTO
        for v in sin_dato or []:
            malo |= b == v
        if umbral_sin_dato is not None:
            malo |= b >= umbral_sin_dato
        if nd is not None and np.isfinite(nd):
            malo |= b == nd
    b[malo] = np.nan
    return Raster(b, transform, crs, nodata=0)


def rejilla_de(d: dict) -> Rejilla:
    a, b, c, dd, e, f = d["transform"]
    alto, ancho = d["forma"]
    return Rejilla(Affine(a, b, c, dd, e, f), ancho, alto, f"EPSG:{d['epsg']}")


def _escribir(ruta: Path, bandas: list[np.ndarray], transform, crs: str, dtype: str, nodata=None) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(ruta, "w", driver="GTiff", height=bandas[0].shape[0], width=bandas[0].shape[1],
                       count=len(bandas), dtype=dtype, crs=crs, transform=transform, nodata=nodata,
                       compress="deflate") as d:
        for i, b in enumerate(bandas, 1):
            d.write(b.astype(dtype), i)


def _spec_banda(entrada: Path, s: dict) -> Raster:
    return leer_banda(entrada / s["archivo"], s.get("banda", 1), s.get("sin_dato"), s.get("umbral_sin_dato"))


def _faltante(entrada: Path, spec: dict | None) -> bool:
    return not spec or not spec.get("archivo") or not (entrada / spec["archivo"]).exists()


def organizar(manifiesto: dict, entrada: Path, salida: Path) -> list[str]:
    """Escribe `salida/<sitio>/<AAAAMMDD>/` y devuelve las líneas del informe."""
    entrada, salida = Path(entrada), Path(salida)
    informe: list[str] = []
    for sitio, cfg in manifiesto["sitios"].items():
        rej = rejilla_de(cfg["rejilla"]) if cfg.get("rejilla") else None
        for e in cfg["fechas"]:
            papel = e.get("papel", "?")
            if not e.get("fecha"):
                informe.append(f"{sitio}: entrada «{papel}» omitida: falta la fecha (pedir al equipo)")
                continue
            etiqueta = f"{sitio} {e['fecha']}"
            hay = False
            if e.get("mascara") is not None and _faltante(entrada, e["mascara"]):
                informe.append(f"{etiqueta}: falta el archivo de la máscara (pedir al equipo)")
                continue
            stack = e.get("stack")
            if stack and any(_faltante(entrada, stack.get(p)) for p in ("HH", "HV")):
                informe.append(f"{etiqueta}: falta el archivo del stack (pedir al equipo)")
                continue
            rfdi = e.get("delta_rfdi")
            if rfdi is not None and _faltante(entrada, rfdi):
                informe.append(f"{etiqueta}: falta el archivo del ΔRFDI (pedir al equipo)")
                continue
            carpeta = salida / sitio / e["fecha"].replace("-", "")
            escritos = []
            if stack:
                hh, hv = _spec_banda(entrada, stack["HH"]), _spec_banda(entrada, stack["HV"])
                if rej is not None:
                    bandas, tr, crs = [remuestrear_continua(b, rej) for b in (hh, hv)], rej.transform, rej.crs
                else:
                    bandas, tr, crs = [hh.datos, hv.datos], hh.transform, hh.crs
                _escribir(carpeta / "stack.tif", bandas, tr, crs, "float32")
                escritos.append("stack")
            if e.get("mascara"):
                origen = entrada / e["mascara"]["archivo"]
                if rej is not None:
                    m = remuestrear_categorica(leer_mascara(origen), rej)
                    _escribir(carpeta / "mascara.tif", [m], rej.transform, rej.crs, "uint8", nodata=255)
                else:
                    carpeta.mkdir(parents=True, exist_ok=True)
                    destino = carpeta / "mascara.tif"
                    if not destino.exists() or destino.stat().st_size != origen.stat().st_size:
                        shutil.copyfile(origen, destino)
                escritos.append("mascara")
            if rfdi:
                r = _spec_banda(entrada, rfdi)
                if rej is not None:
                    _escribir(carpeta / "delta_rfdi.tif", [remuestrear_continua(r, rej)], rej.transform, rej.crs,
                              "float32")
                else:
                    _escribir(carpeta / "delta_rfdi.tif", [r.datos], r.transform, r.crs, "float32")
                escritos.append("delta_rfdi")
            if e.get("procedencia") is not None and carpeta.exists():
                ruta = carpeta / "procedencia.json"
                if not ruta.exists():
                    ruta.write_text(json.dumps(e["procedencia"], ensure_ascii=False, indent=1), encoding="utf-8")
                    escritos.append("procedencia")
                else:
                    informe.append(f"{etiqueta}: procedencia.json existente, no se toca")
            informe.append(f"{etiqueta} ({papel}): {', '.join(escritos) or 'nada que escribir'}")
    return informe
