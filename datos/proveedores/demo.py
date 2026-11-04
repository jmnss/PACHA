"""Proveedor de demostración: traduce el núcleo sintético (`modelo/`) al contrato de datos.

Todo lo que sale de aquí es SINTÉTICO y lo declara en su `Origen`. Las escenas viven en memoria
(`generar_escena`): `nisar.analizar` necesita información del modelo que no cabe en un `.npz`.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
import warnings
from collections import OrderedDict
from datetime import date, datetime, timezone

import numpy as np
import pandas as pd

from datos.contrato import (
    PALETAS, Adquisicion, CampoVectorial, CapaRaster, Capacidades, Escenario, Medicion, Metrica, Origen,
    ResultadoCambio, SerieTemporal, TablaResultado,
)
from datos.generador import ESCENARIOS_DEMO, PARAMETROS_DEMO, generar_escena, origen_demo
from modelo import estaciones, nisar

MAX_FOTOGRAMAS = 500
MAX_CACHE = 32  # escenas, escenarios simulados registrados y análisis en memoria
ORBITAS = ("Ascendente", "Descendente")
# Parámetros de la simulación que no son controles físicos del tipo de cambio.
GENERICOS = ("semilla", "looks", "orbita", "estacional", "lat", "lon")

# Cubo del modelo -> (variable del contrato, polarización). LOS/VEL no tienen polarización conocida.
_VARIABLE_DE_CUBO = {
    "HH": ("sigma0", "HH"), "HV": ("sigma0", "HV"),
    "LOS": ("desplazamiento_los", None), "VEL": ("velocidad", None),
}
# variable -> (unidad, paleta); la unidad de sigma0 es dB (los cubos del modelo ya están en dB).
_META_VARIABLE = {
    "sigma0": ("dB", "gris"),
    "desplazamiento_los": ("cm", "divergente"),
    "velocidad": ("m/día", "secuencial"),
}
# Posición en `Analisis.paneles` del mapa de cambio y de la clasificación, por tipo de cambio.
_PANELES_CAMBIO = {
    "humedales": (2, None), "incendios": (2, 3), "terremotos": (1, None),
    "glaciares": (2, 3), "agricultura": (2, None), "subsidencia": (1, None),
}
# Paneles secundarios que se exponen como `capas_extra` (interferograma/coherencia; acumulado/error).
_PANELES_EXTRA = {"terremotos": (0, 2), "subsidencia": (0, 2)}
_PALETA_DE_PANEL = {"secuencial_naranja": "secuencial"}  # el contrato solo tiene una rampa secuencial


# --- utilidades ---------------------------------------------------------------------------------

def _rejilla(a) -> np.ndarray:
    """float32 con NaN = sin dato: cualquier valor no finito pasa a NaN."""
    arr = np.array(a, dtype=np.float32, copy=True)
    arr[~np.isfinite(arr)] = np.nan
    return arr


def _slug(texto: str) -> str:
    s = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


_NUM = re.compile(r"^([−+\-]?\d+(?:[\s\u2009\u00a0]\d{3})*(?:,\d+)?(?:[\s\u2009\u00a0]mil)?)\s*(.*)$")


def _metrica(etiqueta: str, valor: str, ayuda: str) -> Metrica:
    """Separa «12,3 km²» en valor y unidad; si no tiene forma numérica, deja el texto entero."""
    m = _NUM.match(str(valor).strip())
    num, unidad = (m.group(1).strip(), m.group(2)) if m else (str(valor), "")
    return Metrica(etiqueta=str(etiqueta), valor=num, unidad=unidad, ayuda=str(ayuda))


def _utc(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)  # fecha nominal, medianoche UTC


def _rango(datos: np.ndarray, paleta: str) -> tuple[float, float]:
    """Rango común de color para todo el cubo (no por adquisición)."""
    v = datos[np.isfinite(datos)]
    if v.size == 0:
        return 0.0, 1.0
    if paleta == "divergente":
        m = max(float(np.percentile(np.abs(v), 98)), 1e-6)
        return -m, m
    if paleta == "secuencial":
        lo, hi = 0.0, float(np.percentile(v, 99))
    else:
        lo, hi = (float(x) for x in np.percentile(v, [2, 98]))
    return (lo, hi) if hi > lo else (lo, lo + 1.0)


def _paleta(nombre: str) -> str:
    p = _PALETA_DE_PANEL.get(nombre, nombre)
    if p not in PALETAS:
        raise ValueError(f"Paleta desconocida en el modelo: {nombre}")
    return p


class _LRU(OrderedDict):
    """Diccionario acotado: al superar `maximo` descarta lo menos usado."""

    def __init__(self, maximo: int = MAX_CACHE) -> None:
        super().__init__()
        self.maximo = maximo

    def obtener(self, clave):
        if clave in self:
            self.move_to_end(clave)
            return self[clave]
        return None

    def poner(self, clave, valor):
        self[clave] = valor
        self.move_to_end(clave)
        while len(self) > self.maximo:
            self.popitem(last=False)
        return valor


def _celda(v):
    if v is None or (isinstance(v, float) and not math.isfinite(v)):
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(v, (bool, np.bool_)):
        return str(v)
    if isinstance(v, (int, float, np.floating, np.integer)):
        return float(v)
    return str(v)


def _capa_de_panel(escenario_id, adquisicion_id, panel, variable, polarizacion, bbox, origen,
                   vmin=None, vmax=None, instante=None) -> CapaRaster:
    return CapaRaster(
        escenario_id=escenario_id, adquisicion_id=adquisicion_id, variable=variable,
        polarizacion=polarizacion, unidad=panel.unidad, paleta=_paleta(panel.paleta),
        vmin=float(panel.vmin if vmin is None else vmin), vmax=float(panel.vmax if vmax is None else vmax),
        leyenda=[(str(e), str(c)) for e, c in panel.leyenda] if panel.leyenda else None,
        datos=_rejilla(panel.datos), bbox=bbox, origen=origen, instante=instante,
    )


def _serie_contrato(s: nisar.Serie, origen: Origen) -> SerieTemporal:
    puntos = []
    for fila in s.datos.itertuples(index=False):
        if not math.isfinite(fila.valor):
            continue  # NaN no viaja en JSON; un hueco en la serie es un punto ausente
        t = pd.Timestamp(fila.fecha).to_pydatetime().replace(tzinfo=timezone.utc)
        puntos.append((t, float(fila.valor), str(fila.serie)))
    return SerieTemporal(titulo=s.titulo, unidad=s.unidad, puntos=puntos, origen=origen)


# --- sitio del mapa (réplica de app.py:sitio_en_mapa; no se importa app.py) ---------------------

def _coordenadas(lat: float, lon: float) -> str:
    return (f"{abs(lat):.4f}° {'N' if lat >= 0 else 'S'}, {abs(lon):.4f}° {'E' if lon >= 0 else 'O'}"
            .replace(".", ","))


def sitio_en_mapa(tipo: str, lat: float, lon: float, sitios: pd.DataFrame) -> dict:
    """Lugar colocado con el puntero: usa los parámetros genéricos del tipo de cambio."""
    referencia = sitios[sitios["tipo_cambio"] == tipo].iloc[0]  # sitio de Ecuador del mismo tipo
    region = estaciones.region_natural(lat, lon) or {"provincia": "Ecuador", "region": ""}
    return {
        "id": f"mapa_{lat:.4f}_{lon:.4f}",
        "tipo_cambio": tipo,
        "sitio": f"Punto en {region['provincia']}",
        "pais": _coordenadas(lat, lon),
        "lat": lat,
        "lon": lon,
        "fecha_evento": referencia["fecha_evento"],
        "descripcion": f"Lugar colocado con el puntero ({region['region']}). El modelo usa parámetros genéricos "
                       "de este tipo de cambio y la climatología del punto.",
    }


# --- validación de parámetros --------------------------------------------------------------------

def _numero(valor, nombre: str) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        raise ValueError(f"«{nombre}» debe ser un número finito.")
    return float(valor)


def _validar(tipo: str, parametros: dict | None) -> dict:
    """Separa y valida los parámetros. Los controles físicos van en las unidades de la interfaz
    (las de `nisar.CONTROLES`, p. ej. porcentaje) y aquí se pasan a unidades del modelo."""
    parametros = dict(parametros or {})
    controles = {c.clave: c for c in nisar.CONTROLES[tipo]}
    for k in parametros:
        if k not in controles and k not in GENERICOS:
            raise ValueError(f"Parámetro desconocido para este tipo de cambio: {k}")
    sim: dict = {}
    if "semilla" in parametros:
        s = parametros["semilla"]
        if isinstance(s, bool) or not isinstance(s, int) or not 0 <= s < 2**31:
            raise ValueError("semilla debe ser un entero entre 0 y 2147483647.")
        sim["semilla"] = s
    if "looks" in parametros:
        looks = _numero(parametros["looks"], "looks")
        if not 1.0 <= looks <= 100.0:
            raise ValueError("looks debe estar entre 1 y 100.")
        sim["looks"] = looks
    if "orbita" in parametros:
        if parametros["orbita"] not in ORBITAS:
            raise ValueError(f"orbita debe ser una de: {', '.join(ORBITAS)}.")
        sim["orbita"] = parametros["orbita"]
    if "estacional" in parametros:
        if not isinstance(parametros["estacional"], bool):
            raise ValueError("estacional debe ser verdadero o falso.")
        sim["estacional"] = parametros["estacional"]
    punto = None
    if "lat" in parametros or "lon" in parametros:
        if "lat" not in parametros or "lon" not in parametros:
            raise ValueError("Para colocar un punto en el mapa hacen falta lat y lon.")
        lat, lon = _numero(parametros["lat"], "lat"), _numero(parametros["lon"], "lon")
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("lat debe estar entre -90 y 90, y lon entre -180 y 180.")
        punto = (lat, lon)
    ajustes: dict = {}
    mostrados: dict = {}
    for clave, c in controles.items():
        if clave not in parametros:
            continue
        v = _numero(parametros[clave], c.etiqueta)
        if c.opciones:
            validos = [o for o, _ in c.opciones]
            if v not in validos:
                raise ValueError(f"«{c.etiqueta}» debe ser uno de: " + ", ".join(f"{n} ({o:g})" for o, n in c.opciones) + ".")
            ajustes[clave] = v
        elif c.hora:
            if not 0 <= v < 24:
                raise ValueError(f"«{c.etiqueta}» debe estar entre 0 y 24 horas (sin incluir 24).")
            ajustes[clave] = v
        else:
            if not c.minimo <= v <= c.maximo:
                raise ValueError(f"«{c.etiqueta}» debe estar entre {c.minimo:g} y {c.maximo:g}.")
            ajustes[clave] = v / c.escala
        mostrados[clave] = v
    por_defecto = {k: PARAMETROS_DEMO[k] for k in sim if sim[k] == PARAMETROS_DEMO[k]}
    sim = {k: x for k, x in sim.items() if k not in por_defecto}  # igual a la demostración = no cambia nada
    canonico = {"sim": sim, "ajustes": ajustes, "punto": list(punto) if punto else None}
    return {"sim": sim, "ajustes": ajustes, "mostrados": mostrados, "punto": punto, "canonico": canonico}


class ProveedorDemostracion:
    """Cumple `ProveedorDatos` con escenas sintéticas de Ecuador (`ESCENARIOS_DEMO`)."""

    capacidades = Capacidades(simulacion=True, modelo_continuo=True, verdad_terreno=True)

    def __init__(self) -> None:
        self._cache: _LRU = _LRU()        # id de escenario -> (escena, Escenario)
        self._simulados: _LRU = _LRU()    # id derivado -> (id base, parámetros originales)
        self._analisis_cache: _LRU = _LRU()  # (id, i0, i1) -> Analisis

    def _tipo(self, base: str) -> str:
        if base not in ESCENARIOS_DEMO:
            raise KeyError(f"Escenario de demostración desconocido: {base}")
        df = nisar.cargar_sitios()
        return str(df[df["id"] == base].iloc[0]["tipo_cambio"])

    def _contexto(self, escenario_id: str, parametros: dict | None = None) -> tuple[nisar.Escena, Escenario]:
        """Escena y escenario de un id base (con `parametros` opcionales) o de un id simulado registrado."""
        if "~" in escenario_id:
            registro = self._simulados.obtener(escenario_id)
            if registro is None:
                raise KeyError(f"Escenario simulado desconocido o caducado: {escenario_id}")
            if parametros:
                raise ValueError("Un escenario simulado ya lleva sus parámetros; no se pueden dar otros.")
            base, parametros = registro
        else:
            base = escenario_id
        tipo = self._tipo(base)
        v = _validar(tipo, parametros)
        canon = v["canonico"]
        if canon == {"sim": {}, "ajustes": {}, "punto": None}:
            id_final = base
        else:
            huella = hashlib.sha256(json.dumps(canon, sort_keys=True).encode()).hexdigest()[:8]
            id_final = f"{base}~{huella}"
            self._simulados.poner(id_final, (base, dict(parametros or {})))
        hecho = self._cache.obtener(id_final)
        if hecho is not None:
            return hecho
        completos = {**PARAMETROS_DEMO, **v["sim"]}
        sitio = None
        if v["punto"] is not None:
            sitio = sitio_en_mapa(tipo, *v["punto"], nisar.cargar_sitios())
        escena = generar_escena(sitio["id"] if sitio else base, completos, sitio=sitio,
                                ajustes=v["ajustes"] or None)
        origen = origen_demo(completos)
        extra = []
        if v["mostrados"]:
            extra.append("Ajustes (unidades de la interfaz): " + ", ".join(f"{k}={x:g}" for k, x in v["mostrados"].items()))
        if v["punto"] is not None:
            extra.append(f"Punto del mapa: lat={v['punto'][0]:.4f}, lon={v['punto'][1]:.4f}")
        if extra:
            origen = origen.model_copy(update={"notas": "; ".join(filter(None, [origen.notas, *extra]))})
        reg = estaciones.region_natural(float(escena.sitio["lat"]), float(escena.sitio["lon"]))
        cubos = [k for k in escena.cubos if k in _VARIABLE_DE_CUBO]  # VX/VY (componentes) no se exponen
        pols = sorted({_VARIABLE_DE_CUBO[k][1] for k in cubos if _VARIABLE_DE_CUBO[k][1]})
        variables = list(dict.fromkeys(_VARIABLE_DE_CUBO[k][0] for k in cubos))
        orbita = str(completos["orbita"])
        esc = Escenario(
            id=id_final, nombre=str(escena.sitio["sitio"]), tipo_cambio=escena.tipo,
            historia=ESCENARIOS_DEMO[base]["historia"],
            region=f"{reg['provincia']} ({reg['region']})" if reg else "Fuera de Ecuador",
            bbox=escena.limites(), resolucion_m=float(escena.pixel_m), polarizaciones=pols,
            variables=variables,
            adquisiciones=[Adquisicion(id=f.isoformat(), instante=_utc(f), direccion_orbital=orbita,
                                       polarizaciones=pols) for f in escena.fechas],
            capacidades=self.capacidades, origen=origen,
        )
        return self._cache.poner(id_final, (escena, esc))

    @staticmethod
    def _indice(esc: Escenario, adquisicion_id: str) -> int:
        for i, a in enumerate(esc.adquisiciones):
            if a.id == adquisicion_id:
                return i
        raise KeyError(f"Adquisición desconocida: {adquisicion_id}")

    # --- protocolo ----------------------------------------------------------------------------

    def nombre(self) -> str:
        return "demo"

    def escenarios(self) -> list[Escenario]:
        return [self._contexto(i)[1] for i in ESCENARIOS_DEMO]

    def escenario(self, id: str) -> Escenario:
        return self._contexto(id)[1]

    def intervalo_por_defecto(self, escenario_id: str) -> tuple[str, str]:
        """Ids (antes, después) del intervalo que el modelo propone para este escenario."""
        escena, esc = self._contexto(escenario_id)
        i0, i1 = nisar.intervalo_por_defecto(escena)
        return esc.adquisiciones[i0].id, esc.adquisiciones[i1].id

    def _capa_cubo(self, escena: nisar.Escena, esc: Escenario, i: int, variable: str,
                   polarizacion: str | None) -> CapaRaster:
        if variable not in esc.variables:
            raise ValueError(f"variable desconocida: {variable}; disponibles: {', '.join(esc.variables)}")
        if variable == "sigma0":
            polarizacion = polarizacion or nisar.SERIE_SELECCION[escena.tipo][0]
            if polarizacion not in esc.polarizaciones:
                raise ValueError(f"polarización no disponible: {polarizacion}; disponibles: {', '.join(esc.polarizaciones)}")
            cubo_clave = polarizacion
        else:
            if polarizacion is not None:
                raise ValueError(f"La variable {variable} no tiene polarización.")
            cubo_clave = next(k for k, (var, _) in _VARIABLE_DE_CUBO.items() if var == variable and k in escena.cubos)
        unidad, paleta = _META_VARIABLE[variable]
        cubo = escena.cubos[cubo_clave]
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            vmin, vmax = _rango(cubo, paleta)
        return CapaRaster(
            escenario_id=esc.id, adquisicion_id=esc.adquisiciones[i].id, variable=variable,
            polarizacion=polarizacion, unidad=unidad, paleta=paleta, vmin=vmin, vmax=vmax,
            leyenda=None, datos=_rejilla(cubo[i]), bbox=esc.bbox, origen=esc.origen,
        )

    def capa(self, escenario_id: str, adquisicion_id: str, variable: str,
             polarizacion: str | None) -> CapaRaster:
        escena, esc = self._contexto(escenario_id)
        return self._capa_cubo(escena, esc, self._indice(esc, adquisicion_id), variable, polarizacion)

    def _analisis(self, escenario_id: str, antes_id: str, despues_id: str):
        escena, esc = self._contexto(escenario_id)
        i0, i1 = self._indice(esc, antes_id), self._indice(esc, despues_id)
        clave = (esc.id, i0, i1)
        a = self._analisis_cache.obtener(clave)
        if a is None:
            a = self._analisis_cache.poner(clave, nisar.analizar(escena, i0, i1))  # ValueError si i0 >= i1
        return escena, esc, i0, i1, a

    def cambio(self, escenario_id: str, antes_id: str, despues_id: str,
               polarizacion: str | None) -> ResultadoCambio:
        escena, esc, i0, i1, a = self._analisis(escenario_id, antes_id, despues_id)
        variable = esc.variables[0]
        i_cambio, i_clas = _PANELES_CAMBIO[escena.tipo]

        def de_panel(panel):
            return _capa_de_panel(esc.id, None, panel, _slug(panel.titulo), None, esc.bbox, esc.origen)

        extras = [de_panel(a.paneles[k]) for k in _PANELES_EXTRA.get(escena.tipo, ())]
        tablas = []
        if a.tabla is not None:
            tablas.append(TablaResultado(
                titulo="Resultados por parcela" if escena.tipo == "agricultura" else "Resultados",
                columnas=[str(c) for c in a.tabla.columns],
                filas=[[_celda(x) for x in fila] for fila in a.tabla.itertuples(index=False, name=None)],
                origen=esc.origen))
        vectores = None
        if a.flechas is not None and len(a.flechas):
            f = a.flechas
            ang = np.radians(f["angulo"].to_numpy(float))  # grados desde el norte, sentido horario
            vel = f["velocidad"].to_numpy(float)
            vectores = CampoVectorial(
                x=f["x_km"].astype(float).tolist(), y=f["y_km"].astype(float).tolist(),
                u=(vel * np.sin(ang)).tolist(), v=(vel * np.cos(ang)).tolist(),
                unidad="m/día", origen=esc.origen)
        return ResultadoCambio(
            antes=self._capa_cubo(escena, esc, i0, variable, polarizacion),
            despues=self._capa_cubo(escena, esc, i1, variable, polarizacion),
            cambio=de_panel(a.paneles[i_cambio]),
            clasificacion=de_panel(a.paneles[i_clas]) if i_clas is not None else None,
            metricas=[_metrica(e, v, ay) for e, v, ay in a.metricas],
            series=[_serie_contrato(s, esc.origen) for s in a.series],
            notas=[str(n) for n in a.notas],
            origen=esc.origen,
            tablas=tablas, vectores=vectores, capas_extra=extras,
        )

    def medir(self, escenario_id: str, antes_id: str, despues_id: str,
              cuadrante: tuple[int, int, int, int] | None = None,
              punto: tuple[int, int] | None = None) -> Medicion:
        if (cuadrante is None) == (punto is None):
            raise ValueError("Indica exactamente uno de `cuadrante` o `punto`.")
        escena, esc, _, _, a = self._analisis(escenario_id, antes_id, despues_id)
        ny = nx = escena.n
        if cuadrante is not None:
            f0, f1, c0, c1 = cuadrante
            if not (0 <= f0 < f1 <= ny and 0 <= c0 < c1 <= nx):
                raise ValueError(f"El cuadrante {cuadrante} queda fuera de la imagen ({ny}×{nx} píxeles).")
            metricas, tabla = nisar.medir_cuadrante(a, cuadrante)
            ms = [_metrica(e, v, ay) for e, v, ay in metricas]
        else:
            f, c = punto
            if not (0 <= f < ny and 0 <= c < nx):
                raise ValueError(f"El punto {punto} queda fuera de la imagen ({ny}×{nx} píxeles).")
            tabla = nisar.valores_en_punto(a, punto)
            lat, lon = nisar.coordenadas_punto(a.limites, ((c + 0.5) / nx, (f + 0.5) / ny))
            ms = [Metrica(etiqueta="Posición", valor=_coordenadas(lat, lon), unidad="",
                          ayuda=f"Centro del píxel (fila {f}, columna {c})")]
        filas = [{k: (None if (isinstance(v, float) and not math.isfinite(v)) or v is None else
                      (float(v) if isinstance(v, (int, float, np.floating, np.integer)) else str(v)))
                  for k, v in fila.items()} for fila in tabla.to_dict("records")]
        return Medicion(cuadrante=cuadrante, punto=punto, metricas=ms, tabla=filas, origen=esc.origen)

    def serie_seleccion(self, escenario_id: str, cuadrante: tuple[int, int, int, int] | None = None,
                        punto: tuple[int, int] | None = None) -> SerieTemporal | None:
        """Evolución del observable principal en el punto (3×3 px) y/o el cuadrante; None si no hay ninguno."""
        escena, esc = self._contexto(escenario_id)
        s = nisar.serie_seleccion(escena, rect_px=cuadrante, punto_px=punto)
        return None if s is None else _serie_contrato(s, esc.origen)

    # --- simulación (opcional del contrato) ----------------------------------------------------

    def simular(self, escenario_id: str, parametros: dict | None) -> Escenario:
        """Escenario con parámetros propios; con `lat` y `lon`, un punto del mapa del mismo tipo de cambio.

        Devuelve un id derivado `base~huella` (huella de los parámetros normalizados) que `capa`, `cambio`,
        `medir`, `fotogramas` y `escenario` resuelven mientras siga en el registro (LRU de `MAX_CACHE`);
        después `KeyError`. Parámetros vacíos o iguales a los de demostración dan el id base."""
        return self._contexto(escenario_id, parametros)[1]

    def fotogramas(self, escenario_id: str, parametros: dict | None, inicio: datetime, fin: datetime,
                   paso_min: int) -> list[CapaRaster]:
        """Estado continuo del modelo cada `paso_min` minutos entre `inicio` y `fin` (UTC, inclusive).

        Cada capa lleva su instante UTC en `CapaRaster.instante`; todas comparten vmin/vmax. Un id simulado
        (`base~huella`) ya lleva sus parámetros: `parametros` debe quedar vacío.
        """
        for nombre, t in (("inicio", inicio), ("fin", fin)):
            if t.tzinfo is None or t.utcoffset() is None:
                raise ValueError(f"{nombre} debe llevar zona horaria.")
        if isinstance(paso_min, bool) or not isinstance(paso_min, int) or paso_min <= 0:
            raise ValueError("El paso debe ser un número entero de minutos mayor que 0.")
        ini, fi = inicio.astimezone(timezone.utc), fin.astimezone(timezone.utc)
        if fi < ini:
            raise ValueError("El fin debe ser igual o posterior al inicio.")
        n = int((fi - ini).total_seconds() // (paso_min * 60)) + 1
        if n > MAX_FOTOGRAMAS:
            raise ValueError(f"Se pedirían {n} fotogramas; el máximo es {MAX_FOTOGRAMAS}. Amplía el paso o acorta el intervalo.")
        escena, esc = self._contexto(escenario_id, parametros)
        paneles = []
        for k in range(n):
            t = ini + pd.Timedelta(minutes=paso_min * k)
            panel, _ = nisar.estado_modelo(escena, t.replace(tzinfo=None))
            paneles.append((t, panel))
        vmin = min(float(p.vmin) for _, p in paneles)
        vmax = max(float(p.vmax) for _, p in paneles)
        return [
            _capa_de_panel(esc.id, None, p, "estado_modelo", None, esc.bbox, esc.origen, vmin, vmax,
                           instante=t)
            for t, p in paneles
        ]
