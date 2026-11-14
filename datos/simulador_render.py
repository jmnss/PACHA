"""Colorización del Simulador de Eventos: relieve y capas animadas a PNG (sin Streamlit).

Porta la lógica de `interfaz/modo_dios.py` (relieve sombreado, estilos de capa y composición «alfa sobre»).
Los colores son los de las capas físicas del mapa del tablero (fuego, agua, lahar, ceniza…), no del sistema
de diseño de la interfaz.
"""
from __future__ import annotations

import base64
import io

import numpy as np
from PIL import Image

from modelo import desastres

# Relieve por cobertura (tonos naturales apagados para que destaquen las capas del evento)
COLOR_COBERTURA = {
    desastres.AGUA: "#0d3b66", desastres.GLACIAR: "#e8f1fb", desastres.PARAMO: "#9c9a5e",
    desastres.BOSQUE_ANDINO: "#3d7a46", desastres.BOSQUE_HUMEDO: "#24603a", desastres.BOSQUE_SECO: "#9a8448",
    desastres.CULTIVO: "#a8ad66", desastres.URBANO: "#cbbbe6",
}
ESTILOS = {
    "fuego": {"categorias": ["#ffb000", "#5e0f2b"], "alfa": [245, 215]},
    "onda": {"categorias": ["#00f0ff", "#ff2bd6"], "alfa": [255, 255]},
    "deslizamiento": {"categorias": ["#d2832f"], "alfa": [235]},
    "pdc": {"categorias": ["#ff4d1a"], "alfa": [225]},
    "agua": {"rampa": ["#8be3ff", "#2a9dff", "#1745d1", "#0b1f7a"], "alfa": (0.45, 0.92)},
    "lahar": {"rampa": ["#e0b07a", "#9a6331", "#4a2a10"], "alfa": (0.75, 0.95)},
    "ceniza": {"rampa": ["#d9d9d9", "#8c8c8c", "#3a3a3a"], "alfa": (0.25, 0.85)},
}
# Escala MMI de ShakeMap (USGS), del I al X
COLORES_MMI = ["#ffffff", "#bfccff", "#a0e6ff", "#80ffff", "#7aff93", "#ffff00", "#ffc800", "#ff9100",
               "#ff0000", "#c80000"]


def _rgb(hex_color: str) -> np.ndarray:
    return np.array([int(hex_color[i:i + 2], 16) for i in (1, 3, 5)], float)


def png_b64(rgba: np.ndarray) -> str:
    # Sin optimize=True: mismo tamaño en estos cuadros y unas 6 veces más rápido (medido el 2026-11-08).
    buf = io.BytesIO()
    Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA").save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _rampa(t: np.ndarray, colores: list) -> np.ndarray:
    anclas = np.array([_rgb(c) for c in colores])
    pos = np.clip(t, 0, 1) * (len(anclas) - 1)
    i = np.clip(np.floor(pos).astype(int), 0, len(anclas) - 2)
    f = (pos - i)[..., None]
    return anclas[i] * (1 - f) + anclas[i + 1] * f


def relieve_rgba(mundo: desastres.Mundo, escala: int = 4) -> np.ndarray:
    """Sombreado del relieve (luz del noroeste a 45°) teñido por la cobertura; el mar se oscurece con la profundidad."""
    z = np.where(mundo.mar, 0.0, mundo.z)
    gy, gx = np.gradient(z, mundo.pixel_m)
    nx, ny = -gx * 2.0, gy * 2.0
    norma = np.sqrt(nx ** 2 + ny ** 2 + 1)
    luz = np.array([-0.5, 0.5, 0.7071])
    sombra = np.clip((nx * luz[0] + ny * luz[1] + luz[2]) / norma, 0, 1)
    color = np.zeros(z.shape + (3,))
    for codigo, hex_color in COLOR_COBERTURA.items():
        color[mundo.cobertura == codigo] = _rgb(hex_color)
    rgb = color * (0.35 + 0.8 * sombra)[..., None]
    if mundo.mar.any():
        prof = np.clip(-mundo.z / 2000.0, 0, 1)
        rgb[mundo.mar] = _rampa(prof[mundo.mar], ["#12497a", "#0a2547", "#050f24"])
    rgba = np.dstack([np.clip(rgb, 0, 255), np.full(z.shape, 255.0)]).astype(np.uint8)
    lado = mundo.n * escala
    return np.asarray(Image.fromarray(rgba, "RGBA").resize((lado, lado), Image.BILINEAR))


def _colorear_capa(capa: desastres.Capa, datos: np.ndarray) -> np.ndarray:
    d = np.asarray(datos, float)
    rgba = np.zeros(d.shape + (4,))
    if capa.estilo == "mmi":
        nivel = np.clip(np.floor(d + 0.5).astype(int), 1, 10)
        for k, c in enumerate(COLORES_MMI, start=1):
            sel = (nivel == k) & (d >= capa.umbral)
            rgba[sel] = (*_rgb(c), 70 + 9 * k)
        return rgba
    estilo = ESTILOS[capa.estilo]
    if "categorias" in estilo:
        for k, (c, a) in enumerate(zip(estilo["categorias"], estilo["alfa"]), start=1):
            rgba[d == k] = (*_rgb(c), a)
        return rgba
    t = (d - capa.vmin) / max(capa.vmax - capa.vmin, 1e-9)
    visible = np.isfinite(d) & (d > capa.umbral)
    a0, a1 = estilo["alfa"]
    rgba[..., :3] = _rampa(np.nan_to_num(t), estilo["rampa"])
    rgba[..., 3] = np.where(visible, (a0 + (a1 - a0) * np.clip(np.nan_to_num(t), 0, 1)) * 255, 0)
    return rgba


def componer(evento: desastres.Evento, cuadro: dict, escala: int = 4) -> np.ndarray:
    """Superpone las capas del cuadro con composición «alfa sobre»; escala por repetición de celdas."""
    salida = None
    for capa in evento.capas:
        if capa.clave not in cuadro:
            continue
        src = _colorear_capa(capa, cuadro[capa.clave])
        if salida is None:
            salida = np.zeros_like(src)
        a = src[..., 3:4] / 255.0
        b = salida[..., 3:4] / 255.0
        alfa = a + b * (1 - a)
        salida[..., :3] = np.where(alfa > 0, (src[..., :3] * a + salida[..., :3] * b * (1 - a)) / np.maximum(alfa, 1e-9), 0)
        salida[..., 3:4] = alfa * 255
    if salida is None:
        return np.zeros((1, 1, 4))
    return np.repeat(np.repeat(salida, escala, axis=0), escala, axis=1)
