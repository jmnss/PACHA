"""Cuantización y reducción de capas ráster para la API (uint8 en base64)."""
from __future__ import annotations

import base64

import numpy as np

from api.schemas import Rejilla
from datos.contrato import CapaRaster

_NIVELES = 254  # códigos 1..255 -> 254 pasos


def _reducir(datos: np.ndarray, factor: int) -> np.ndarray:
    """Promedio por bloques factor×factor ignorando NaN; un bloque todo NaN da NaN.

    Si el lado no es múltiplo del factor se rellena con NaN al final (los bloques del borde
    promedian solo sus píxeles reales), de modo que el bbox se conserva.
    """
    f, c = datos.shape
    nf, nc = -(-f // factor), -(-c // factor)
    if (nf * factor, nc * factor) != (f, c):
        relleno = np.full((nf * factor, nc * factor), np.nan, dtype=np.float32)
        relleno[:f, :c] = datos
        datos = relleno
    bloques = datos.reshape(nf, factor, nc, factor)
    validos = ~np.isnan(bloques)
    suma = np.where(validos, bloques, 0).sum(axis=(1, 3), dtype=np.float64)
    cuenta = validos.sum(axis=(1, 3))
    with np.errstate(invalid="ignore", divide="ignore"):
        media = suma / cuenta
    media[cuenta == 0] = np.nan
    return media.astype(np.float32)


def a_rejilla(capa: CapaRaster, max_lado: int = 512) -> Rejilla:
    datos = np.asarray(capa.datos, dtype=np.float32)
    factor = max(1, -(-max(datos.shape) // max_lado))
    if factor > 1:
        datos = _reducir(datos, factor)
    vmin, vmax = float(capa.vmin), float(capa.vmax)
    q = np.zeros(datos.shape, dtype=np.uint8)
    validos = ~np.isnan(datos)
    if vmax > vmin:
        t = np.clip((datos[validos] - vmin) / (vmax - vmin), 0.0, 1.0)
        q[validos] = (np.rint(t * _NIVELES) + 1).astype(np.uint8)
    else:
        q[validos] = 1
    return Rejilla(
        filas=datos.shape[0],
        columnas=datos.shape[1],
        vmin=vmin,
        vmax=vmax,
        bbox=tuple(capa.bbox),
        datos_b64=base64.b64encode(q.tobytes()).decode("ascii"),
    )


def de_rejilla(r: Rejilla) -> np.ndarray:
    """Inversa de `a_rejilla`: float32 con NaN donde el código es 0."""
    q = np.frombuffer(base64.b64decode(r.datos_b64), dtype=np.uint8)
    if q.size != r.filas * r.columnas:
        raise ValueError("datos_b64 no coincide con filas × columnas")
    q = q.reshape(r.filas, r.columnas)
    paso = (r.vmax - r.vmin) / _NIVELES
    out = (r.vmin + (q.astype(np.float32) - 1.0) * np.float32(paso)).astype(np.float32)
    out[q == 0] = np.nan
    return out
