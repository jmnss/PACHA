r"""
Estaciones y temporadas en Ecuador para el modelo NISAR.

El clima de Ecuador no se organiza en cuatro estaciones térmicas sino en temporadas de lluvia que
cambian según la región natural. Este módulo responde, para cualquier punto y fecha del país:

1. Región natural (Costa, Sierra, Amazonía, Insular) a partir de los límites provinciales.
2. Estación astronómica: declinación solar (Spencer, 1971), pasos cenitales del Sol, elevación al
   mediodía y duración del día (FAO-56, Allen et al., 1998).
3. Climatología mensual 2001–2025 de NASA POWER (MERRA-2) interpolada al punto.
4. Temporada climática: lluviosa, de transición o seca (mes seco: P < 60 mm, criterio de Köppen).
5. Balance hídrico diario del suelo (cubeta de Thornthwaite–Mather con ET₀ de Hargreaves–Samani)
   y almacenamiento de un humedal como embalse lineal.
6. Forzamiento estacional que el simulador evalúa en cualquier instante (humedad del suelo, pulso
   de inundación y vapor de agua atmosférico).

Los datos se generan con «python scripts/preparar_datos_ecuador.py».
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

DIR_DATOS = Path(__file__).resolve().parents[1] / "data"  # carpeta data/ en la raíz del proyecto
RUTA_CLIMA = DIR_DATOS / "clima_ecuador_power.csv"
RUTA_PROVINCIAS = DIR_DATOS / "ecuador_provincias.geojson"

LIMITES_ECUADOR = (-92.3, -5.1, -75.1, 1.8)        # (oeste, sur, este, norte) en grados, con Galápagos
LIMITES_CONTINENTE = (-81.2, -5.05, -75.15, 1.5)   # Ecuador continental
TOLERANCIA_COSTA_DEG = 0.02                        # ≈ 2 km: absorbe la simplificación del contorno

# Malla nativa MERRA-2 de NASA POWER (0,5° en latitud × 0,625° en longitud)
DLAT, DLON = 0.5, 0.625
LAT0, LON0 = -5.5, -92.5

DIAS_MES = np.array([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])
J_MITAD_MES = np.cumsum(np.r_[0, DIAS_MES[:-1]]) + (DIAS_MES + 1) / 2.0   # día juliano central de cada mes
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre",
         "octubre", "noviembre", "diciembre"]

# Constantes físicas y parámetros del balance hídrico (valores típicos documentados en el informe LaTeX)
G_SC = 0.0820               # constante solar (MJ m⁻² min⁻¹), FAO-56 ec. 21
MJ_A_MM = 0.408             # 1 MJ m⁻² día⁻¹ evapora 0,408 mm de agua (FAO-56 ec. 20)
AGUA_UTIL_MM = 150.0        # agua disponible total en la zona de raíces (FAO-56, suelo franco, Zr ≈ 1 m)
THETA_UTIL = 0.15           # θ_cc − θ_pmp (m³/m³) asociado a AGUA_UTIL_MM en 1 m de suelo
SENSIBILIDAD_DB = 0.25      # dB por punto porcentual de humedad volumétrica (banda L, suelo desnudo)
TAU_HUMEDAL_DIAS = 30.0     # constante de vaciado del humedal (embalse lineal)
UMBRAL_MES_SECO_MM = 60.0   # Köppen–Geiger: un mes tropical es seco si P < 60 mm (Peel et al., 2007)
ANIOS_ARRANQUE = 6          # años de climatología repetida hasta alcanzar el ciclo periódico estable

TEMPORADAS = ("Lluviosa", "Transición", "Seca")
NOMBRE_LOCAL = {"Lluviosa": "«invierno»", "Transición": "entre épocas", "Seca": "«verano»"}  # uso popular


# ---------------------------------------------------------------------------
# 1. Región natural
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _provincias():
    """Polígonos shapely de las 24 provincias con su región natural (se cargan una vez)."""
    from shapely.geometry import shape
    from shapely.prepared import prep

    datos = json.loads(RUTA_PROVINCIAS.read_text(encoding="utf-8"))
    return [(f["properties"]["provincia"], f["properties"]["region"], shape(f["geometry"]),
             prep(shape(f["geometry"]))) for f in datos["features"]]


def provincias_geojson() -> dict:
    """GeoJSON de las provincias (para dibujarlas en el mapa)."""
    return json.loads(RUTA_PROVINCIAS.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def contorno_ecuador():
    """Unión de las provincias: el contorno del país (continente + Galápagos)."""
    from shapely.ops import unary_union

    return unary_union([g for _, _, g, _ in _provincias()])


def contorno_geojson() -> dict:
    """Frontera del país (continente y Galápagos) simplificada a ~500 m, para dibujarla en el mapa."""
    from shapely.geometry import mapping

    return {"type": "Feature", "properties": {}, "geometry": mapping(contorno_ecuador().simplify(0.005))}


def mascara_exterior_geojson() -> dict:
    """Polígono que cubre todo lo que NO es Ecuador (sirve para atenuar el exterior en el mapa)."""
    from shapely.geometry import box, mapping

    exterior = box(-100.0, -15.0, -65.0, 12.0).difference(contorno_ecuador().buffer(0.01))
    return {"type": "Feature", "properties": {}, "geometry": mapping(exterior.simplify(0.01))}


def region_natural(lat: float, lon: float) -> dict | None:
    """Provincia y región natural del punto; None si está fuera de Ecuador."""
    from shapely.geometry import Point

    o, s, e, n = LIMITES_ECUADOR
    if not (s <= lat <= n and o <= lon <= e):
        return None
    punto = Point(lon, lat)
    for provincia, region, _, preparada in _provincias():
        if preparada.contains(punto):
            return {"provincia": provincia, "region": region}
    distancia, provincia, region = min((g.distance(punto), p, r) for p, r, g, _ in _provincias())
    if distancia <= TOLERANCIA_COSTA_DEG:          # punto en la costa, justo fuera del contorno simplificado
        return {"provincia": provincia, "region": region}
    return None


def en_ecuador(lat: float, lon: float) -> bool:
    return region_natural(lat, lon) is not None


# ---------------------------------------------------------------------------
# 2. Astronomía solar
# ---------------------------------------------------------------------------

def declinacion_solar(j) -> np.ndarray:
    """Declinación solar δ (rad) para el día juliano j (Spencer, 1971; error < 0,035°)."""
    g = 2 * np.pi * (np.asarray(j, float) - 1) / 365.0
    return (0.006918 - 0.399912 * np.cos(g) + 0.070257 * np.sin(g) - 0.006758 * np.cos(2 * g)
            + 0.000907 * np.sin(2 * g) - 0.002697 * np.cos(3 * g) + 0.00148 * np.sin(3 * g))


def radiacion_extraterrestre(lat_deg: float, j) -> np.ndarray:
    """Radiación solar en el tope de la atmósfera Ra (MJ m⁻² día⁻¹), FAO-56 ec. 21."""
    phi = math.radians(lat_deg)
    j = np.asarray(j, float)
    dr = 1 + 0.033 * np.cos(2 * np.pi * j / 365.0)                       # distancia relativa Tierra–Sol
    delta = declinacion_solar(j)
    ws = np.arccos(np.clip(-math.tan(phi) * np.tan(delta), -1.0, 1.0))  # ángulo horario de la puesta
    return (24 * 60 / np.pi) * G_SC * dr * (ws * math.sin(phi) * np.sin(delta)
                                            + math.cos(phi) * np.cos(delta) * np.sin(ws))


def duracion_dia_h(lat_deg: float, j) -> np.ndarray:
    """Horas de luz N = 24·ωs/π (FAO-56 ec. 34)."""
    ws = np.arccos(np.clip(-math.tan(math.radians(lat_deg)) * np.tan(declinacion_solar(j)), -1.0, 1.0))
    return 24.0 * ws / np.pi


def _dia_juliano(f: date) -> int:
    return f.timetuple().tm_yday


@lru_cache(maxsize=1)
def _hitos_astronomicos() -> dict:
    """Días julianos de equinoccios y solsticios según la declinación de Spencer (resolución 0,01 día)."""
    j = np.arange(1.0, 366.0, 0.01)
    d = declinacion_solar(j)
    cruces = np.where(np.diff(np.sign(d)) != 0)[0]
    return {"equinoccio_marzo": float(j[cruces[0]]), "solsticio_junio": float(j[np.argmax(d)]),
            "equinoccio_septiembre": float(j[cruces[1]]), "solsticio_diciembre": float(j[np.argmin(d)])}


def _fecha_de_juliano(anio: int, j: float) -> date:
    return date(anio, 1, 1) + timedelta(days=int(round(j)) - 1)


def pasos_cenitales(lat_deg: float, anio: int) -> list[date]:
    """Fechas en que el Sol pasa por el cenit al mediodía (δ = φ); dos al año en la zona tropical."""
    j = np.arange(1.0, 366.0, 0.05)
    diferencia = declinacion_solar(j) - math.radians(lat_deg)
    cruces = np.where(np.diff(np.sign(diferencia)) != 0)[0]
    return [_fecha_de_juliano(anio, float(j[k])) for k in cruces]


def estacion_astronomica(fecha: date, lat_deg: float) -> dict:
    """Estación astronómica del hemisferio del punto, posición del Sol y próximo hito."""
    h = _hitos_astronomicos()
    j = _dia_juliano(fecha)
    norte = lat_deg >= 0
    tramos = [  # (inicio, fin, nombre boreal, nombre austral)
        (h["solsticio_diciembre"] - 365, h["equinoccio_marzo"], "invierno boreal", "verano austral"),
        (h["equinoccio_marzo"], h["solsticio_junio"], "primavera boreal", "otoño austral"),
        (h["solsticio_junio"], h["equinoccio_septiembre"], "verano boreal", "invierno austral"),
        (h["equinoccio_septiembre"], h["solsticio_diciembre"], "otoño boreal", "primavera austral"),
        (h["solsticio_diciembre"], h["equinoccio_marzo"] + 365, "invierno boreal", "verano austral"),
    ]
    nombre = next((b if norte else a) for i, f_, b, a in tramos if i <= j < f_)
    nombres_hito = {"equinoccio_marzo": "equinoccio de marzo", "solsticio_junio": "solsticio de junio",
                    "equinoccio_septiembre": "equinoccio de septiembre",
                    "solsticio_diciembre": "solsticio de diciembre"}
    futuros = sorted((jh if jh >= j else jh + 365, clave) for clave, jh in h.items())
    j_prox, clave_prox = futuros[0]
    anio_prox = fecha.year + (1 if j_prox > 365 else 0)
    delta = float(declinacion_solar(j))
    return {
        "estacion": nombre,
        "hemisferio": "norte" if norte else "sur",
        "declinacion_deg": math.degrees(delta),
        "elevacion_mediodia_deg": 90.0 - abs(lat_deg - math.degrees(delta)),
        "duracion_dia_h": float(duracion_dia_h(lat_deg, j)),
        "ra_mj": float(radiacion_extraterrestre(lat_deg, j)),
        "proximo_hito": nombres_hito[clave_prox],
        "fecha_proximo_hito": _fecha_de_juliano(anio_prox, j_prox - (365 if j_prox > 365 else 0)),
        "pasos_cenitales": pasos_cenitales(lat_deg, fecha.year),
    }


# ---------------------------------------------------------------------------
# 3. Climatología NASA POWER
# ---------------------------------------------------------------------------

VARIABLES = ("prec_mm_dia", "t2m_c", "t2m_rango_c", "pw_cm")


@lru_cache(maxsize=1)
def _malla_climatica() -> dict:
    """Nodos de la malla: (fila, columna) → {'lat', 'lon', 'elev_m', variable: array(12)}."""
    df = pd.read_csv(RUTA_CLIMA).sort_values(["lat", "lon", "mes"])
    nodos = {}
    for (lat, lon), g in df.groupby(["lat", "lon"]):
        clave = (int(round((lat - LAT0) / DLAT)), int(round((lon - LON0) / DLON)))
        nodos[clave] = {"lat": lat, "lon": lon, "elev_m": float(g["elev_m"].iloc[0]),
                        **{v: g[v].to_numpy(float) for v in VARIABLES}}
    return nodos


@dataclass(frozen=True)
class Climatologia:
    """Climatología mensual (12 valores por variable) en un punto."""
    lat: float
    lon: float
    elev_malla_m: float     # elevación media de la celda MERRA-2 (no la del punto)
    metodo: str             # «bilineal» o «nodo más cercano»
    prec_mm_dia: np.ndarray
    t2m_c: np.ndarray
    t2m_rango_c: np.ndarray
    pw_cm: np.ndarray

    @property
    def et0_mm_dia(self) -> np.ndarray:
        """ET₀ de Hargreaves–Samani (FAO-56 ec. 52) con Ra del día central de cada mes."""
        ra_mm = MJ_A_MM * radiacion_extraterrestre(self.lat, J_MITAD_MES)
        return 0.0023 * (self.t2m_c + 17.8) * np.sqrt(np.clip(self.t2m_rango_c, 0, None)) * ra_mm

    @property
    def prec_mm_mes(self) -> np.ndarray:
        return self.prec_mm_dia * DIAS_MES

    @property
    def et0_mm_mes(self) -> np.ndarray:
        return self.et0_mm_dia * DIAS_MES


@lru_cache(maxsize=512)
def _climatologia_redondeada(lat: float, lon: float) -> Climatologia | None:
    nodos = _malla_climatica()
    fi, ci = (lat - LAT0) / DLAT, (lon - LON0) / DLON
    f0, c0 = int(math.floor(fi)), int(math.floor(ci))
    esquinas = [(f0, c0), (f0 + 1, c0), (f0, c0 + 1), (f0 + 1, c0 + 1)]
    if all(k in nodos for k in esquinas):
        tf, tc = fi - f0, ci - c0
        pesos = [(1 - tf) * (1 - tc), tf * (1 - tc), (1 - tf) * tc, tf * tc]
        valores = {v: sum(w * nodos[k][v] for w, k in zip(pesos, esquinas)) for v in VARIABLES}
        elev = sum(w * nodos[k]["elev_m"] for w, k in zip(pesos, esquinas))
        metodo = "bilineal"
    else:
        clave = min(nodos, key=lambda k: (nodos[k]["lat"] - lat) ** 2 + (nodos[k]["lon"] - lon) ** 2)
        if math.hypot(nodos[clave]["lat"] - lat, nodos[clave]["lon"] - lon) > 1.0:
            return None                              # fuera de la malla de Ecuador
        valores = {v: nodos[clave][v] for v in VARIABLES}
        elev = nodos[clave]["elev_m"]
        metodo = "nodo más cercano"
    return Climatologia(lat, lon, float(elev), metodo, **valores)


def climatologia(lat: float, lon: float) -> Climatologia | None:
    """Climatología interpolada al punto (bilineal en la malla MERRA-2); None fuera de Ecuador."""
    if not RUTA_CLIMA.is_file():
        return None
    return _climatologia_redondeada(round(float(lat), 3), round(float(lon), 3))


# ---------------------------------------------------------------------------
# 4. Temporada climática
# ---------------------------------------------------------------------------

def clasificar_meses(clim: Climatologia) -> list[str]:
    """Temporada de cada mes: seca si P < 60 mm; lluviosa si P ≥ media mensual; si no, transición."""
    p = clim.prec_mm_mes
    media = p.mean()
    return ["Seca" if v < UMBRAL_MES_SECO_MM else ("Lluviosa" if v >= media else "Transición") for v in p]


def regimen_lluvias(clim: Climatologia) -> str:
    """Unimodal o bimodal: número de rachas (circulares) de meses con P ≥ media mensual."""
    sobre = clim.prec_mm_mes >= clim.prec_mm_mes.mean()
    if sobre.all() or not sobre.any():
        return "sin estacionalidad marcada"
    rachas = int(sum(sobre[m] and not sobre[m - 1] for m in range(12)))   # inicios de racha (m − 1 es circular)
    return "bimodal (dos épocas de lluvia)" if rachas >= 2 else "unimodal (una época de lluvia)"


def temporada(fecha: date, clim: Climatologia, region: str | None = None) -> dict:
    """Temporada climática del mes de la fecha, con su precipitación y evapotranspiración típicas."""
    m = fecha.month - 1
    clases = clasificar_meses(clim)
    resultado = {
        "temporada": clases[m],
        "nombre_local": NOMBRE_LOCAL[clases[m]],
        "prec_mes_mm": float(clim.prec_mm_mes[m]),
        "prec_media_mm": float(clim.prec_mm_mes.mean()),
        "et0_mes_mm": float(clim.et0_mm_mes[m]),
        "t2m_c": float(clim.t2m_c[m]),
        "regimen": regimen_lluvias(clim),
        "meses_lluviosos": [MESES[k] for k, c in enumerate(clases) if c == "Lluviosa"],
        "meses_secos": [MESES[k] for k, c in enumerate(clases) if c == "Seca"],
    }
    if region == "Insular":
        # Galápagos: la corriente de Humboldt define una época cálida y lluviosa y otra fría y seca (garúa).
        resultado["nombre_local"] = ("época cálida" if clim.t2m_c[m] >= clim.t2m_c.mean()
                                     else "época fría de garúa")
    return resultado


# ---------------------------------------------------------------------------
# 5. Balance hídrico y forzamiento estacional
# ---------------------------------------------------------------------------

def _diario(mensual: np.ndarray) -> np.ndarray:
    """Interpolación periódica de valores de mitad de mes a los 365 días del año."""
    return np.interp(np.arange(1, 366), J_MITAD_MES, mensual, period=365)


@lru_cache(maxsize=256)
def _balance(lat: float, lon: float) -> dict | None:
    """Ciclo anual periódico del balance hídrico diario (cubeta) y del humedal (embalse lineal)."""
    clim = climatologia(lat, lon)
    if clim is None:
        return None
    p = _diario(clim.prec_mm_dia)
    et0 = _diario(clim.et0_mm_dia)
    w = 0.5 * AGUA_UTIL_MM                          # agua en el suelo (mm)
    s_alm = 0.0                                     # almacenamiento del humedal (mm)
    humedad = np.empty(365)
    exceso = np.empty(365)
    eta = np.empty(365)
    almacen = np.empty(365)
    for _ in range(ANIOS_ARRANQUE):                 # se repite el año climatológico hasta el estado periódico
        for t in range(365):
            eta[t] = et0[t] * w / AGUA_UTIL_MM      # ET real ∝ agua disponible (Thornthwaite–Mather)
            w = w + p[t] - eta[t]
            exceso[t] = max(w - AGUA_UTIL_MM, 0.0)  # escorrentía por saturación
            w = min(max(w, 0.0), AGUA_UTIL_MM)
            humedad[t] = w / AGUA_UTIL_MM
            s_alm += exceso[t] - s_alm / TAU_HUMEDAL_DIAS   # dS/dt = Q − S/τ (Euler, Δt = 1 día)
            almacen[t] = s_alm
    pw = _diario(clim.pw_cm)
    return {"prec": p, "et0": et0, "eta": eta, "humedad": humedad.copy(), "exceso": exceso.copy(),
            "almacen": almacen.copy(), "factor_pw": pw / pw.mean()}


def _anomalia_normalizada(x: np.ndarray) -> np.ndarray:
    """(x − media) / máx |x − media| ∈ [−1, 1]; ceros si la serie no varía."""
    desvio = x - x.mean()
    escala = np.abs(desvio).max()
    return desvio / escala if escala > 1e-6 else np.zeros_like(x)


@dataclass
class Forzamiento:
    """Ciclo estacional diario (365 valores) evaluable en días fraccionarios desde una fecha de referencia."""
    fecha_ref: date
    lat: float
    lon: float
    humedad: np.ndarray          # fracción de agua útil en el suelo, 0–1
    almacen_mm: np.ndarray       # almacenamiento del humedal (mm)
    prec: np.ndarray             # precipitación climatológica (mm/día)
    et0: np.ndarray              # evapotranspiración de referencia (mm/día)
    factor_pw: np.ndarray        # agua precipitable relativa a su media anual

    def __post_init__(self):
        self.humedad_media = float(self.humedad.mean())
        self.anom_humedad = _anomalia_normalizada(self.humedad)
        self.anom_almacen = _anomalia_normalizada(self.almacen_mm)

    def _evaluar(self, serie: np.ndarray, d: float) -> float:
        instante = datetime.combine(self.fecha_ref, datetime.min.time()) + timedelta(days=float(d))
        inicio = datetime(instante.year, 1, 1)
        largo = (datetime(instante.year + 1, 1, 1) - inicio).days
        j = 1.0 + (instante - inicio).total_seconds() / 86400.0 * 365.0 / largo   # día juliano fraccionario
        return float(np.interp(j, np.arange(1, 366), serie, period=365))

    def humedad_en(self, d: float) -> float:
        return self._evaluar(self.humedad, d)

    def anomalia_humedad(self, d: float) -> float:
        return self._evaluar(self.anom_humedad, d)

    def anomalia_almacen(self, d: float) -> float:
        return self._evaluar(self.anom_almacen, d)

    def factor_atmosfera(self, d: float) -> float:
        return self._evaluar(self.factor_pw, d)

    def delta_sigma_suelo_db(self, d: float) -> float:
        """Cambio de σ⁰ del suelo (dB) respecto de la humedad media: κ · 100 · Δθ."""
        delta_theta = THETA_UTIL * (self.humedad_en(d) - self.humedad_media)
        return SENSIBILIDAD_DB * 100.0 * delta_theta


def forzamiento(lat: float, lon: float, fecha_ref: date) -> Forzamiento | None:
    """Forzamiento estacional en un punto de Ecuador; None si no hay climatología para el punto."""
    b = _balance(round(float(lat), 3), round(float(lon), 3))
    if b is None:
        return None
    return Forzamiento(fecha_ref, float(lat), float(lon), b["humedad"], b["almacen"], b["prec"], b["et0"],
                       b["factor_pw"])


# ---------------------------------------------------------------------------
# 6. Resúmenes para la interfaz y el informe
# ---------------------------------------------------------------------------

def resumen(lat: float, lon: float, fecha: date) -> dict | None:
    """Región, estación astronómica, temporada climática y estado del suelo en un punto y una fecha."""
    region = region_natural(lat, lon)
    clim = climatologia(lat, lon)
    if region is None or clim is None:
        return None
    forz = forzamiento(lat, lon, fecha)
    return {
        **region,
        "astronomia": estacion_astronomica(fecha, lat),
        "temporada": temporada(fecha, clim, region["region"]),
        "humedad_suelo": forz.humedad_en(0.0),
        "climatologia": clim,
    }


def tabla_mensual(clim: Climatologia) -> pd.DataFrame:
    """Climatología mensual con la temporada de cada mes (para gráficos y tablas)."""
    return pd.DataFrame({
        "mes": [m[:3] for m in MESES],
        "mes_num": np.arange(1, 13),
        "precipitacion_mm": np.round(clim.prec_mm_mes, 1),
        "et0_mm": np.round(clim.et0_mm_mes, 1),
        "temperatura_c": np.round(clim.t2m_c, 1),
        "temporada": clasificar_meses(clim),
    })


def serie_forzamiento(forz: Forzamiento, inicio: date, fin: date) -> pd.DataFrame:
    """Humedad del suelo y almacenamiento del humedal (en % de su máximo anual) día a día."""
    dias = np.arange((inicio - forz.fecha_ref).days, (fin - forz.fecha_ref).days + 1)
    maximo = max(float(forz.almacen_mm.max()), 1e-9)
    filas = []
    for d in dias:
        fecha = forz.fecha_ref + timedelta(days=int(d))
        filas.append({"fecha": pd.Timestamp(fecha), "valor": 100 * forz.humedad_en(d),
                      "serie": "Humedad del suelo"})                       # % del agua útil
        filas.append({"fecha": pd.Timestamp(fecha), "valor": 100 * forz._evaluar(forz.almacen_mm, d) / maximo,
                      "serie": "Agua en el humedal"})                      # % del máximo anual
    return pd.DataFrame(filas)
