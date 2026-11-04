r"""
Física, simulación y detección de cambios con radar NISAR (NASA–ISRO).

Contenido
---------
1. Constantes de la misión y geometría de observación (L-SAR, mirada a la izquierda).
2. Utilidades numéricas: campos aleatorios, speckle, filtros y modelo de nube de agua.
3. Modelos físicos directos por tipo de cambio:
   - humedales: inundación (dispersión especular y doble rebote en HH),
   - incendios: pérdida de biomasa vista en HV (Attema y Ulaby, 1978),
   - terremotos: dislocación elástica de Okada (1985) proyectada a la línea de vista,
   - subsidencia: series temporales InSAR,
   - glaciares: ley de flujo de Glen y seguimiento de desplazamientos (offsets),
   - agricultura: fenología de cultivos por parcela.
4. Detección de cambios sobre observaciones simuladas o reales.
5. Datos reales: catálogo ASF (SearchAPI) y lectura de HDF5 GCOV / GUNW.

Las simulaciones reproducen los productos de nivel 2 de NISAR (GCOV, GUNW, GOFF) con
sus fuentes de error dominantes (speckle, atmósfera, decorrelación), de modo que los
algoritmos de detección son los mismos que se aplican a los archivos reales.

Forzamiento estacional (módulo estaciones.py): en Ecuador, la humedad del suelo, el pulso de
inundación de los humedales, el vapor de agua atmosférico y el calendario agrícola siguen la
climatología NASA POWER del punto y la fecha, no una fase fija respecto de la fecha del evento.
"""

from __future__ import annotations

import math
import re
import warnings
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from . import estaciones


# ---------------------------------------------------------------------------
# 1. Misión NISAR
# ---------------------------------------------------------------------------

C_LUZ = 299_792_458.0
FRECUENCIA_L_HZ = 1.257e9
FRECUENCIA_S_HZ = 3.2e9
LAMBDA_L_M = C_LUZ / FRECUENCIA_L_HZ  # ≈ 0,2385 m
LAMBDA_S_M = C_LUZ / FRECUENCIA_S_HZ  # ≈ 0,0937 m
CICLO_DIAS = 12
INCLINACION_DEG = 98.4
MU_CORTE_PA = 3.0e10

MISION = {
    "Agencias": "NASA (JPL) e ISRO",
    "Lanzamiento": "30 de julio de 2025, GSLV-F16 desde Sriharikota (India)",
    "Radares": "L-SAR 1,257 GHz (λ ≈ 23,8 cm) y S-SAR 3,2 GHz (λ ≈ 9,4 cm)",
    "Órbita": "Heliosíncrona amanecer-anochecer, 747 km, inclinación 98,4°",
    "Repetición": "12 días; cada punto se observa en pasos ascendente y descendente",
    "Geometría": "Mirada a la izquierda, franja ≈ 240 km, incidencia 33°–47°",
    "Productos L2": "GCOV (retrodispersión), GUNW (interferograma), GOFF (desplazamientos), GSLC",
    "Archivo": "ASF DAAC: BETA (feb. 2026) y PROVISIONAL (desde el 20 jul. 2026)",
}


@dataclass(frozen=True)
class TipoCambio:
    clave: str
    nombre: str
    producto: str
    observable: str
    metodo: str


TIPOS = {
    "humedales": TipoCambio(
        "humedales", "Pérdida de humedales", "GCOV", "σ⁰ HH y HV (dB)",
        "Clasificación de inundación: agua abierta (reflexión especular, HH muy bajo) y "
        "vegetación inundada (doble rebote tronco-agua, HH muy alto)."),
    "incendios": TipoCambio(
        "incendios", "Incendios forestales", "GCOV", "σ⁰ HV (dB)",
        "Razón logarítmica HV después/antes e inversión de biomasa con el modelo de nube de agua."),
    "terremotos": TipoCambio(
        "terremotos", "Terremotos", "GUNW", "Desplazamiento LOS (cm)",
        "Interferometría diferencial de 12 días; el modelo de Okada genera la deformación cosísmica."),
    "glaciares": TipoCambio(
        "glaciares", "Movimiento de glaciares", "GOFF", "Velocidad superficial (m/día)",
        "Seguimiento de desplazamientos (offset tracking) entre adquisiciones de 12 días."),
    "agricultura": TipoCambio(
        "agricultura", "Actividad agrícola", "GCOV", "σ⁰ HV por parcela (dB)",
        "Series temporales por parcela: siembra, crecimiento, inundación de arroz y cosecha."),
    "subsidencia": TipoCambio(
        "subsidencia", "Subsidencia del terreno", "GUNW", "Velocidad vertical (cm/año)",
        "Series temporales InSAR: ajuste por mínimos cuadrados de la pila de interferogramas."),
}

PROYECTO_DIR = Path(__file__).resolve().parents[1]  # raíz del proyecto (modelo/ está un nivel abajo)
RUTA_SITIOS = PROYECTO_DIR / "data" / "nisar_sample.csv"
CARPETA_H5 = PROYECTO_DIR / "data" / "nisar"
COLUMNAS_SITIOS = ["id", "tipo_cambio", "sitio", "pais", "lat", "lon", "fecha_evento", "descripcion"]


def cargar_sitios(ruta: Path = RUTA_SITIOS) -> pd.DataFrame:
    """Lee y valida el catálogo de sitios de estudio."""
    df = pd.read_csv(ruta, dtype={"id": str})
    faltan = [c for c in COLUMNAS_SITIOS if c not in df.columns]
    if faltan:
        raise ValueError(f"Al catálogo {ruta.name} le faltan columnas: {', '.join(faltan)}")
    df = df[df["tipo_cambio"].isin(TIPOS)].copy()
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
    df["fecha_evento"] = pd.to_datetime(df["fecha_evento"], errors="coerce")
    validos = df["lat"].between(-90, 90) & df["lon"].between(-180, 180) & df["fecha_evento"].notna()
    return df[validos].reset_index(drop=True)


def rumbo_vuelo_deg(lat_deg: float, orbita: str) -> float:
    """Rumbo aproximado de la traza (grados desde el norte) para una órbita de 98,4°."""
    s = math.cos(math.radians(INCLINACION_DEG)) / max(math.cos(math.radians(lat_deg)), 0.05)
    az = math.degrees(math.asin(max(-1.0, min(1.0, s))))
    return az if orbita == "Ascendente" else 180.0 - az


def vector_los(lat_deg: float, orbita: str, incidencia_deg: float = 40.0) -> tuple[float, float, float]:
    """Vector unitario suelo→satélite (este, norte, arriba) para un radar que mira a la izquierda."""
    h = math.radians(rumbo_vuelo_deg(lat_deg, orbita))
    th = math.radians(incidencia_deg)
    return (math.sin(th) * math.cos(h), -math.sin(th) * math.sin(h), math.cos(th))


# ---------------------------------------------------------------------------
# 2. Utilidades numéricas
# ---------------------------------------------------------------------------

def a_db(x):
    return 10.0 * np.log10(np.clip(x, 1e-7, None))


def de_db(x):
    return 10.0 ** (np.asarray(x) / 10.0)


def _malla(n: int, pixel_m: float):
    c = (np.arange(n) - (n - 1) / 2.0) * pixel_m
    return np.meshgrid(c, -c)  # X hacia el este, Y hacia el norte (fila 0 = norte)


def campo_suave(rng: np.random.Generator, n: int, sigma_pix: float) -> np.ndarray:
    """Campo gaussiano aleatorio de media 0 y desviación 1 con longitud de correlación sigma_pix."""
    k = np.fft.fftfreq(n)
    k2 = k[None, :] ** 2 + k[:, None] ** 2
    f = np.fft.ifft2(np.fft.fft2(rng.standard_normal((n, n))) * np.exp(-2 * (np.pi * sigma_pix) ** 2 * k2)).real
    return (f - f.mean()) / (f.std() + 1e-12)


def campo_turbulento(rng: np.random.Generator, n: int, beta: float = 8.0 / 3.0) -> np.ndarray:
    """Pantalla de fase atmosférica con espectro de potencia ∝ k^(-β) (turbulencia de Kolmogórov)."""
    k = np.fft.fftfreq(n)
    kk = np.sqrt(k[None, :] ** 2 + k[:, None] ** 2)
    kk[0, 0] = 1.0
    amp = kk ** (-beta / 2.0)
    amp[0, 0] = 0.0
    f = np.fft.ifft2(np.fft.fft2(rng.standard_normal((n, n))) * amp).real
    return (f - f.mean()) / (f.std() + 1e-12)


def speckle(rng: np.random.Generator, potencia, looks: float):
    """Speckle multiplicativo: intensidad multilook con distribución Gamma(L, 1/L)."""
    return potencia * rng.gamma(looks, 1.0 / looks, size=np.shape(potencia))


def _suma_ventana(a: np.ndarray, k: int) -> np.ndarray:
    p = k // 2
    a = np.pad(a, ((p, k - 1 - p), (p, k - 1 - p)), mode="edge")
    c = np.pad(a.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    return c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]


def promedio_movil(img: np.ndarray, k: int = 3) -> np.ndarray:
    """Filtro de caja k×k que ignora NaN (multilook espacial)."""
    if k <= 1:
        return img
    validos = np.isfinite(img)
    s = _suma_ventana(np.where(validos, img, 0.0), k)
    c = _suma_ventana(validos.astype(float), k)
    with np.errstate(invalid="ignore", divide="ignore"):
        out = s / c
    out[c < 0.5] = np.nan
    return out


def sigma_fase(coherencia, looks: float):
    """Desviación de la fase interferométrica (Cramér-Rao): σφ = √(1-γ²) / (γ √(2L))."""
    g = np.clip(coherencia, 0.05, 0.999)
    return np.sqrt(1 - g**2) / (g * np.sqrt(2 * looks))


# Modelo de nube de agua (Attema y Ulaby, 1978) para banda L
HV_BOSQUE = {"A": 0.075, "s_suelo": 0.004, "b": 0.006}
HH_BOSQUE = {"A": 0.20, "s_suelo": 0.03, "b": 0.006}
HV_CULTIVO = {"A": 0.035, "s_suelo": 0.0025, "b": 0.10}
HH_CULTIVO = {"A": 0.08, "s_suelo": 0.025, "b": 0.06}


def nube_de_agua(biomasa, A, s_suelo, b, incidencia_deg: float = 40.0):
    """σ⁰ = A·cosθ·(1−τ²) + σ⁰_suelo·τ², con τ² = exp(−2·b·B / cosθ)."""
    c = math.cos(math.radians(incidencia_deg))
    tau2 = np.exp(-2.0 * b * np.asarray(biomasa) / c)
    return A * c * (1 - tau2) + s_suelo * tau2


def invertir_biomasa(sigma_lin, A, s_suelo, b, incidencia_deg: float = 40.0, maximo: float = 300.0):
    """Inversión del modelo de nube de agua: biomasa (Mg/ha) a partir de σ⁰ lineal."""
    c = math.cos(math.radians(incidencia_deg))
    techo = A * c
    s = np.clip(sigma_lin, s_suelo * 1.02, techo * 0.985)
    tau2 = (techo - s) / (techo - s_suelo)
    return np.clip(-c * np.log(tau2) / (2 * b), 0, maximo)


def okada85(e, n, profundidad, rumbo, buzamiento, longitud, ancho, rake, deslizamiento, nu=0.25):
    """
    Desplazamiento superficial (este, norte, vertical) de una falla rectangular en un
    semiespacio elástico (Okada, 1985). Distancias en metros; ángulos en grados con la
    convención de Aki-Richards (rake 0 = sinistral, 90 = inversa, 180 = dextral).
    'profundidad' es la del centroide de la falla.
    """
    eps = 1e-9
    st_, bz, rk = (math.radians(v) for v in (rumbo, buzamiento, rake))
    cd, sd = math.cos(bz), math.sin(bz)
    if abs(cd) < 1e-6:
        cd = 0.0
    u1, u2 = math.cos(rk) * deslizamiento, math.sin(rk) * deslizamiento
    x = math.cos(st_) * n + math.sin(st_) * e + longitud / 2
    y = math.sin(st_) * n - math.cos(st_) * e + cd * ancho / 2
    d = profundidad + sd * ancho / 2
    p = y * cd + d * sd
    q = y * sd - d * cd
    mu = 1 - 2 * nu

    def i5(xi, eta, r, db):
        if cd > eps:
            xx = np.sqrt(xi**2 + q**2)
            with np.errstate(divide="ignore", invalid="ignore"):
                v = mu * 2 / cd * np.arctan((eta * (xx + q * cd) + xx * (r + xx) * sd) / (xi * (r + xx) * cd))
            return np.where(np.abs(xi) < eps, 0.0, v)
        return -mu * xi * sd / (r + db)

    def i4(eta, r, db):
        if cd > eps:
            return mu / cd * (np.log(r + db) - sd * np.log(r + eta))
        return -mu * q / (r + db)

    def i3(eta, r, db):
        yb = eta * cd + q * sd
        if cd > eps:
            return mu * (yb / (cd * (r + db)) - np.log(r + eta)) + sd / cd * i4(eta, r, db)
        return mu / 2 * (eta / (r + db) + yb * q / (r + db) ** 2 - np.log(r + eta))

    def i1(xi, eta, r, db):
        if cd > eps:
            return mu * (-xi / (cd * (r + db))) - sd / cd * i5(xi, eta, r, db)
        return -mu / 2 * xi * q / (r + db) ** 2

    def i2(eta, r, db):
        return mu * (-np.log(r + eta)) - i3(eta, r, db)

    def f(xi, eta):
        r = np.sqrt(xi**2 + eta**2 + q**2)
        db = eta * sd - q * cd
        yb = eta * cd + q * sd
        with np.errstate(divide="ignore", invalid="ignore"):
            at = np.where(np.abs(q) < eps, 0.0, np.arctan(xi * eta / (q * r)))
        ss = np.stack([
            xi * q / (r * (r + eta)) + at + i1(xi, eta, r, db) * sd,
            yb * q / (r * (r + eta)) + q * cd / (r + eta) + i2(eta, r, db) * sd,
            db * q / (r * (r + eta)) + q * sd / (r + eta) + i4(eta, r, db) * sd,
        ])
        ds = np.stack([
            q / r - i3(eta, r, db) * sd * cd,
            yb * q / (r * (r + xi)) + cd * at - i1(xi, eta, r, db) * sd * cd,
            db * q / (r * (r + xi)) + sd * at - i5(xi, eta, r, db) * sd * cd,
        ])
        return ss, ds

    terminos = [f(x, p), f(x, p - ancho), f(x - longitud, p), f(x - longitud, p - ancho)]
    ss = terminos[0][0] - terminos[1][0] - terminos[2][0] + terminos[3][0]
    ds = terminos[0][1] - terminos[1][1] - terminos[2][1] + terminos[3][1]
    ux, uy, uz = -u1 / (2 * np.pi) * ss - u2 / (2 * np.pi) * ds
    ue = math.sin(st_) * ux - math.cos(st_) * uy
    un = math.cos(st_) * ux + math.sin(st_) * uy
    return ue, un, uz


def magnitud_momento(longitud_m: float, ancho_m: float, deslizamiento_m: float) -> float:
    """Mw = (2/3)(log10 M0 − 9,1) con M0 = μ·L·W·s."""
    m0 = MU_CORTE_PA * longitud_m * ancho_m * deslizamiento_m
    return (2.0 / 3.0) * (math.log10(m0) - 9.1)


# ---------------------------------------------------------------------------
# 3. Escenas simuladas
# ---------------------------------------------------------------------------
# Cada fenómeno se separa en tres piezas:
#   _modelo_<tipo>   campos estáticos del lugar (topografía, biomasa, falla, glaciar...)
#   _estado_<tipo>   estado físico en un instante d (días desde la fecha del evento, fraccionarios:
#                    1 minuto = 1/1440 día), usado tanto por las adquisiciones como por el reproductor
#   _sim_<tipo>      observación NISAR en cada adquisición de 12 días (speckle, atmósfera, ruido)

ROTACIONES_PUNJAB = [
    # (rotación, probabilidad, [(cultivo, siembra, cosecha, biomasa máx. Mg/ha, inundado)])
    # Días relativos a la fecha de referencia del sitio (cosecha de trigo de rabi).
    ("Trigo → Arroz", 0.65, [("Trigo", -156, 0, 13.0, False), ("Arroz", 71, 178, 14.0, True)]),
    ("Trigo → Maíz", 0.25, [("Trigo", -150, 6, 13.0, False), ("Maíz", 56, 163, 18.0, False)]),
    ("Frutales", 0.10, [("Frutales", None, None, 35.0, False)]),
]

ROTACIONES_PAMPA = [
    ("Soja", 0.45, [("Soja", -132, 9, 9.0, False), ("Trigo", 70, 248, 12.0, False)]),
    ("Maíz", 0.30, [("Maíz", -182, -17, 20.0, False)]),
    ("Trigo → Soja de segunda", 0.25, [("Trigo", -295, -117, 12.0, False), ("Soja", -107, 29, 8.0, False)]),
]

PARAMETROS_BASE = {
    "humedales": dict(n=160, pixel_m=100.0, fraccion_inundada=0.45, amplitud_estacional=0.35,
                      tasa_secado=1.1, dia_pico=-40, amplitud_meandro_m=2500.0, longitud_meandro_m=9000.0),
    "incendios": dict(n=160, pixel_m=100.0, biomasa_media=190.0, biomasa_desv=55.0, radio_km=4.5,
                      amplitud_humedad=1.5, dia_lluvias=120, viento_deg=45.0, hora_evento=14.0),
    "terremotos": dict(n=160, pixel_m=600.0, rumbo=0.0, buzamiento=90.0, rake=180.0, deslizamiento_m=4.0,
                       longitud_km=70.0, ancho_km=15.0, profundidad_km=8.0, incidencia=40.0,
                       atmosfera_cm=1.2, postsismico=0.08, hora_evento=6.4,
                       falla_este_km=0.0, falla_norte_km=0.0, costa=None),
    "subsidencia": dict(n=160, pixel_m=200.0, cuencos=[(2.0, -1.5, 4.5, -32.0), (-5.0, 4.0, 2.8, -18.0)],
                        estacional_cm=1.2, incidencia=40.0, atmosfera_cm=1.0, costa_norte_km=None,
                        factor_tasa=1.0, factor_radio=1.0),
    "glaciares": dict(n=160, pixel_m=150.0, azimut_flujo=270.0, semiancho_m=2400.0, frente_m=5000.0,
                      u_terminal=16.0, u_interior=1.5, l_aceleracion_m=7000.0, retroceso_m_a=1200.0,
                      frente_estacional_m=400.0, aceleracion=0.25, dia_pico=45, ruido_md=0.15,
                      umbral_hielo_md=0.6, frente_terrestre=False),
    "agricultura": dict(n=160, pixel_m=30.0, rotaciones=ROTACIONES_PUNJAB, desfase_dias=0.0, factor_biomasa=1.0),
}

ROTACIONES_GUAYAS = [
    # Cuenca baja del Guayas: dos ciclos de arroz bajo riego (invierno y verano), maíz y banano.
    # Días relativos al 15 de mayo de cada año (calendario_anual): el arroz de invierno se siembra a
    # mediados de enero y se cosecha en mayo; el de verano va de mediados de junio a octubre.
    ("Arroz → Arroz", 0.60, [("Arroz", -120, 0, 13.0, True), ("Arroz", 30, 150, 12.0, True)]),
    ("Maíz", 0.15, [("Maíz", -125, 5, 18.0, False)]),
    ("Banano", 0.25, [("Banano", None, None, 40.0, False)]),
]

# Lugares de Ecuador (punto inicial de la aplicación)
PARAMETROS_ECUADOR = {
    # Humedal Ramsar en la confluencia de los ríos Chone y Carrizal (1 836 ha): escena de 8 km.
    "ec_la_segua": dict(pixel_m=50.0, fraccion_inundada=0.35, tasa_secado=1.6, dia_pico=-30,
                        amplitud_meandro_m=800.0, longitud_meandro_m=4000.0),
    # Bosque andino seco y matorral: menos biomasa; vientos del este en la estación seca.
    "ec_loja": dict(biomasa_media=120.0, biomasa_desv=40.0, radio_km=3.0, viento_deg=110.0,
                    dia_lluvias=-270, hora_evento=15.5),
    # Megaterremoto de subducción de 2016 (Mw 7,8): ruptura de ~100 × 40 km entre 15 y 30 km de
    # profundidad, bajo la costa de Manabí; la mitad oeste de la escena es océano (sin datos de radar).
    "ec_pedernales": dict(pixel_m=800.0, rumbo=25.0, buzamiento=20.0, rake=115.0, deslizamiento_m=4.0,
                          longitud_km=100.0, ancho_km=40.0, profundidad_km=22.0, falla_este_km=0.0,
                          falla_norte_km=0.0, costa=(-1.0, 10.0), hora_evento=18.97, atmosfera_cm=1.8),
    # Glaciares del flanco oeste del Antisana: lengua de ~1 km que termina en tierra y retrocede.
    "ec_antisana": dict(pixel_m=30.0, azimut_flujo=270.0, semiancho_m=450.0, frente_m=1200.0,
                        u_terminal=0.12, u_interior=0.04, l_aceleracion_m=900.0, retroceso_m_a=40.0,
                        frente_estacional_m=10.0, aceleracion=0.0, dia_pico=0, ruido_md=0.02,
                        umbral_hielo_md=0.03, frente_terrestre=True),
    # Calendario fijo al año civil: mover la fecha de referencia no desplaza las épocas de siembra.
    "ec_daule": dict(rotaciones=ROTACIONES_GUAYAS, calendario_anual=(5, 15)),
    # Rellenos sobre arcillas blandas y antiguos manglares: hundimiento de algunos cm/año.
    "ec_guayaquil": dict(pixel_m=150.0, cuencos=[(-2.0, -3.0, 2.5, -4.0), (3.0, 1.5, 1.8, -2.5)],
                         estacional_cm=0.8, atmosfera_cm=1.6),
}

PARAMETROS_SITIO = {
    "pantanal": dict(dia_pico=-45),
    "mesopotamia": dict(fraccion_inundada=0.35, tasa_secado=1.4, dia_pico=20, amplitud_meandro_m=1500.0),
    "para": dict(biomasa_media=220.0, radio_km=3.5, dia_lluvias=150, viento_deg=70.0),
    "california": dict(biomasa_media=260.0, biomasa_desv=70.0, radio_km=5.0, dia_lluvias=-60, viento_deg=230.0),
    "nepal": dict(pixel_m=800.0, rumbo=290.0, buzamiento=10.0, rake=90.0, deslizamiento_m=3.0,
                  longitud_km=80.0, ancho_km=50.0, profundidad_km=12.0, hora_evento=11.9),
    "perito_moreno": dict(azimut_flujo=70.0, semiancho_m=2000.0, u_terminal=2.2, u_interior=0.9,
                          l_aceleracion_m=5000.0, retroceso_m_a=0.0, frente_estacional_m=150.0,
                          aceleracion=0.0, dia_pico=0, ruido_md=0.08, umbral_hielo_md=0.3),
    "pampa": dict(rotaciones=ROTACIONES_PAMPA),
    "yakarta": dict(cuencos=[(-3.0, 5.0, 4.0, -14.0), (5.0, 4.0, 3.0, -9.0), (0.0, -6.0, 2.5, -5.0)],
                    costa_norte_km=9.0, atmosfera_cm=1.6),
    **PARAMETROS_ECUADOR,
}


@dataclass(frozen=True)
class Control:
    """Parámetro del modelo que el usuario puede ajustar en tiempo real."""
    clave: str
    etiqueta: str
    minimo: float = 0.0
    maximo: float = 1.0
    paso: float = 0.1
    ayuda: str = ""
    escala: float = 1.0          # valor mostrado = valor del modelo × escala
    opciones: tuple = ()         # selección discreta: ((valor, etiqueta), ...)
    hora: bool = False           # se edita como hora del día (horas fraccionarias en el modelo)


CONTROLES = {
    "humedales": [
        Control("fraccion_inundada", "Superficie inundada inicial (%)", 10, 80, 5, escala=100),
        Control("tasa_secado", "Tasa de secado (desv. topográfica/año)", -1.0, 3.0, 0.1,
                "Positivo: el humedal se seca; negativo: se expande."),
        Control("amplitud_estacional", "Pulso de inundación estacional", 0.0, 1.0, 0.05),
    ],
    "incendios": [
        Control("radio_km", "Tamaño final del incendio (km)", 0.5, 8.0, 0.5),
        Control("biomasa_media", "Biomasa del bosque (Mg/ha)", 30.0, 400.0, 10.0),
        Control("viento_deg", "Dirección del viento (° desde el norte)", 0.0, 355.0, 5.0),
        Control("hora_evento", "Hora de ignición", hora=True),
    ],
    "terremotos": [
        Control("rake", "Mecanismo de la falla",
                opciones=((180.0, "Rumbo dextral"), (0.0, "Rumbo sinistral"), (90.0, "Inversa"), (-90.0, "Normal"))),
        Control("deslizamiento_m", "Deslizamiento (m)", 0.1, 10.0, 0.1),
        Control("longitud_km", "Longitud de ruptura (km)", 5.0, 150.0, 5.0),
        Control("ancho_km", "Ancho de ruptura (km)", 3.0, 60.0, 1.0),
        Control("profundidad_km", "Profundidad del centroide (km)", 2.0, 30.0, 1.0),
        Control("rumbo", "Rumbo de la falla (°)", 0.0, 355.0, 5.0),
        Control("buzamiento", "Buzamiento (°)", 5.0, 90.0, 5.0),
        Control("hora_evento", "Hora del sismo", hora=True),
    ],
    "subsidencia": [
        Control("factor_tasa", "Intensidad de la extracción (× tasa)", 0.0, 3.0, 0.1),
        Control("factor_radio", "Extensión de los conos de hundimiento (×)", 0.5, 2.0, 0.1),
        Control("estacional_cm", "Oscilación estacional (cm)", 0.0, 5.0, 0.5),
    ],
    "glaciares": [
        Control("u_terminal", "Velocidad en el frente (m/día)", 0.5, 40.0, 0.5),
        Control("retroceso_m_a", "Retroceso del frente (m/año)", -1000.0, 3000.0, 100.0,
                "Negativo: el frente avanza."),
        Control("aceleracion", "Aceleración tras el evento (%)", -50.0, 100.0, 5.0, escala=100),
        Control("azimut_flujo", "Dirección del flujo (° desde el norte)", 0.0, 355.0, 5.0),
    ],
    "agricultura": [
        Control("desfase_dias", "Adelanto (−) o retraso (+) de siembra y cosecha (días)", -45.0, 45.0, 1.0),
        Control("factor_biomasa", "Vigor del cultivo (× biomasa)", 0.5, 1.5, 0.05),
    ],
}


def parametros_sitio(sitio: dict, ajustes: dict | None = None) -> dict:
    p = dict(PARAMETROS_BASE[sitio["tipo_cambio"]])
    p.update(PARAMETROS_SITIO.get(str(sitio["id"]), {}))
    if ajustes:
        p.update({k: v for k, v in ajustes.items() if k in p})
    return p


@dataclass
class Escena:
    tipo: str
    sitio: dict
    fechas: list
    i_evento: int
    pixel_m: float
    cubos: dict
    verdad: dict = field(default_factory=dict)
    info: dict = field(default_factory=dict)

    @property
    def n(self) -> int:
        return next(iter(self.cubos.values())).shape[-1]

    @property
    def extension_km(self) -> float:
        return self.n * self.pixel_m / 1000.0

    @property
    def fecha_evento(self) -> date:
        return pd.Timestamp(self.sitio["fecha_evento"]).date()

    def limites(self) -> tuple[float, float, float, float]:
        """(oeste, sur, este, norte) en grados."""
        mitad = self.n * self.pixel_m / 2.0
        lat, lon = float(self.sitio["lat"]), float(self.sitio["lon"])
        dlat = mitad / 111_320.0
        dlon = mitad / (111_320.0 * max(math.cos(math.radians(lat)), 0.05))
        return lon - dlon, lat - dlat, lon + dlon, lat + dlat

    def dias_desde_evento(self, instante: datetime) -> float:
        """Días fraccionarios (resolución de segundos) entre la fecha de referencia y un instante."""
        return (instante - datetime.combine(self.fecha_evento, datetime.min.time())).total_seconds() / 86400.0

    def instante_evento(self) -> datetime:
        horas = float(self.info["parametros"].get("hora_evento", 0.0))
        return datetime.combine(self.fecha_evento, datetime.min.time()) + timedelta(hours=horas)


def _calendario(fecha_evento: date, n_antes: int, n_despues: int):
    inicio = fecha_evento - timedelta(days=CICLO_DIAS * n_antes - 5)
    fechas = [inicio + timedelta(days=CICLO_DIAS * k) for k in range(n_antes + n_despues)]
    dias = np.array([(f - fecha_evento).days for f in fechas], dtype=float)
    return fechas, dias


# --- Humedales: nivel del agua sobre una llanura con un río meandriforme --------------------

TABLA_HH = np.array([-22.0, -7.0, -3.0, -8.0, -12.0])  # agua, herbácea inund., bosque inund., bosque, herbácea
TABLA_HV = np.array([-28.0, -17.0, -11.0, -12.5, -19.0])


def _modelo_humedales(sitio, p, rng, d0):
    n, pix = p["n"], p["pixel_m"]
    X, Y = _malla(n, pix)
    x_rio = p["amplitud_meandro_m"] * np.sin(2 * np.pi * Y / p["longitud_meandro_m"])
    dist_rio = np.abs(X - x_rio)
    topo = (0.55 * campo_suave(rng, n, 14) + 0.25 * campo_suave(rng, n, 4)
            + 1.4 * (1 - np.exp(-(dist_rio / 3000.0) ** 2)))
    topo = (topo - topo.mean()) / topo.std()
    bosque = (campo_suave(rng, n, 5) + 1.3 * np.exp(-(dist_rio / 1200.0) ** 2)) > 0.7
    return {"p": p, "pixel_m": pix, "d0": d0, "topo": topo, "bosque": bosque,
            "textura": 0.8 * campo_suave(rng, n, 1.5), "nivel0": float(np.quantile(topo, p["fraccion_inundada"]))}


def _estado_humedales(M, d):
    p = M["p"]
    forz = p.get("forzamiento")
    # Pulso de inundación: con forzamiento, anomalía del almacenamiento del humedal (embalse lineal
    # alimentado por el excedente del balance hídrico); sin él, coseno con pico en dia_pico.
    pulso = (forz.anomalia_almacen(d) if forz is not None
             else math.cos(2 * np.pi * (d - p["dia_pico"]) / 365.25))
    nivel = M["nivel0"] + p["amplitud_estacional"] * pulso - p["tasa_secado"] * max(d, 0.0) / 365.25
    prof = nivel - M["topo"]
    mojado = prof > 0
    bosque = M["bosque"]
    clase = np.full(prof.shape, 4)
    clase[bosque & ~mojado] = 3
    clase[~bosque & mojado & (prof <= 0.25)] = 1
    clase[~bosque & mojado & (prof > 0.25)] = 0
    clase[bosque & mojado] = 2
    return {"clase": clase, "inundado": mojado}


def _sim_humedales(sitio, p, fechas, dias, rng, looks, orbita):
    M = _modelo_humedales(sitio, p, rng, dias[0])
    T, n = len(fechas), p["n"]
    hh = np.empty((T, n, n), np.float32)
    hv = np.empty((T, n, n), np.float32)
    inundado = np.empty((T, n, n), bool)
    for k in range(T):
        est = _estado_humedales(M, dias[k])
        clase = est["clase"]
        viento = rng.uniform(0.0, 4.0)  # rugosidad del agua por viento (dB)
        s_hh = TABLA_HH[clase] + M["textura"] + np.where(clase == 0, viento, 0.0)
        s_hv = TABLA_HV[clase] + M["textura"] + np.where(clase == 0, 0.5 * viento, 0.0)
        hh[k] = a_db(speckle(rng, de_db(s_hh), looks))
        hv[k] = a_db(speckle(rng, de_db(s_hv), looks))
        inundado[k] = est["inundado"]
    return {"HH": hh, "HV": hv}, {"inundado": inundado}, {"modelo": M}


def _vista_humedales(M, d):
    est = _estado_humedales(M, d)
    clase = est["clase"]
    cat = np.zeros(clase.shape, np.int8)
    cat[clase == 0] = 1
    cat[(clase == 1) | (clase == 2)] = 2
    km2 = M["pixel_m"] ** 2 / 1e6
    panel = Panel("Inundación modelada", cat, "categorias",
                  leyenda=[("Agua abierta", AZUL), ("Vegetación inundada", AGUA)])
    return panel, [
        ("Área inundada", f"{_fmt(est['inundado'].sum() * km2)} km²", "Agua abierta + vegetación inundada"),
        ("Agua abierta", f"{_fmt((cat == 1).sum() * km2)} km²", "Reflexión especular: HH muy bajo"),
        ("Vegetación inundada", f"{_fmt((cat == 2).sum() * km2)} km²", "Doble rebote: HH muy alto"),
    ]


# --- Incendios: frente elíptico empujado por el viento sobre un bosque heterogéneo ---------

def _modelo_incendios(sitio, p, rng, d0):
    n, pix = p["n"], p["pixel_m"]
    X, Y = _malla(n, pix)
    biomasa0 = np.clip(p["biomasa_media"] + p["biomasa_desv"] * campo_suave(rng, n, 8), 20, 450)
    claros = campo_suave(rng, n, 4) > 1.4
    biomasa0[claros] = rng.uniform(3, 15, int(claros.sum()))
    textura = 0.7 * campo_suave(rng, n, 1.5)
    viento = math.radians(p["viento_deg"])
    x0, y0 = rng.uniform(-0.15, 0.15, 2) * n * pix
    a = p["radio_km"] * 1000.0
    U = ((X - x0) * math.sin(viento) + (Y - y0) * math.cos(viento)) / a          # a favor del viento
    V = ((X - x0) * math.cos(viento) - (Y - y0) * math.sin(viento)) / (0.55 * a)  # transversal
    # Frente elíptico que nace en el punto de ignición: en el crecimiento g ∈ (0, 1] la elipse tiene
    # semiejes (g·a, 0,55·g·a) y su centro está 0,7·g·a a sotavento. g_min es el crecimiento necesario
    # para que el frente alcance cada píxel (raíz de 0,51 g² + 1,4 U g − (U² + V²) = 0).
    g_min = (-1.4 * U + np.sqrt(1.96 * U**2 + 2.04 * (U**2 + V**2))) / 1.02
    g_min = np.clip(g_min + 0.12 * campo_suave(rng, n, 6), 0.0, None)  # perímetro irregular
    combustible = biomasa0 > 25
    severidad = np.clip(0.72 + 0.3 * (1 - g_min) + 0.08 * campo_suave(rng, n, 2), 0.4, 0.98)
    # Crecimiento g(t) = 1 − exp(−t/τ), τ = 2 días: un píxel arde cuando g(t) ≥ g_min.
    t_ignicion = p["hora_evento"] / 24.0
    with np.errstate(divide="ignore"):
        t_quema = np.where(combustible & (g_min < 1.0),
                           t_ignicion - 2.0 * np.log1p(-np.clip(g_min, 0.0, 0.9999)), np.inf)
    return {"p": p, "pixel_m": pix, "d0": d0, "biomasa0": biomasa0, "textura": textura,
            "severidad": severidad, "t_quema": t_quema, "t_ignicion": t_ignicion}


def _estado_incendios(M, d):
    quemado = d >= M["t_quema"]
    desde = np.where(quemado, d - np.where(np.isfinite(M["t_quema"]), M["t_quema"], d), 0.0)
    rebrote = 1 - np.exp(-desde / (6 * 365.0))
    b0, sev = M["biomasa0"], M["severidad"]
    biomasa = np.where(quemado, b0 * (1 - sev + sev * rebrote), b0)
    return {"quemado": quemado, "biomasa": biomasa, "activo": quemado & (desde < 0.25)}


def _sim_incendios(sitio, p, fechas, dias, rng, looks, orbita):
    M = _modelo_incendios(sitio, p, rng, dias[0])
    T, n = len(fechas), p["n"]
    hh = np.empty((T, n, n), np.float32)
    hv = np.empty((T, n, n), np.float32)
    quemado = np.zeros((T, n, n), bool)
    biomasa = np.empty((T, n, n), np.float32)
    forz = p.get("forzamiento")
    for k in range(T):
        est = _estado_incendios(M, dias[k])
        quemado[k], biomasa[k] = est["quemado"], est["biomasa"]
        if forz is not None:  # humedad del suelo del balance hídrico → constante dieléctrica → σ⁰ del suelo
            humedad = de_db(forz.delta_sigma_suelo_db(dias[k]))
        else:
            humedad = de_db(p["amplitud_humedad"] * math.sin(2 * np.pi * (dias[k] - p["dia_lluvias"]) / 365.25))
        s_hv = nube_de_agua(est["biomasa"], HV_BOSQUE["A"], HV_BOSQUE["s_suelo"] * humedad, HV_BOSQUE["b"])
        s_hh = nube_de_agua(est["biomasa"], HH_BOSQUE["A"], HH_BOSQUE["s_suelo"] * humedad, HH_BOSQUE["b"])
        hv[k] = a_db(speckle(rng, s_hv * de_db(M["textura"]), looks))
        hh[k] = a_db(speckle(rng, s_hh * de_db(M["textura"]), looks))
    return {"HH": hh, "HV": hv}, {"quemado": quemado, "biomasa": biomasa}, {"modelo": M}


def _vista_incendios(M, d):
    est = _estado_incendios(M, d)
    consumida = np.clip((M["biomasa0"] - est["biomasa"]) / M["biomasa0"] * 100, 0, 100)
    km2 = M["pixel_m"] ** 2 / 1e6
    perdida_mg = float((M["biomasa0"] - est["biomasa"]).sum()) * M["pixel_m"] ** 2 / 1e4
    panel = Panel("Biomasa consumida por el fuego", consumida, "secuencial_naranja", 0, 100, "%")
    return panel, [
        ("Tiempo desde la ignición", duracion_texto(d - M["t_ignicion"]), ""),
        ("Área quemada", f"{_fmt(est['quemado'].sum() * km2, 2)} km²", ""),
        ("Frente activo", f"{_fmt(est['activo'].sum() * km2, 2)} km²", "Ardió en las últimas 6 horas"),
        ("Biomasa consumida", f"{_fmt(perdida_mg / 1e3)} mil Mg", ""),
    ]


# --- Terremotos: dislocación de Okada proyectada a la línea de vista ---------------------

def _distancia_traza(X, Y, p):
    """Distancia a la traza superficial de la falla (inf si la ruptura no alcanza la superficie)."""
    bz = math.radians(p["buzamiento"])
    techo_km = p["profundidad_km"] - math.sin(bz) * p["ancho_km"] / 2
    if techo_km > 1.0:
        return np.full(X.shape, np.inf)
    st_ = math.radians(p["rumbo"])
    a_lo_largo = math.cos(st_) * Y + math.sin(st_) * X
    transversal = math.sin(st_) * Y - math.cos(st_) * X - math.cos(bz) * p["ancho_km"] * 500.0
    exceso = np.clip(np.abs(a_lo_largo) - p["longitud_km"] * 500.0, 0, None)
    return np.hypot(exceso, transversal)


def _modelo_terremotos(sitio, p, rng, d0, orbita):
    n, pix = p["n"], p["pixel_m"]
    X, Y = _malla(n, pix)
    p = dict(p)
    # La falla no puede asomar por encima de la superficie: el techo queda a ≥ 0,2 km.
    p["profundidad_km"] = max(p["profundidad_km"], math.sin(math.radians(p["buzamiento"])) * p["ancho_km"] / 2 + 0.2)
    # Coordenadas relativas al centroide de la falla (puede no coincidir con el centro de la escena).
    Xf, Yf = X - p["falla_este_km"] * 1e3, Y - p["falla_norte_km"] * 1e3
    ue, un, uz = okada85(Xf, Yf, p["profundidad_km"] * 1e3, p["rumbo"], p["buzamiento"],
                         p["longitud_km"] * 1e3, p["ancho_km"] * 1e3, p["rake"], p["deslizamiento_m"])
    le, ln, lu = vector_los(float(sitio["lat"]), orbita, p["incidencia"])
    los_cm = 100.0 * (ue * le + un * ln + uz * lu)
    # Océano al oeste de una costa recta (x0 en km, rumbo en grados): el radar no mide el mar.
    mar = np.zeros((n, n), bool)
    if p["costa"] is not None:
        x0, rumbo_costa = p["costa"]
        az = math.radians(rumbo_costa)
        mar = (X - x0 * 1e3) * math.cos(az) - Y * math.sin(az) < 0
    los_cm[mar] = np.nan
    coherencia = np.clip(0.78 - 0.18 * campo_suave(rng, n, 5), 0.3, 0.95)
    coherencia[mar] = 0.05
    return {"p": p, "pixel_m": pix, "d0": d0, "los_cm": los_cm, "vector_los": (le, ln, lu), "mar": mar,
            "componentes_cm": (100 * ue, 100 * un, 100 * uz), "coherencia_base": coherencia,
            "dist_traza": _distancia_traza(Xf, Yf, p), "t_evento": p["hora_evento"] / 24.0,
            "lim_cm": _rango_simetrico(los_cm, pct=99, minimo=1.0),
            "mw": magnitud_momento(p["longitud_km"] * 1e3, p["ancho_km"] * 1e3, p["deslizamiento_m"])}


def _f_terremoto(M, d):
    """Fracción del desplazamiento cosísmico alcanzada en d (salto en el instante del sismo + postsísmico)."""
    t = d - M["t_evento"]
    if t < 0:
        return 0.0
    return 1.0 + M["p"]["postsismico"] * math.log1p(t / 20.0) / math.log1p(10.0)


def _sim_terremotos(sitio, p, fechas, dias, rng, looks, orbita):
    M = _modelo_terremotos(sitio, p, rng, dias[0], orbita)
    T, n = len(fechas), p["n"]
    ruido_cm = 100 * LAMBDA_L_M / (4 * np.pi) * sigma_fase(M["coherencia_base"], 4 * looks)
    aps = [p["atmosfera_cm"] * _factor_atmosfera(p, d) * campo_turbulento(rng, n) for d in dias]
    f_t = np.array([_f_terremoto(M, d) for d in dias])
    cubo = np.empty((T, n, n), np.float32)
    for k in range(T):
        cubo[k] = f_t[k] * M["los_cm"] + aps[k] - aps[0] + ruido_cm * rng.standard_normal((n, n))
    cubo[:, M["mar"]] = np.nan
    info = {"modelo": M, "coherencia_base": M["coherencia_base"], "dist_traza": M["dist_traza"], "f_t": f_t,
            "los_cosismico_cm": M["los_cm"], "componentes_cm": M["componentes_cm"],
            "vector_los": M["vector_los"], "mw": M["mw"]}
    return {"LOS": cubo}, {}, info


def _vista_terremotos(M, d):
    los = _f_terremoto(M, d) * M["los_cm"]
    panel = Panel("Desplazamiento en la línea de vista", los, "divergente", -M["lim_cm"], M["lim_cm"], "cm")
    return panel, [
        ("Magnitud del escenario", f"Mw {_fmt(M['mw'], 1)}", ""),
        ("Tiempo desde el sismo", duracion_texto(d - M["t_evento"]), ""),
        ("Máx. hacia el satélite", f"{_fmt(float(np.nanmax(los)))} cm", ""),
        ("Máx. alejándose", f"{_fmt(float(np.nanmin(los)))} cm", ""),
    ]


# --- Subsidencia: conos de hundimiento por extracción de agua subterránea ---------------

def _modelo_subsidencia(sitio, p, rng, d0, orbita):
    n, pix = p["n"], p["pixel_m"]
    X, Y = _malla(n, pix)
    vel = np.zeros((n, n))
    for xc, yc, radio, tasa in p["cuencos"]:
        r2 = (X - xc * 1e3) ** 2 + (Y - yc * 1e3) ** 2
        vel += p["factor_tasa"] * tasa * np.exp(-r2 / (2 * (radio * 1e3 * p["factor_radio"]) ** 2))
    vel *= 1 + 0.2 * campo_suave(rng, n, 6)
    mar = (Y > p["costa_norte_km"] * 1e3) if p["costa_norte_km"] is not None else np.zeros((n, n), bool)
    vel[mar] = np.nan
    vmax = max(float(np.nanmax(np.abs(vel))), 1e-6)
    _, _, lu = vector_los(float(sitio["lat"]), orbita, p["incidencia"])
    return {"p": p, "pixel_m": pix, "d0": d0, "vel": vel, "mar": mar, "lu": lu,
            "estacional": p["estacional_cm"] * np.abs(vel) / vmax, "vmax": vmax,
            "coherencia_base": np.clip(0.85 - 0.08 * campo_suave(rng, n, 4), 0.4, 0.97)}


def _factor_atmosfera(p, d) -> float:
    """Escala de la pantalla atmosférica: agua precipitable relativa a su media anual (retardo húmedo)."""
    forz = p.get("forzamiento")
    return forz.factor_atmosfera(d) if forz is not None else 1.0


def _estado_subsidencia(M, d):
    t_a = (d - M["d0"]) / 365.25
    forz = M["p"].get("forzamiento")
    # Componente estacional: con forzamiento, sigue la humedad del suelo (los rellenos arcillosos se
    # hinchan y el acuífero se recarga en la época lluviosa); se resta su valor inicial para que el
    # desplazamiento sea nulo en la primera adquisición.
    ciclo = (forz.anomalia_humedad(d) - forz.anomalia_humedad(M["d0"]) if forz is not None
             else math.sin(2 * np.pi * t_a))
    return M["vel"] * t_a + np.nan_to_num(M["estacional"]) * ciclo


def _sim_subsidencia(sitio, p, fechas, dias, rng, looks, orbita):
    M = _modelo_subsidencia(sitio, p, rng, dias[0], orbita)
    T, n = len(fechas), p["n"]
    ruido_cm = 100 * LAMBDA_L_M / (4 * np.pi) * sigma_fase(M["coherencia_base"], 4 * looks)
    aps = [p["atmosfera_cm"] * _factor_atmosfera(p, d) * campo_turbulento(rng, n) for d in dias]
    cubo = np.empty((T, n, n), np.float32)
    for k in range(T):
        cubo[k] = M["lu"] * _estado_subsidencia(M, dias[k]) + aps[k] - aps[0] + ruido_cm * rng.standard_normal((n, n))
    cubo[:, M["mar"]] = np.nan
    t_a = (dias - dias[0]) / 365.25
    return {"LOS": cubo}, {"velocidad_vertical": M["vel"]}, {"modelo": M, "lu": M["lu"], "t_anios": t_a}


def _vista_subsidencia(M, d):
    uz = _estado_subsidencia(M, d)
    lim = max(M["vmax"] * (M["p"].get("anios_vista", 1.0)), 1.0)
    panel = Panel("Desplazamiento vertical acumulado", uz, "divergente", -lim, lim, "cm")
    return panel, [
        ("Tiempo desde el inicio", duracion_texto(d - M["d0"]), ""),
        ("Hundimiento máximo", f"{_fmt(float(np.nanmin(uz)))} cm", "Acumulado desde la primera adquisición"),
        ("Velocidad máxima", f"{_fmt(-M['vmax'])} cm/año", ""),
    ]


# --- Glaciares: flujo de Glen en un canal sinuoso con frente de desprendimiento -----------

def _geometria_glaciar(X, Y, p):
    az = math.radians(p["azimut_flujo"])
    s = X * math.sin(az) + Y * math.cos(az)
    w = X * math.cos(az) - Y * math.sin(az)
    amp, lon = 1200.0, 16000.0
    w_c = amp * np.sin(2 * np.pi * s / lon)
    pendiente = amp * 2 * np.pi / lon * np.cos(2 * np.pi * s / lon)
    eta = (w - w_c) / np.sqrt(1 + pendiente**2)
    norma = np.sqrt(1 + pendiente**2)
    t_s, t_w = 1 / norma, pendiente / norma
    dir_e = t_s * math.sin(az) + t_w * math.cos(az)
    dir_n = t_s * math.cos(az) - t_w * math.sin(az)
    return s, eta, dir_e, dir_n, (amp, lon)


def _modelo_glaciares(sitio, p, rng, d0):
    n, pix = p["n"], p["pixel_m"]
    X, Y = _malla(n, pix)
    s, eta, dir_e, dir_n, _ = _geometria_glaciar(X, Y, p)
    perfil = 0.5 + 0.5 * (1 - np.clip(np.abs(eta) / p["semiancho_m"], 0, 1) ** 4)  # deslizamiento + Glen n=3
    return {"p": p, "pixel_m": pix, "d0": d0, "s": s, "dir_e": dir_e, "dir_n": dir_n,
            "canal": np.abs(eta) < p["semiancho_m"], "perfil": perfil,
            "vmax": p["u_terminal"] * (1 + max(p["aceleracion"], 0.0)) * 1.15}


def _estado_glaciares(M, d):
    p = M["p"]
    frente = (p["frente_m"] - p["retroceso_m_a"] * (d - M["d0"]) / 365.25
              - p["frente_estacional_m"] * math.cos(2 * np.pi * (d - p["dia_pico"]) / 365.25))
    factor = ((1 + p["aceleracion"] * (1 - math.exp(-max(d, 0.0) / 36.0)))
              * (1 + 0.08 * math.cos(2 * np.pi * (d - p["dia_pico"]) / 365.25)))
    u_c = p["u_interior"] + (p["u_terminal"] - p["u_interior"]) * np.exp(-np.clip(frente - M["s"], 0, None)
                                                                          / p["l_aceleracion_m"])
    hielo = M["canal"] & (M["s"] < frente)
    rapidez = np.where(hielo, u_c * M["perfil"] * factor, 0.0)
    # Frente de desprendimiento: agua sin correlación más allá del hielo. Frente terrestre: roca estable.
    agua = np.zeros_like(hielo) if p.get("frente_terrestre") else M["canal"] & (M["s"] >= frente)
    return {"rapidez": rapidez, "hielo": hielo, "agua": agua, "frente": frente}


def _sim_glaciares(sitio, p, fechas, dias, rng, looks, orbita):
    M = _modelo_glaciares(sitio, p, rng, dias[0])
    T, n = len(fechas), p["n"]
    vel = np.empty((T, n, n), np.float32)
    vx = np.empty((T, n, n), np.float32)
    vy = np.empty((T, n, n), np.float32)
    hielo = np.empty((T, n, n), bool)
    frentes = np.empty(T)
    for k in range(T):
        est = _estado_glaciares(M, dias[k])
        ex = est["rapidez"] * M["dir_e"] + p["ruido_md"] * rng.standard_normal((n, n))
        ny_ = est["rapidez"] * M["dir_n"] + p["ruido_md"] * rng.standard_normal((n, n))
        ex[est["agua"]] = np.nan
        ny_[est["agua"]] = np.nan
        vx[k], vy[k] = ex, ny_
        vel[k] = np.hypot(ex, ny_)
        hielo[k] = est["hielo"]
        frentes[k] = est["frente"]
    return {"VEL": vel, "VX": vx, "VY": vy}, {"hielo": hielo, "frente_m": frentes}, {"modelo": M}


def _vista_glaciares(M, d):
    est = _estado_glaciares(M, d)
    rapidez = np.where(est["agua"], np.nan, est["rapidez"])
    panel = Panel("Velocidad superficial del hielo", rapidez, "secuencial", 0, M["vmax"], "m/día")
    frente0 = _estado_glaciares(M, M["d0"])["frente"]
    return panel, [
        ("Tiempo desde el inicio", duracion_texto(d - M["d0"]), ""),
        ("Velocidad máxima", _velocidad_texto(float(np.nanmax(rapidez))), ""),
        ("Posición del frente", _distancia_texto(est["frente"] - frente0),
         "Respecto a la primera adquisición; negativo = retroceso"),
    ]


def _velocidad_texto(v: float) -> str:
    """m/día con dos decimales para glaciares lentos (p. ej. los tropicales) y uno para los rápidos."""
    return f"{_fmt(v, 2 if abs(v) < 1 else 1)} m/día"


def _distancia_texto(metros: float) -> str:
    return f"{_fmt(metros, 0)} m" if abs(metros) < 1000 else f"{_fmt(metros / 1e3, 2)} km"


# --- Agricultura: fenología por parcela -------------------------------------------------

def _parcelas(rng, n):
    ids = -np.ones((n, n), int)
    fid, fila = 0, 0
    while fila < n:
        alto = int(rng.integers(5, 10))
        col = 0
        while col < n:
            ancho = int(rng.integers(5, 12))
            ids[fila:fila + alto - 1, col:col + ancho - 1] = fid  # caminos y bordos de 1 píxel
            fid += 1
            col += ancho
        fila += alto
    return ids, fid


def _modelo_agricultura(sitio, p, rng, d0):
    n = p["n"]
    ids, nf = _parcelas(rng, n)
    rotaciones = p["rotaciones"]
    probs = np.array([r[1] for r in rotaciones], float)
    eleccion = rng.choice(len(rotaciones), size=nf, p=probs / probs.sum())
    desfase = rng.integers(-12, 13, size=nf) + p["desfase_dias"]
    anios = (0,)
    if p.get("calendario_anual"):
        # Calendario ligado al año civil: las fechas de la rotación son relativas a (mes, día) del año
        # del evento y se repiten el año anterior y el siguiente para cubrir toda la ventana simulada.
        mes, dia = p["calendario_anual"]
        evento = pd.Timestamp(sitio["fecha_evento"]).date()
        desfase = desfase + (date(evento.year, mes, dia) - evento).days
        anios = (-1, 0, 1)
    J = max(len(r[2]) for r in rotaciones) * len(anios)
    s0 = np.full((J, nf), np.nan)
    c0 = np.full((J, nf), np.nan)
    bmax = np.zeros((J, nf))
    inund = np.zeros((J, nf), bool)
    perenne = np.full(nf, np.nan)
    filas = []
    for j in range(nf):
        nombre, _, ciclos_base = rotaciones[eleccion[j]]
        ciclos = [(cultivo, None if s is None else s + 365 * a, None if c is None else c + 365 * a, bm, inu)
                  for a in anios for cultivo, s, c, bm, inu in ciclos_base]
        cosechas = []
        for c, (cultivo, siembra, cosecha, bm, inu) in enumerate(ciclos):
            if siembra is None:
                perenne[j] = bm
                continue
            s0[c, j] = siembra + desfase[j] + int(rng.integers(-4, 5))
            c0[c, j] = cosecha + desfase[j] + int(rng.integers(-4, 5))
            bmax[c, j] = bm * p["factor_biomasa"]
            inund[c, j] = inu
            cosechas.append((cultivo, float(c0[c, j])))
        filas.append({"parcela": j, "rotacion": nombre, "cosechas": cosechas})
    return {"p": p, "pixel_m": p["pixel_m"], "d0": d0, "ids": ids, "nf": nf, "s0": s0, "c0": c0,
            "bmax": bmax, "inund": inund, "perenne": perenne, "parcelas": pd.DataFrame(filas),
            "textura": 0.5 * campo_suave(rng, n, 1.0)}


def _estado_agricultura(M, d):
    nf = M["nf"]
    biomasa = np.zeros(nf)
    bmax_actual = np.ones(nf)
    inundada = np.zeros(nf, bool)
    creciendo_alguno = np.zeros(nf, bool)
    with np.errstate(over="ignore", invalid="ignore"):
        for j in range(M["s0"].shape[0]):
            s0, c0, bm = M["s0"][j], M["c0"][j], M["bmax"][j]
            valido = np.isfinite(s0)
            dur = np.where(valido, c0 - s0, 1.0)
            mitad = s0 + 0.55 * dur
            creciendo = valido & (d >= s0) & (d < c0)
            b = bm / (1 + np.exp(-(d - mitad) / (dur / 10.0)))
            biomasa = np.where(creciendo, b, biomasa)
            bmax_actual = np.where(creciendo, bm, bmax_actual)
            rastrojo = valido & (d >= c0)
            biomasa = np.where(rastrojo, np.maximum(biomasa, 0.8 * np.exp(-(d - c0) / 40.0)), biomasa)
            inundada |= valido & M["inund"][j] & (d >= s0) & (d < c0 - 20)
            creciendo_alguno |= creciendo
    perenne = np.isfinite(M["perenne"])
    biomasa = np.where(perenne, M["perenne"], biomasa)
    bmax_actual = np.where(perenne, M["perenne"], bmax_actual)
    return {"biomasa": biomasa, "bmax": bmax_actual, "inundada": inundada,
            "creciendo": creciendo_alguno & ~perenne}


def _sim_agricultura(sitio, p, fechas, dias, rng, looks, orbita):
    M = _modelo_agricultura(sitio, p, rng, dias[0])
    ids, nf, n = M["ids"], M["nf"], p["n"]
    validos = ids >= 0
    T = len(fechas)
    hv = np.empty((T, n, n), np.float32)
    hh = np.empty((T, n, n), np.float32)
    biomasa = np.zeros((T, nf))
    forz = p.get("forzamiento")
    for k in range(T):
        est = _estado_agricultura(M, dias[k])
        biomasa[k] = est["biomasa"]
        if forz is not None:  # humedad estacional del suelo + heterogeneidad de riego por parcela (±1 dB)
            humedad = de_db(forz.delta_sigma_suelo_db(dias[k]) + rng.uniform(-1.0, 1.0, nf))
        else:
            humedad = de_db(rng.uniform(0, 3, nf))  # riego y lluvia por parcela (dB sobre el suelo)
        agua = np.where(est["inundada"], 0.03, 1.0)
        frac = np.clip(est["biomasa"] / est["bmax"], 0, 1)
        s_hv = (nube_de_agua(est["biomasa"], HV_CULTIVO["A"], HV_CULTIVO["s_suelo"] * humedad * agua, HV_CULTIVO["b"])
                + est["inundada"] * 0.006 * frac)
        s_hh = (nube_de_agua(est["biomasa"], HH_CULTIVO["A"], HH_CULTIVO["s_suelo"] * humedad * agua, HH_CULTIVO["b"])
                + est["inundada"] * 0.30 * frac)
        img_hv = np.where(validos, s_hv[np.clip(ids, 0, None)], de_db(-27.0))
        img_hh = np.where(validos, s_hh[np.clip(ids, 0, None)], de_db(-14.0))
        hv[k] = a_db(speckle(rng, img_hv * de_db(M["textura"]), looks))
        hh[k] = a_db(speckle(rng, img_hh * de_db(M["textura"]), looks))
    info = {"modelo": M, "ids": ids, "n_parcelas": nf, "parcelas": M["parcelas"]}
    return {"HV": hv, "HH": hh}, {"biomasa_parcela": biomasa}, info


def _vista_agricultura(M, d):
    est = _estado_agricultura(M, d)
    ids = M["ids"]
    imagen = np.where(ids >= 0, est["biomasa"][np.clip(ids, 0, None)], np.nan)
    anuales = ~np.isfinite(M["perenne"])
    total = max(int(anuales.sum()), 1)
    cosechadas = anuales & ~est["creciendo"] & (est["biomasa"] < 1.0) & np.any(np.isfinite(M["c0"]) & (d >= M["c0"]), axis=0)
    panel = Panel("Biomasa del cultivo por parcela", imagen, "secuencial", 0, 20, "Mg/ha")
    return panel, [
        ("Parcelas en crecimiento", f"{_fmt(est['creciendo'].sum() / total * 100, 0)} %", ""),
        ("Parcelas cosechadas", f"{_fmt(cosechadas.sum() / total * 100, 0)} %", "Rastrojo o suelo desnudo"),
        ("Arroz inundado", f"{_fmt(est['inundada'].sum() / total * 100, 0)} %", "Trasplante con lámina de agua"),
        ("Biomasa media", f"{_fmt(float(np.mean(est['biomasa'][anuales])) if anuales.any() else 0.0)} Mg/ha", ""),
    ]


SIMULADORES = {
    "humedales": _sim_humedales,
    "incendios": _sim_incendios,
    "terremotos": _sim_terremotos,
    "subsidencia": _sim_subsidencia,
    "glaciares": _sim_glaciares,
    "agricultura": _sim_agricultura,
}

VISTAS = {
    "humedales": _vista_humedales,
    "incendios": _vista_incendios,
    "terremotos": _vista_terremotos,
    "subsidencia": _vista_subsidencia,
    "glaciares": _vista_glaciares,
    "agricultura": _vista_agricultura,
}


def duracion_texto(dias: float) -> str:
    """Duración con signo en días, horas y minutos (p. ej. '−2 h 15 min' o '+3 d 4 h')."""
    signo = "−" if dias < 0 else "+"
    minutos = int(round(abs(dias) * 1440))
    d, resto = divmod(minutos, 1440)
    h, m = divmod(resto, 60)
    if d:
        return f"{signo}{d} d {h} h"
    if h:
        return f"{signo}{h} h {m} min"
    return f"{signo}{m} min"


def simular(sitio: dict, semilla: int = 7, looks: float = 12.0, orbita: str = "Ascendente",
            ajustes: dict | None = None, n_antes: int = 12, n_despues: int = 18,
            estacional: bool = True) -> Escena:
    """Genera una pila de adquisiciones NISAR de 12 días para un lugar, con parámetros opcionales.

    Con estacional=True y un punto de Ecuador, el modelo usa el forzamiento climatológico del punto
    (estaciones.forzamiento); fuera de la malla climática se conserva la fase fija de cada sitio.
    """
    tipo = sitio["tipo_cambio"]
    if tipo not in SIMULADORES:
        raise ValueError(f"Tipo de cambio desconocido: {tipo}")
    p = parametros_sitio(sitio, ajustes)
    evento = pd.Timestamp(sitio["fecha_evento"]).date()
    fechas, dias = _calendario(evento, n_antes, n_despues)
    p["anios_vista"] = float((dias[-1] - dias[0]) / 365.25)
    p["forzamiento"] = (estaciones.forzamiento(float(sitio["lat"]), float(sitio["lon"]), evento)
                        if estacional else None)
    rng = np.random.default_rng(semilla)
    cubos, verdad, info = SIMULADORES[tipo](sitio, p, fechas, dias, rng, looks, orbita)
    info.update({"parametros": p, "dias": dias, "semilla": semilla, "looks": looks, "orbita": orbita,
                 "forzamiento": p["forzamiento"]})
    return Escena(tipo, dict(sitio), fechas, n_antes, p["pixel_m"], cubos, verdad, info)


def estado_modelo(escena: Escena, instante: datetime) -> tuple:
    """Estado físico continuo del modelo en un instante (resolución de minutos) y sus métricas."""
    d = escena.dias_desde_evento(instante)
    panel, metricas = VISTAS[escena.tipo](escena.info["modelo"], d)
    return panel, metricas


def adquisiciones_alrededor(escena: Escena, instante: datetime) -> tuple:
    """Última adquisición NISAR anterior (o igual) al instante y la siguiente, como datetimes o None."""
    tiempos = [datetime.combine(f, datetime.min.time()) for f in escena.fechas]
    previas = [t for t in tiempos if t <= instante]
    siguientes = [t for t in tiempos if t > instante]
    return (previas[-1] if previas else None), (siguientes[0] if siguientes else None)


def intervalo_por_defecto(escena: Escena) -> tuple[int, int]:
    ultimo = len(escena.fechas) - 1
    i = escena.i_evento
    return {
        "humedales": (max(i - 2, 0), ultimo),
        "incendios": (i - 1, min(i + 2, ultimo)),
        "terremotos": (i - 1, i),
        "subsidencia": (0, ultimo),
        "glaciares": (0, ultimo),
        "agricultura": (max(i - 2, 0), min(i + 1, ultimo)),
    }[escena.tipo]


# ---------------------------------------------------------------------------
# 4. Detección de cambios
# ---------------------------------------------------------------------------

# Colores de las clases de los mapas de cambio (tema cyberpunk, validados sobre fondo oscuro;
# deben coincidir con interfaz/tema.py): cian, magenta y violeta; severidad en dos pasos de magenta.
AZUL, NARANJA, AGUA = "#009dcc", "#e0369b", "#8a63f0"
NEUTRO = "#6f6d7a"
SEVERIDAD_MODERADA, SEVERIDAD_ALTA = "#8f1f62", "#ff2bd6"


@dataclass
class Panel:
    titulo: str
    datos: np.ndarray
    paleta: str  # "gris", "secuencial", "divergente", "ciclico" o "categorias"
    vmin: float = 0.0
    vmax: float = 1.0
    unidad: str = ""
    leyenda: list = None  # [(etiqueta, color)] para "categorias"; código 1..N, 0 = transparente


@dataclass
class Serie:
    titulo: str
    unidad: str
    datos: pd.DataFrame  # columnas: fecha, valor, serie


@dataclass
class Analisis:
    paneles: list
    capa_mapa: Panel
    metricas: list  # [(etiqueta, valor, ayuda)]
    series: list
    tabla: pd.DataFrame | None = None
    notas: list = field(default_factory=list)
    flechas: pd.DataFrame | None = None
    limites: tuple | None = None
    pixel_m: float = 0.0


def _km2(n_pix, pixel_m):
    return float(n_pix) * pixel_m**2 / 1e6


def _fmt(x, dec=1):
    return f"{x:,.{dec}f}".replace(",", " ").replace(".", ",")


def _rango_simetrico(*arrs, pct=98, minimo=1.0):
    v = np.concatenate([np.abs(a[np.isfinite(a)]).ravel() for a in arrs])
    return max(float(np.percentile(v, pct)) if v.size else minimo, minimo)


def _serie(fechas, valores: dict) -> pd.DataFrame:
    filas = []
    for nombre, vals in valores.items():
        for f, v in zip(fechas, vals):
            filas.append({"fecha": pd.Timestamp(f), "valor": float(v) if np.isfinite(v) else np.nan,
                          "serie": nombre})
    return pd.DataFrame(filas)


def clasificar_inundacion(hh_db: np.ndarray, hv_db: np.ndarray) -> np.ndarray:
    """Agua abierta (HH < −16 dB) o vegetación inundada (doble rebote: HH alto y HH/HV grande)."""
    hh = a_db(promedio_movil(de_db(hh_db), 3))
    hv = a_db(promedio_movil(de_db(hv_db), 3))
    razon = hh - hv
    agua = hh < -16.0
    doble_rebote = (hh > -5.5) & (razon > 6.0)
    herbacea = (hh > -9.5) & (hh <= -5.5) & (razon > 8.5)
    return agua | doble_rebote | herbacea


def _analizar_humedales(e: Escena, i0: int, i1: int) -> Analisis:
    hh, hv = e.cubos["HH"], e.cubos["HV"]
    inund = [clasificar_inundacion(hh[k], hv[k]) for k in range(len(e.fechas))]
    a0, a1 = inund[i0], inund[i1]
    cat = np.zeros(a0.shape, np.int8)
    cat[a1 & ~a0] = 1
    cat[a0 & ~a1] = 2
    cat[a0 & a1] = 3
    leyenda = [("Nueva inundación", AZUL), ("Pérdida de inundación", NARANJA), ("Inundación persistente", AGUA)]
    area0, area1 = _km2(a0.sum(), e.pixel_m), _km2(a1.sum(), e.pixel_m)
    exactitud = float((a1 == e.verdad["inundado"][i1]).mean()) * 100
    cambio = (area1 - area0) / max(area0, 1e-9) * 100
    serie = _serie(e.fechas, {
        "Detectada con NISAR": [_km2(m.sum(), e.pixel_m) for m in inund],
        "Verdad del modelo": [_km2(m.sum(), e.pixel_m) for m in e.verdad["inundado"]],
    })
    panel_cat = Panel("Cambio de inundación", cat, "categorias", leyenda=leyenda)
    return Analisis(
        paneles=[
            Panel(f"σ⁰ HH · {e.fechas[i0]:%d/%m/%Y}", hh[i0], "gris", -25, 0, "dB"),
            Panel(f"σ⁰ HH · {e.fechas[i1]:%d/%m/%Y}", hh[i1], "gris", -25, 0, "dB"),
            panel_cat,
        ],
        capa_mapa=panel_cat,
        metricas=[
            ("Área inundada inicial", f"{_fmt(area0)} km²", "Agua abierta + vegetación inundada"),
            ("Área inundada final", f"{_fmt(area1)} km²", ""),
            ("Cambio neto", f"{_fmt(cambio)} %", "Negativo = pérdida de humedal"),
            ("Exactitud vs. verdad", f"{_fmt(exactitud)} %", "Clasificación píxel a píxel en la fecha final"),
        ],
        series=[Serie("Superficie inundada", "km²", serie)],
        notas=["El agua abierta refleja la señal lejos del radar (HH muy bajo); bajo el dosel inundado, "
               "el doble rebote tronco-agua eleva HH y la razón HH/HV, algo que solo la banda L "
               "detecta porque atraviesa la copa de los árboles."],
    )


def _analizar_incendios(e: Escena, i0: int, i1: int) -> Analisis:
    hv = e.cubos["HV"]
    lin0 = promedio_movil(de_db(hv[i0]), 3)
    lin1 = promedio_movil(de_db(hv[i1]), 3)
    lr = a_db(lin1) - a_db(lin0)
    quemado = (lr < -2.5) & (a_db(lin0) > -18.0)
    alta = quemado & (lr < -4.5)
    cat = np.zeros(lr.shape, np.int8)
    cat[quemado] = 1
    cat[alta] = 2
    leyenda = [("Severidad moderada (−2,5 a −4,5 dB)", SEVERIDAD_MODERADA), ("Severidad alta (< −4,5 dB)", SEVERIDAD_ALTA)]
    real = e.verdad["quemado"][i1] & ~e.verdad["quemado"][i0]
    vp = float((quemado & real).sum())
    f1 = 2 * vp / max(float(quemado.sum() + real.sum()), 1.0) * 100
    b0 = invertir_biomasa(lin0, **HV_BOSQUE)
    b1 = invertir_biomasa(lin1, **HV_BOSQUE)
    pix_ha = e.pixel_m**2 / 1e4
    perdida_mg = float(np.nansum(np.clip(b0 - b1, 0, None)[quemado])) * pix_ha
    co2_t = perdida_mg * 0.47 * 44.0 / 12.0
    medias = {"Zona quemada": [], "Bosque no quemado (control)": []}
    control = ~quemado & (a_db(lin0) > -18.0)
    for k in range(len(e.fechas)):
        lin = de_db(hv[k])
        medias["Zona quemada"].append(a_db(lin[quemado].mean()) if quemado.any() else np.nan)
        medias["Bosque no quemado (control)"].append(a_db(lin[control].mean()) if control.any() else np.nan)
    panel_cat = Panel("Área quemada detectada", cat, "categorias", leyenda=leyenda)
    return Analisis(
        paneles=[
            Panel(f"σ⁰ HV · {e.fechas[i0]:%d/%m/%Y}", hv[i0], "gris", -26, -8, "dB"),
            Panel(f"σ⁰ HV · {e.fechas[i1]:%d/%m/%Y}", hv[i1], "gris", -26, -8, "dB"),
            Panel("Razón logarítmica HV (después/antes)", lr, "divergente", -8, 8, "dB"),
            panel_cat,
        ],
        capa_mapa=panel_cat,
        metricas=[
            ("Área quemada detectada", f"{_fmt(_km2(quemado.sum(), e.pixel_m))} km²", ""),
            ("Área quemada real", f"{_fmt(_km2(real.sum(), e.pixel_m))} km²", "Verdad del modelo en el intervalo"),
            ("Puntuación F1", f"{_fmt(f1)} %", "Coincidencia entre detección y verdad"),
            ("Biomasa perdida", f"{_fmt(perdida_mg / 1e3)} mil Mg", "Inversión del modelo de nube de agua"),
            ("CO₂ emitido (estimado)", f"{_fmt(co2_t / 1e3)} mil t", "47 % de carbono en la biomasa × 44/12"),
        ],
        series=[Serie("σ⁰ HV medio", "dB", _serie(e.fechas, medias))],
        notas=["En banda L, HV responde a la dispersión de volumen de ramas y troncos; al consumirse la "
               "biomasa cae entre 3 y 8 dB. La señal se satura cerca de 100–150 Mg/ha, por lo que la "
               "pérdida de biomasa en bosques densos es una cota inferior."],
    )


def _analizar_terremotos(e: Escena, i0: int, i1: int) -> Analisis:
    lam_cm = LAMBDA_L_M * 100
    rng = np.random.default_rng([int(e.info["semilla"]), i0, i1])
    d = (e.cubos["LOS"][i1] - e.cubos["LOS"][i0]).astype(float)
    dt = (e.fechas[i1] - e.fechas[i0]).days
    coh = e.info["coherencia_base"] * (0.55 + 0.45 * math.exp(-dt / 90.0))
    if i0 < e.i_evento <= i1:
        coh = coh * (1 - 0.9 * np.exp(-(e.info["dist_traza"] / (1.5 * e.pixel_m)) ** 2))
    coh = np.clip(coh, 0.02, 0.99)
    fase = -4 * np.pi / lam_cm * d + sigma_fase(coh, 4 * e.info["looks"]) * rng.standard_normal(d.shape)
    envuelta = np.angle(np.exp(1j * fase))
    d_obs = -fase * lam_cm / (4 * np.pi)
    d_obs[coh < 0.25] = np.nan
    lim = _rango_simetrico(d_obs, minimo=2.0)
    deformada = np.abs(d_obs) > 5.0
    modelo = e.info["los_cosismico_cm"]
    magnitud = np.abs(np.nan_to_num(modelo))
    tierra = np.isfinite(modelo)  # el océano no tiene datos de radar
    lejos = (e.info["dist_traza"] > 3 * e.pixel_m) & tierra
    idx = np.unravel_index(np.argmax(np.where(lejos, magnitud, -1)), modelo.shape)
    ref = np.unravel_index(np.argmin(np.where(tierra, magnitud, np.inf)), modelo.shape)
    cubo = e.cubos["LOS"]
    f_t = e.info["f_t"]
    serie = _serie(e.fechas, {
        "Cerca de la falla (observado)": cubo[:, idx[0], idx[1]] - cubo[0, idx[0], idx[1]],
        "Cerca de la falla (modelo de Okada)": f_t * modelo[idx],
        "Zona estable (referencia)": cubo[:, ref[0], ref[1]] - cubo[0, ref[0], ref[1]],
    })
    franjas = (np.nanmax(d_obs) - np.nanmin(d_obs)) / (lam_cm / 2) if np.isfinite(d_obs).any() else 0.0
    panel_los = Panel("Desplazamiento LOS desenrollado", d_obs, "divergente", -lim, lim, "cm")
    le, ln, lu = e.info["vector_los"]
    return Analisis(
        paneles=[
            Panel("Interferograma envuelto (1 ciclo = 11,9 cm)", envuelta, "ciclico", -np.pi, np.pi, "rad"),
            panel_los,
            Panel("Coherencia interferométrica", coh, "secuencial", 0, 1, "γ"),
        ],
        capa_mapa=panel_los,
        metricas=[
            ("Magnitud del escenario", f"Mw {_fmt(e.info['mw'], 1)}", "Okada: M0 = μ·L·W·deslizamiento"),
            ("Máx. hacia el satélite", f"{_fmt(np.nanmax(d_obs))} cm", "LOS positivo"),
            ("Máx. alejándose", f"{_fmt(np.nanmin(d_obs))} cm", "LOS negativo"),
            ("Franjas interferométricas", _fmt(franjas, 0), "Una franja = λ/2 = 11,9 cm"),
            ("Área deformada > 5 cm", f"{_fmt(_km2(deformada.sum(), e.pixel_m), 0)} km²", ""),
        ],
        series=[Serie("Desplazamiento LOS acumulado", "cm", serie)],
        notas=[f"Vector LOS (este, norte, arriba) = ({le:+.2f}, {ln:+.2f}, {lu:+.2f}). NISAR mira a la "
               "izquierda: el movimiento norte-sur casi no se proyecta en la línea de vista, por eso las "
               "fallas de rumbo N-S se complementan con desplazamientos de píxel (GOFF).",
               "Los píxeles con coherencia < 0,25 (ruptura superficial, decorrelación) se enmascaran, "
               "como hacen las componentes conexas del producto GUNW."],
    )


def _analizar_subsidencia(e: Escena, i0: int, i1: int) -> Analisis:
    cubo = e.cubos["LOS"][i0:i1 + 1].astype(float)
    t = e.info["t_anios"][i0:i1 + 1]
    n = e.n
    if len(t) < 3:
        raise ValueError("Selecciona al menos tres adquisiciones para estimar velocidades.")
    columnas = [np.ones_like(t), t - t.mean()]
    if t[-1] - t[0] > 0.8:
        columnas += [np.sin(2 * np.pi * t), np.cos(2 * np.pi * t)]
    G = np.stack(columnas, axis=1)
    datos = cubo.reshape(len(t), -1)
    mar = ~np.isfinite(datos).all(axis=0)
    coef, *_ = np.linalg.lstsq(G, np.where(np.isfinite(datos), datos, 0.0), rcond=None)
    v_los = coef[1].reshape(n, n)
    # Multilook espacial 3×3: reduce el residuo atmosférico y de decorrelación de cada píxel.
    v_vert = promedio_movil(v_los / e.info["lu"], 3)
    v_vert[mar.reshape(n, n)] = np.nan
    acumulado = cubo[-1] - cubo[0]
    verdad = e.verdad["velocidad_vertical"]
    rmse = float(np.sqrt(np.nanmean((v_vert - verdad) ** 2)))
    critico = v_vert < -5.0
    # Máximo robusto (percentil 1): un píxel aislado con ruido atmosférico no define el hundimiento.
    maximo = float(np.nanpercentile(v_vert, 1))
    idx = np.unravel_index(np.nanargmin(np.abs(v_vert - maximo)), v_vert.shape)
    validos = np.isfinite(v_vert) & (np.abs(verdad) < 0.5)
    ref = np.unravel_index(np.argmax(validos), v_vert.shape)
    completo = e.cubos["LOS"]
    serie = _serie(e.fechas, {
        "Máximo hundimiento": (completo[:, idx[0], idx[1]] - completo[i0, idx[0], idx[1]]) / e.info["lu"],
        "Zona estable (referencia)": (completo[:, ref[0], ref[1]] - completo[i0, ref[0], ref[1]]) / e.info["lu"],
    })
    lim_v = _rango_simetrico(v_vert, minimo=2.0)
    lim_d = _rango_simetrico(acumulado, minimo=2.0)
    panel_v = Panel("Velocidad vertical", v_vert, "divergente", -lim_v, lim_v, "cm/año")
    return Analisis(
        paneles=[
            Panel("Desplazamiento LOS acumulado", acumulado, "divergente", -lim_d, lim_d, "cm"),
            panel_v,
            Panel("Error vs. verdad del modelo", v_vert - verdad, "divergente", -3, 3, "cm/año"),
        ],
        capa_mapa=panel_v,
        metricas=[
            ("Hundimiento máximo", f"{_fmt(maximo)} cm/año", "Percentil 1 de la velocidad vertical"),
            ("Área con > 5 cm/año", f"{_fmt(_km2(critico.sum(), e.pixel_m))} km²", "Umbral de daño a infraestructura"),
            ("Adquisiciones usadas", str(len(t)), "Pila de interferogramas de 12 días"),
            ("RMSE vs. verdad", f"{_fmt(rmse, 2)} cm/año", "Atmósfera y decorrelación residuales"),
        ],
        series=[Serie("Desplazamiento vertical acumulado", "cm", serie)],
        notas=["Se ajusta, píxel a píxel, d(t) = a + v·t (+ término estacional si la serie supera ~10 meses). "
               "La atmósfera turbulenta es aleatoria entre fechas y se promedia al usar muchas adquisiciones."],
    )


def _frente_detectado(e: Escena, rapidez: np.ndarray) -> float:
    p = e.info["parametros"]
    az = math.radians(p["azimut_flujo"])
    mitad = e.n * e.pixel_m / 2
    s = np.arange(-mitad, mitad, e.pixel_m / 2)
    w = 1200.0 * np.sin(2 * np.pi * s / 16000.0)
    X = s * math.sin(az) + w * math.cos(az)
    Y = s * math.cos(az) - w * math.sin(az)
    col = np.round(X / e.pixel_m + (e.n - 1) / 2).astype(int)
    fila = np.round((e.n - 1) / 2 - Y / e.pixel_m).astype(int)
    dentro = (col >= 0) & (col < e.n) & (fila >= 0) & (fila < e.n)
    hielo = np.zeros(s.shape, bool)
    hielo[dentro] = np.nan_to_num(rapidez[fila[dentro], col[dentro]]) > p["umbral_hielo_md"]
    if not hielo.any():
        return float("nan")
    primero = int(np.argmax(hielo))
    ultimo = primero
    huecos = 0
    for k in range(primero, len(s)):
        if hielo[k]:
            ultimo, huecos = k, 0
        else:
            huecos += 1
            if huecos >= 4:
                break
    return float(s[ultimo])


def _analizar_glaciares(e: Escena, i0: int, i1: int) -> Analisis:
    p = e.info["parametros"]
    vel = e.cubos["VEL"]
    v0 = promedio_movil(vel[i0].astype(float), 3)
    v1 = promedio_movil(vel[i1].astype(float), 3)
    h0, h1 = v0 > p["umbral_hielo_md"], v1 > p["umbral_hielo_md"]
    dv = np.where(h0 & h1, v1 - v0, np.nan)
    # Avance o retroceso del frente: el hielo reemplaza al agua sin correlación (NaN) o viceversa.
    # Exigirlo evita contar como cambio el ruido de velocidad en los márgenes lentos.
    cat = np.zeros(v0.shape, np.int8)
    umbral = p["umbral_hielo_md"]
    if p.get("frente_terrestre"):
        # Frente en tierra: el hielo que fluía pasa a roca quieta (o al revés); márgenes amplios contra el ruido.
        cat[(v1 > 1.5 * umbral) & (v0 < 0.5 * umbral)] = 1
        cat[(v0 > 1.5 * umbral) & (v1 < 0.5 * umbral)] = 2
    else:
        cat[h1 & ~h0 & np.isnan(vel[i0])] = 1
        cat[h0 & ~h1 & np.isnan(vel[i1])] = 2
    leyenda = [("Hielo nuevo (avance)", AZUL), ("Hielo perdido (retroceso del frente)", NARANJA)]
    vmax = float(np.nanpercentile(vel[i0:i1 + 1], 99.5))
    frentes = [_frente_detectado(e, promedio_movil(vel[k].astype(float), 3)) for k in range(len(e.fechas))]
    referencia = frentes[0]
    serie_frente = _serie(e.fechas, {
        "Detectado con GOFF": [(f - referencia) / 1e3 for f in frentes],
        "Verdad del modelo": [(f - e.verdad["frente_m"][0]) / 1e3 for f in e.verdad["frente_m"]],
    })
    s, _, _, _, _ = _geometria_glaciar(*_malla(e.n, e.pixel_m), p)
    distancia = min(4000.0, 0.3 * e.n * e.pixel_m)  # aguas arriba del frente, dentro de la escena
    punto = np.unravel_index(np.argmin(np.abs(s - (p["frente_m"] - distancia)) + 1e9 * ~e.verdad["hielo"][0]), s.shape)
    serie_vel = _serie(e.fechas, {f"A {_fmt(distancia / 1e3)} km del frente inicial": vel[:, punto[0], punto[1]]})
    lim = _rango_simetrico(dv, minimo=0.5)
    retroceso = (frentes[i0] - frentes[i1]) / 1e3
    paso = 8
    c = (np.arange(e.n) - (e.n - 1) / 2) * e.pixel_m / 1e3
    filas = []
    vx1 = promedio_movil(e.cubos["VX"][i1].astype(float), 3)
    vy1 = promedio_movil(e.cubos["VY"][i1].astype(float), 3)
    for r in range(paso // 2, e.n, paso):
        for q in range(paso // 2, e.n, paso):
            if h1[r, q]:
                filas.append({"x_km": c[q], "y_km": -c[r], "velocidad": float(v1[r, q]),
                              "angulo": math.degrees(math.atan2(vx1[r, q], vy1[r, q])) % 360})
    panel_v1 = Panel(f"Velocidad · {e.fechas[i1]:%d/%m/%Y}", v1, "secuencial", 0, vmax, "m/día")
    return Analisis(
        paneles=[
            Panel(f"Velocidad · {e.fechas[i0]:%d/%m/%Y}", v0, "secuencial", 0, vmax, "m/día"),
            panel_v1,
            Panel("Cambio de velocidad", dv, "divergente", -lim, lim, "m/día"),
            Panel("Cambio del frente", cat, "categorias", leyenda=leyenda),
        ],
        capa_mapa=panel_v1,
        metricas=[
            ("Velocidad máxima inicial", _velocidad_texto(np.nanmax(np.where(h0, v0, np.nan))), ""),
            ("Velocidad máxima final", _velocidad_texto(np.nanmax(np.where(h1, v1, np.nan))), ""),
            ("Retroceso del frente", _distancia_texto(retroceso * 1e3), "Sobre la línea de flujo central"),
            ("Hielo perdido", f"{_fmt(_km2((cat == 2).sum(), e.pixel_m), 2)} km²", ""),
        ],
        series=[Serie("Velocidad superficial", "m/día", serie_vel),
                Serie("Posición del frente (respecto a la 1.ª fecha)", "km", serie_frente)],
        notas=["La velocidad sale de correlacionar parches de imagen entre dos fechas (12 días): "
               "desplazamiento / Δt. El perfil transversal sigue la ley de Glen (n = 3): u ∝ 1 − |y/W|⁴."],
        flechas=pd.DataFrame(filas),
    )


def _analizar_agricultura(e: Escena, i0: int, i1: int) -> Analisis:
    ids = e.info["ids"]
    nf = e.info["n_parcelas"]
    validos = ids >= 0
    conteo = np.bincount(ids[validos], minlength=nf).astype(float)
    hv = e.cubos["HV"]
    medias = np.stack([a_db(np.bincount(ids[validos], weights=de_db(hv[k][validos]), minlength=nf)
                            / np.maximum(conteo, 1)) for k in range(len(e.fechas))])
    lr = medias[i1] - medias[i0]
    pasos = np.diff(medias[i0:i1 + 1], axis=0) if i1 > i0 else np.zeros((1, nf))
    k_min = np.argmin(pasos, axis=0)
    caida = pasos[k_min, np.arange(nf)]
    nivel_despues = medias[i0 + 1 + k_min, np.arange(nf)] if i1 > i0 else medias[i0]
    inundacion = (caida < -3.0) & (nivel_despues < -32.0)
    cosecha = (caida < -3.0) & ~inundacion
    crecimiento = ~cosecha & ~inundacion & (lr > 3.0)
    cat_parcela = np.ones(nf, np.int8)
    cat_parcela[crecimiento] = 2
    cat_parcela[cosecha] = 3
    cat_parcela[inundacion] = 4
    cat = np.where(validos, cat_parcela[np.clip(ids, 0, None)], 0).astype(np.int8)
    leyenda = [("Sin cambio", NEUTRO), ("Crecimiento del cultivo", AZUL), ("Cosecha / labranza", NARANJA),
               ("Inundación (trasplante de arroz)", AGUA)]
    f0, f1 = pd.Timestamp(e.fechas[i0]), pd.Timestamp(e.fechas[i1])
    evento = pd.Timestamp(e.sitio["fecha_evento"])
    filas, errores = [], []
    for j, fila in e.info["parcelas"].iterrows():
        reales = [(c, evento + pd.Timedelta(days=int(d))) for c, d in fila["cosechas"]]
        en_intervalo = [(c, f) for c, f in reales if f0 < f <= f1]
        estimada = None
        if cosecha[j]:
            k = i0 + int(k_min[j])
            estimada = pd.Timestamp(e.fechas[k]) + (pd.Timestamp(e.fechas[k + 1]) - pd.Timestamp(e.fechas[k])) / 2
            if en_intervalo:
                errores.append(abs((estimada - en_intervalo[0][1]).days))
        filas.append({
            "Parcela": j, "Rotación": fila["rotacion"], "Δσ⁰ HV (dB)": round(float(lr[j]), 2),
            "Cambio detectado": leyenda[cat_parcela[j] - 1][0],
            "Cosecha estimada": estimada.date() if estimada is not None else None,
            "Cosecha real": en_intervalo[0][1].date() if en_intervalo else None,
            "Cultivo cosechado": en_intervalo[0][0] if en_intervalo else "",
        })
    tabla = pd.DataFrame(filas)
    real = tabla["Cosecha real"].notna().to_numpy()
    exactitud = float((real == cosecha).mean()) * 100
    rot = e.info["parcelas"]["rotacion"].to_numpy()
    series_vals = {}
    for nombre in pd.unique(rot)[:3]:
        sel = rot == nombre
        series_vals[nombre] = a_db(de_db(medias[:, sel]).mean(axis=1))
    panel_cat = Panel("Cambio por parcela", cat, "categorias", leyenda=leyenda)
    return Analisis(
        paneles=[
            Panel(f"σ⁰ HV · {e.fechas[i0]:%d/%m/%Y}", hv[i0], "gris", -30, -12, "dB"),
            Panel(f"σ⁰ HV · {e.fechas[i1]:%d/%m/%Y}", hv[i1], "gris", -30, -12, "dB"),
            panel_cat,
        ],
        capa_mapa=panel_cat,
        metricas=[
            ("Parcelas analizadas", str(nf), ""),
            ("Cosechas detectadas", str(int(cosecha.sum())), "Caída de HV > 3 dB hasta nivel de suelo"),
            ("Exactitud de detección", f"{_fmt(exactitud)} %", "Cosechada / no cosechada vs. verdad"),
            ("Error medio de fecha", f"{_fmt(np.mean(errores), 0)} días" if errores else "—",
             "Limitado por la revisita de 12 días"),
        ],
        series=[Serie("σ⁰ HV medio por rotación", "dB", _serie(e.fechas, series_vals))],
        tabla=tabla,
        notas=["Un cultivo en crecimiento aumenta la dispersión de volumen (HV sube hasta ~10 dB); la "
               "cosecha devuelve la parcela al nivel de suelo desnudo. La inundación para trasplantar "
               "arroz produce reflexión especular, con HV por debajo de −32 dB."],
    )


ANALIZADORES = {
    "humedales": _analizar_humedales,
    "incendios": _analizar_incendios,
    "terremotos": _analizar_terremotos,
    "subsidencia": _analizar_subsidencia,
    "glaciares": _analizar_glaciares,
    "agricultura": _analizar_agricultura,
}


def analizar(escena: Escena, i0: int, i1: int) -> Analisis:
    """Detecta cambios entre las adquisiciones i0 (antes) e i1 (después)."""
    if not 0 <= i0 < i1 < len(escena.fechas):
        raise ValueError("La fecha 'después' debe ser posterior a la fecha 'antes'.")
    resultado = ANALIZADORES[escena.tipo](escena, i0, i1)
    resultado.limites = escena.limites()
    resultado.pixel_m = escena.pixel_m
    return resultado


# ---------------------------------------------------------------------------
# 5. Datos reales: catálogo ASF y archivos HDF5
# ---------------------------------------------------------------------------

URL_ASF = "https://api.daac.asf.alaska.edu/services/search/param"
PRODUCTOS_ASF = ("GCOV", "GUNW", "GOFF", "GSLC")
_RE_FECHA = re.compile(r"(\d{8}T\d{6})")


def buscar_nisar_asf(lat: float, lon: float, producto: str, inicio: date, fin: date,
                     max_resultados: int = 60, timeout: float = 40.0, area_wkt: str | None = None) -> pd.DataFrame:
    """Busca productos NISAR reales que cubran un punto, o el área WKT si se indica (ASF SearchAPI;
    no requiere credenciales)."""
    import requests

    if producto not in PRODUCTOS_ASF:
        raise ValueError(f"Producto no válido: {producto}")
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("Coordenadas fuera de rango.")
    if fin < inicio:
        raise ValueError("La fecha final es anterior a la inicial.")
    params = {
        "dataset": "NISAR",
        "processingLevel": producto,
        "intersectsWith": area_wkt or f"POINT({lon:.5f} {lat:.5f})",
        "start": f"{inicio.isoformat()}T00:00:00Z",
        "end": f"{fin.isoformat()}T23:59:59Z",
        "maxResults": int(max(1, min(max_resultados, 500))),
        "output": "geojson",
    }
    respuesta = requests.get(URL_ASF, params=params, timeout=timeout)
    respuesta.raise_for_status()
    filas = []
    for f in respuesta.json().get("features", []):
        p = f.get("properties", {}) or {}
        nombre = p.get("sceneName") or p.get("fileID") or ""
        browse = p.get("browse") or []
        miniatura = next((b for b in browse if b.endswith("_LATLON_thumbnail.png")), browse[0] if browse else None)
        tamano = p.get("bytes")
        tamano_gb = sum(v.get("bytes", 0) for v in tamano.values()) / 1e9 if isinstance(tamano, dict) else None
        fechas_nombre = _RE_FECHA.findall(nombre)
        secundaria = None
        if producto in ("GUNW", "GOFF") and len(fechas_nombre) >= 4:
            secundaria = datetime.strptime(fechas_nombre[2], "%Y%m%dT%H%M%S")
        coleccion = p.get("collectionName") or ""
        filas.append({
            "fecha": pd.to_datetime(p.get("startTime"), utc=True).tz_convert(None),
            "fecha_secundaria": secundaria,
            "producto": p.get("processingLevel", producto),
            "direccion": "Ascendente" if p.get("flightDirection") == "ASCENDING" else "Descendente",
            "track": p.get("pathNumber"),
            "frame": p.get("frameNumber"),
            "polarizaciones": ", ".join(p.get("mainBandPolarization") or []),
            "madurez": "PROVISIONAL" if "PROVISIONAL" in coleccion else ("BETA" if "BETA" in coleccion else coleccion),
            "tamano_gb": round(tamano_gb, 2) if tamano_gb else None,
            "escena": nombre,
            "url": p.get("url"),
            "miniatura": miniatura,
            "huella": (f.get("geometry") or {}).get("coordinates"),
        })
    df = pd.DataFrame(filas)
    if df.empty:
        return df
    df["fecha_secundaria"] = pd.to_datetime(df["fecha_secundaria"])
    return df.drop_duplicates("escena").sort_values("fecha", ascending=False).reset_index(drop=True)


def listar_productos_locales(carpeta: Path = CARPETA_H5) -> list[Path]:
    if not carpeta.is_dir():
        return []
    return sorted(carpeta.glob("NISAR_*.h5"))


def fecha_de_nombre(nombre: str) -> datetime | None:
    m = _RE_FECHA.search(nombre)
    return datetime.strptime(m.group(1), "%Y%m%dT%H%M%S") if m else None


def _buscar_datasets(h5, nombre: str) -> list[str]:
    import h5py

    encontrados = []

    def visitar(ruta, obj):
        if isinstance(obj, h5py.Dataset) and ruta.rsplit("/", 1)[-1] == nombre:
            encontrados.append(ruta)

    h5.visititems(visitar)
    return encontrados


def _coordenadas(h5, grupo: str, paso: int):
    partes = grupo.split("/")
    for k in range(len(partes), 0, -1):
        g = "/".join(partes[:k])
        if f"{g}/xCoordinates" in h5 and f"{g}/yCoordinates" in h5:
            x = h5[f"{g}/xCoordinates"][::paso]
            y = h5[f"{g}/yCoordinates"][::paso]
            epsg = int(np.asarray(h5[f"{g}/projection"][()]).ravel()[0]) if f"{g}/projection" in h5 else None
            return np.asarray(x, float), np.asarray(y, float), epsg
    raise ValueError("No se encontraron xCoordinates / yCoordinates en el producto.")


def _limpiar(datos, ds):
    datos = np.asarray(datos, dtype=np.float32)
    relleno = ds.attrs.get("_FillValue")
    if relleno is not None:
        datos[datos == np.float32(np.asarray(relleno).ravel()[0])] = np.nan
    datos[~np.isfinite(datos)] = np.nan
    return datos


def leer_gcov(ruta: Path, polarizacion: str = "HVHV", paso: int = 8) -> dict:
    """Lee un término de covarianza (potencia lineal) de un GCOV NISAR, submuestreado con 'paso'."""
    import h5py

    with h5py.File(ruta, "r") as f:
        base = "science/LSAR/GCOV/grids/frequencyA"
        if base not in f:
            raise ValueError(f"{Path(ruta).name} no es un producto GCOV de NISAR.")
        if polarizacion not in f[base]:
            disponibles = [k for k in f[base] if len(k) == 4 and k.isupper()]
            raise ValueError(f"Polarización {polarizacion} no disponible. Hay: {', '.join(disponibles)}")
        ds = f[f"{base}/{polarizacion}"]
        datos = _limpiar(ds[::paso, ::paso], ds)
        datos[datos <= 0] = np.nan
        x, y, epsg = _coordenadas(f, f"{base}/{polarizacion}", paso)
    return {"datos": datos, "x": x, "y": y, "epsg": epsg, "fecha": fecha_de_nombre(Path(ruta).name)}


def leer_gunw(ruta: Path, paso: int = 2) -> dict:
    """Lee la fase desenrollada y la coherencia de un GUNW NISAR y las convierte a desplazamiento LOS."""
    import h5py

    with h5py.File(ruta, "r") as f:
        candidatos = [r for r in _buscar_datasets(f, "unwrappedPhase") if "frequencyA" in r]
        if not candidatos:
            raise ValueError(f"{Path(ruta).name} no contiene 'unwrappedPhase' en frequencyA (¿es un GUNW?).")
        ruta_fase = sorted(candidatos, key=lambda r: ("/HH/" not in r and "/VV/" not in r, r))[0]
        grupo = ruta_fase.rsplit("/", 1)[0]
        fase = _limpiar(f[ruta_fase][::paso, ::paso], f[ruta_fase])
        coh = None
        if f"{grupo}/coherenceMagnitude" in f:
            coh = _limpiar(f[f"{grupo}/coherenceMagnitude"][::paso, ::paso], f[f"{grupo}/coherenceMagnitude"])
        x, y, epsg = _coordenadas(f, grupo, paso)
        frec = [r for r in _buscar_datasets(f, "centerFrequency") if "frequencyA" in r]
        frecuencia = float(np.asarray(f[frec[0]][()]).ravel()[0]) if frec else FRECUENCIA_L_HZ
    lam = C_LUZ / frecuencia
    fechas = [datetime.strptime(s, "%Y%m%dT%H%M%S") for s in _RE_FECHA.findall(Path(ruta).name)]
    return {
        "fase": fase, "coherencia": coh, "x": x, "y": y, "epsg": epsg, "lambda_m": lam,
        "desplazamiento_cm": -lam / (4 * np.pi) * fase * 100.0,
        "fecha_ref": fechas[0] if fechas else None,
        "fecha_sec": fechas[2] if len(fechas) >= 4 else (fechas[1] if len(fechas) >= 2 else None),
    }


def _limites_geograficos(x, y, epsg):
    if epsg is None:
        return None
    from pyproj import Transformer

    tr = Transformer.from_crs(epsg, 4326, always_xy=True)
    xs = [x.min(), x.max(), x.min(), x.max()]
    ys = [y.min(), y.min(), y.max(), y.max()]
    lon, lat = tr.transform(xs, ys)
    return min(lon), min(lat), max(lon), max(lat)


def _remuestrear(b: dict, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Vecino más cercano de la rejilla de b sobre las coordenadas (x, y)."""
    dx, dy = b["x"][1] - b["x"][0], b["y"][1] - b["y"][0]
    col = np.round((x - b["x"][0]) / dx).astype(int)
    fila = np.round((y - b["y"][0]) / dy).astype(int)
    ok_c = (col >= 0) & (col < len(b["x"]))
    ok_f = (fila >= 0) & (fila < len(b["y"]))
    out = np.full((len(y), len(x)), np.nan, np.float32)
    out[np.ix_(ok_f, ok_c)] = b["datos"][np.ix_(fila[ok_f], col[ok_c])]
    return out


def analizar_par_gcov(ruta_antes: Path, ruta_despues: Path, polarizacion: str = "HVHV", paso: int = 8) -> Analisis:
    """Razón logarítmica entre dos GCOV reales del mismo track/frame."""
    a = leer_gcov(ruta_antes, polarizacion, paso)
    b = leer_gcov(ruta_despues, polarizacion, paso)
    if a["epsg"] != b["epsg"]:
        raise ValueError(f"Proyecciones distintas (EPSG {a['epsg']} y {b['epsg']}); usa el mismo track/frame.")
    b_en_a = _remuestrear(b, a["x"], a["y"])
    lin0 = promedio_movil(a["datos"], 3)
    lin1 = promedio_movil(b_en_a, 3)
    lr = a_db(lin1) - a_db(lin0)
    lr[~(np.isfinite(lin0) & np.isfinite(lin1))] = np.nan
    cat = np.zeros(lr.shape, np.int8)
    cat[lr > 3] = 1
    cat[lr < -3] = 2
    pixel_m = abs(a["x"][1] - a["x"][0])
    validos = np.isfinite(lr)
    pol = polarizacion[:2]
    leyenda = [("Aumento > 3 dB", AZUL), ("Disminución > 3 dB", NARANJA)]
    panel_cat = Panel("Cambios significativos", cat, "categorias", leyenda=leyenda)
    fa, fb = a["fecha"], b["fecha"]
    return Analisis(
        paneles=[
            Panel(f"σ⁰ {pol} · {fa:%d/%m/%Y}" if fa else f"σ⁰ {pol} · antes", a_db(a["datos"]), "gris", -30, 0, "dB"),
            Panel(f"σ⁰ {pol} · {fb:%d/%m/%Y}" if fb else f"σ⁰ {pol} · después", a_db(b_en_a), "gris", -30, 0, "dB"),
            Panel("Razón logarítmica (después/antes)", lr, "divergente", -8, 8, "dB"),
            panel_cat,
        ],
        capa_mapa=panel_cat,
        metricas=[
            ("Intervalo", f"{(fb - fa).days} días" if fa and fb else "—", ""),
            ("Aumento > 3 dB", f"{_fmt(_km2((cat == 1).sum(), pixel_m))} km²", ""),
            ("Disminución > 3 dB", f"{_fmt(_km2((cat == 2).sum(), pixel_m))} km²", ""),
            ("Píxeles válidos", f"{_fmt(validos.mean() * 100)} %", f"Resolución analizada ≈ {pixel_m:.0f} m"),
        ],
        series=[],
        notas=[f"Productos reales: {Path(ruta_antes).name} y {Path(ruta_despues).name}."],
        limites=_limites_geograficos(a["x"], a["y"], a["epsg"]),
        pixel_m=pixel_m,
    )


def analizar_gunw(ruta: Path, paso: int = 2, invertir_signo: bool = False) -> Analisis:
    """Mapa de desplazamiento LOS a partir de un GUNW real."""
    g = leer_gunw(ruta, paso)
    d = g["desplazamiento_cm"] * (-1 if invertir_signo else 1)
    d = d - np.nanmedian(d)
    coh = g["coherencia"]
    if coh is not None and coh.shape == d.shape:
        d = np.where(coh >= 0.3, d, np.nan)
    lim = _rango_simetrico(d, minimo=1.0)
    lam_cm = g["lambda_m"] * 100
    envuelta = np.angle(np.exp(1j * g["fase"]))
    pixel_m = abs(g["x"][1] - g["x"][0])
    panel_d = Panel("Desplazamiento LOS", d, "divergente", -lim, lim, "cm")
    paneles = [Panel(f"Fase re-envuelta (1 ciclo = {lam_cm / 2:.1f} cm)", envuelta, "ciclico", -np.pi, np.pi, "rad"),
               panel_d]
    if coh is not None:
        paneles.append(Panel("Coherencia", coh, "secuencial", 0, 1, "γ"))
    fr, fs = g["fecha_ref"], g["fecha_sec"]
    return Analisis(
        paneles=paneles,
        capa_mapa=panel_d,
        metricas=[
            ("Par interferométrico", f"{fr:%d/%m/%Y} → {fs:%d/%m/%Y}" if fr and fs else "—", ""),
            ("Máx. hacia el satélite", f"{_fmt(np.nanmax(d))} cm", "Relativo a la mediana de la escena"),
            ("Máx. alejándose", f"{_fmt(np.nanmin(d))} cm", ""),
            ("Píxeles coherentes", f"{_fmt(np.isfinite(d).mean() * 100)} %", f"γ ≥ 0,3; resolución ≈ {pixel_m:.0f} m"),
        ],
        series=[],
        notas=["d_LOS = −λ/(4π)·φ (positivo = acercamiento al satélite). Comprueba la convención de signo "
               "con la especificación del producto GUNW (JPL D-102272) y usa la opción de invertir si difiere."],
        limites=_limites_geograficos(g["x"], g["y"], g["epsg"]),
        pixel_m=pixel_m,
    )


# ---------------------------------------------------------------------------
# 6. Medición interactiva: punto seleccionado y cuadrante
# ---------------------------------------------------------------------------

SERIE_SELECCION = {
    "humedales": ("HH", "σ⁰ HH", "dB"),
    "incendios": ("HV", "σ⁰ HV", "dB"),
    "agricultura": ("HV", "σ⁰ HV", "dB"),
    "terremotos": ("LOS", "Desplazamiento LOS acumulado", "cm"),
    "subsidencia": ("LOS", "Desplazamiento vertical acumulado", "cm"),
    "glaciares": ("VEL", "Velocidad superficial", "m/día"),
}


def cuadrante_a_pixeles(forma, cuadrante):
    """Índices (fila0, fila1, col0, col1) de un cuadrante dado en fracciones de la imagen (x0, y0, x1, y1)."""
    ny, nx = forma
    x0, y0, x1, y1 = cuadrante
    x0, x1 = sorted((x0 * nx, x1 * nx))
    y0, y1 = sorted((y0 * ny, y1 * ny))
    # Cada borde se ajusta al límite de píxel más cercano; como mínimo se mide un píxel.
    c0 = int(np.clip(round(x0), 0, nx - 1))
    c1 = int(np.clip(max(round(x1), c0 + 1), 1, nx))
    f0 = int(np.clip(round(y0), 0, ny - 1))
    f1 = int(np.clip(max(round(y1), f0 + 1), 1, ny))
    return f0, f1, c0, c1


def punto_a_pixel(forma, punto):
    """(fila, col) del píxel bajo un punto dado en fracciones de la imagen (x, y)."""
    ny, nx = forma
    x, y = punto
    return min(max(int(y * ny), 0), ny - 1), min(max(int(x * nx), 0), nx - 1)


def coordenadas_punto(limites, punto):
    """Latitud y longitud de un punto dado en fracciones de la imagen."""
    o, s, e, n = limites
    return n - punto[1] * (n - s), o + punto[0] * (e - o)


def _media_db(v):
    return float(a_db(de_db(v).mean()))


def medir_cuadrante(analisis: Analisis, pixeles) -> tuple[list, pd.DataFrame]:
    """Métricas del cuadrante para cada capa del análisis: áreas por categoría o media/mín./máx."""
    f0, f1, c0, c1 = pixeles
    km2_pix = analisis.pixel_m**2 / 1e6
    n_pix = (f1 - f0) * (c1 - c0)
    area = n_pix * km2_pix
    filas = []
    metricas = [("Área del cuadrante", f"{_fmt(area, 2)} km²", f"{f1 - f0} × {c1 - c0} píxeles de {analisis.pixel_m:.0f} m")]
    for p in analisis.paneles:
        recorte = np.asarray(p.datos)[f0:f1, c0:c1]
        if p.paleta == "categorias":
            for codigo, (etiqueta, _) in enumerate(p.leyenda, start=1):
                km2 = float((recorte == codigo).sum()) * km2_pix
                filas.append({"Capa": p.titulo, "Medida": etiqueta, "Valor": f"{_fmt(km2, 2)} km²",
                              "% del cuadrante": round(km2 / area * 100, 1)})
                if p is analisis.capa_mapa:
                    metricas.append((etiqueta, f"{_fmt(km2, 2)} km²", f"{_fmt(km2 / area * 100)} % del cuadrante"))
            continue
        if p.paleta == "ciclico":
            continue
        v = recorte[np.isfinite(recorte)].astype(float)
        if v.size == 0:
            continue
        if p.paleta == "gris":
            filas.append({"Capa": p.titulo, "Medida": "Media", "Valor": f"{_fmt(_media_db(v), 2)} {p.unidad}",
                          "% del cuadrante": None})
            continue
        for medida, valor in (("Media", v.mean()), ("Mínimo", v.min()), ("Máximo", v.max())):
            filas.append({"Capa": p.titulo, "Medida": medida, "Valor": f"{_fmt(valor, 2)} {p.unidad}",
                          "% del cuadrante": None})
            if p is analisis.capa_mapa:
                metricas.append((f"{medida} · {p.titulo}", f"{_fmt(valor, 2)} {p.unidad}", ""))
    return metricas, pd.DataFrame(filas)


def valores_en_punto(analisis: Analisis, pixel) -> pd.DataFrame:
    """Valor de cada capa del análisis en el píxel seleccionado."""
    f, c = pixel
    filas = []
    for p in analisis.paneles:
        v = np.asarray(p.datos)[f, c]
        if p.paleta == "categorias":
            texto = p.leyenda[int(v) - 1][0] if 1 <= int(v) <= len(p.leyenda) else "Sin cambio detectado"
        elif np.isfinite(v):
            texto = f"{_fmt(float(v), 2)} {p.unidad}"
        else:
            texto = "Sin dato (enmascarado)"
        filas.append({"Capa": p.titulo, "Valor": texto})
    return pd.DataFrame(filas)


def _serie_pixeles(escena: Escena, f0: int, f1: int, c0: int, c1: int) -> np.ndarray:
    clave = SERIE_SELECCION[escena.tipo][0]
    datos = escena.cubos[clave][:, f0:f1, c0:c1].reshape(len(escena.fechas), -1).astype(float)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)  # píxeles sin dato (agua, mar) en toda la ventana
        if clave in ("HH", "HV"):
            return a_db(np.nanmean(de_db(datos), axis=1))
        valores = np.nanmean(datos, axis=1)
    if clave == "LOS":
        valores = valores - valores[0]
        if escena.tipo == "subsidencia":
            valores = valores / escena.info["lu"]
    return valores


def serie_seleccion(escena: Escena, rect_px=None, punto_px=None) -> Serie | None:
    """Evolución temporal del observable principal en el punto (ventana 3×3) y en el cuadrante."""
    _, titulo, unidad = SERIE_SELECCION[escena.tipo]
    valores = {}
    if punto_px is not None:
        f, c = punto_px
        valores["Punto seleccionado (3×3 px)"] = _serie_pixeles(escena, max(f - 1, 0), f + 2, max(c - 1, 0), c + 2)
    if rect_px is not None:
        valores["Media del cuadrante"] = _serie_pixeles(escena, *rect_px)
    if not valores:
        return None
    return Serie(f"{titulo} en la selección", unidad, _serie(escena.fechas, valores))
