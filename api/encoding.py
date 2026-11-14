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


def _reducir_moda(datos: np.ndarray, factor: int) -> np.ndarray:
    """Moda por bloques de los códigos enteros no nulos (NaN y 0 no cuentan); sin valores inventados.

    Un bloque sin códigos válidos da NaN. En empate gana el código menor.
    """
    f, c = datos.shape
    nf, nc = -(-f // factor), -(-c // factor)
    relleno = np.full((nf * factor, nc * factor), np.nan, dtype=np.float32)
    relleno[:f, :c] = datos
    bloques = relleno.reshape(nf, factor, nc, factor).transpose(0, 2, 1, 3).reshape(nf, nc, factor * factor)
    codigos = np.where(np.isnan(bloques), 0, np.rint(bloques)).astype(np.int64)
    codigos = np.clip(codigos, 0, 254)
    cuentas = np.stack([(codigos == k).sum(axis=2) for k in range(1, 255)], axis=2)  # (nf, nc, 254)
    moda = cuentas.argmax(axis=2) + 1
    out = moda.astype(np.float32)
    out[cuentas.max(axis=2) == 0] = np.nan
    return out


def _a_rejilla_categorica(capa: CapaRaster, max_lado: int) -> Rejilla:
    """Capas categóricas: el valor entero k viaja como código k (1..254); NaN o 0 es 0 (sin dato).

    vmin=0 y vmax=nº de categorías de la leyenda (o el mayor código si no hay leyenda).
    """
    datos = np.asarray(capa.datos, dtype=np.float32)
    factor = max(1, -(-max(datos.shape) // max_lado))
    if factor > 1:
        datos = _reducir_moda(datos, factor)
    validos = ~np.isnan(datos)
    q = np.zeros(datos.shape, dtype=np.uint8)
    q[validos] = np.clip(np.rint(datos[validos]), 0, 254).astype(np.uint8)
    n = len(capa.leyenda) if capa.leyenda else int(q.max())
    return Rejilla(
        filas=datos.shape[0], columnas=datos.shape[1], vmin=0.0, vmax=float(n),
        bbox=tuple(capa.bbox), datos_b64=base64.b64encode(q.tobytes()).decode("ascii"),
    )


def a_rejilla(capa: CapaRaster, max_lado: int = 512) -> Rejilla:
    if not isinstance(max_lado, int) or not 1 <= max_lado <= 512:
        raise ValueError("max_lado debe ser un entero entre 1 y 512")
    if capa.paleta != "categorias" and not (np.isfinite(capa.vmin) and np.isfinite(capa.vmax)):
        raise ValueError("vmin y vmax de la capa deben ser números finitos")
    if capa.paleta == "categorias":
        return _a_rejilla_categorica(capa, max_lado)
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


def de_rejilla(r: Rejilla, categorica: bool = False) -> np.ndarray:
    """Inversa de `a_rejilla`: float32 con NaN donde el código es 0.

    Con `categorica=True` los códigos son los enteros originales (la rejilla de una capa con paleta
    `categorias`); si no, se deshace la cuantización lineal entre vmin y vmax.
    """
    q = np.frombuffer(base64.b64decode(r.datos_b64), dtype=np.uint8)
    if q.size != r.filas * r.columnas:
        raise ValueError("datos_b64 no coincide con filas × columnas")
    q = q.reshape(r.filas, r.columnas)
    if categorica:
        out = q.astype(np.float32)
        out[q == 0] = np.nan
        return out
    paso = (r.vmax - r.vmin) / _NIVELES
    out = (r.vmin + (q.astype(np.float32) - 1.0) * np.float32(paso)).astype(np.float32)
    out[q == 0] = np.nan
    return out
