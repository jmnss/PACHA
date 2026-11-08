"""Copia congelada de `modelo.desastres.aguas_someras` antes de optimizarla (2026-11-08).

No se usa en la app: solo la prueba de equivalencia la compara con la versión optimizada. No la modifiques.
"""
import math

import numpy as np

from modelo.desastres import COBERTURAS, G, Mundo


def aguas_someras(mundo: Mundo, horas: float, h0: np.ndarray | None = None, fuente=None, nivel_mar=None,
                  oceano_activo: bool = False, prof_max_oceano: float = 1500.0, cuadros: int = 40,
                  alfa: float = 0.7, dt_max: float = 60.0) -> dict:
    """Formulación inercial local de las ecuaciones de aguas someras (Bates, Horritt y Fewtrell, 2010).

        q_{t+Δt} = (q_t − g h_f Δt ∂(h+z)/∂x) / (1 + g Δt n² |q_t| / h_f^{7/3}),  Δt = α Δx / √(g h_max)

    fuente(t, dt) → lámina (m) que entra en cada celda durante el paso; nivel_mar(t) → nivel del mar (m).
    Con oceano_activo el mar evoluciona (tsunami); si no, es un contorno de nivel prescrito.
    """
    n, dx = mundo.n, mundo.pixel_m
    mar = mundo.mar
    zb = np.where(mar, np.maximum(mundo.z, -prof_max_oceano), mundo.z).astype(float)
    nf = np.vectorize(lambda c: COBERTURAS[c]["manning"])(mundo.cobertura).astype(float)
    h = np.zeros((n, n)) if h0 is None else h0.astype(float).copy()
    if oceano_activo:
        h[mar] = np.maximum(h[mar], 0.0)
    qx = np.zeros((n, n + 1))
    qy = np.zeros((n + 1, n))
    activa_x = ~(mar[:, :-1] & mar[:, 1:]) if not oceano_activo else np.ones((n, n - 1), bool)
    activa_y = ~(mar[:-1, :] & mar[1:, :]) if not oceano_activo else np.ones((n - 1, n), bool)
    nfx = 0.5 * (nf[:, :-1] + nf[:, 1:])
    nfy = 0.5 * (nf[:-1, :] + nf[1:, :])
    reposo = np.where(mar, 0.0, zb)       # superficie en reposo: nivel del mar o el suelo seco
    T = horas * 3600.0
    guardar = np.linspace(0, T, cuadros + 1)[1:]
    k_guardar = 0
    salida_h, salida_t = [], []
    hmax = h.copy()
    vmax = np.zeros((n, n))
    llegada = np.full((n, n), np.inf)
    t = 0.0
    while t < T - 1e-6:
        if nivel_mar is not None and not oceano_activo:
            nivel = nivel_mar(t)
            h[mar] = np.maximum(nivel - zb[mar], 0.0)
        eta = zb + h
        hmax_act = float(h.max() if oceano_activo else h[~mar].max(initial=0.0))
        if not oceano_activo and nivel_mar is not None:
            hmax_act = max(hmax_act, float(nivel_mar(t)) + 1.0)
        dt = min(alfa * dx / math.sqrt(G * max(hmax_act, 0.05)), dt_max, guardar[k_guardar] - t)
        dt = max(dt, 1e-3)

        hf = np.maximum(eta[:, :-1], eta[:, 1:]) - np.maximum(zb[:, :-1], zb[:, 1:])
        hf = np.clip(hf, 0.0, None)
        q = qx[:, 1:-1]
        with np.errstate(divide="ignore", invalid="ignore", over="ignore"):
            q = (q - G * hf * dt * (eta[:, 1:] - eta[:, :-1]) / dx) / (
                1 + G * dt * nfx ** 2 * np.abs(q) / np.maximum(hf, 1e-4) ** (7.0 / 3.0))
        qx[:, 1:-1] = np.where((hf > 1e-3) & activa_x, q, 0.0)
        hf = np.maximum(eta[:-1, :], eta[1:, :]) - np.maximum(zb[:-1, :], zb[1:, :])
        hf = np.clip(hf, 0.0, None)
        q = qy[1:-1, :]
        with np.errstate(divide="ignore", invalid="ignore", over="ignore"):
            q = (q - G * hf * dt * (eta[1:, :] - eta[:-1, :]) / dx) / (
                1 + G * dt * nfy ** 2 * np.abs(q) / np.maximum(hf, 1e-4) ** (7.0 / 3.0))
        qy[1:-1, :] = np.where((hf > 1e-3) & activa_y, q, 0.0)

        # Contornos abiertos: condición de radiación q = a·√(g h) con a = anomalía sobre el reposo.
        anom = eta - reposo
        celer = np.sqrt(G * np.maximum(h, 0.0))
        flujo = np.where(mar, anom, np.maximum(anom, 0.0)) * celer
        qx[:, 0], qx[:, -1] = -flujo[:, 0], flujo[:, -1]
        qy[0, :], qy[-1, :] = -flujo[0, :], flujo[-1, :]

        # Limitador: ninguna celda entrega más agua de la que tiene.
        salida = (np.clip(qx[:, 1:], 0, None) + np.clip(-qx[:, :-1], 0, None)
                  + np.clip(qy[1:, :], 0, None) + np.clip(-qy[:-1, :], 0, None)) * dt / dx
        f = np.where(salida > h, h / np.maximum(salida, 1e-12), 1.0)
        fpx = np.pad(f, ((0, 0), (1, 1)), constant_values=1.0)
        fpy = np.pad(f, ((1, 1), (0, 0)), constant_values=1.0)
        qx *= np.where(qx > 0, fpx[:, :-1], fpx[:, 1:])
        qy *= np.where(qy > 0, fpy[:-1, :], fpy[1:, :])

        h = h + dt * (qx[:, :-1] - qx[:, 1:] + qy[:-1, :] - qy[1:, :]) / dx
        if fuente is not None:
            h = h + fuente(t, dt)
        h = np.maximum(h, 0.0)
        t += dt

        seco = ~mar | oceano_activo
        mojado = (h - np.where(mar, -zb, 0.0) > 0.05) if oceano_activo else (h > 0.05)
        llegada = np.where(mojado & ~np.isfinite(llegada) & seco, t, llegada)
        prof_tierra = np.where(mar, 0.0, h)
        hmax = np.maximum(hmax, prof_tierra)
        with np.errstate(divide="ignore", invalid="ignore"):
            u = 0.5 * (qx[:, :-1] + qx[:, 1:]) / np.maximum(h, 0.05)
            v = 0.5 * (qy[:-1, :] + qy[1:, :]) / np.maximum(h, 0.05)
        vmax = np.maximum(vmax, np.where(mar, 0.0, np.hypot(u, v)))
        if t >= guardar[k_guardar] - 1e-6:
            salida_h.append(np.where(mar, h + zb if oceano_activo else 0.0, h).astype(np.float32))
            salida_t.append(t)
            k_guardar = min(k_guardar + 1, len(guardar) - 1)
    return {"h": h, "cuadros": salida_h, "tiempos": salida_t, "hmax": hmax, "vmax": vmax, "llegada": llegada}
