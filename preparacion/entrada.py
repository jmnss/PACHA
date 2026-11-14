"""Lectura de las entregas del equipo: raiz/<sitio>/<AAAAMMDD>/{mascara.tif, stack.tif?, procedencia.json?}."""
import json
import re
import warnings
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

import numpy as np
import rasterio
from affine import Affine

from datos.contrato import Procedencia, faltantes_procedencia

SIN_DATO = 255
_CARPETA = re.compile(r"^\d{8}$")


@dataclass
class Raster:
    datos: np.ndarray
    transform: Affine
    crs: str
    nodata: int = SIN_DATO


@dataclass
class Fecha:
    sitio: str
    fecha: date
    mascara: Path
    stack: Path | None = None
    procedencia: dict | None = None
    faltan: list[str] = field(default_factory=list)


def descubrir(raiz: Path, sitio: str) -> list[Fecha]:
    """Fechas entregadas para un sitio, ordenadas; las carpetas con otro nombre se ignoran con aviso."""
    salida = []
    for carpeta in sorted((Path(raiz) / sitio).iterdir()):
        if not carpeta.is_dir():
            continue
        try:
            if not _CARPETA.match(carpeta.name):
                raise ValueError
            f = datetime.strptime(carpeta.name, "%Y%m%d").date()
        except ValueError:
            warnings.warn(f"carpeta ignorada (se esperaba AAAAMMDD): {carpeta}")
            continue
        mascara, stack, prov = carpeta / "mascara.tif", carpeta / "stack.tif", carpeta / "procedencia.json"
        faltan = [n for n, ruta in (("mascara.tif", mascara), ("procedencia.json", prov)) if not ruta.exists()]
        salida.append(Fecha(
            sitio=sitio, fecha=f, mascara=mascara, stack=stack if stack.exists() else None,
            procedencia=json.loads(prov.read_text(encoding="utf-8")) if prov.exists() else None, faltan=faltan))
    return sorted(salida, key=lambda x: x.fecha)


def _nodata_declarado(src) -> int | None:
    """Nodata del archivo si cabe en uint8; la etiqueta inválida (p. ej. 256 de ArcGIS) se trata como ausente."""
    bruto = src.tags().get("GDAL_NODATA", src.nodata)
    try:
        v = float(bruto)
    except (TypeError, ValueError):
        return None
    return int(v) if v == int(v) and 0 <= v <= 255 else None


def leer_mascara(ruta: Path, stack_hh: np.ndarray | None = None) -> Raster:
    """Máscara uint8; los códigos sin dato (3, 255 y el nodata declarado) pasan a 255. Los píxeles con
    `stack_hh == 0` (borde sin dato del stack) también."""
    with rasterio.open(ruta) as src:
        datos = src.read(1).astype(np.uint8)
        sin_dato = np.isin(datos, (3, SIN_DATO))
        nd = _nodata_declarado(src)
        if nd is not None:
            sin_dato |= datos == nd
        transform, crs = src.transform, src.crs.to_string()
    if stack_hh is not None:
        if stack_hh.shape != datos.shape:
            raise ValueError(f"el stack {stack_hh.shape} no tiene la rejilla de la máscara {datos.shape}")
        sin_dato |= stack_hh == 0
    datos[sin_dato] = SIN_DATO
    return Raster(datos, transform, crs)


def leer_stack(ruta: Path) -> tuple[Raster, Raster]:
    """HH y HV en dB (float32); el 0 exacto y los NaN son sin dato (NaN)."""
    with rasterio.open(ruta) as src:
        if src.count < 2:
            raise ValueError(f"el stack necesita HH y HV (2 bandas), tiene {src.count}: {ruta}")
        transform, crs = src.transform, src.crs.to_string()
        bandas = []
        for i in (1, 2):
            b = src.read(i).astype(np.float32)
            b[(b == 0) | ~np.isfinite(b)] = np.nan
            bandas.append(Raster(b, transform, crs, nodata=0))
    return bandas[0], bandas[1]


def validar_procedencia(p: dict | None, clase: str = "nisar") -> list[str]:
    """Campos de procedencia que faltan (vacío = completa). `None` → ['procedencia.json']."""
    if p is None:
        return ["procedencia.json"]
    fecha = p.get("fecha_adquisicion_utc")
    metodo = p.get("metodo")
    prov = Procedencia(
        producto=p.get("producto"), coleccion=p.get("coleccion"), granulos=p.get("granulos") or [],
        fecha_adquisicion=datetime.fromisoformat(fecha.replace("Z", "+00:00")) if fecha else None,
        polarizaciones=p.get("polarizaciones") or [], frecuencia=p.get("frecuencia"), madurez=p.get("madurez"),
        unidades=p.get("unidades_stack"), metodo=metodo if isinstance(metodo, dict) else None,
        autor=p.get("autor"), fecha_proceso=p.get("fecha_proceso"))
    return faltantes_procedencia(clase, prov)
