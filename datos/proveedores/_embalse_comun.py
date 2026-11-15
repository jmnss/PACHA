"""Lógica compartida por `ProveedorDerivados` y los sustitutos sintéticos: leyendas del cambio, clasificación entre
dos máscaras, métricas y medición. Solo numpy y json (corre también en Pyodide)."""
from __future__ import annotations

import json
import math
from datetime import datetime
from pathlib import Path
from typing import Callable

import numpy as np

from datos.contorno_raster import rasterizar_contorno
from datos.contrato import (CapaRaster, CapacidadNoDisponible, EntradaNoValida, Medicion, Metrica, Origen)
from datos.claves import texto

# Categorías del cambio entre dos máscaras: código 1..4 → (nombre, color). El 0 es «sin dato» (fuera del contorno).
CLASES_CAMBIO = {
    "embalse": [("Agua persistente", "#2a6fb0"), ("Agua ganada", "#2f9e8f"), ("Agua perdida", "#c9822b"),
                ("Sin agua", "#6f6d7a")],
    "incendio": [("Quemado en ambas", "#6b4a3a"), ("Quemado nuevo", "#c0392b"), ("Recuperado", "#4f8a4b"),
                 ("Sin quemar", "#6f6d7a")],
}
TITULO_SERIE = {"embalse": "Superficie de agua", "incendio": "Superficie quemada"}


def num(v: float, decimales: int = 2) -> str:
    """Cifra en español (coma decimal): el cliente la reescribe a la manera de su idioma con `valores_texto`."""
    return f"{v:.{decimales}f}".replace(".", ",")


def dentro_contorno(carpeta: Path, sitio: dict) -> np.ndarray:
    """Máscara bool del contorno sobre la rejilla (todo True si el sitio no trae contorno)."""
    forma = tuple(sitio["forma"])
    ruta = sitio.get("contorno")
    if not ruta:
        return np.ones(forma, bool)
    gj = json.loads((Path(carpeta) / ruta).read_text(encoding="utf-8"))
    return rasterizar_contorno(gj, sitio["epsg"], sitio["transform"], forma)


def validar_par(antes_id: str, despues_id: str, instante_antes: datetime, instante_despues: datetime) -> None:
    if antes_id == despues_id:
        raise CapacidadNoDisponible(texto("api.error.segunda_fecha_comparar"))
    if instante_antes > instante_despues:  # la comparación va de la fecha anterior a la posterior
        raise EntradaNoValida.con("api.error.fecha_despues_antes")


def clasificar(ma: np.ndarray, md: np.ndarray, dentro: np.ndarray) -> np.ndarray:
    """Códigos 1 persistente, 2 ganada, 3 perdida, 4 sin clase; 0 donde falta dato o fuera del contorno."""
    a1, d1 = ma == 1, md == 1
    out = np.where(a1 & d1, 1, np.where(~a1 & d1, 2, np.where(a1 & ~d1, 3, 4))).astype(np.uint8)
    out[(ma == 0) | (md == 0) | ~dentro] = 0
    return out


def capa_clasificacion(escenario_id: str, adquisicion_id: str, tipo: str, cod: np.ndarray, bbox, origen: Origen) -> CapaRaster:
    leyenda = [tuple(x) for x in CLASES_CAMBIO[tipo]]
    return CapaRaster(escenario_id=escenario_id, adquisicion_id=adquisicion_id, variable="cambio", polarizacion=None,
                      unidad="", paleta="categorias", vmin=0, vmax=len(leyenda), leyenda=leyenda, datos=cod,
                      bbox=bbox, origen=origen)


def metricas_cambio(tipo: str, sa: float, sd: float, fecha_antes: str, fecha_despues: str) -> list[Metrica]:
    """Las cuatro métricas del cambio, cada una con su clave (`api.cambio.metrica.<tipo>.<campo>`) y las cifras
    sin formato para que cada idioma las escriba a su manera."""
    dif = sd - sa
    rel = round(dif / sa * 100, 1) if sa else None

    def metrica(campo: str, valor: str, numero: float | None, unidad: str, **extra: str) -> Metrica:
        clave = f"api.cambio.metrica.{tipo}.{campo}"
        valores: dict[str, float | str] = dict(extra)
        if numero is not None:
            valores["valor"] = numero
        return Metrica(etiqueta=texto(f"{clave}.etiqueta"), valor=valor, unidad=unidad,
                       ayuda=texto(f"{clave}.ayuda", **extra), clave_texto=clave, valores_texto=valores or None)

    return [
        metrica("antes", num(sa), round(sa, 2), "km²", fecha=fecha_antes),
        metrica("despues", num(sd), round(sd, 2), "km²", fecha=fecha_despues),
        metrica("variacion", num(dif), round(dif, 2), "km²"),
        metrica("variacion_relativa", num(rel, 1) if rel is not None else "—", rel, "%"),
    ]


def medir_mascaras(nombres: list[str], km2_pixel: float, ma: np.ndarray, md: np.ndarray, fecha_despues: str,
                   origen: Origen, gamma: Callable[[str, str, int, int], float | None] | None,
                   cuadrante: tuple[int, int, int, int] | None, punto: tuple[int, int] | None) -> Medicion:
    """Medición sobre el par de máscaras. `gamma(capa, pol, f, c)` da el dB de «Antes»/«Después» o None si no hay."""
    if (cuadrante is None) == (punto is None):
        raise EntradaNoValida.con("api.error.medir_uno_de_dos")
    ny, nx = md.shape
    if cuadrante is not None:
        f0, f1, c0, c1 = cuadrante
        if not (0 <= f0 < f1 <= ny and 0 <= c0 < c1 <= nx):
            raise EntradaNoValida.con("api.error.cuadrante_fuera", cuadrante=cuadrante, ny=ny, nx=nx)
        bloque = md[f0:f1, c0:c1]
        metricas, tabla = [], []
        for codigo, nom in enumerate(nombres, 1):
            km2 = float((bloque == codigo).sum()) * km2_pixel
            metricas.append(Metrica(etiqueta=f"Superficie de «{nom}»", valor=num(km2, 3), unidad="km²",
                                    ayuda=f"Píxeles de esa clase dentro del cuadrante, el {fecha_despues}."))
            tabla.append({"Capa": "Después", "Medida": nom, "Valor": km2})
        return Medicion(cuadrante=cuadrante, metricas=metricas, tabla=tabla, origen=origen)
    f, c = punto
    if not (0 <= f < ny and 0 <= c < nx):
        raise EntradaNoValida.con("api.error.punto_fuera", punto=punto, ny=ny, nx=nx)

    def clase(m: np.ndarray) -> str:
        v = int(m[f, c])
        return nombres[v - 1] if 1 <= v <= len(nombres) else "sin dato"

    tabla = []
    for capa, m in (("Antes", ma), ("Después", md)):
        tabla.append({"Capa": capa, "Medida": "Clase", "Valor": clase(m)})
        if gamma is not None:
            for pol in ("HH", "HV"):
                v = gamma(capa, pol, f, c)
                if v is not None:
                    tabla.append({"Capa": capa, "Medida": f"{pol} (dB)", "Valor": v if math.isfinite(v) else None})
    metricas = [Metrica(etiqueta="Clase después", valor=clase(md), unidad="",
                        ayuda=f"Clase del píxel ({f}, {c}) el {fecha_despues}.")]
    return Medicion(punto=punto, metricas=metricas, tabla=tabla, origen=origen)
