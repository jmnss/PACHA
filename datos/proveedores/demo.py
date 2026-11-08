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
import threading
import warnings
from collections import OrderedDict
from datetime import date, datetime, timezone

import numpy as np
import pandas as pd

from datos.claves import buscar_texto, clave_metrica, numero_de, texto
from datos.contrato import (
    EntradaNoValida,
    NoEncontrado,
    PALETAS, Adquisicion, CampoVectorial, CapaRaster, Capacidades, Control, Escenario, Opcion, TipoCambio, Medicion, Metrica, Origen,
    ResultadoCambio, SerieTemporal, TablaResultado,
)
from datos.geografia import MENSAJE_FUERA_DE_ECUADOR, en_ecuador
from datos.generador import ESCENARIOS_DEMO, PARAMETROS_DEMO, _sitio_catalogo, generar_escena, origen_demo
from modelo import estaciones, nisar

MAX_FOTOGRAMAS = 120
MAX_CACHE = 32  # escenas, escenarios simulados registrados y análisis en memoria
ORBITAS = ("Ascendente", "Descendente")
# Parámetros de la simulación que no son controles físicos del tipo de cambio.
GENERICOS = ("semilla", "looks", "orbita", "estacional", "lat", "lon", "fecha_evento")
# Rango ilustrativo de la fecha del evento simulable (datos sintéticos).
FECHA_EVENTO_MIN, FECHA_EVENTO_MAX = date(2024, 1, 1), date(2030, 12, 31)

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


_DETECTADA_NISAR = re.compile(r"detectad[oa]s?\s+(?:con|por)\s+NISAR", re.IGNORECASE)


def _sin_nisar(texto: str) -> str:
    """Los datos de demostración no los detecta NISAR: lo hace el modelo de simulación (regla 7).
    Se aplica a series, métricas, tablas y leyendas; las `notas` conservan su propio aviso."""
    texto = _DETECTADA_NISAR.sub("Detectada por el modelo (simulación)", str(texto))
    return re.sub(r"\bNISAR\b", "el modelo", texto)


def _metrica(etiqueta: str, valor: str, ayuda: str) -> Metrica:
    """Separa «12,3 km²» en valor y unidad; si no tiene forma numérica, deja el texto entero.
    Con etiqueta y ayuda registradas (`api.obs.metrica.<slug>`) lleva su clave y las cifras sin formato."""
    m = _NUM.match(str(valor).strip())
    num, unidad = (m.group(1).strip(), m.group(2)) if m else (str(valor), "")
    etiqueta, ayuda = _sin_nisar(etiqueta), _sin_nisar(ayuda)
    clave, valores = clave_metrica("api.obs.metrica", etiqueta, ayuda)
    numero = numero_de(num)
    if clave is not None and numero is not None:
        valores = {"valor": numero, **valores}
    return Metrica(etiqueta=etiqueta, valor=num, unidad=unidad, ayuda=ayuda,
                   clave_texto=clave, valores_texto=valores or None)


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
        raise EntradaNoValida.con("api.error.paleta_desconocida", nombre=nombre)
    return p


class _LRU(OrderedDict):
    """Diccionario acotado: al superar `maximo` descarta lo menos usado."""

    def __init__(self, maximo: int = MAX_CACHE) -> None:
        super().__init__()
        self.maximo = maximo
        self._cerrojo = threading.RLock()

    def obtener(self, clave):
        with self._cerrojo:
            if clave in self:
                self.move_to_end(clave)
                return self[clave]
            return None

    def poner(self, clave, valor):
        with self._cerrojo:
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
        return _sin_nisar(str(v))
    if isinstance(v, (int, float, np.floating, np.integer)):
        return float(v)
    return _sin_nisar(str(v))


def _capa_de_panel(escenario_id, adquisicion_id, panel, variable, polarizacion, bbox, origen,
                   vmin=None, vmax=None, instante=None) -> CapaRaster:
    return CapaRaster(
        escenario_id=escenario_id, adquisicion_id=adquisicion_id, variable=variable,
        polarizacion=polarizacion, unidad=panel.unidad, paleta=_paleta(panel.paleta),
        vmin=float(panel.vmin if vmin is None else vmin), vmax=float(panel.vmax if vmax is None else vmax),
        leyenda=[(_sin_nisar(e), str(c)) for e, c in panel.leyenda] if panel.leyenda else None,
        datos=_rejilla(panel.datos), bbox=bbox, origen=origen, instante=instante,
    )


def _serie_contrato(s: nisar.Serie, origen: Origen) -> SerieTemporal:
    puntos = []
    for fila in s.datos.itertuples(index=False):
        if not math.isfinite(fila.valor):
            continue  # NaN no viaja en JSON; un hueco en la serie es un punto ausente
        t = pd.Timestamp(fila.fecha).to_pydatetime().replace(tzinfo=timezone.utc)
        puntos.append((t, float(fila.valor), _sin_nisar(fila.serie)))
    nombres = {n: buscar_texto(("api.obs.serie_nombre.", "api.obs.valor."), n) for n in dict.fromkeys(p[2] for p in puntos)}
    return SerieTemporal(titulo=_sin_nisar(s.titulo), unidad=s.unidad, puntos=puntos, origen=origen,
                         nombres_texto={n: tc for n, tc in nombres.items() if tc is not None} or None)


_ES_FECHA_ISO = re.compile(r"\d{4}-\d{2}-\d{2}")
_CELDAS = ("api.obs.valor.", "api.obs.medida.")


def _tabla_resultado(titulo: str, df, origen: Origen) -> TablaResultado:
    """Tabla del análisis con el texto del modelo reconocido contra las plantillas (`*_texto` paralelos)."""
    columnas = [_sin_nisar(c) for c in df.columns]
    filas = [[_celda(x) for x in fila] for fila in df.itertuples(index=False, name=None)]
    celdas = [[buscar_texto(_CELDAS, v) if isinstance(v, str) and v and not _ES_FECHA_ISO.fullmatch(v) else None
               for v in fila] for fila in filas]
    return TablaResultado(titulo=titulo, columnas=columnas, filas=filas, origen=origen,
                          titulo_texto=buscar_texto("api.obs.titulo_tabla.", titulo),
                          columnas_texto=[buscar_texto("api.obs.columna.", c) for c in columnas], celdas_texto=celdas)


_PREFIJO_MEDICION = {"Capa": "api.obs.capa.", "Medida": "api.obs.medida.", "Valor": _CELDAS}


def _textos_de_fila(fila: dict) -> dict:
    return {col: buscar_texto(pre, fila[col]) if isinstance(fila.get(col), str) else None
            for col, pre in _PREFIJO_MEDICION.items() if col in fila}


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
        raise EntradaNoValida.con("api.error.numero_finito", nombre=nombre)
    return float(valor)


def _validar(tipo: str, parametros: dict | None) -> dict:
    """Separa y valida los parámetros. Los controles físicos van en las unidades de la interfaz
    (las de `nisar.CONTROLES`, p. ej. porcentaje) y aquí se pasan a unidades del modelo."""
    parametros = dict(parametros or {})
    controles = {c.clave: c for c in nisar.CONTROLES[tipo]}
    for k in parametros:
        if k not in controles and k not in GENERICOS:
            raise EntradaNoValida.con("api.error.parametro_desconocido_tipo", parametro=k)
    sim: dict = {}
    if "semilla" in parametros:
        s = parametros["semilla"]
        if isinstance(s, bool) or not isinstance(s, int) or not 0 <= s < 2**31:
            raise EntradaNoValida.con("api.error.semilla_rango")
        sim["semilla"] = s
    if "looks" in parametros:
        looks = _numero(parametros["looks"], "looks")
        if not 1.0 <= looks <= 100.0:
            raise EntradaNoValida.con("api.error.looks_rango")
        sim["looks"] = looks
    if "orbita" in parametros:
        if parametros["orbita"] not in ORBITAS:
            raise EntradaNoValida.con("api.error.orbita_opcion", opciones=", ".join(ORBITAS))
        sim["orbita"] = parametros["orbita"]
    if "estacional" in parametros:
        if not isinstance(parametros["estacional"], bool):
            raise EntradaNoValida.con("api.error.estacional_booleano")
        sim["estacional"] = parametros["estacional"]
    fecha = None
    if "fecha_evento" in parametros:
        crudo = parametros["fecha_evento"]
        if not isinstance(crudo, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", crudo):
            raise EntradaNoValida.con("api.error.fecha_evento_formato")
        try:
            fecha = date.fromisoformat(crudo)
        except ValueError:
            raise EntradaNoValida.con("api.error.fecha_evento_formato") from None
        if not FECHA_EVENTO_MIN <= fecha <= FECHA_EVENTO_MAX:
            raise EntradaNoValida.con("api.error.fecha_evento_rango")
    punto = None
    if "lat" in parametros or "lon" in parametros:
        if "lat" not in parametros or "lon" not in parametros:
            raise EntradaNoValida.con("api.error.punto_faltan_coordenadas")
        lat, lon = _numero(parametros["lat"], "lat"), _numero(parametros["lon"], "lon")
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise EntradaNoValida.con("api.error.latlon_rango")
        if not en_ecuador(lat, lon):
            raise EntradaNoValida.con("api.error.fuera_de_ecuador")
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
                raise EntradaNoValida.con("api.error.control_opcion", nombre=c.etiqueta,
                                          opciones=", ".join(f"{n} ({o:g})" for o, n in c.opciones))
            ajustes[clave] = v
        elif c.hora:
            if not 0 <= v < 24:
                raise EntradaNoValida.con("api.error.control_hora", nombre=c.etiqueta)
            ajustes[clave] = v
        else:
            if not c.minimo <= v <= c.maximo:
                raise EntradaNoValida.con("api.error.control_rango", nombre=c.etiqueta, minimo=f"{c.minimo:g}", maximo=f"{c.maximo:g}")
            ajustes[clave] = v / c.escala
        mostrados[clave] = v
    por_defecto = {k: PARAMETROS_DEMO[k] for k in sim if sim[k] == PARAMETROS_DEMO[k]}
    sim = {k: x for k, x in sim.items() if k not in por_defecto}  # igual a la demostración = no cambia nada
    canonico = {"sim": sim, "ajustes": ajustes, "punto": list(punto) if punto else None}
    return {"sim": sim, "ajustes": ajustes, "mostrados": mostrados, "punto": punto, "fecha": fecha,
            "canonico": canonico}


class ProveedorDemostracion:
    """Cumple `ProveedorDatos` con escenas sintéticas de Ecuador (`ESCENARIOS_DEMO`)."""

    capacidades = Capacidades(simulacion=True, modelo_continuo=True, verdad_terreno=True)

    def __init__(self) -> None:
        self._cache: _LRU = _LRU()        # id de escenario -> (escena, Escenario)
        self._simulados: _LRU = _LRU()    # id derivado -> (id base, parámetros originales)
        self._analisis_cache: _LRU = _LRU()  # (id, i0, i1) -> Analisis
        # Reentrante: consultar-generar-guardar es un bloque único (FastAPI llama desde un pool de hilos).
        self._cerrojo = threading.RLock()

    def _tipo(self, base: str) -> str:
        if base not in ESCENARIOS_DEMO:
            raise NoEncontrado.con("api.error.escenario_desconocido", id=base)
        df = nisar.cargar_sitios()
        return str(df[df["id"] == base].iloc[0]["tipo_cambio"])

    def _contexto(self, escenario_id: str, parametros: dict | None = None) -> tuple[nisar.Escena, Escenario]:
        """Escena y escenario de un id base (con `parametros` opcionales) o de un id simulado registrado."""
        with self._cerrojo:
            return self._contexto_sin_cerrojo(escenario_id, parametros)

    def _contexto_sin_cerrojo(self, escenario_id: str, parametros: dict | None) -> tuple[nisar.Escena, Escenario]:
        if "~" in escenario_id:
            registro = self._simulados.obtener(escenario_id)
            if registro is None:
                raise NoEncontrado.con("api.error.escenario_simulado_caducado", id=escenario_id)
            if parametros:
                raise EntradaNoValida.con("api.error.simulado_sin_parametros")
            base, parametros = registro
        else:
            base = escenario_id
        tipo = self._tipo(base)
        v = _validar(tipo, parametros)
        canon = v["canonico"]
        # Sitio del escenario: el del mapa si hay punto; con `fecha_evento` distinta de la suya, el del catálogo.
        sitio = None
        if v["punto"] is not None:
            sitio = sitio_en_mapa(tipo, *v["punto"], nisar.cargar_sitios())
        if v["fecha"] is not None:
            if sitio is None:
                sitio = _sitio_catalogo(base)
            if pd.Timestamp(sitio["fecha_evento"]).date() == v["fecha"]:
                v["fecha"] = None   # igual a la del catálogo: no cuenta (id base)
            else:
                sitio = {**sitio, "fecha_evento": v["fecha"].isoformat()}
                canon["fecha"] = v["fecha"].isoformat()   # solo si se usa: no altera las huellas existentes
        if canon == {"sim": {}, "ajustes": {}, "punto": None}:
            id_final = base
        else:
            huella = hashlib.sha256(json.dumps(canon, sort_keys=True).encode()).hexdigest()[:12]
            id_final = f"{base}~{huella}"
            self._simulados.poner(id_final, (base, dict(parametros or {})))
        hecho = self._cache.obtener(id_final)
        if hecho is not None:
            return hecho
        completos = {**PARAMETROS_DEMO, **v["sim"]}
        if v["fecha"] is None and v["punto"] is None:
            sitio = None
        escena = generar_escena(sitio["id"] if sitio else base, completos, sitio=sitio,
                                ajustes=v["ajustes"] or None)
        origen = origen_demo(completos)
        extra = []
        if v["mostrados"]:
            extra.append("Ajustes (unidades de la interfaz): " + ", ".join(f"{k}={x:g}" for k, x in v["mostrados"].items()))
        if v["punto"] is not None:
            extra.append(f"Punto del mapa: lat={v['punto'][0]:.4f}, lon={v['punto'][1]:.4f}")
        if v["fecha"] is not None:
            extra.append(f"Fecha del evento (ilustrativa): {v['fecha'].isoformat()}")
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
            instante_evento=escena.instante_evento().replace(tzinfo=timezone.utc),
        )
        return self._cache.poner(id_final, (escena, esc))

    @staticmethod
    def _indice(esc: Escenario, adquisicion_id: str) -> int:
        for i, a in enumerate(esc.adquisiciones):
            if a.id == adquisicion_id:
                return i
        raise NoEncontrado.con("api.error.adquisicion_desconocida", id=adquisicion_id)

    # --- protocolo ----------------------------------------------------------------------------

    def nombre(self) -> str:
        return "demo"

    def escenarios(self) -> list[Escenario]:
        return [self._contexto(i)[1] for i in ESCENARIOS_DEMO]

    def escenario(self, id: str) -> Escenario:
        return self._contexto(id)[1]

    def tipos(self) -> list[TipoCambio]:
        """Los seis tipos de cambio con los controles de la simulación (de `nisar.TIPOS/CONTROLES`)."""
        salida = []
        for clave, t in nisar.TIPOS.items():
            controles = []
            for c in nisar.CONTROLES.get(clave, []):
                defecto = nisar.PARAMETROS_BASE[clave].get(c.clave)
                if c.opciones:
                    controles.append(Control(
                        id=c.clave, etiqueta=c.etiqueta, tipo="selector", valor_defecto=defecto,
                        opciones=[Opcion(valor=float(v), etiqueta=e) for v, e in c.opciones],
                        ayuda=c.ayuda or None))
                elif c.hora:
                    controles.append(Control(
                        id=c.clave, etiqueta=c.etiqueta, tipo="hora", minimo=0.0, maximo=24.0,
                        paso=0.25, valor_defecto=defecto, unidad="h", ayuda=c.ayuda or None))
                else:
                    controles.append(Control(
                        id=c.clave, etiqueta=c.etiqueta, tipo="deslizador", minimo=c.minimo,
                        maximo=c.maximo, paso=c.paso, valor_defecto=defecto, escala=c.escala,
                        ayuda=c.ayuda or None))
            salida.append(TipoCambio(id=clave, nombre=t.nombre, descripcion=t.metodo, observable=t.observable,
                                     controles=controles))
        return salida

    def intervalo_por_defecto(self, escenario_id: str) -> tuple[str, str]:
        """Ids (antes, después) del intervalo que el modelo propone para este escenario."""
        escena, esc = self._contexto(escenario_id)
        i0, i1 = nisar.intervalo_por_defecto(escena)
        return esc.adquisiciones[i0].id, esc.adquisiciones[i1].id

    def _capa_cubo(self, escena: nisar.Escena, esc: Escenario, i: int, variable: str,
                   polarizacion: str | None) -> CapaRaster:
        if variable not in esc.variables:
            raise EntradaNoValida.con("api.error.variable_desconocida", variable=variable, disponibles=", ".join(esc.variables))
        if variable == "sigma0":
            polarizacion = polarizacion or nisar.SERIE_SELECCION[escena.tipo][0]
            if polarizacion not in esc.polarizaciones:
                raise EntradaNoValida.con("api.error.polarizacion_no_disponible", polarizacion=polarizacion,
                                          disponibles=", ".join(esc.polarizaciones))
            cubo_clave = polarizacion
        else:
            if polarizacion is not None:
                raise EntradaNoValida.con("api.error.variable_sin_polarizacion", variable=variable)
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
        if i0 >= i1:
            raise EntradaNoValida.con("api.error.fecha_despues_antes")
        clave = (esc.id, i0, i1)
        with self._cerrojo:
            a = self._analisis_cache.obtener(clave)
            if a is None:
                a = self._analisis_cache.poner(clave, nisar.analizar(escena, i0, i1))
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
            tablas.append(_tabla_resultado("Resultados por parcela" if escena.tipo == "agricultura" else "Resultados",
                                           a.tabla, esc.origen))
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
            notas_texto=[buscar_texto("api.plantilla.nota.", str(n)) for n in a.notas]
            if any(buscar_texto("api.plantilla.nota.", str(n)) for n in a.notas) else None,
        )

    def medir(self, escenario_id: str, antes_id: str, despues_id: str,
              cuadrante: tuple[int, int, int, int] | None = None,
              punto: tuple[int, int] | None = None) -> Medicion:
        if (cuadrante is None) == (punto is None):
            raise EntradaNoValida.con("api.error.medir_uno_de_dos")
        escena, esc, _, _, a = self._analisis(escenario_id, antes_id, despues_id)
        ny = nx = escena.n
        if cuadrante is not None:
            f0, f1, c0, c1 = cuadrante
            if not (0 <= f0 < f1 <= ny and 0 <= c0 < c1 <= nx):
                raise EntradaNoValida.con("api.error.cuadrante_fuera", cuadrante=cuadrante, ny=ny, nx=nx)
            metricas, tabla = nisar.medir_cuadrante(a, cuadrante)
            ms = [_metrica(e, v, ay) for e, v, ay in metricas]
        else:
            f, c = punto
            if not (0 <= f < ny and 0 <= c < nx):
                raise EntradaNoValida.con("api.error.punto_fuera", punto=punto, ny=ny, nx=nx)
            tabla = nisar.valores_en_punto(a, punto)
            lat, lon = nisar.coordenadas_punto(a.limites, ((c + 0.5) / nx, (f + 0.5) / ny))
            ms = [Metrica(etiqueta=texto("api.medicion.posicion.etiqueta"), valor=_coordenadas(lat, lon), unidad="",
                          ayuda=texto("api.medicion.posicion.ayuda", fila=f, columna=c),
                          clave_texto="api.medicion.posicion", valores_texto={"fila": f, "columna": c})]
        filas = [{k: (None if (isinstance(v, float) and not math.isfinite(v)) or v is None else
                      (float(v) if isinstance(v, (int, float, np.floating, np.integer)) else str(v)))
                  for k, v in fila.items()} for fila in tabla.to_dict("records")]
        return Medicion(cuadrante=cuadrante, punto=punto, metricas=ms, tabla=filas, origen=esc.origen,
                        textos=[_textos_de_fila(f) for f in filas])

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
        después `NoEncontrado`. Parámetros vacíos o iguales a los de demostración dan el id base."""
        return self._contexto(escenario_id, parametros)[1]

    def fotogramas(self, escenario_id: str, parametros: dict | None, inicio: datetime, fin: datetime,
                   paso_min: int) -> list[CapaRaster]:
        """Estado continuo del modelo cada `paso_min` minutos entre `inicio` y `fin` (UTC, inclusive).

        Cada capa lleva su instante UTC en `CapaRaster.instante`; todas comparten vmin/vmax. Un id simulado
        (`base~huella`) ya lleva sus parámetros: `parametros` debe quedar vacío.
        """
        for nombre, t in (("inicio", inicio), ("fin", fin)):
            if t.tzinfo is None or t.utcoffset() is None:
                raise EntradaNoValida.con("api.error.fecha_sin_zona", nombre=nombre)
        if isinstance(paso_min, bool) or not isinstance(paso_min, int) or paso_min <= 0:
            raise EntradaNoValida.con("api.error.paso_invalido")
        try:
            ini, fi = inicio.astimezone(timezone.utc), fin.astimezone(timezone.utc)
        except OverflowError:
            raise EntradaNoValida.con("api.error.fechas_fuera_rango") from None
        if fi < ini:
            raise EntradaNoValida.con("api.error.fin_anterior_inicio")
        n = int((fi - ini).total_seconds() // (paso_min * 60)) + 1
        if n > MAX_FOTOGRAMAS:
            raise EntradaNoValida.con("api.error.fotogramas_maximo", n=n, maximo=MAX_FOTOGRAMAS)
        escena, esc = self._contexto(escenario_id, parametros)
        paneles = []
        for k in range(n):
            try:
                t = ini + pd.Timedelta(minutes=paso_min * k)
            except (OverflowError, pd.errors.OutOfBoundsDatetime):
                raise EntradaNoValida.con("api.error.fechas_fuera_rango") from None
            panel, _ = nisar.estado_modelo(escena, t.replace(tzinfo=None))
            paneles.append((t, panel))
        vmin = min(float(p.vmin) for _, p in paneles)
        vmax = max(float(p.vmax) for _, p in paneles)
        return [
            _capa_de_panel(esc.id, None, p, "estado_modelo", None, esc.bbox, esc.origen, vmin, vmax,
                           instante=t)
            for t, p in paneles
        ]
