"""Resumen de impacto accionable: hectáreas afectadas, evolución y lectura en lenguaje llano.

Solo habla con el contrato de datos (`ProveedorDatos.cambio`), así que sirve igual con el proveedor real.
Disponible para las dos historias (inundación e incendio): se apoya en una capa de categorías de cambio.
Las acciones sugeridas son condicionales («si esto fuera un evento real…»): no son recomendaciones operativas.
"""
from __future__ import annotations

import math
from datetime import datetime

import numpy as np

from datos.contrato import CapaRaster, EntradaNoValida, Metrica, ProveedorDatos

MAX_PUNTOS_EVOLUCION = 12

# Categorías que cuentan como «afectado» por tipo de historia (código = posición + 1 en la leyenda)
AFECTADO = {"inundacion": {1, 3}, "incendio": {1, 2}}
ACCIONES = {
    "inundacion": [
        "Contrastar los bordes de la mancha con el aviso de la autoridad local antes de decidir cierres de vías.",
        "Priorizar la verificación en campo donde la superficie inundada crece más entre pasadas.",
        "Repetir el análisis con la siguiente pasada para saber si el agua se retira o se extiende.",
    ],
    "incendio": [
        "Contrastar la cicatriz con los reportes de bomberos y con focos de calor ópticos antes de actuar.",
        "Priorizar la revisión de las zonas de severidad alta, donde la pérdida de estructura es mayor.",
        "Repetir el análisis tras las lluvias para vigilar la erosión de laderas sin cobertura.",
    ],
}


def _n(x: float) -> str:
    """Entero con espacio fino como separador de miles (1 113)."""
    return f"{x:,.0f}".replace(",", " ")


def _pct(x: float) -> str:
    return f"{x:.1f}".replace(".", ",")


def _area_pixel_km2(capa: CapaRaster) -> float:
    o, s, e, n = capa.bbox
    filas, cols = capa.datos.shape
    lat = math.radians((s + n) / 2)
    ancho_km = (e - o) * 111.320 * math.cos(lat) / cols
    alto_km = (n - s) * 110.574 / filas
    return ancho_km * alto_km


def _capa_de_impacto(r) -> CapaRaster:
    capa = r.clasificacion if r.clasificacion is not None else r.cambio
    if capa.paleta != "categorias" or not capa.leyenda:
        raise EntradaNoValida("Este escenario no tiene un cambio por categorías para resumir.")
    return capa


def _km2(capa: CapaRaster, codigos: set[int]) -> float:
    d = capa.datos
    return float(np.isin(d[~np.isnan(d)], list(codigos)).sum() * _area_pixel_km2(capa))


def _espaciados(ids: list[str], maximo: int) -> list[str]:
    if len(ids) <= maximo:
        return ids
    idx = np.unique(np.linspace(0, len(ids) - 1, maximo).round().astype(int))
    return [ids[i] for i in idx]


def resumen(prov: ProveedorDatos, escenario_id: str, antes: str, despues: str, pol: str | None) -> dict:
    esc = prov.escenario(escenario_id)
    historia = esc.historia
    if historia not in AFECTADO:
        raise EntradaNoValida("El resumen de impacto está disponible para inundaciones e incendios.")
    r = prov.cambio(escenario_id, antes, despues, pol)
    capa = _capa_de_impacto(r)
    px = _area_pixel_km2(capa)
    validos = int((~np.isnan(capa.datos)).sum())
    escena_km2 = validos * px
    categorias = []
    for k, (etiqueta, _color) in enumerate(capa.leyenda, start=1):
        km2 = _km2(capa, {k})
        categorias.append({"etiqueta": etiqueta, "km2": km2, "ha": km2 * 100, "pct_escena": 100 * km2 / escena_km2 if escena_km2 else 0.0})
    afectada_km2 = _km2(capa, AFECTADO[historia])

    # Evolución: superficie afectada en cada pasada frente a la pasada «antes».
    t_antes = next(a.instante for a in esc.adquisiciones if a.id == antes)
    posteriores = [a for a in esc.adquisiciones if a.instante > t_antes]
    por_id = {a.id: a for a in posteriores}
    evolucion = []
    for aid in _espaciados([a.id for a in posteriores], MAX_PUNTOS_EVOLUCION):
        km2 = _km2(_capa_de_impacto(prov.cambio(escenario_id, antes, aid, pol)), AFECTADO[historia])
        evolucion.append({"instante": por_id[aid].instante, "ha": km2 * 100})
    pico = max(evolucion, key=lambda p: p["ha"]) if evolucion else None

    ha = afectada_km2 * 100
    pct_afectada = 100 * afectada_km2 / escena_km2 if escena_km2 else 0.0
    if historia == "inundacion":
        titulo = "Superficie inundada"
        nueva = categorias[0]["ha"]
        cifras = [Metrica(etiqueta="Superficie inundada al final", valor=_n(ha), unidad="ha", ayuda="Hectáreas con agua en la pasada «después» (nueva inundación más la que ya estaba)."),
                  Metrica(etiqueta="Inundación nueva", valor=_n(nueva), unidad="ha", ayuda="Hectáreas que no tenían agua en la pasada «antes» y sí en la «después»."),
                  Metrica(etiqueta="Parte de la escena", valor=_pct(pct_afectada), unidad="%", ayuda="Fracción del área analizada que está inundada al final.")]
        lectura = [f"En este escenario de demostración, el radar marca unas {_n(ha)} ha con agua al final del intervalo, el {_pct(pct_afectada)} % del área analizada."]
    else:
        titulo = "Superficie quemada"
        alta = categorias[-1]["ha"]
        cifras = [Metrica(etiqueta="Superficie quemada detectada", valor=_n(ha), unidad="ha", ayuda="Hectáreas donde la señal cruzada (HV) cayó lo bastante para marcar daño."),
                  Metrica(etiqueta="Severidad alta", valor=_n(alta), unidad="ha", ayuda="Hectáreas con la mayor caída de señal: la mayor pérdida de estructura del bosque."),
                  Metrica(etiqueta="Parte de la escena", valor=_pct(pct_afectada), unidad="%", ayuda="Fracción del área analizada que aparece quemada.")]
        lectura = [f"En este escenario de demostración, el radar marca unas {_n(ha)} ha quemadas, el {_pct(pct_afectada)} % del área analizada."]
    if pico is not None:
        lectura.append(f"El máximo de la serie llega el {pico['instante']:%d/%m/%Y} con unas {_n(pico['ha'])} ha.")
    sintetico = r.origen.tipo != "real"
    acciones = [("Si esto fuera un evento real, " + a[0].lower() + a[1:]) if i == 0 and sintetico else a
                for i, a in enumerate(ACCIONES[historia])]
    return {"titulo": titulo, "tipo": historia, "escenario": esc.nombre, "antes": antes, "despues": despues,
            "cifras": cifras, "categorias": categorias, "evolucion": evolucion, "lectura": lectura, "acciones": acciones,
            "capa": capa, "area_escena_km2": escena_km2, "resolucion_celda_m": px ** 0.5 * 1000,
            "notas": [f"Superficies medidas sobre la malla de análisis (celdas de unos {px ** 0.5 * 1000:.0f} m).",
                      "Las acciones son orientativas y condicionales; no sustituyen a la autoridad competente."],
            "origen": r.origen}
