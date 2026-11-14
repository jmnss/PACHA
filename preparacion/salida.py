"""Escritura de los derivados de un sitio (formato que leen las Tareas 7 y 8 del plan de la fase 1)."""
import json
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import numpy as np
from pyproj import Transformer

from preparacion.entrada import SIN_DATO, Fecha, Raster, leer_mascara, leer_stack, validar_procedencia
from preparacion.medidas import contorno, contorno_a_geojson, geojson_a_mascara, superficie_km2
from preparacion.rejilla import Rejilla, reducir_categorica, reducir_continua, rejilla_derivados, \
    rejilla_referencia, remuestrear_categorica
from preparacion.relieve import curva_nivel_superficie, superficie_agua_dem
from preparacion.sitios import Sitio

VERSION = 1
RANGOS_DB = {"HH": (-25.0, 0.0), "HV": (-30.0, -5.0)}
SIN_DATO_DEM = -32768
DECIMALES_GEOJSON = 5  # ~1 m: ahorra tamaño frente al presupuesto de 10 MB
# Colores de la leyenda: «agua» y «quemado» salen de LEYENDA_SUPERFICIES (datos/laboratorio.py);
# «no agua» y «no quemado» usan el gris NEUTRO de modelo/nisar.py.
LEYENDAS = {
    "embalse": [["agua", "#2a6fb0"], ["no agua", "#6f6d7a"]],
    "incendio": [["quemado", "#6b4a3a"], ["no quemado", "#6f6d7a"]],
}
CARPETAS = {"embalse": "embalses", "incendio": "incendios"}


def cuantizar(db: np.ndarray, vmin: float, vmax: float) -> np.ndarray:
    """dB → uint8: 0 = sin dato (NaN), 1–255 = vmin + (q-1)/254·(vmax−vmin); fuera de rango se recorta."""
    v = np.asarray(db, np.float64)
    with np.errstate(invalid="ignore"):
        q = 1 + np.rint((v - vmin) / (vmax - vmin) * 254)
    q = np.clip(np.nan_to_num(q, nan=0.0), 1, 255)
    return np.where(np.isfinite(v), q, 0).astype(np.uint8)


def descuantizar(q: np.ndarray, vmin: float, vmax: float) -> np.ndarray:
    q = np.asarray(q)
    return np.where(q == 0, np.nan, vmin + (q.astype(np.float64) - 1) / 254 * (vmax - vmin)).astype(np.float32)


def tamano_mb(raiz: Path) -> float:
    raiz = Path(raiz)
    return sum(p.stat().st_size for p in raiz.rglob("*") if p.is_file()) / 1e6 if raiz.exists() else 0.0


def _redondear(obj, n: int = DECIMALES_GEOJSON):
    if isinstance(obj, float):
        return round(obj, n)
    if isinstance(obj, (list, tuple)):
        return [_redondear(x, n) for x in obj]
    if isinstance(obj, dict):
        return {k: _redondear(v, n) for k, v in obj.items()}
    return obj


def _mismo_rejilla(r: Raster, ref: Rejilla) -> bool:
    return r.datos.shape == (ref.alto, ref.ancho) and r.transform == ref.transform and \
        r.crs.upper().replace("EPSG:", "") == ref.crs.upper().replace("EPSG:", "")


def _a_codigos_contrato(m: np.ndarray) -> np.ndarray:
    """Máscara del equipo (1 clase, 0 resto, 255 sin dato) → códigos del contrato (0 sin dato, 1 clase, 2 resto)."""
    out = np.zeros(m.shape, np.uint8)
    out[m == 1] = 1
    out[m == 0] = 2
    return out


def _fila_semilla(sitio: Sitio, rej: Rejilla) -> tuple[int, int]:
    x, y = Transformer.from_crs("EPSG:4326", rej.crs, always_xy=True).transform(sitio.semilla[1], sitio.semilla[0])
    col, fila = ~rej.transform @ (x, y)
    f, c = int(np.floor(fila)), int(np.floor(col))
    if not (0 <= f < rej.alto and 0 <= c < rej.ancho):
        raise ValueError("La semilla cae fuera de la rejilla.")
    return f, c


def _dentro_en(m: Raster, ref: Rejilla, dentro: np.ndarray | None, gj: dict | None) -> np.ndarray | None:
    """El contorno en la rejilla ORIGINAL de la máscara: la superficie se mide ahí, no tras remuestrear."""
    if dentro is None or _mismo_rejilla(m, ref):
        return dentro
    return geojson_a_mascara(gj, Rejilla(m.transform, m.datos.shape[1], m.datos.shape[0], m.crs))


def _escribir_json(ruta: Path, datos) -> None:
    ruta.write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def escribir_sitio(sitio: Sitio, fechas: list[Fecha], destino: Path,
                   dem_fn: Callable[[Rejilla], np.ndarray] | None = None,
                   regenerar_contorno: bool = False) -> dict:
    """Escribe en `destino` (la carpeta del sitio) sitio.json, un .npz por fecha, el contorno y, si hay `dem_fn`
    (rejilla de derivados → DEM en metros), dem.npz y curva.json. Devuelve el sitio.json escrito."""
    destino = Path(destino)
    destino.mkdir(parents=True, exist_ok=True)
    clase = LEYENDAS[sitio.tipo][0][0]

    leidas: list[tuple[Fecha, Raster, Raster | None, Raster | None]] = []
    for f in fechas:
        try:
            hh = hv = None
            if f.stack is not None:
                hh, hv = leer_stack(f.stack)
            leidas.append((f, leer_mascara(f.mascara, hh.datos if hh is not None else None), hh, hv))
        except Exception as e:  # una fecha ilegible no tumba el sitio
            warnings.warn(f"{sitio.sitio} {f.fecha}: fecha omitida ({e})")
    ref = rejilla_referencia(sitio, [m for _, m, _, _ in leidas])
    der = rejilla_derivados(ref)
    ref_mascaras = [m.datos if _mismo_rejilla(m, ref) else remuestrear_categorica(m, ref) for _, m, _, _ in leidas]

    # DEM, agua en el DEM y curva (el DEM sin cota válida en la semilla no aborta: se escribe sin él)
    dem = agua_dem = curva = None
    if dem_fn is not None:
        try:
            dem = np.asarray(dem_fn(der), np.float32)
            agua_dem, _ = superficie_agua_dem(dem, _fila_semilla(sitio, der))
            area = abs(der.transform.a * der.transform.e) / 1e6
            curva = curva_nivel_superficie(dem, agua_dem, area)
        except (ValueError, IndexError) as e:
            warnings.warn(f"{sitio.sitio}: sin relieve ({e})")
            dem = agua_dem = curva = None

    # contorno: el existente se conserva salvo --regenerar-contorno
    ruta_contorno = destino / "contorno.geojson"
    gj, dentro = None, None
    if ruta_contorno.exists() and not regenerar_contorno:
        gj = json.loads(ruta_contorno.read_text(encoding="utf-8"))
        dentro = geojson_a_mascara(gj, ref)
    elif ref_mascaras:
        dentro = contorno(ref_mascaras, ref)
    elif agua_dem is not None:  # sin entregas: el agua del DEM dilatada (la usan los sustitutos)
        dentro = contorno([agua_dem.astype(np.uint8)], der, min_ha=0)
        ref = der
    if gj is None and dentro is not None:
        gj = _redondear(contorno_a_geojson(dentro, ref)) if dentro.any() else \
            {"type": "FeatureCollection", "features": []}
        _escribir_json(ruta_contorno, gj)
    if dentro is not None and not dentro.any():
        dentro = None

    filas = []
    for (f, m, hh, hv), m_ref in zip(leidas, ref_mascaras):
        arrays = {"mascara": _a_codigos_contrato(reducir_categorica(m_ref, ref, der))}
        stack = None
        if hh is not None and _mismo_rejilla(hh, ref):
            for nombre, banda in (("HH", hh), ("HV", hv)):
                arrays[nombre] = cuantizar(reducir_continua(banda.datos, ref, der), *RANGOS_DB[nombre])
            stack = {k: list(v) for k, v in RANGOS_DB.items()}
        elif hh is not None:
            warnings.warn(f"{sitio.sitio} {f.fecha}: el stack no está en la rejilla de referencia; se omite")
        nombre_npz = f"{f.fecha:%Y%m%d}.npz"
        np.savez_compressed(destino / nombre_npz, **arrays)
        faltan = validar_procedencia(f.procedencia)
        faltan += [x for x in f.faltan if "ilegible" in x]
        filas.append({
            "fecha": f.fecha.isoformat(), "archivo": nombre_npz,
            "instante": (f.procedencia or {}).get("fecha_adquisicion_utc"),
            "superficie_km2": {clase: round(superficie_km2(m, 1, _dentro_en(m, ref, dentro, gj)), 4)},
            "procedencia": f.procedencia, "procedencia_completa": not faltan, "faltan": faltan, "stack": stack,
        })

    if dem is not None:
        d16 = np.where(np.isfinite(dem), np.rint(dem), SIN_DATO_DEM).astype(np.int16)
        np.savez_compressed(destino / "dem.npz", dem=d16, agua_dem=np.packbits(agua_dem))
        _escribir_json(destino / "curva.json", curva)

    sj = {
        "version": VERSION, "sitio": sitio.sitio, "tipo": sitio.tipo, "nombre": sitio.nombre, "region": sitio.region,
        "epsg": int(der.crs.upper().replace("EPSG:", "")), "transform": list(der.transform)[:6],
        "forma": [der.alto, der.ancho], "resolucion_m": der.resolucion_m, "bbox": list(der.bbox_wgs84()),
        "leyenda": LEYENDAS[sitio.tipo], "fechas": filas,
        "contorno": "contorno.geojson" if gj is not None else None,
        "dem": "dem.npz" if dem is not None else None, "curva": "curva.json" if curva is not None else None,
        "fecha_preparacion": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    _escribir_json(destino / "sitio.json", sj)
    return json.loads((destino / "sitio.json").read_text(encoding="utf-8"))
