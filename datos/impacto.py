"""Resumen de impacto accionable: hectáreas afectadas, evolución y lectura en lenguaje llano.

Solo habla con el contrato de datos (`ProveedorDatos.cambio`), así que sirve igual con el proveedor real.
Disponible para las dos historias (inundación e incendio): se apoya en una capa de categorías de cambio.
Las acciones sugeridas son condicionales («si esto fuera un evento real…»): no son recomendaciones operativas.
"""
from __future__ import annotations

import math
from datetime import datetime

import numpy as np

from datos.claves import slug, texto
from datos.contrato import CapaRaster, EntradaNoValida, Metrica, ProveedorDatos

MAX_PUNTOS_EVOLUCION = 12

# Qué etiquetas de la leyenda cuentan como «afectado» por tipo de historia. Los códigos se resuelven por
# etiqueta (no por posición): si el proveedor cambia el orden o el texto, falla en vez de rotular mal.
AFECTADO = {"inundacion": ("Nueva inundación", "Inundación persistente"), "incendio": ("Severidad",)}
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


def _frase(clave: str, **valores) -> tuple[str, dict]:
    """(texto en español, {clave_texto, valores_texto}). Cada valor es `(formato, número)` o un texto.
    El español sale de la plantilla registrada con las cifras ya formateadas; el cliente recibe los números
    sin formato para escribirlos a la manera de su idioma."""
    dar = {k: (v[0](v[1]) if isinstance(v, tuple) else v) for k, v in valores.items()}
    crudo = {k: (v[1] if isinstance(v, tuple) else v) for k, v in valores.items()}
    return texto(clave, **dar), {"clave_texto": clave, "valores_texto": crudo}


def _cifra(historia: str, etiqueta: str, valor: str, numero: float, unidad: str) -> Metrica:
    clave = f"api.impacto.cifra.{historia}.{slug(etiqueta)}"
    return Metrica(etiqueta=texto(f"{clave}.etiqueta"), valor=valor, unidad=unidad, ayuda=texto(f"{clave}.ayuda"),
                   clave_texto=clave, valores_texto={"valor": numero})


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
        raise EntradaNoValida.con("api.error.impacto_sin_categorias")
    return capa


def _codigos(capa: CapaRaster, prefijos: tuple[str, ...]) -> set[int]:
    """Códigos (posición + 1) de las categorías cuya etiqueta empieza por alguno de los prefijos."""
    cods = {k for k, (etiqueta, _c) in enumerate(capa.leyenda or [], start=1) if etiqueta.startswith(prefijos)}
    if not cods:
        raise EntradaNoValida.con("api.error.impacto_categorias_inesperadas")
    return cods


def _km2(capa: CapaRaster, codigos: set[int]) -> float:
    d = capa.datos
    return float(np.isin(d[~np.isnan(d)], list(codigos)).sum() * _area_pixel_km2(capa))


def _espaciados(ids: list[str], maximo: int) -> list[str]:
    if len(ids) <= maximo:
        return ids
    idx = np.unique(np.linspace(0, len(ids) - 1, maximo).round().astype(int))
    return [ids[i] for i in idx]


_CACHE: dict[tuple, dict] = {}
_CACHE_MAX = 32


def resumen(prov: ProveedorDatos, escenario_id: str, antes: str, despues: str, pol: str | None) -> dict:
    """Con caché acotada: la evolución llama hasta 13 veces a `prov.cambio`, que con el proveedor real sería caro."""
    clave = (id(prov), escenario_id, antes, despues, pol)
    if clave not in _CACHE:
        if len(_CACHE) >= _CACHE_MAX:
            _CACHE.pop(next(iter(_CACHE)))
        _CACHE[clave] = _calcular(prov, escenario_id, antes, despues, pol)
    return _CACHE[clave]


def _calcular(prov: ProveedorDatos, escenario_id: str, antes: str, despues: str, pol: str | None) -> dict:
    esc = prov.escenario(escenario_id)
    historia = esc.historia
    if historia not in AFECTADO:
        raise EntradaNoValida.con("api.error.impacto_no_disponible")
    r = prov.cambio(escenario_id, antes, despues, pol)
    capa = _capa_de_impacto(r)
    px = _area_pixel_km2(capa)
    validos = int((~np.isnan(capa.datos)).sum())
    escena_km2 = validos * px
    categorias = []
    for k, (etiqueta, _color) in enumerate(capa.leyenda, start=1):
        km2 = _km2(capa, {k})
        categorias.append({"etiqueta": etiqueta, "km2": km2, "ha": km2 * 100, "pct_escena": 100 * km2 / escena_km2 if escena_km2 else 0.0})
    afectadas = _codigos(capa, AFECTADO[historia])
    afectada_km2 = _km2(capa, afectadas)

    # Evolución: superficie afectada en cada pasada frente a la pasada «antes».
    por_id_todas = {a.id: a for a in esc.adquisiciones}
    t_antes, t_despues = por_id_todas[antes].instante, por_id_todas[despues].instante
    if t_despues <= t_antes:
        raise EntradaNoValida.con("api.error.pasada_despues_antes")
    # Solo el intervalo analizado (hasta «después» incluida), y «después» siempre está en la serie.
    en_rango = sorted((a for a in esc.adquisiciones if t_antes < a.instante <= t_despues), key=lambda a: a.instante)
    por_id = {a.id: a for a in en_rango}
    ids = _espaciados([a.id for a in en_rango], MAX_PUNTOS_EVOLUCION)
    if despues not in ids:
        ids = [*ids[:-1], despues] if ids else [despues]
    evolucion = []
    for aid in ids:
        c = _capa_de_impacto(prov.cambio(escenario_id, antes, aid, pol))
        km2 = _km2(c, _codigos(c, AFECTADO[historia]))
        evolucion.append({"instante": por_id[aid].instante, "ha": km2 * 100})
    pico = max(evolucion, key=lambda p: p["ha"]) if evolucion else None

    ha = afectada_km2 * 100
    pct_afectada = 100 * afectada_km2 / escena_km2 if escena_km2 else 0.0
    if historia == "inundacion":
        titulo, titulo_frase = _frase("api.impacto.titulo.inundacion")
        nueva = sum(c["ha"] for c in categorias if c["etiqueta"].startswith("Nueva inundación"))
        cifras = [_cifra("inundacion", "Superficie inundada al final", _n(ha), ha, "ha"),
                  _cifra("inundacion", "Inundación nueva", _n(nueva), nueva, "ha"),
                  _cifra("inundacion", "Parte de la escena", _pct(pct_afectada), pct_afectada, "%")]
        lectura = [_frase("api.impacto.lectura.inundacion", ha=(_n, ha), pct=(_pct, pct_afectada))]
    else:
        titulo, titulo_frase = _frase("api.impacto.titulo.incendio")
        alta = sum(c["ha"] for c in categorias if c["etiqueta"].startswith("Severidad alta"))
        cifras = [_cifra("incendio", "Superficie quemada detectada", _n(ha), ha, "ha"),
                  _cifra("incendio", "Severidad alta", _n(alta), alta, "ha"),
                  _cifra("incendio", "Parte de la escena", _pct(pct_afectada), pct_afectada, "%")]
        lectura = [_frase("api.impacto.lectura.incendio", ha=(_n, ha), pct=(_pct, pct_afectada))]
    if pico is not None:
        lectura.append(_frase("api.impacto.lectura.pico", fecha=f"{pico['instante']:%d/%m/%Y}", ha=(_n, pico["ha"])))
    sintetico = r.origen.tipo != "real"
    acciones = [_frase(f"api.impacto.accion.{historia}.{i + 1}" + ("_hipotetica" if i == 0 and sintetico else ""))
                for i in range(len(ACCIONES[historia]))]
    metros = round(px ** 0.5 * 1000)
    notas = [_frase("api.impacto.nota.celdas", metros=(lambda m: f"{m:.0f}", metros)),
             _frase("api.impacto.nota.orientativas")]
    return {"titulo": titulo, "tipo": historia, "escenario": esc.nombre, "antes": antes, "despues": despues,
            "cifras": cifras, "categorias": categorias, "evolucion": evolucion, "lectura": [t for t, _ in lectura], "acciones": [t for t, _ in acciones],
            "titulo_frase": titulo_frase, "lectura_frases": [f for _, f in lectura],
            "acciones_frases": [f for _, f in acciones],
            "capa": capa, "area_escena_km2": escena_km2, "resolucion_celda_m": px ** 0.5 * 1000,
            "notas": [t for t, _ in notas], "notas_frases": [f for _, f in notas],
            "origen": r.origen}
