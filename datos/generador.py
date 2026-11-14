"""Generador sintético reproducible: escenas de demostración de Ecuador.

Envuelve `nisar.simular` con parámetros fijos, caché en memoria y una exportación abierta y
verificable (`manifest.json` con hashes SHA-256 + un `.npz` por escenario). Todo lo que sale de
aquí es SINTÉTICO y así se declara en su `Origen`.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

import numpy as np

from datos.contrato import EntradaNoValida, NoEncontrado, Origen
from modelo import nisar

# Los seis sitios de Ecuador del catálogo; `historia` marca las dos historias narradas.
ESCENARIOS_DEMO: dict[str, dict] = {
    "ec_la_segua": {"historia": "inundacion"},
    "ec_loja": {"historia": "incendio"},
    "ec_pedernales": {"historia": None},
    "ec_antisana": {"historia": None},
    "ec_daule": {"historia": None},
    "ec_guayaquil": {"historia": None},
}

PARAMETROS_DEMO: dict = {"semilla": 7, "looks": 12.0, "orbita": "Ascendente", "estacional": True}

FUENTE_DEMO = "Generador de demostración NISAR·Ecuador"
GENERADOR = "datos/generador.py"
VERSION = "1"


def _parametros(parametros: dict | None) -> dict:
    """Parámetros completos: los de demostración con los dados encima (solo claves conocidas)."""
    p = dict(PARAMETROS_DEMO)
    for k, v in (parametros or {}).items():
        if k not in PARAMETROS_DEMO:
            raise EntradaNoValida.con("api.error.parametro_desconocido", parametro=k)
        p[k] = v
    p["semilla"] = int(p["semilla"])
    p["looks"] = float(p["looks"])
    p["estacional"] = bool(p["estacional"])
    return p


def origen_demo(parametros: dict) -> Origen:
    p = _parametros(parametros)
    distintos = {k: p[k] for k in PARAMETROS_DEMO if p[k] != PARAMETROS_DEMO[k]}
    notas = "Parámetros no por defecto: " + ", ".join(f"{k}={v}" for k, v in distintos.items()) \
        if distintos else None
    return Origen(
        tipo="sintetico", fuente=FUENTE_DEMO, generador=GENERADOR, version=VERSION,
        semilla=p["semilla"], fecha_generacion=datetime.now(timezone.utc), notas=notas,
    )


def _sitio_catalogo(sitio_id: str) -> dict:
    if sitio_id not in ESCENARIOS_DEMO:
        raise NoEncontrado.con("api.error.escenario_desconocido", id=sitio_id)
    df = nisar.cargar_sitios()
    fila = df[df["id"] == sitio_id]
    if fila.empty:
        raise NoEncontrado.con("api.error.sitio_no_catalogo", id=sitio_id)
    return fila.iloc[0].to_dict()


def _generar_sin_cache(sitio_id: str, parametros: dict | None = None,
                       sitio: dict | None = None, ajustes: dict | None = None) -> nisar.Escena:
    p = _parametros(parametros)
    s = dict(sitio) if sitio is not None else _sitio_catalogo(sitio_id)
    s.setdefault("id", sitio_id)
    return nisar.simular(s, semilla=p["semilla"], looks=p["looks"], orbita=p["orbita"],
                         ajustes=ajustes or None, estacional=p["estacional"])


@lru_cache(maxsize=32)
def _generar_cacheada(clave: str) -> nisar.Escena:
    d = json.loads(clave)
    return _generar_sin_cache(d["sitio_id"], d["parametros"], d["sitio"], d["ajustes"])


def generar_escena(sitio_id: str, parametros: dict | None = None,
                   sitio: dict | None = None, ajustes: dict | None = None) -> nisar.Escena:
    """Escena sintética en memoria. La clave de caché es canónica (parámetros completos + sitio + ajustes).

    `ajustes`: parámetros físicos del modelo en unidades del modelo (como `nisar.simular`).

    La escena devuelta se comparte entre llamadas iguales: no se debe modificar.
    """
    clave = json.dumps(
        {"sitio_id": sitio_id, "parametros": _parametros(parametros), "sitio": sitio,
         "ajustes": dict(ajustes) if ajustes else None},
        sort_keys=True, default=str,
    )
    return _generar_cacheada(clave)


def _hash_cubo(cubo: np.ndarray) -> str:
    return hashlib.sha256(np.ascontiguousarray(cubo).tobytes()).hexdigest()


def exportar(destino: Path, sitios: list[str] | None = None) -> Path:
    """Escribe `manifest.json` y un `<id>.npz` por escenario en `destino`; devuelve el manifiesto."""
    destino = Path(destino)
    destino.mkdir(parents=True, exist_ok=True)
    ids = list(sitios) if sitios is not None else list(ESCENARIOS_DEMO)
    origen = origen_demo(PARAMETROS_DEMO)
    escenarios: dict[str, dict] = {}
    for sid in ids:
        escena = _generar_sin_cache(sid, dict(PARAMETROS_DEMO))
        np.savez_compressed(
            destino / f"{sid}.npz",
            **{f"cubo_{k}": v for k, v in escena.cubos.items()},
            fechas=np.array([f.isoformat() for f in escena.fechas]),
        )
        escenarios[sid] = {
            "historia": ESCENARIOS_DEMO[sid]["historia"],
            "tipo_cambio": escena.tipo,
            "bbox": list(escena.limites()),
            "pixel_m": escena.pixel_m,
            "fechas": [f.isoformat() for f in escena.fechas],
            "i_evento": escena.i_evento,
            "archivo": f"{sid}.npz",
            "hashes": {k: _hash_cubo(v) for k, v in escena.cubos.items()},
        }
    manifiesto = {
        "aviso": "DATOS DE DEMOSTRACIÓN: sintéticos, no son datos reales de NISAR.",
        "origen": json.loads(origen.model_dump_json()),
        "parametros": dict(PARAMETROS_DEMO),
        "hash_algoritmo": "sha256 del contenido (bytes C-contiguos) de cada cubo",
        "escenarios": escenarios,
    }
    ruta = destino / "manifest.json"
    ruta.write_text(json.dumps(manifiesto, ensure_ascii=False, indent=2), encoding="utf-8")
    return ruta
