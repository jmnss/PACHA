"""Rejilla de referencia de un sitio, remuestreo y reducción de máscaras y dB a la rejilla de los derivados."""
import math
from dataclasses import dataclass

import numpy as np
from affine import Affine
from rasterio.transform import array_bounds
from rasterio.warp import Resampling, reproject, transform_bounds

from preparacion.entrada import SIN_DATO, Raster
from preparacion.sitios import Sitio

CRS_REF = "EPSG:32717"
RES_RESPALDO_M = 10.0


@dataclass
class Rejilla:
    transform: Affine
    ancho: int
    alto: int
    crs: str = CRS_REF

    @property
    def resolucion_m(self) -> float:
        return abs(self.transform.a)

    def bbox_wgs84(self) -> tuple[float, float, float, float]:
        o, s, e, n = array_bounds(self.alto, self.ancho, self.transform)
        return tuple(transform_bounds(self.crs, "EPSG:4326", o, s, e, n))


def _es_cuadrado(t: Affine, tol: float = 1e-6) -> bool:
    return abs(abs(t.a) - abs(t.e)) < tol and t.b == 0 and t.d == 0


def rejilla_referencia(sitio: Sitio, mascaras: list[Raster]) -> Rejilla:
    """La de la primera máscara en EPSG:32717 con píxel cuadrado; si ninguna, la caja del sitio a 10 m."""
    for m in mascaras:
        if m.crs.upper().replace("EPSG:", "") == "32717" and _es_cuadrado(m.transform):
            return Rejilla(m.transform, m.datos.shape[1], m.datos.shape[0], CRS_REF)
    o, s, e, n = transform_bounds("EPSG:4326", CRS_REF, *sitio.bbox)
    o, n = math.floor(o / RES_RESPALDO_M) * RES_RESPALDO_M, math.ceil(n / RES_RESPALDO_M) * RES_RESPALDO_M
    ancho, alto = math.ceil((e - o) / RES_RESPALDO_M), math.ceil((n - s) / RES_RESPALDO_M)
    return Rejilla(Affine(RES_RESPALDO_M, 0, o, 0, -RES_RESPALDO_M, n), ancho, alto, CRS_REF)


def rejilla_derivados(ref: Rejilla, lado_max: int = 1024) -> Rejilla:
    """Misma extensión (el borde se redondea hacia arriba) con factor entero ceil(max(ancho, alto) / lado_max)."""
    f = max(1, math.ceil(max(ref.ancho, ref.alto) / lado_max))
    t = ref.transform
    return Rejilla(Affine(t.a * f, t.b, t.c, t.d, t.e * f, t.f), math.ceil(ref.ancho / f), math.ceil(ref.alto / f), ref.crs)


def remuestrear_categorica(r: Raster, destino: Rejilla) -> np.ndarray:
    """Vecino más cercano a la rejilla destino; lo que no cubre la fuente queda 255."""
    fuente = r.datos.astype(np.uint8)
    out = np.full((destino.alto, destino.ancho), SIN_DATO, np.uint8)
    reproject(fuente, out, src_transform=r.transform, src_crs=r.crs, dst_transform=destino.transform,
              dst_crs=destino.crs, resampling=Resampling.nearest, src_nodata=r.nodata, dst_nodata=SIN_DATO)
    return out


def _factor(ref: Rejilla, destino: Rejilla) -> int:
    return max(1, round(destino.resolucion_m / ref.resolucion_m))


def _bloques(datos: np.ndarray, f: int, destino: Rejilla, relleno) -> np.ndarray:
    """(alto, ancho, f*f) con relleno en el borde que sobra."""
    p = np.full((destino.alto * f, destino.ancho * f), relleno, dtype=datos.dtype)
    alto, ancho = min(datos.shape[0], p.shape[0]), min(datos.shape[1], p.shape[1])
    p[:alto, :ancho] = datos[:alto, :ancho]
    return p.reshape(destino.alto, f, destino.ancho, f).transpose(0, 2, 1, 3).reshape(destino.alto, destino.ancho, f * f)


def reducir_categorica(datos: np.ndarray, ref: Rejilla, destino: Rejilla) -> np.ndarray:
    """Moda por bloque; 255 solo si todo el bloque es 255. Empate: gana el código menor."""
    b = _bloques(datos, _factor(ref, destino), destino, SIN_DATO)
    validos = b != SIN_DATO
    codigos = [c for c in np.unique(b) if c != SIN_DATO]
    out = np.full(b.shape[:2], SIN_DATO, np.uint8)
    if codigos:
        cuentas = np.stack([(b == c).sum(axis=2) for c in codigos])
        out = np.where(validos.any(axis=2), np.array(codigos, np.uint8)[cuentas.argmax(axis=0)], SIN_DATO).astype(np.uint8)
    return out


def reducir_continua(datos: np.ndarray, ref: Rejilla, destino: Rejilla) -> np.ndarray:
    """Media por bloque ignorando NaN, en lineal (dB → lineal → media → dB). Bloque sin datos: NaN."""
    b = _bloques(datos.astype(np.float64), _factor(ref, destino), destino, np.nan)
    lineal = np.power(10.0, b / 10.0)
    n = np.isfinite(lineal).sum(axis=2)
    suma = np.where(np.isfinite(lineal), lineal, 0.0).sum(axis=2)
    with np.errstate(divide="ignore", invalid="ignore"):
        media = np.where(n > 0, suma / np.maximum(n, 1), np.nan)
        return (10.0 * np.log10(media)).astype(np.float32)
