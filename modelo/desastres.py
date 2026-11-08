r"""
Modo Dios: simulador de desastres naturales sobre el territorio real de Ecuador.

El usuario elige un lugar, el módulo construye un «mundo» (relieve real, cobertura, población y
estado hídrico de la temporada) y sobre él desata desastres con modelos publicados en la literatura.
Cada desastre devuelve una animación (cuadros), sus efectos (área, población expuesta, víctimas
cuando existe una función de mortalidad publicada, pérdidas) y la observación que haría NISAR en
su siguiente pasada, con los mismos detectores que usa el resto de la aplicación.

Contenido
---------
1. Mundo: DEM SRTM (teselas Terrarium de AWS), cobertura del suelo, población y red de drenaje.
2. Hidráulica: aguas someras con la formulación inercial local de Bates et al. (2010), escorrentía
   con el número de curva del SCS (USDA, 1986) y condición de humedad antecedente (Chow et al., 1988).
3. Incendios: autómata celular de Alexandridis et al. (2008) con amortiguamiento por humedad del
   combustible de Rothermel (1972).
4. Terremotos: escalas de ruptura de Wells y Coppersmith (1994), deformación de Okada (1985),
   intensidad de Allen, Wald y Worden (2012), aceleración con Worden et al. (2012) y mortalidad
   empírica de PAGER (Jaiswal y Wald, 2010).
5. Deslizamientos: talud infinito pseudoestático con humedad estacionaria de SHALSTAB
   (Montgomery y Dietrich, 1994) y alcance del flujo de detritos con LAHARZ (Griswold e Iverson, 2008).
6. Volcanes: lahares con LAHARZ (Iverson et al., 1998), corrientes de densidad piroclástica con el
   cono de energía (Malin y Sheridan, 1982), altura de columna de Mastin et al. (2009) y caída de
   ceniza con un modelo de advección–difusión tipo Suzuki (1983) / TEPHRA2 (Bonadonna et al., 2005).
7. Efectos: mortalidad por inundación de Jonkman et al. (2008) y daño por calado de Huizinga et al.
   (2017, JRC) para Sudamérica.
8. Observación NISAR simulada (speckle, atmósfera, decorrelación) y detección automática.

Los supuestos propios del juego (escalas de tiempo, población rural sintética, letalidad) se
declaran en las notas de cada evento. Pruebas: «python -m unittest modelo.desastres».
"""

from __future__ import annotations

import heapq
import io
import math
import unittest
from dataclasses import dataclass, field
from datetime import date

import numpy as np
import pandas as pd

from . import estaciones, nisar

G = 9.81                     # gravedad (m/s²)
DIR_TERRENO = nisar.PROYECTO_DIR / "data" / "terreno"   # caché de teselas del DEM
URL_TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
VECINOS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]   # orden fijo (D8)
PERSONAS_POR_VIVIENDA = 3.4  # tamaño medio del hogar en Ecuador (orden de magnitud del censo 2022)


# ---------------------------------------------------------------------------
# 1. Mundo: relieve, cobertura y población
# ---------------------------------------------------------------------------

AGUA, GLACIAR, PARAMO, BOSQUE_ANDINO, BOSQUE_HUMEDO, BOSQUE_SECO, CULTIVO, URBANO = range(8)

# Propiedades por cobertura:
#   biomasa aérea (Mg/ha), p_veg de Alexandridis et al. (2008) (cultivos −0,3; matorral 0; bosque 0,4),
#   humedad de extinción del combustible (Anderson, 1982: pastos 12–15 %, matorral 20–25 %, hojarasca 25–30 %),
#   número de curva SCS para suelo hidrológico B (TR-55) y rugosidad de Manning n (s/m^⅓).
COBERTURAS = {
    AGUA:          dict(nombre="Agua", biomasa=0.0, p_veg=None, m_ext=None, cn=100, manning=0.03, consumo=0.0),
    GLACIAR:       dict(nombre="Glaciar y nieve", biomasa=0.0, p_veg=None, m_ext=None, cn=98, manning=0.02, consumo=0.0),
    PARAMO:        dict(nombre="Páramo", biomasa=12.0, p_veg=0.0, m_ext=0.15, cn=69, manning=0.04, consumo=0.9),
    BOSQUE_ANDINO: dict(nombre="Bosque andino", biomasa=140.0, p_veg=0.4, m_ext=0.25, cn=55, manning=0.10, consumo=0.5),
    BOSQUE_HUMEDO: dict(nombre="Bosque tropical húmedo", biomasa=250.0, p_veg=0.4, m_ext=0.25, cn=55, manning=0.10,
                        consumo=0.4),
    BOSQUE_SECO:   dict(nombre="Bosque seco y matorral", biomasa=60.0, p_veg=0.0, m_ext=0.20, cn=60, manning=0.06,
                        consumo=0.7),
    CULTIVO:       dict(nombre="Cultivos y pastos", biomasa=8.0, p_veg=-0.3, m_ext=0.15, cn=78, manning=0.035, consumo=0.9),
    URBANO:        dict(nombre="Zona urbana", biomasa=5.0, p_veg=-0.8, m_ext=0.15, cn=85, manning=0.05, consumo=0.2),
}
# Densidad rural sintética por cobertura (hab/km²); se reduce a la mitad en la Amazonía.
DENSIDAD_RURAL = {AGUA: 0, GLACIAR: 0, PARAMO: 3, BOSQUE_ANDINO: 10, BOSQUE_HUMEDO: 5, BOSQUE_SECO: 15,
                  CULTIVO: 60, URBANO: 0}
# Humedad extra del combustible en bosques densos y sombreados respecto del promedio del suelo.
HUMEDAD_EXTRA = {BOSQUE_HUMEDO: 0.10, BOSQUE_ANDINO: 0.05}

# Centros urbanos (población aproximada del área urbana, orden de magnitud del censo INEC 2022).
CIUDADES = [
    ("Guayaquil", -2.1894, -79.8891, 2_400_000), ("Quito", -0.1807, -78.4678, 1_800_000),
    ("Cuenca", -2.9001, -79.0059, 450_000), ("Santo Domingo", -0.2530, -79.1754, 330_000),
    ("Durán", -2.1700, -79.8380, 300_000), ("Machala", -3.2581, -79.9554, 260_000),
    ("Manta", -0.9677, -80.7089, 250_000), ("Portoviejo", -1.0546, -80.4545, 210_000),
    ("Ambato", -1.2491, -78.6168, 190_000), ("Riobamba", -1.6636, -78.6546, 180_000),
    ("Loja", -3.9931, -79.2042, 180_000), ("Esmeraldas", 0.9682, -79.6517, 160_000),
    ("Ibarra", 0.3517, -78.1223, 150_000), ("Quevedo", -1.0225, -79.4604, 150_000),
    ("Milagro", -2.1347, -79.5872, 140_000), ("La Libertad", -2.2333, -80.9000, 110_000),
    ("Latacunga", -0.9352, -78.6155, 100_000), ("Babahoyo", -1.8022, -79.5344, 100_000),
    ("Sangolquí", -0.3126, -78.4475, 90_000), ("Tulcán", 0.8117, -77.7173, 65_000),
    ("Nueva Loja", 0.0847, -76.8828, 60_000), ("Chone", -0.6984, -80.0936, 55_000),
    ("Otavalo", 0.2340, -78.2610, 45_000), ("Puyo", -1.4924, -77.9989, 40_000),
    ("Azogues", -2.7397, -78.8486, 40_000), ("Tena", -0.9938, -77.8129, 35_000),
    ("Guaranda", -1.5926, -79.0010, 35_000), ("Pedernales", 0.0717, -80.0517, 30_000),
    ("Machachi", -0.5100, -78.5670, 30_000), ("Bahía de Caráquez", -0.6000, -80.4240, 25_000),
    ("Macas", -2.3087, -78.1114, 25_000), ("Salcedo", -1.0450, -78.5900, 20_000),
    ("Baños", -1.3964, -78.4247, 15_000), ("Zamora", -4.0692, -78.9567, 15_000),
    ("Puerto Ayora", -0.7433, -90.3126, 15_000), ("Pelileo", -1.3300, -78.5430, 15_000),
]

VOLCANES = [  # volcanes activos o potencialmente activos (cumbre)
    ("Cotopaxi", -0.6838, -78.4378), ("Tungurahua", -1.4670, -78.4420), ("Sangay", -2.0050, -78.3410),
    ("Reventador", -0.0775, -77.6560), ("Guagua Pichincha", -0.1710, -78.5980), ("Cayambe", 0.0290, -77.9860),
    ("Chimborazo", -1.4693, -78.8175), ("Antisana", -0.4810, -78.1410), ("Sierra Negra (Galápagos)", -0.8300, -91.1700),
]

# Escenarios de partida: (lat, lon, lado en km, herramienta sugerida, descripción)
ESCENARIOS = {
    "Cotopaxi y el valle de Latacunga": (-0.80, -78.52, 60.0, "erupcion",
        "Volcán más vigilado del país; en 1877 sus lahares bajaron por los ríos Cutuchi y Pita."),
    "Tungurahua y Baños": (-1.43, -78.47, 30.0, "erupcion",
        "Activo entre 1999 y 2016; Baños está a 8 km del cráter."),
    "Pedernales y la costa de Manabí": (-0.10, -80.20, 120.0, "terremoto",
        "Zona de subducción del sismo de 2016 (Mw 7,8); el mar al oeste permite tsunamis."),
    "Quito y el Guagua Pichincha": (-0.20, -78.52, 40.0, "terremoto",
        "Capital sobre el sistema de fallas inversas de Quito, a los pies de un volcán activo."),
    "Bosques secos de Loja": (-4.05, -79.25, 30.0, "incendio",
        "Bosque andino y matorral seco con incendios recurrentes entre agosto y octubre."),
    "Cuenca baja del Guayas (Babahoyo)": (-1.85, -79.60, 60.0, "tormenta",
        "Llanura de inundación que se anega en casi todos los inviernos."),
    "Guayaquil y el estuario": (-2.20, -79.90, 40.0, "inundacion",
        "Ciudad baja sobre el estuario: sensible a marejadas y desbordes."),
    "Galápagos: Santa Cruz": (-0.65, -90.35, 40.0, "incendio",
        "Isla volcánica con zonas áridas y húmedas; el mar rodea todo el mundo."),
}


@dataclass
class Mundo:
    """Malla cuadrada (fila 0 = norte) centrada en (lat, lon) con todo lo que necesitan los modelos."""
    lat: float
    lon: float
    extension_km: float
    n: int
    pixel_m: float
    z: np.ndarray            # elevación (m); el mar tiene batimetría negativa si el DEM es real
    mar: np.ndarray          # bool
    cobertura: np.ndarray    # código de COBERTURAS
    biomasa: np.ndarray      # Mg/ha
    poblacion: np.ndarray    # habitantes por celda
    pendiente: np.ndarray    # grados
    z_relleno: np.ndarray    # DEM sin depresiones (priority-flood)
    destino: np.ndarray      # índice plano de la celda aguas abajo (D8), −1 en salidas
    acumulacion: np.ndarray  # celdas que drenan a cada celda (incluida ella)
    humedad_suelo: float     # fracción del agua útil en la fecha (balance de Thornthwaite–Mather)
    prec_anual_mm: float
    fecha: date
    fuente_dem: str
    region: str
    ciudades: list = field(default_factory=list)   # [(nombre, fila, columna, habitantes)]

    def limites(self) -> tuple[float, float, float, float]:
        """(oeste, sur, este, norte) en grados."""
        mitad = self.extension_km * 500.0
        dlat = mitad / 111_320.0
        dlon = mitad / (111_320.0 * max(math.cos(math.radians(self.lat)), 0.05))
        return self.lon - dlon, self.lat - dlat, self.lon + dlon, self.lat + dlat

    def latlon(self, i: float, j: float) -> tuple[float, float]:
        """Coordenadas del centro de la celda (i, j)."""
        o, s, e, n_ = self.limites()
        return n_ - (i + 0.5) / self.n * (n_ - s), o + (j + 0.5) / self.n * (e - o)

    def celda(self, lat: float, lon: float) -> tuple[int, int] | None:
        o, s, e, n_ = self.limites()
        i, j = int((n_ - lat) / (n_ - s) * self.n), int((lon - o) / (e - o) * self.n)
        return (i, j) if 0 <= i < self.n and 0 <= j < self.n else None

    def malla_m(self, i0: float, j0: float):
        """Coordenadas este (X) y norte (Y) en metros relativas a la celda (i0, j0)."""
        idx = np.arange(self.n)
        X, Y = np.meshgrid((idx - j0) * self.pixel_m, (i0 - idx) * self.pixel_m)
        return X, Y

    @property
    def area_celda_km2(self) -> float:
        return self.pixel_m ** 2 / 1e6


def _malla_geografica(lat: float, lon: float, extension_km: float, n: int, sub: int = 1):
    """Latitudes y longitudes de los centros (o subceldas) de la malla."""
    mitad = extension_km * 500.0
    pix = 2 * mitad / n
    k = (np.arange(n * sub) + 0.5) * pix / sub - mitad
    lat_f = lat - k / 111_320.0                       # filas hacia el sur
    lon_c = lon + k / (111_320.0 * max(math.cos(math.radians(lat)), 0.05))
    return np.meshgrid(lon_c, lat_f)


def _tesela_terrarium(z: int, x: int, y: int) -> np.ndarray | None:
    """Elevación (m) de una tesela Terrarium (SRTM/GMTED/ETOPO) con caché en disco."""
    ruta = DIR_TERRENO / f"{z}_{x}_{y}.png"
    contenido = None
    if ruta.is_file():
        contenido = ruta.read_bytes()
    else:
        import requests  # solo se necesita al descargar

        r = requests.get(URL_TERRARIUM.format(z=z, x=x, y=y), timeout=15)
        r.raise_for_status()
        contenido = r.content
        try:
            DIR_TERRENO.mkdir(parents=True, exist_ok=True)
            ruta.write_bytes(contenido)
        except OSError:
            pass  # sin permiso de escritura: se usa sin caché
    from PIL import Image

    a = np.asarray(Image.open(io.BytesIO(contenido)).convert("RGB")).astype(float)
    return a[..., 0] * 256.0 + a[..., 1] + a[..., 2] / 256.0 - 32768.0


def dem_real(lat: float, lon: float, extension_km: float, n: int) -> np.ndarray | None:
    """DEM de la malla a partir de las teselas Terrarium (promedio de 2×2 submuestras); None si falla."""
    pix = extension_km * 1000.0 / n
    tam_eq = 156_543.03 * math.cos(math.radians(lat))       # m/píxel en el zoom 0
    zoom = int(np.clip(math.ceil(math.log2(tam_eq / (pix / 2.0))), 5, 12))
    LON, LAT = _malla_geografica(lat, lon, extension_km, n, sub=2)
    escala = 2 ** zoom
    px = (LON + 180.0) / 360.0 * escala * 256.0
    lat_r = np.radians(np.clip(LAT, -85, 85))
    py = (1 - np.log(np.tan(lat_r) + 1 / np.cos(lat_r)) / math.pi) / 2 * escala * 256.0
    tx0, tx1 = int(px.min() // 256), int(px.max() // 256)
    ty0, ty1 = int(py.min() // 256), int(py.max() // 256)
    if (tx1 - tx0 + 1) * (ty1 - ty0 + 1) > 36:
        return None
    try:
        mosaico = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256))
        for ty in range(ty0, ty1 + 1):
            for tx in range(tx0, tx1 + 1):
                mosaico[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = \
                    _tesela_terrarium(zoom, tx, ty)
    except Exception:
        return None  # sin red o servicio caído: el llamador usa terreno sintético
    fx, fy = px - tx0 * 256 - 0.5, py - ty0 * 256 - 0.5
    x0 = np.clip(np.floor(fx).astype(int), 0, mosaico.shape[1] - 2)
    y0 = np.clip(np.floor(fy).astype(int), 0, mosaico.shape[0] - 2)
    wx, wy = np.clip(fx - x0, 0, 1), np.clip(fy - y0, 0, 1)
    z = (mosaico[y0, x0] * (1 - wx) * (1 - wy) + mosaico[y0, x0 + 1] * wx * (1 - wy)
         + mosaico[y0 + 1, x0] * (1 - wx) * wy + mosaico[y0 + 1, x0 + 1] * wx * wy)
    return z.reshape(n, 2, n, 2).mean(axis=(1, 3))


def terreno_sintetico(rng: np.random.Generator, n: int, pixel_m: float, elev_media: float, region: str) -> np.ndarray:
    """Relieve fractal (espectro k^−β) con la elevación media de la celda climática y el relieve de la región."""
    relieve = {"Sierra": 900.0, "Costa": 120.0, "Amazonía": 250.0, "Insular": 300.0}.get(region, 400.0)
    campo = nisar.campo_turbulento(rng, n, beta=3.6)
    z = elev_media + relieve * campo
    return np.maximum(z, 1.0 if elev_media > 0 else z)


def _pendiente(z: np.ndarray, pix: float) -> np.ndarray:
    gy, gx = np.gradient(z, pix)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def rellenar_depresiones(z: np.ndarray, salidas: np.ndarray, epsilon: float = 1e-3) -> np.ndarray:
    """Priority-flood (Barnes et al., 2014): eleva las depresiones para que todo drene a una salida."""
    n0, n1 = z.shape
    zf = z.astype(float).copy()
    visto = salidas.copy()
    monticulo = [(zf[i, j], i, j) for i, j in zip(*np.nonzero(salidas))]
    heapq.heapify(monticulo)
    while monticulo:
        e, i, j = heapq.heappop(monticulo)
        for di, dj in VECINOS:
            a, b = i + di, j + dj
            if 0 <= a < n0 and 0 <= b < n1 and not visto[a, b]:
                visto[a, b] = True
                zf[a, b] = max(zf[a, b], e + epsilon)
                heapq.heappush(monticulo, (zf[a, b], a, b))
    return zf


def drenaje_d8(zf: np.ndarray, pix: float, salidas: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Dirección D8 (índice plano aguas abajo, −1 en salidas) y acumulación de flujo (n.º de celdas)."""
    n0, n1 = zf.shape
    pad = np.pad(zf, 1, mode="constant", constant_values=np.inf)
    mejor = np.zeros(zf.shape)
    destino = np.full(zf.shape, -1, dtype=np.int64)
    filas, cols = np.indices(zf.shape)
    for di, dj in VECINOS:
        vecino = pad[1 + di:1 + di + n0, 1 + dj:1 + dj + n1]
        caida = (zf - vecino) / (pix * math.hypot(di, dj))
        mejora = caida > mejor
        mejor = np.where(mejora, caida, mejor)
        destino = np.where(mejora, (filas + di) * n1 + (cols + dj), destino)
    destino[salidas] = -1
    acum = np.ones(zf.size)
    plano = destino.ravel()
    for k in np.argsort(-zf.ravel(), kind="stable"):
        if plano[k] >= 0:
            acum[plano[k]] += acum[k]
    return destino, acum.reshape(zf.shape)


def _densidad_ciudades(mundo_lat, mundo_lon, extension_km, n, ciudades) -> tuple[np.ndarray, list]:
    """Habitantes/km² de los centros urbanos como campanas gaussianas (densidad pico ≈ 12 000 hab/km²)."""
    LON, LAT = _malla_geografica(mundo_lat, mundo_lon, extension_km, n)
    kx = 111.32 * max(math.cos(math.radians(mundo_lat)), 0.05)
    densidad = np.zeros((n, n))
    dentro = []
    margen = extension_km / 111.32
    for nombre, la, lo, hab in ciudades:
        if abs(la - mundo_lat) > margen + 0.3 or abs(lo - mundo_lon) > margen / max(math.cos(math.radians(la)), 0.05) + 0.3:
            continue
        sigma2 = hab / (2 * math.pi * 12_000.0)                        # km²
        r2 = ((LON - lo) * kx) ** 2 + ((LAT - la) * 111.32) ** 2
        densidad += hab / (2 * math.pi * sigma2) * np.exp(-r2 / (2 * sigma2))
        fila = (mundo_lat + extension_km / 2 / 111.32 - la) / (extension_km / 111.32) * n
        col = (lo - mundo_lon + extension_km / 2 / kx) / (extension_km / kx) * n
        if 0 <= fila < n and 0 <= col < n:
            dentro.append((nombre, int(fila), int(col), hab))
    return densidad, dentro


def crear_mundo(lat: float, lon: float, extension_km: float = 40.0, n: int = 160, fecha: date | None = None,
                semilla: int = 7, usar_dem: bool = True, ciudades_extra: tuple = ()) -> Mundo:
    """Construye el mundo de juego: relieve real (o sintético), cobertura, población y drenaje.

    ciudades_extra: ((nombre, lat, lon, habitantes), ...) fundadas por el jugador.
    """
    fecha = fecha or date.today()
    rng = np.random.default_rng(semilla)
    pix = extension_km * 1000.0 / n
    region_info = estaciones.region_natural(lat, lon) or {"region": "Costa" if lon < -79.3 else "Sierra",
                                                          "provincia": "—"}
    region = region_info["region"]
    clim = estaciones.climatologia(lat, lon)
    prec_anual = float(clim.prec_mm_mes.sum()) if clim is not None else 1500.0
    forz = estaciones.forzamiento(lat, lon, fecha)
    humedad = forz.humedad_en(0.0) if forz is not None else 0.5

    z = dem_real(lat, lon, extension_km, n) if usar_dem else None
    if z is not None:
        fuente = "SRTM (teselas Terrarium, AWS Open Data)"
    else:
        elev = clim.elev_malla_m if clim is not None else 500.0
        z = terreno_sintetico(rng, n, pix, elev, region)
        fuente = "terreno sintético (sin conexión al DEM)"
    mar = z <= 0.0
    if not usar_dem or fuente.startswith("terreno"):
        mar = np.zeros_like(mar)
    pendiente = _pendiente(np.where(mar, 0.0, z), pix)

    # Cobertura: pisos altitudinales andinos + lluvia anual + mosaico agrícola en terreno llano.
    ruido = nisar.campo_suave(rng, n, 4)
    cob = np.full((n, n), BOSQUE_HUMEDO, dtype=np.int8)
    bajo_seco = prec_anual < 900
    cob[(z <= 2000) & (bajo_seco | (ruido > 1.2))] = BOSQUE_SECO
    cob[(z > 2000) & (z <= 3400)] = BOSQUE_SECO if prec_anual < 700 else BOSQUE_ANDINO
    cob[(pendiente < (12 if region == "Sierra" else 6)) & (ruido > -0.3) & (z <= 3400)] = CULTIVO
    cob[(z > 3400)] = PARAMO
    cob[(z > 4900)] = GLACIAR
    densidad_urbana, ciudades = _densidad_ciudades(lat, lon, extension_km, n, list(CIUDADES) + list(ciudades_extra))
    densidad_urbana[mar] = 0.0
    cob[densidad_urbana > 1500] = URBANO
    cob[mar] = AGUA

    rural = np.vectorize(DENSIDAD_RURAL.get)(cob).astype(float) * (0.5 if region == "Amazonía" else 1.0)
    rural *= np.exp(0.4 * nisar.campo_suave(rng, n, 3))
    poblacion = (rural + densidad_urbana) * pix ** 2 / 1e6
    poblacion[mar] = 0.0
    biomasa = np.vectorize(lambda c: COBERTURAS[c]["biomasa"])(cob).astype(float)
    biomasa *= np.clip(1 + 0.3 * nisar.campo_suave(rng, n, 6), 0.3, 1.8)

    salidas = mar.copy()
    salidas[[0, -1], :] = True
    salidas[:, [0, -1]] = True
    zf = rellenar_depresiones(np.where(mar, np.minimum(z, 0.0), z), salidas)
    destino, acum = drenaje_d8(zf, pix, salidas)
    return Mundo(lat, lon, extension_km, n, pix, z, mar, cob, biomasa, poblacion, pendiente, zf, destino, acum,
                 float(humedad), prec_anual, fecha, fuente, region, ciudades)


# ---------------------------------------------------------------------------
# Resultado de un desastre
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Capa:
    """Capa animada: los cuadros guardan un array por clave; la interfaz la colorea según su estilo."""
    clave: str
    nombre: str
    estilo: str              # fuego, agua, mmi, onda, deslizamiento, lahar, ceniza, pdc
    vmin: float = 0.0
    vmax: float = 1.0
    unidad: str = ""
    umbral: float = 0.0      # por debajo de este valor la capa es transparente
    etiquetas: tuple = ()    # nombres de las categorías (código 1..N)


@dataclass
class Evento:
    tipo: str
    titulo: str
    celda: tuple             # (fila, columna) donde actuó el jugador
    capas: list
    cuadros: list            # [{clave: array}]
    tiempos: list            # etiqueta de cada cuadro
    metricas: list           # [(etiqueta, valor, ayuda)]
    resumen: dict            # números para la bitácora
    tabla: pd.DataFrame | None = None
    notas: list = field(default_factory=list)
    modelos: list = field(default_factory=list)       # referencias de los modelos usados
    nisar_paneles: list = field(default_factory=list)  # [nisar.Panel]
    nisar_metricas: list = field(default_factory=list)


def _fmt(x: float, dec: int = 0) -> str:
    return f"{x:,.{dec}f}".replace(",", " ").replace(".", ",")


def _personas(x: float) -> str:
    return _fmt(round(x)) if x >= 1 else ("< 1" if x > 0 else "0")


def _phi(x) -> np.ndarray:
    """Función de distribución normal estándar (vectorizada con math.erf)."""
    x = np.asarray(x, float)
    return 0.5 * (1.0 + np.vectorize(math.erf)(x / math.sqrt(2.0)))


def _dilatar(mascara: np.ndarray, pasos: int = 1) -> np.ndarray:
    m = mascara.copy()
    for _ in range(pasos):
        p = np.pad(m, 1)
        m = m | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return m


def _submuestrear_cuadros(cuadros: list, tiempos: list, maximo: int = 48) -> tuple[list, list]:
    if len(cuadros) <= maximo:
        return cuadros, tiempos
    idx = np.unique(np.linspace(0, len(cuadros) - 1, maximo).round().astype(int))
    return [cuadros[k] for k in idx], [tiempos[k] for k in idx]


def _hora(segundos: float) -> str:
    m = int(round(segundos / 60.0))
    h, m = divmod(m, 60)
    d, h = divmod(h, 24)
    return f"+{d} d {h:02d} h" if d else (f"+{h} h {m:02d} min" if h else f"+{m} min")


# ---------------------------------------------------------------------------
# 2. Hidráulica: aguas someras (Bates et al., 2010) y escorrentía SCS-CN
# ---------------------------------------------------------------------------

def cn_humedad_antecedente(cn: np.ndarray, humedad: float) -> np.ndarray:
    """CN para suelo seco (AMC I) o húmedo (AMC III) según Chow, Maidment y Mays (1988)."""
    cn = np.asarray(cn, float)
    if humedad < 0.3:
        return 4.2 * cn / (10.0 - 0.058 * cn)
    if humedad > 0.7:
        return 23.0 * cn / (10.0 + 0.13 * cn)
    return cn


def escorrentia_scs(p_mm, cn) -> np.ndarray:
    """Escorrentía directa Q = (P − 0,2 S)² / (P + 0,8 S), S = 25 400 / CN − 254 (mm)."""
    p = np.asarray(p_mm, float)
    s = 25_400.0 / np.clip(cn, 1.0, 100.0) - 254.0
    ia = 0.2 * s
    return np.where(p > ia, (p - ia) ** 2 / (p + 0.8 * s + 1e-9), 0.0)


def aguas_someras(mundo: Mundo, horas: float, h0: np.ndarray | None = None, fuente=None, nivel_mar=None,
                  oceano_activo: bool = False, prof_max_oceano: float = 1500.0, cuadros: int = 40,
                  alfa: float = 0.7, dt_max: float = 60.0) -> dict:
    """Formulación inercial local de las ecuaciones de aguas someras (Bates, Horritt y Fewtrell, 2010).

        q_{t+Δt} = (q_t − g h_f Δt ∂(h+z)/∂x) / (1 + g Δt n² |q_t| / h_f^{7/3}),  Δt = α Δx / √(g h_max)

    fuente(t, dt) → lámina (m) que entra en cada celda durante el paso; nivel_mar(t) → nivel del mar (m).
    Con oceano_activo el mar evoluciona (tsunami); si no, es un contorno de nivel prescrito.

    Rendimiento (2026-11-08): lo que no cambia entre pasos se calcula una vez antes del bucle y los búferes se
    reutilizan; la física y el orden de las operaciones son los de la versión original
    (`tests/modelo/_referencia_aguas_someras.py`, que la prueba de equivalencia compara con esta).
    """
    n, dx = mundo.n, mundo.pixel_m
    mar = mundo.mar
    tierra = ~mar
    zb = np.where(mar, np.maximum(mundo.z, -prof_max_oceano), mundo.z).astype(float)
    nf = np.vectorize(lambda c: COBERTURAS[c]["manning"])(mundo.cobertura).astype(float)
    h = np.zeros((n, n)) if h0 is None else h0.astype(float).copy()
    if oceano_activo:
        h[mar] = np.maximum(h[mar], 0.0)
    qx = np.zeros((n, n + 1))
    qy = np.zeros((n + 1, n))
    activa_x = ~(mar[:, :-1] & mar[:, 1:]) if not oceano_activo else np.ones((n, n - 1), bool)
    activa_y = ~(mar[:-1, :] & mar[1:, :]) if not oceano_activo else np.ones((n - 1, n), bool)
    nfx2 = (0.5 * (nf[:, :-1] + nf[:, 1:])) ** 2
    nfy2 = (0.5 * (nf[:-1, :] + nf[1:, :])) ** 2
    zbx = np.maximum(zb[:, :-1], zb[:, 1:])       # cota del suelo en cada cara (no cambia)
    zby = np.maximum(zb[:-1, :], zb[1:, :])
    zb_mar = zb[mar]
    hay_mar = bool(mar.any())
    tierra_f = tierra.astype(float)       # 1 en tierra, 0 en mar: h·tierra_f = np.where(mar, 0, h) porque h ≥ 0
    reposo = np.where(mar, 0.0, zb)       # superficie en reposo: nivel del mar o el suelo seco
    seco = tierra | oceano_activo
    umbral_mojado = np.where(mar, -zb, 0.0) if oceano_activo else None
    T = horas * 3600.0
    guardar = np.linspace(0, T, cuadros + 1)[1:]
    k_guardar = 0
    salida_h, salida_t = [], []
    hmax = h.copy()
    vmax = np.zeros((n, n))
    llegada = np.full((n, n), np.inf)
    sin_llegar = seco.copy()              # celdas secas a las que el agua aún no llegó
    fpx = np.ones((n, n + 2))             # factor del limitador con un borde de unos (antes np.pad)
    fpy = np.ones((n + 2, n))
    t = 0.0
    while t < T - 1e-6:
        if nivel_mar is not None and not oceano_activo:
            nivel = nivel_mar(t)
            h[mar] = np.maximum(nivel - zb_mar, 0.0)
        eta = zb + h
        if oceano_activo:
            hmax_act = float(h.max())
        else:
            hmax_act = float((h * tierra_f).max(initial=0.0)) if hay_mar else float(h.max(initial=0.0))
            if nivel_mar is not None:
                hmax_act = max(hmax_act, float(nivel_mar(t)) + 1.0)
        dt = min(alfa * dx / math.sqrt(G * max(hmax_act, 0.05)), dt_max, guardar[k_guardar] - t)
        dt = max(dt, 1e-3)
        g_dt = G * dt

        # Caudal por las caras interiores. Solo las caras mojadas y activas lo necesitan (las demás quedan en 0),
        # así que la fórmula, y sobre todo la potencia 7/3, se evalúa solo en ellas: mismas operaciones, mismos valores.
        with np.errstate(divide="ignore", invalid="ignore", over="ignore"):
            hf = np.maximum(eta[:, :-1], eta[:, 1:]) - zbx
            np.maximum(hf, 0.0, out=hf)
            cara = (hf > 1e-3) & activa_x
            q, hc = qx[:, 1:-1][cara], hf[cara]
            q = (q - G * hc * dt * (eta[:, 1:] - eta[:, :-1])[cara] / dx) / (
                1 + g_dt * nfx2[cara] * np.abs(q) / np.maximum(hc, 1e-4) ** (7.0 / 3.0))
            qx[:, 1:-1] = 0.0
            qx[:, 1:-1][cara] = q
            hf = np.maximum(eta[:-1, :], eta[1:, :]) - zby
            np.maximum(hf, 0.0, out=hf)
            cara = (hf > 1e-3) & activa_y
            q, hc = qy[1:-1, :][cara], hf[cara]
            q = (q - G * hc * dt * (eta[1:, :] - eta[:-1, :])[cara] / dx) / (
                1 + g_dt * nfy2[cara] * np.abs(q) / np.maximum(hc, 1e-4) ** (7.0 / 3.0))
            qy[1:-1, :] = 0.0
            qy[1:-1, :][cara] = q

        # Contornos abiertos: condición de radiación q = a·√(g h) con a = anomalía sobre el reposo.
        anom = eta - reposo
        celer = np.sqrt(G * np.maximum(h, 0.0))
        flujo = (np.where(mar, anom, np.maximum(anom, 0.0)) if hay_mar else np.maximum(anom, 0.0)) * celer
        qx[:, 0], qx[:, -1] = -flujo[:, 0], flujo[:, -1]
        qy[0, :], qy[-1, :] = -flujo[0, :], flujo[-1, :]

        # Limitador: ninguna celda entrega más agua de la que tiene.
        salida = (np.maximum(qx[:, 1:], 0.0) + np.maximum(-qx[:, :-1], 0.0)
                  + np.maximum(qy[1:, :], 0.0) + np.maximum(-qy[:-1, :], 0.0)) * dt / dx
        exceso = salida > h
        if exceso.any():
            f = np.where(exceso, h / np.maximum(salida, 1e-12), 1.0)
            fpx[:, 1:-1] = f
            fpy[1:-1, :] = f
            qx *= np.where(qx > 0, fpx[:, :-1], fpx[:, 1:])
            qy *= np.where(qy > 0, fpy[:-1, :], fpy[1:, :])

        h = h + dt * (qx[:, :-1] - qx[:, 1:] + qy[:-1, :] - qy[1:, :]) / dx
        if fuente is not None:
            h = h + fuente(t, dt)
        np.maximum(h, 0.0, out=h)
        t += dt

        mojado = (h - umbral_mojado > 0.05) if oceano_activo else (h > 0.05)
        nuevas = mojado & sin_llegar
        if nuevas.any():
            llegada[nuevas] = t
            sin_llegar &= ~nuevas
        np.maximum(hmax, h * tierra_f if hay_mar else h, out=hmax)
        with np.errstate(divide="ignore", invalid="ignore"):
            hd = np.maximum(h, 0.05)
            u = 0.5 * (qx[:, :-1] + qx[:, 1:]) / hd
            v = 0.5 * (qy[:-1, :] + qy[1:, :]) / hd
        # La velocidad solo es distinta de 0 donde hay caudal (y en tierra): hypot se evalúa solo ahí.
        flu = (u != 0.0) | (v != 0.0)
        if hay_mar:
            flu &= tierra
        if flu.any():
            vel = np.zeros((n, n))
            vel[flu] = np.hypot(u[flu], v[flu])
            np.maximum(vmax, vel, out=vmax)
        if t >= guardar[k_guardar] - 1e-6:
            salida_h.append(np.where(mar, h + zb if oceano_activo else 0.0, h).astype(np.float32))
            salida_t.append(t)
            k_guardar = min(k_guardar + 1, len(guardar) - 1)
    return {"h": h, "cuadros": salida_h, "tiempos": salida_t, "hmax": hmax, "vmax": vmax, "llegada": llegada}


# Efectos de las inundaciones -------------------------------------------------------------

# Huizinga, de Moel y Szewczyk (2017), JRC, tabla 3-5: Sudamérica, viviendas.
JRC_CALADO_M = np.array([0.0, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0])
JRC_DANO_RESIDENCIAL_SA = np.array([0.0, 0.49, 0.71, 0.84, 0.95, 0.98, 1.0, 1.0, 1.0])
JRC_DANO_MAX_EUR_M2 = 69.0          # valor de Brasil recomendado por el JRC para Sudamérica (€ de 2010)
USD_POR_EUR_2010 = 1.33
M2_VIVIENDA_POR_PERSONA = 20.0      # supuesto: ~70 m² por hogar de 3,4 personas


def dano_inundacion(calado_m) -> np.ndarray:
    """Fracción de daño de una vivienda según el calado (curva JRC para Sudamérica)."""
    return np.interp(np.asarray(calado_m, float), JRC_CALADO_M, JRC_DANO_RESIDENCIAL_SA)


def mortalidad_jonkman(calado_m) -> np.ndarray:
    """Mortalidad en la «zona restante» de Jonkman et al. (2008): Φ((ln h − 7,60) / 2,75)."""
    h = np.asarray(calado_m, float)
    with np.errstate(divide="ignore"):
        return np.where(h > 0, _phi((np.log(np.maximum(h, 1e-6)) - 7.60) / 2.75), 0.0)


def _efectos_agua(mundo: Mundo, hmax: np.ndarray, umbral: float = 0.15) -> dict:
    mojado = (hmax > umbral) & ~mundo.mar
    pop = mundo.poblacion
    victimas = float((pop * mortalidad_jonkman(hmax) * mojado).sum())
    perdidas = float((pop * M2_VIVIENDA_POR_PERSONA * dano_inundacion(hmax) * mojado).sum()
                     * JRC_DANO_MAX_EUR_M2 * USD_POR_EUR_2010)
    return {"area_km2": float(mojado.sum() * mundo.area_celda_km2), "expuestos": float(pop[mojado].sum()),
            "victimas": victimas, "perdidas_usd": perdidas,
            "viviendas": float((pop * dano_inundacion(hmax) * mojado).sum() / PERSONAS_POR_VIVIENDA),
            "cultivos_km2": float((mojado & (mundo.cobertura == CULTIVO)).sum() * mundo.area_celda_km2),
            "calado_max": float(hmax[~mundo.mar].max(initial=0.0))}


def _metricas_agua(ef: dict, titulo_area: str = "Área inundada") -> list:
    return [
        (titulo_area, f"{_fmt(ef['area_km2'], 1)} km²", f"Calado > 15 cm · máximo {_fmt(ef['calado_max'], 1)} m"),
        ("Población expuesta", _personas(ef["expuestos"]), "Habitantes en celdas inundadas"),
        ("Víctimas estimadas", _personas(ef["victimas"]), "Sin evacuación · Jonkman et al. (2008)"),
        ("Viviendas destruidas (equiv.)", _personas(ef["viviendas"]), "Daño JRC × viviendas expuestas"),
        ("Pérdidas en viviendas", f"{_fmt(ef['perdidas_usd'] / 1e6, 1)} M USD", "Curva JRC Sudamérica (USD 2010)"),
    ]


# ---------------------------------------------------------------------------
# 3. Incendios: autómata celular de Alexandridis et al. (2008)
# ---------------------------------------------------------------------------

ALEX_P0, ALEX_C1, ALEX_C2, ALEX_A = 0.58, 0.045, 0.131, 0.078   # parámetros calibrados en Spetses (1990)
VEL_MAX_FUEGO_MS = 0.25   # supuesto de escala temporal: avance máximo de una celda por paso (~0,9 km/h)


def amortiguamiento_humedad(m_f, m_x) -> np.ndarray:
    """Coeficiente de Rothermel (1972): η_M = 1 − 2,59 r + 5,11 r² − 3,52 r³, r = M_f / M_x ≤ 1."""
    r = np.clip(np.asarray(m_f, float) / np.asarray(m_x, float), 0.0, 1.0)
    return np.clip(1 - 2.59 * r + 5.11 * r ** 2 - 3.52 * r ** 3, 0.0, 1.0)


def humedad_combustible(humedad_suelo: float) -> float:
    """Supuesto: humedad del combustible muerto fino entre 6 % (suelo seco) y 30 % (saturado)."""
    return 0.06 + 0.24 * float(np.clip(humedad_suelo, 0, 1))


def incendio(mundo: Mundo, i: int, j: int, viento_ms: float = 5.0, viento_deg: float = 45.0,
             humedad_comb: float | None = None, horas: float = 24.0, semilla: int = 7) -> Evento:
    """Propagación probabilística: p_burn = p₀(1+p_veg)(1+p_den)·p_w·p_s·η_M/η_M,ref.

    p_w = exp(c₁V)·exp(V c₂ (cos θ − 1)) (viento) y p_s = exp(a θ_s) (pendiente, θ_s en grados).
    """
    rng = np.random.default_rng(semilla)
    n, pix = mundo.n, mundo.pixel_m
    cob = mundo.cobertura
    m_f = humedad_combustible(mundo.humedad_suelo) if humedad_comb is None else humedad_comb
    p_veg = np.vectorize(lambda c: COBERTURAS[c]["p_veg"] if COBERTURAS[c]["p_veg"] is not None else -1.0)(cob)
    combustible = p_veg > -1.0
    p_den = np.where(mundo.biomasa < 50, -0.4, np.where(mundo.biomasa > 200, 0.3, 0.0))
    m_x = np.vectorize(lambda c: COBERTURAS[c]["m_ext"] or 0.3)(cob)
    extra = np.vectorize(lambda c: HUMEDAD_EXTRA.get(c, 0.0))(cob)
    eta_m = amortiguamiento_humedad(m_f + extra, m_x) / amortiguamiento_humedad(0.06, m_x)  # ref.: Spetses, agosto
    base = ALEX_P0 * (1 + p_veg) * (1 + p_den) * eta_m
    base[~combustible] = 0.0
    viento = math.radians(viento_deg)

    estado = np.where(combustible, 1, 0).astype(np.int8)   # 0 no combustible, 1 combustible, 2 ardiendo, 3 quemado
    if not combustible[i, j]:
        cerca = np.argwhere(combustible)
        if cerca.size == 0:
            raise ValueError("No hay combustible en este mundo.")
        i, j = cerca[np.argmin((cerca[:, 0] - i) ** 2 + (cerca[:, 1] - j) ** 2)]
    estado[i, j] = 2
    dt = pix / VEL_MAX_FUEGO_MS
    pasos = max(int(horas * 3600 / dt), 1)
    zpad = np.pad(mundo.z, 1, mode="edge")
    t_quema = np.full((n, n), np.inf)
    t_quema[i, j] = 0.0
    cuadros, tiempos = [], []
    for paso in range(1, pasos + 1):
        ardiendo = np.pad(estado == 2, 1)
        no_prende = np.ones((n, n))
        for di, dj in VECINOS:
            fuente = ardiendo[1 - di:1 - di + n, 1 - dj:1 - dj + n]     # celda vecina que arde (en −di, −dj)
            if not fuente.any():
                continue
            prop = math.atan2(dj, -di)                                # dirección fuente → objetivo (desde el norte)
            p_w = math.exp(ALEX_C1 * viento_ms) * math.exp(viento_ms * ALEX_C2 * (math.cos(prop - viento) - 1))
            z_fuente = zpad[1 - di:1 - di + n, 1 - dj:1 - dj + n]
            theta_s = np.degrees(np.arctan((mundo.z - z_fuente) / (pix * math.hypot(di, dj))))
            p = np.clip(base * p_w * np.exp(ALEX_A * theta_s), 0.0, 1.0)
            no_prende *= np.where(fuente, 1 - p, 1.0)
        nuevas = (estado == 1) & (rng.random((n, n)) > no_prende)
        estado[estado == 2] = 3                                       # una celda arde un solo paso
        estado[nuevas] = 2
        t_quema[nuevas] = paso * dt
        if paso % max(pasos // 48, 1) == 0 or paso == pasos:
            cuadros.append({"fuego": np.where(estado == 2, 1, np.where(estado == 3, 2, 0)).astype(np.int8)})
            tiempos.append(_hora(paso * dt))
        if not (estado == 2).any():
            cuadros.append({"fuego": np.where(estado == 3, 2, 0).astype(np.int8)})
            tiempos.append(_hora(paso * dt) + " · extinguido")
            break
    quemado = estado >= 2
    consumo = np.vectorize(lambda c: COBERTURAS[c]["consumo"])(cob)
    perdida_mg = float((mundo.biomasa * consumo * quemado).sum() * pix ** 2 / 1e4)
    co2 = perdida_mg * 0.47 * 44.0 / 12.0
    interfaz = _dilatar(quemado, 1)
    residentes = float(mundo.poblacion[quemado].sum())
    expuestos = float(mundo.poblacion[interfaz].sum())
    area = float(quemado.sum() * mundo.area_celda_km2)
    biomasa_post = np.where(quemado, mundo.biomasa * (1 - consumo), mundo.biomasa)

    tabla = pd.DataFrame([{"Cobertura": COBERTURAS[c]["nombre"],
                           "Área quemada (km²)": round(float((quemado & (cob == c)).sum() * mundo.area_celda_km2), 2)}
                          for c in COBERTURAS if (quemado & (cob == c)).any()])
    evento = Evento(
        "incendio", "Incendio forestal", (int(i), int(j)),
        [Capa("fuego", "Estado del fuego", "fuego", etiquetas=("Frente activo", "Quemado"))],
        *_submuestrear_cuadros(cuadros, tiempos),
        metricas=[
            ("Área quemada", f"{_fmt(area, 2)} km²", f"{_fmt(area * 100)} ha"),
            ("Biomasa consumida", f"{_fmt(perdida_mg / 1e3, 1)} mil Mg", "Biomasa × fracción consumida"),
            ("CO₂ emitido", f"{_fmt(co2 / 1e3, 1)} mil t", "ΔB · 0,47 · 44/12"),
            ("Personas a evacuar", _personas(expuestos), "Dentro del área quemada o a < 1 celda del borde"),
            ("Humedad del combustible", f"{_fmt(100 * m_f)} %", f"Suelo al {_fmt(100 * mundo.humedad_suelo)} % del agua útil"),
        ],
        resumen={"area_km2": area, "expuestos": expuestos, "victimas": None, "perdidas_usd": None, "co2_t": co2},
        tabla=tabla,
        notas=[f"Cada paso del autómata equivale a {_fmt(dt / 60)} min: el fuego avanza como máximo una celda "
               f"({_fmt(pix)} m) por paso (supuesto de {VEL_MAX_FUEGO_MS} m/s ≈ 0,9 km/h).",
               f"Residentes dentro del perímetro: {_personas(residentes)}. No hay una función de mortalidad "
               "publicada para incendios forestales en Ecuador: se informa la exposición.",
               "El páramo y el bosque seco arden con facilidad; el bosque húmedo apenas propaga si el combustible "
               "supera su humedad de extinción."],
        modelos=["Alexandridis, A. et al. (2008). A cellular automata model for forest fire spread prediction: "
                 "the case of the wildfire that swept through Spetses Island in 1990. *Appl. Math. Comput.* 204(1).",
                 "Rothermel, R. C. (1972). A mathematical model for predicting fire spread in wildland fuels. "
                 "USDA Forest Service INT-115.",
                 "Attema, E. y Ulaby, F. (1978). Vegetation modeled as a water cloud. *Radio Science* 13(2)."],
    )
    _nisar_incendio(evento, mundo, biomasa_post, quemado, rng)
    return evento


# ---------------------------------------------------------------------------
# 4. Inundaciones: tormenta, desborde de río y marejada
# ---------------------------------------------------------------------------

def campo_lluvia(mundo: Mundo, i: int, j: int, lluvia_mm: float, radio_km: float) -> np.ndarray:
    """Lluvia total (mm) de una tormenta convectiva con perfil gaussiano centrada en (i, j)."""
    X, Y = mundo.malla_m(i, j)
    return lluvia_mm * np.exp(-(X ** 2 + Y ** 2) / (2 * (radio_km * 1000.0) ** 2))


def tormenta(mundo: Mundo, i: int, j: int, lluvia_mm: float = 150.0, duracion_h: float = 6.0,
             radio_km: float = 15.0, horas: float | None = None, semilla: int = 7,
             cohesion_kpa: float = 5.0, friccion_deg: float = 33.0) -> Evento:
    """Lluvia extrema → escorrentía SCS-CN → inundación (Bates 2010) → deslizamientos (SHALSTAB)."""
    rng = np.random.default_rng(semilla)
    horas = horas or min(duracion_h + 12.0, 36.0)
    lluvia = campo_lluvia(mundo, i, j, lluvia_mm, radio_km)
    cn = cn_humedad_antecedente(np.vectorize(lambda c: COBERTURAS[c]["cn"])(mundo.cobertura), mundo.humedad_suelo)
    D = duracion_h * 3600.0
    mar = mundo.mar

    previo = {"t": None, "q": None}       # la escorrentía al final de un paso es la del inicio del siguiente

    def fuente(t, dt):
        t1 = t + dt
        q0 = previo["q"] if previo["t"] == t else escorrentia_scs(lluvia * min(t / D, 1.0), cn)
        q1 = escorrentia_scs(lluvia * min(t1 / D, 1.0), cn)
        previo["t"], previo["q"] = t1, q1
        return np.where(mar, 0.0, (q1 - q0) / 1000.0)

    sim = aguas_someras(mundo, horas, fuente=fuente, nivel_mar=(lambda t: 0.0) if mar.any() else None, cuadros=44)
    ef = _efectos_agua(mundo, sim["hmax"])
    intensidad = lluvia / max(duracion_h, 0.5) * 24.0 / 1000.0          # m/día durante la tormenta
    falla, fs = deslizamientos(mundo, recarga_m_dia=intensidad, cohesion_kpa=cohesion_kpa, friccion_deg=friccion_deg)
    desliz = _alcance_deslizamientos(mundo, falla)
    n_desl = int(desliz.sum())
    cuadros = [{"agua": c} for c in sim["cuadros"]]
    for k in range(len(cuadros)):
        if sim["tiempos"][k] >= D:
            cuadros[k]["desliz"] = desliz.astype(np.int8)
    tiempos = [_hora(t) for t in sim["tiempos"]]
    pob_desl = float(mundo.poblacion[desliz].sum())
    metricas = _metricas_agua(ef)
    metricas.insert(1, ("Deslizamientos", f"{_fmt(n_desl * mundo.area_celda_km2, 2)} km²",
                        f"{_personas(pob_desl)} personas en laderas que fallan"))
    evento = Evento(
        "tormenta", "Tormenta extrema", (i, j),
        [Capa("agua", "Calado", "agua", 0.0, 3.0, "m", 0.05),
         Capa("desliz", "Deslizamientos", "deslizamiento", etiquetas=("Ladera que falla y su depósito",))],
        cuadros, tiempos, metricas,
        resumen={**ef, "area_km2": ef["area_km2"] + n_desl * mundo.area_celda_km2,
                 "expuestos": ef["expuestos"] + pob_desl},
        notas=[f"Lluvia de {_fmt(lluvia_mm)} mm en {_fmt(duracion_h)} h con radio de {_fmt(radio_km)} km. "
               f"Humedad antecedente del suelo: {_fmt(100 * mundo.humedad_suelo)} % del agua útil "
               f"(CN {'húmedo (AMC III)' if mundo.humedad_suelo > 0.7 else 'seco (AMC I)' if mundo.humedad_suelo < 0.3 else 'normal (AMC II)'}).",
               "La red de drenaje es la del DEM a la resolución del mundo: los cauces estrechos se ensanchan a una celda.",
               "Los deslizamientos se muestran desde el final de la lluvia; no se estima su mortalidad."],
        modelos=_REF_HIDRAULICA + _REF_DESLIZAMIENTOS,
    )
    _nisar_agua(evento, mundo, sim["hmax"], rng, desliz)
    return evento


def inundacion(mundo: Mundo, i: int, j: int, caudal_m3s: float = 1500.0, duracion_h: float = 12.0,
               altura_marejada_m: float = 2.5, horas: float | None = None, semilla: int = 7) -> Evento:
    """Desborde de un río (hidrograma triangular en la celda elegida) o marejada si la celda es mar."""
    rng = np.random.default_rng(semilla)
    horas = horas or min(duracion_h * 1.5, 36.0)
    D = duracion_h * 3600.0
    en_mar = bool(mundo.mar[i, j])
    if en_mar:
        def nivel(t):
            return altura_marejada_m * math.sin(math.pi * min(t / D, 1.0)) if t < D else 0.0
        sim = aguas_someras(mundo, horas, nivel_mar=nivel, cuadros=44)
        titulo, nota = "Marejada costera", (f"Nivel del mar elevado hasta {_fmt(altura_marejada_m, 1)} m durante "
                                            f"{_fmt(duracion_h)} h (pulso senoidal).")
    else:
        # El agua entra por el cauce principal más cercano (máxima acumulación en un radio de 3 celdas).
        r = 3
        sub = mundo.acumulacion[max(i - r, 0):i + r + 1, max(j - r, 0):j + r + 1]
        di, dj = np.unravel_index(int(np.argmax(sub)), sub.shape)
        i, j = max(i - r, 0) + int(di), max(j - r, 0) + int(dj)
        area = mundo.pixel_m ** 2

        def fuente(t, dt):
            pico = D / 3.0
            q = caudal_m3s * (t / pico if t < pico else max(0.0, (D - t) / (D - pico)))
            s = np.zeros((mundo.n, mundo.n))
            s[i, j] = q * dt / area
            return s

        sim = aguas_someras(mundo, horas, fuente=fuente, nivel_mar=(lambda t: 0.0) if mundo.mar.any() else None,
                            cuadros=44)
        titulo = "Desborde de río"
        volumen = caudal_m3s * D / 2
        nota = (f"Hidrograma triangular con pico de {_fmt(caudal_m3s)} m³/s a las {_fmt(duracion_h / 3, 1)} h; "
                f"volumen total {_fmt(volumen / 1e6, 1)} hm³.")
    ef = _efectos_agua(mundo, sim["hmax"])
    evento = Evento(
        "inundacion", titulo, (i, j), [Capa("agua", "Calado", "agua", 0.0, 3.0, "m", 0.05)],
        [{"agua": c} for c in sim["cuadros"]], [_hora(t) for t in sim["tiempos"]], _metricas_agua(ef),
        resumen=ef, notas=[nota, "Mortalidad de la «zona restante» de Jonkman (sin rotura de diques ni subida "
                                 "rápida): es una cota inferior en crecidas súbitas."],
        modelos=_REF_HIDRAULICA,
    )
    _nisar_agua(evento, mundo, sim["hmax"], rng)
    return evento


_REF_HIDRAULICA = [
    "Bates, P. D., Horritt, M. S. y Fewtrell, T. J. (2010). A simple inertial formulation of the shallow water "
    "equations for efficient two-dimensional flood inundation modelling. *J. Hydrol.* 387.",
    "USDA-NRCS (1986). Urban Hydrology for Small Watersheds (TR-55): número de curva.",
    "Chow, V. T., Maidment, D. R. y Mays, L. W. (1988). *Applied Hydrology*. McGraw-Hill (AMC I/III).",
    "Jonkman, S. N., Vrijling, J. K. y Vrouwenvelder, A. C. W. M. (2008). Methods for the estimation of loss of "
    "life due to floods. *Nat. Hazards* 46.",
    "Huizinga, J., de Moel, H. y Szewczyk, W. (2017). Global flood depth-damage functions. JRC105688, EUR 28552.",
]


# ---------------------------------------------------------------------------
# 5. Deslizamientos: talud infinito + SHALSTAB + alcance LAHARZ
# ---------------------------------------------------------------------------

def factor_seguridad(pendiente_deg, humedad_rel, cohesion_kpa=5.0, friccion_deg=33.0, espesor_m=1.5,
                     gamma_suelo=18.0, k_h=0.0) -> np.ndarray:
    """Talud infinito pseudoestático:

        FS = [c' + z (γ cos²β − m γ_w cos²β − k γ sinβ cosβ) tanφ] / [z γ (sinβ cosβ + k cos²β)]
    """
    b = np.radians(np.clip(pendiente_deg, 0.1, 89.0))
    c2, sc = np.cos(b) ** 2, np.sin(b) * np.cos(b)
    gw = 9.81
    num = cohesion_kpa + espesor_m * (gamma_suelo * c2 - humedad_rel * gw * c2 - k_h * gamma_suelo * sc) \
        * math.tan(math.radians(friccion_deg))
    den = espesor_m * gamma_suelo * (sc + k_h * c2)
    return num / den


def deslizamientos(mundo: Mundo, recarga_m_dia: float = 0.0, k_h=0.0, cohesion_kpa: float = 5.0,
                   friccion_deg: float = 33.0, transmisividad_m2_dia: float = 20.0) -> tuple[np.ndarray, np.ndarray]:
    """Celdas que fallan (FS < 1) con la humedad de SHALSTAB: m = min(1, m₀ + q·a / (b·T·sinβ))."""
    beta = np.radians(np.clip(mundo.pendiente, 0.5, 89.0))
    a_b = mundo.acumulacion * mundo.pixel_m           # área contribuyente por unidad de contorno (m)
    m0 = 0.3 * mundo.humedad_suelo                    # nivel freático de partida según la temporada
    m = np.clip(m0 + recarga_m_dia * a_b / (transmisividad_m2_dia * np.sin(beta)), 0.0, 1.0)
    fs = factor_seguridad(mundo.pendiente, m, cohesion_kpa, friccion_deg, k_h=k_h)
    susceptible = ~mundo.mar & (mundo.cobertura != GLACIAR) & (mundo.pendiente > 15)
    return susceptible & (fs < 1.0), fs


def _componentes(mascara: np.ndarray) -> list[list[tuple[int, int]]]:
    """Componentes conexas (vecindad 8) por búsqueda en anchura."""
    visto = np.zeros_like(mascara, bool)
    grupos = []
    n0, n1 = mascara.shape
    for i, j in zip(*np.nonzero(mascara)):
        if visto[i, j]:
            continue
        cola, grupo = [(i, j)], []
        visto[i, j] = True
        while cola:
            a, b = cola.pop()
            grupo.append((a, b))
            for di, dj in VECINOS:
                c, d = a + di, b + dj
                if 0 <= c < n0 and 0 <= d < n1 and mascara[c, d] and not visto[c, d]:
                    visto[c, d] = True
                    cola.append((c, d))
        grupos.append(grupo)
    return grupos


def _alcance_deslizamientos(mundo: Mundo, falla: np.ndarray, espesor_m: float = 1.5, maximo: int = 40) -> np.ndarray:
    """Área de falla + depósito del flujo de detritos (LAHARZ con A = 0,1 V^⅔, B = 20 V^⅔)."""
    afectado = falla.copy()
    grupos = sorted(_componentes(falla), key=len, reverse=True)[:maximo]
    for grupo in grupos:
        volumen = len(grupo) * mundo.pixel_m ** 2 * espesor_m
        inicio = min(grupo, key=lambda c: mundo.z_relleno[c])
        zona, _, _ = laharz(mundo, [inicio], volumen, coef_a=0.1, coef_b=20.0)
        afectado |= zona
    return afectado


_REF_DESLIZAMIENTOS = [
    "Montgomery, D. R. y Dietrich, W. E. (1994). A physically based model for the topographic control on shallow "
    "landsliding. *Water Resour. Res.* 30(4).",
    "Griswold, J. P. e Iverson, R. M. (2008). Mobility statistics and automated hazard mapping for debris flows "
    "and rock avalanches. USGS SIR 2007-5276.",
]


# ---------------------------------------------------------------------------
# 6. Terremotos (y sus cascadas: deslizamientos y tsunami)
# ---------------------------------------------------------------------------

def dimensiones_ruptura(mw: float) -> tuple[float, float, float]:
    """Longitud y ancho (km) de Wells y Coppersmith (1994, todos los mecanismos) y deslizamiento (m)."""
    largo = 10 ** (-2.44 + 0.59 * mw)
    ancho = 10 ** (-1.01 + 0.32 * mw)
    m0 = 10 ** (1.5 * mw + 9.1)
    return largo, ancho, m0 / (nisar.MU_CORTE_PA * largo * 1e3 * ancho * 1e3)


def intensidad_allen2012(mw: float, r_rup_km) -> np.ndarray:
    """MMI = 3,950 + 0,913 M − 1,107 ln √(R² + (1 + 0,813 e^{M−5})²) (Allen, Wald y Worden, 2012)."""
    r = np.asarray(r_rup_km, float)
    return np.clip(3.950 + 0.913 * mw - 1.107 * np.log(np.sqrt(r ** 2 + (1 + 0.813 * math.exp(mw - 5)) ** 2)), 1, 10)


def pga_desde_mmi(mmi) -> np.ndarray:
    """PGA (g) invirtiendo la GMICE de Worden et al. (2012) (PGA en cm/s²)."""
    mmi = np.asarray(mmi, float)
    log_pga = np.where(mmi <= 4.22, (mmi - 1.78) / 1.55, (mmi + 1.60) / 3.70)
    return 10 ** log_pga / 981.0


# PAGER (Jaiswal y Wald, 2010): ν(S) = Φ(ln(S/θ)/β), parámetros por país (tabla del informe USGS 2009)
PAGER = {"Ecuador": (100.00, 0.64), "Perú": (51.50, 0.50), "Colombia": (48.07, 0.47)}


def mortalidad_pager(mmi, pais: str = "Ecuador") -> np.ndarray:
    theta, beta = PAGER[pais]
    return _phi(np.log(np.asarray(mmi, float) / theta) / beta)


def _distancia_falla(X, Y, prof_km, rumbo, buz, largo_km, ancho_km) -> np.ndarray:
    """Distancia mínima (km) de cada punto de la superficie al plano de falla (muestreado)."""
    st_, dp = math.radians(rumbo), math.radians(buz)
    s = np.array([math.sin(st_), math.cos(st_), 0.0])
    abajo = np.array([math.cos(st_) * math.cos(dp), -math.sin(st_) * math.cos(dp), -math.sin(dp)])
    a = np.linspace(-largo_km / 2, largo_km / 2, 17)
    b = np.linspace(-ancho_km / 2, ancho_km / 2, 9)
    A, B = np.meshgrid(a, b)
    puntos = np.array([0, 0, -prof_km])[None, :] + A.ravel()[:, None] * s + B.ravel()[:, None] * abajo
    puntos[:, 2] = np.minimum(puntos[:, 2], 0.0)
    xs, ys = X.ravel() / 1e3, Y.ravel() / 1e3
    d = np.full(xs.shape, np.inf)
    for px, py, pz in puntos:
        d = np.minimum(d, np.sqrt((xs - px) ** 2 + (ys - py) ** 2 + pz ** 2))
    return d.reshape(X.shape)


MECANISMOS = {"Inversa (subducción)": 90.0, "Rumbo dextral": 180.0, "Rumbo sinistral": 0.0, "Normal": -90.0}


def terremoto(mundo: Mundo, i: int, j: int, mw: float = 7.0, profundidad_km: float = 15.0,
              mecanismo: str = "Inversa (subducción)", rumbo: float = 25.0, buzamiento: float | None = None,
              pais: str = "Ecuador", tsunami: bool = True, semilla: int = 7) -> Evento:
    rng = np.random.default_rng(semilla)
    rake = MECANISMOS[mecanismo]
    buz = buzamiento if buzamiento is not None else (20.0 if rake == 90 else 60.0 if rake == -90 else 89.0)
    largo, ancho, desliz = dimensiones_ruptura(mw)
    prof = max(profundidad_km, math.sin(math.radians(buz)) * ancho / 2 + 0.5)
    X, Y = mundo.malla_m(i, j)
    ue, un, uz = nisar.okada85(X, Y, prof * 1e3, rumbo, buz, largo * 1e3, ancho * 1e3, rake, desliz)
    r_rup = _distancia_falla(X, Y, prof, rumbo, buz, largo, ancho)
    mmi = intensidad_allen2012(mw, r_rup)
    r_hip = np.sqrt((X / 1e3) ** 2 + (Y / 1e3) ** 2 + prof ** 2)
    pga = pga_desde_mmi(mmi)
    tierra = ~mundo.mar
    pop = mundo.poblacion
    victimas = float((pop * mortalidad_pager(mmi, pais) * tierra).sum())

    # Ondas: P a 6,0 km/s y S a 3,5 km/s; la intensidad aparece cuando llega la onda S.
    vp, vs = 6.0, 3.5
    t_fin = float(r_hip.max()) / vs + 2.0
    cuadros, tiempos = [], []
    ancho_onda = 1.5 * mundo.pixel_m / 1e3
    for t in np.linspace(0.5, t_fin, 26):
        onda = np.zeros(mmi.shape, np.int8)
        onda[np.abs(r_hip - vp * t) < ancho_onda * 2] = 1
        onda[np.abs(r_hip - vs * t) < ancho_onda * 2] = 2
        cuadros.append({"mmi": np.where(r_hip <= vs * t, mmi, 0).astype(np.float32), "onda": onda})
        tiempos.append(f"+{t:.0f} s".replace(".", ","))

    # Cascada 1: deslizamientos cosísmicos (k = 0,5·PGA/g, Hynes-Griffin y Franklin, 1984)
    falla, _ = deslizamientos(mundo, k_h=0.5 * pga)
    desliz_zona = _alcance_deslizamientos(mundo, falla)
    final = {"mmi": mmi.astype(np.float32), "desliz": desliz_zona.astype(np.int8)}
    for _ in range(4):
        cuadros.append(dict(final))
        tiempos.append("Deslizamientos inducidos")

    # Cascada 2: tsunami si el epicentro está en el mar y el fondo se levanta.
    capas = [Capa("mmi", "Intensidad (MMI)", "mmi", 1.0, 10.0, "MMI", 1.5),
             Capa("onda", "Frentes de onda", "onda", etiquetas=("Onda P", "Onda S")),
             Capa("desliz", "Deslizamientos", "deslizamiento", etiquetas=("Ladera que falla y su depósito",))]
    ef_tsunami = None
    notas = []
    if tsunami and mundo.mar[i, j] and mundo.mar.sum() > 0.05 * mundo.n ** 2 and float(np.abs(uz[mundo.mar]).max()) > 0.2:
        h0 = np.where(mundo.mar, -np.maximum(mundo.z, -1500.0) + uz, 0.0)
        sim = aguas_someras(mundo, 1.5, h0=h0, oceano_activo=True, cuadros=30, alfa=0.5)
        ef_tsunami = _efectos_agua(mundo, sim["hmax"], umbral=0.3)
        capas.append(Capa("agua", "Tsunami: calado en tierra / elevación del mar", "agua", 0.0, 3.0, "m", 0.1))
        for c, t in zip(sim["cuadros"], sim["tiempos"]):
            cuadros.append({**final, "agua": np.where(mundo.mar, np.abs(c), c)})
            tiempos.append("Tsunami " + _hora(t))
        notas.append(f"Tsunami: el levantamiento del fondo marino (hasta {_fmt(float(uz[mundo.mar].max()), 1)} m) "
                     "se propaga con aguas someras; la batimetría se limita a 1 500 m para acelerar el cálculo. "
                     "La mortalidad de Jonkman (zona restante) subestima la de un tsunami.")
    expuestos_vi = float(pop[(mmi >= 6) & tierra].sum())
    tabla = pd.DataFrame([{"Intensidad": f"{romano}", "Percepción": percep,
                           "Población": int(round(float(pop[(mmi >= lo) & (mmi < lo + 1) & tierra].sum())))}
                          for lo, romano, percep in [(4, "IV", "Ligera"), (5, "V", "Moderada"), (6, "VI", "Fuerte"),
                                                     (7, "VII", "Muy fuerte"), (8, "VIII", "Severa"),
                                                     (9, "IX", "Violenta"), (10, "X", "Extrema")]])
    victimas_total = victimas + (ef_tsunami["victimas"] if ef_tsunami else 0.0)
    metricas = [
        ("Magnitud", f"Mw {_fmt(mw, 1)}", f"Ruptura {_fmt(largo)} × {_fmt(ancho)} km · deslizamiento {_fmt(desliz, 1)} m"),
        ("Intensidad máxima", f"MMI {_fmt(float(mmi[tierra].max(initial=1)), 1)}",
         f"PGA máx. {_fmt(float(pga[tierra].max(initial=0)), 2)} g"),
        ("Población con MMI ≥ VI", _personas(expuestos_vi), "Daño probable en construcciones vulnerables"),
        ("Víctimas estimadas", _personas(victimas_total), f"PAGER ({pais}: θ={PAGER[pais][0]}, β={PAGER[pais][1]})"
         + (" + tsunami" if ef_tsunami else "")),
        ("Deslizamientos", f"{_fmt(desliz_zona.sum() * mundo.area_celda_km2, 2)} km²", "Talud pseudoestático"),
    ]
    if ef_tsunami:
        metricas.append(("Tsunami en tierra", f"{_fmt(ef_tsunami['area_km2'], 1)} km²",
                         f"{_personas(ef_tsunami['expuestos'])} personas expuestas"))
    notas += [f"Hipocentro a {_fmt(prof)} km; mecanismo {mecanismo.lower()} (rake {rake:.0f}°), rumbo {rumbo:.0f}°, "
              f"buzamiento {buz:.0f}°. Levantamiento máximo {_fmt(float(uz.max()) * 100)} cm, hundimiento "
              f"{_fmt(float(-uz.min()) * 100)} cm.",
              "La IPE de Allen et al. (2012) es de corteza activa; en sismos de subducción grandes puede infravalorar "
              "la intensidad lejana. No incluye amplificación por suelos blandos.",
              "Los parámetros PAGER de Ecuador se calibraron con sismos de 1973–2007 (antes de Pedernales 2016): "
              "prueba Perú o Colombia para ver la sensibilidad a la vulnerabilidad."]
    evento = Evento(
        "terremoto", f"Terremoto Mw {_fmt(mw, 1)}", (i, j), capas, *_submuestrear_cuadros(cuadros, tiempos, 64),
        metricas=metricas,
        resumen={"area_km2": float(((mmi >= 6) & tierra).sum() * mundo.area_celda_km2), "expuestos": expuestos_vi,
                 "victimas": victimas_total, "perdidas_usd": ef_tsunami["perdidas_usd"] if ef_tsunami else None},
        tabla=tabla, notas=notas,
        modelos=["Wells, D. L. y Coppersmith, K. J. (1994). New empirical relationships among magnitude, rupture "
                 "length, rupture width... *BSSA* 84(4).",
                 "Okada, Y. (1985). Surface deformation due to shear and tensile faults in a half-space. *BSSA* 75(4).",
                 "Allen, T. I., Wald, D. J. y Worden, C. B. (2012). Intensity attenuation for active crustal regions. "
                 "*J. Seismol.* 16.",
                 "Worden, C. B. et al. (2012). Probabilistic relationships between ground-motion parameters and "
                 "Modified Mercalli Intensity in California. *BSSA* 102(1).",
                 "Jaiswal, K. y Wald, D. J. (2010). An empirical model for global earthquake fatality estimation. "
                 "*Earthquake Spectra* 26(4).",
                 "Hynes-Griffin, M. E. y Franklin, A. G. (1984). Rationalizing the seismic coefficient method. "
                 "USACE MP GL-84-13."] + _REF_DESLIZAMIENTOS + (_REF_HIDRAULICA[:1] if ef_tsunami else []),
    )
    _nisar_deformacion(evento, mundo, ue, un, uz, desliz_zona, rng)
    return evento


# ---------------------------------------------------------------------------
# 7. Volcanes: lahares (LAHARZ), corrientes piroclásticas (cono de energía) y ceniza
# ---------------------------------------------------------------------------

def laharz(mundo: Mundo, inicios: list, volumen_m3: float, coef_a: float = 0.05, coef_b: float = 200.0,
           semiancho: int = 14) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """LAHARZ (Iverson, Schilling y Vallance, 1998): A = 0,05 V^⅔ (sección), B = 200 V^⅔ (planta).

    Recorre el cauce D8 desde cada inicio; en cada celda llena la sección transversal hasta el área A y
    se detiene cuando el área inundada en planta alcanza B. Devuelve (zona, calado, distancia por el cauce).
    """
    n, pix = mundo.n, mundo.pixel_m
    A = coef_a * volumen_m3 ** (2.0 / 3.0)
    B = coef_b * volumen_m3 ** (2.0 / 3.0)
    zf = mundo.z_relleno            # el cauce se sigue en el DEM sin depresiones…
    zr = mundo.z                    # …pero las secciones se llenan sobre el relieve real
    zona = np.zeros((n, n), bool)
    calado = np.zeros((n, n))
    distancia = np.full((n, n), np.inf)
    for i0, j0 in inicios:
        k = int(i0) * n + int(j0)
        area, recorrido = 0.0, 0.0
        while k >= 0 and area < B:
            i, j = divmod(k, n)
            sig = int(mundo.destino[i, j])
            if sig >= 0:
                di, dj = sig // n - i, sig % n - j
            else:
                di, dj = 1, 0
            pi_, pj = -dj, di                                  # dirección perpendicular al flujo
            ancho_paso = pix * math.hypot(pi_, pj)
            offs = np.arange(-semiancho, semiancho + 1)
            fi, fj = i + offs * pi_, j + offs * pj
            dentro = (fi >= 0) & (fi < n) & (fj >= 0) & (fj < n)
            zs = np.where(dentro, zr[np.clip(fi, 0, n - 1), np.clip(fj, 0, n - 1)], np.inf)
            z0 = zr[i, j]

            def seccion(nivel):
                bajo = zs < nivel
                c = semiancho
                izq = c
                while izq - 1 >= 0 and bajo[izq - 1]:
                    izq -= 1
                der = c
                while der + 1 < len(zs) and bajo[der + 1]:
                    der += 1
                sel = np.zeros_like(bajo)
                sel[izq:der + 1] = True
                sel &= bajo | (np.arange(len(zs)) == c)
                return float(np.sum(np.clip(nivel - zs[sel], 0, None)) * ancho_paso), sel

            lo, hi = z0, z0 + 400.0
            for _ in range(28):                                # bisección del nivel del flujo
                medio = 0.5 * (lo + hi)
                if seccion(medio)[0] < A:
                    lo = medio
                else:
                    hi = medio
            nivel = hi
            _, sel = seccion(nivel)
            for kk in np.nonzero(sel & dentro)[0]:
                a, b = int(fi[kk]), int(fj[kk])
                if not zona[a, b]:
                    area += pix * pix
                zona[a, b] = True
                calado[a, b] = max(calado[a, b], nivel - zr[a, b], A / ancho_paso if kk == semiancho else 0.0)
                distancia[a, b] = min(distancia[a, b], recorrido)
            if mundo.mar[i, j]:
                break
            recorrido += pix * math.hypot(di, dj)
            k = sig
    # Las secciones de cauces diagonales saltan celdas en damero: cierre morfológico (dilatar y erosionar).
    cerrada = ~_dilatar(~_dilatar(zona, 1), 1) & ~mundo.mar
    nuevas = cerrada & ~zona
    if nuevas.any():
        suma = sum(np.roll(np.roll(calado, di, 0), dj, 1) for di, dj in VECINOS)
        cuenta = sum(np.roll(np.roll(zona.astype(float), di, 0), dj, 1) for di, dj in VECINOS)
        calado = np.where(nuevas, suma / np.maximum(cuenta, 1), calado)
        dist_vec = np.min([np.roll(np.roll(distancia, di, 0), dj, 1) for di, dj in VECINOS], axis=0)
        distancia = np.where(nuevas, dist_vec, distancia)
    zona = cerrada | (zona & ~mundo.mar)
    return zona, np.where(zona, calado, 0.0), distancia


def _cima_cercana(mundo: Mundo, i: int, j: int, radio_m: float = 2500.0) -> tuple[int, int]:
    r = max(int(radio_m / mundo.pixel_m), 1)
    sub = mundo.z[max(i - r, 0):i + r + 1, max(j - r, 0):j + r + 1]
    di, dj = np.unravel_index(int(np.argmax(sub)), sub.shape)
    return max(i - r, 0) + int(di), max(j - r, 0) + int(dj)


def _inicios_lahar(mundo: Mundo, iv: int, jv: int, h_l: float = 0.3, maximo: int = 5) -> list:
    """Cauces que salen de la zona proximal (cono H/L de LAHARZ), los de mayor acumulación."""
    X, Y = mundo.malla_m(iv, jv)
    dist = np.hypot(X, Y)
    zv = mundo.z[iv, jv]
    proximal = mundo.z >= zv - h_l * dist
    borde = proximal & _dilatar(~proximal, 1)          # celdas proximales que tocan la zona distal
    candidatos = np.argwhere(borde & (dist > 2 * mundo.pixel_m))
    if candidatos.size == 0:
        candidatos = np.argwhere(dist < 6 * mundo.pixel_m)
    orden = candidatos[np.argsort(-mundo.acumulacion[candidatos[:, 0], candidatos[:, 1]])]
    elegidos = []
    separacion = max(2000.0 / mundo.pixel_m, 3)
    for a, b in orden:
        if all(math.hypot(a - c, b - d) >= separacion for c, d in elegidos):
            elegidos.append((int(a), int(b)))
        if len(elegidos) >= maximo:
            break
    return elegidos


def altura_columna_km(caudal_dre_m3s: float) -> float:
    """Mastin et al. (2009): H = 2,00 · V̇^0,241 (H en km sobre el cráter, V̇ en m³/s de roca densa)."""
    return 2.00 * max(caudal_dre_m3s, 1e-3) ** 0.241


def ceniza(mundo: Mundo, iv: int, jv: int, masa_kg: float, altura_km: float, viento_ms: float, viento_deg: float,
           difusion_m2s: float = 1500.0) -> np.ndarray:
    """Carga de tefra (kg/m²) con advección–difusión gaussiana desde una columna (estilo Suzuki/TEPHRA2).

    La masa se libera entre 0,5 H y H, en tres clases de partículas (v_s = 0,4, 1,2 y 3,5 m/s):
    cada clase cae en t = h / v_s, deriva u·t a favor del viento y se dispersa con σ² = σ₀² + 2 K t.
    """
    X, Y = mundo.malla_m(iv, jv)
    ux, uy = math.sin(math.radians(viento_deg)), math.cos(math.radians(viento_deg))
    carga = np.zeros(X.shape)
    alturas = np.linspace(0.5, 1.0, 6) * altura_km * 1000.0
    clases = [(0.4, 0.3), (1.2, 0.4), (3.5, 0.3)]
    for v_s, frac in clases:
        for h in alturas:
            t = h / v_s
            cx, cy = viento_ms * t * ux, viento_ms * t * uy
            s2 = (0.1 * h) ** 2 + 2 * difusion_m2s * t
            m = masa_kg * frac / len(alturas)
            carga += m / (2 * math.pi * s2) * np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (2 * s2))
    return carga


def colapso_techos(carga_kpa) -> np.ndarray:
    """Probabilidad de colapso de techos débiles por carga de ceniza (aprox. a Spence et al., 2005: 2,0 ± 0,6 kPa)."""
    return _phi((np.asarray(carga_kpa, float) - 2.0) / 0.6)


def erupcion(mundo: Mundo, i: int, j: int, vei: int = 3, volumen_lahar_hm3: float = 20.0, viento_ms: float = 10.0,
             viento_deg: float = 270.0, duracion_h: float = 6.0, evacuacion: float = 0.0, semilla: int = 7) -> Evento:
    rng = np.random.default_rng(semilla)
    iv, jv = _cima_cercana(mundo, i, j)
    zv = float(mundo.z[iv, jv])
    pix = mundo.pixel_m
    X, Y = mundo.malla_m(iv, jv)
    dist = np.hypot(X, Y)

    # Columna eruptiva y ceniza
    v_bulk = 10 ** (vei + 4.5)                        # m³ de tefra (punto medio logarítmico del IEV)
    masa = v_bulk * 1000.0                            # densidad aparente del depósito ≈ 1 000 kg/m³
    caudal_dre = v_bulk * 1000.0 / 2500.0 / (duracion_h * 3600.0)
    h_col = altura_columna_km(caudal_dre)
    carga = ceniza(mundo, iv, jv, masa, h_col + zv / 1000.0, viento_ms, viento_deg)
    espesor_cm = carga / 1000.0 * 100.0               # cm de depósito (ρ ≈ 1 000 kg/m³)
    carga_kpa = carga * 1.4 * G / 1000.0              # ceniza húmeda (≈ +40 % de agua)
    p_colapso = colapso_techos(carga_kpa)

    # Corrientes de densidad piroclástica: cono de energía H/L con colapso de columna a altura Hc
    # H/L ≈ 0,3–0,5 en flujos pequeños de colapso de domo o columna y ≈ 0,1 en grandes ignimbritas
    # (Hayashi y Self, 1992); la altura de colapso crece con el IEV (supuesto).
    h_l = float(np.clip(0.55 - 0.08 * vei, 0.1, 0.5))
    hc = 100.0 * vei
    cono = (zv + hc - h_l * dist) > mundo.z
    pdc = _conectado(cono & ~mundo.mar, iv, jv) if vei >= 2 else np.zeros_like(cono)

    # Lahares (fusión del glaciar o lluvia sobre ceniza)
    inicios = _inicios_lahar(mundo, iv, jv)
    lahar, calado, recorrido = laharz(mundo, inicios, volumen_lahar_hm3 * 1e6) if volumen_lahar_hm3 > 0 else \
        (np.zeros((mundo.n,) * 2, bool), np.zeros((mundo.n,) * 2), np.full((mundo.n,) * 2, np.inf))
    vel_lahar = 8.0                                   # m/s, supuesto (lahares de 1877: 5–20 m/s)
    t_lahar = recorrido / vel_lahar
    t_pdc = dist / 40.0                               # m/s, supuesto

    T = max(float(np.nanmax(np.where(np.isfinite(t_lahar), t_lahar, 0.0))), duracion_h * 3600.0, 1800.0)
    cuadros, tiempos = [], []
    tx = (X * math.sin(math.radians(viento_deg)) + Y * math.cos(math.radians(viento_deg))) / max(viento_ms, 0.5)
    for t in np.linspace(T / 40, T, 40):
        llegada_ceniza = np.clip((t - np.maximum(tx, 0) - 600.0) / (duracion_h * 3600.0), 0, 1)
        cuadros.append({
            "ceniza": (espesor_cm * llegada_ceniza).astype(np.float32),
            "pdc": (pdc & (t_pdc <= t)).astype(np.int8),
            "lahar": np.where(lahar & (t_lahar <= t), calado, 0).astype(np.float32),
        })
        tiempos.append(_hora(t))

    pop = mundo.poblacion
    zona_lahar_pdc = lahar | pdc
    pob_pdc, pob_lahar = float(pop[pdc].sum()), float(pop[lahar & ~pdc].sum())
    pob_ceniza = float(pop[(espesor_cm >= 1.0) & ~mundo.mar].sum())
    viviendas_colapso = float((pop * p_colapso * ~zona_lahar_pdc).sum() / PERSONAS_POR_VIVIENDA)
    letal_pdc, letal_lahar = 0.9, 0.5                 # supuestos (Armero 1985: ~80 % de letalidad)
    victimas = (pob_pdc * letal_pdc + pob_lahar * letal_lahar) * (1 - evacuacion)
    nombre_volcan = min(VOLCANES, key=lambda v: (v[1] - mundo.latlon(iv, jv)[0]) ** 2 + (v[2] - mundo.latlon(iv, jv)[1]) ** 2)
    cerca = math.hypot(nombre_volcan[1] - mundo.latlon(iv, jv)[0], nombre_volcan[2] - mundo.latlon(iv, jv)[1]) < 0.05
    evento = Evento(
        "erupcion", f"Erupción IEV {vei}" + (f" del {nombre_volcan[0]}" if cerca else ""), (iv, jv),
        [Capa("ceniza", "Espesor de ceniza", "ceniza", 0.0, 20.0, "cm", 0.1),
         Capa("lahar", "Calado del lahar", "lahar", 0.0, 15.0, "m", 0.01),
         Capa("pdc", "Corriente piroclástica", "pdc", etiquetas=("Flujo piroclástico",))],
        cuadros, tiempos,
        metricas=[
            ("Columna eruptiva", f"{_fmt(h_col, 1)} km", f"Mastin et al. (2009) · {_fmt(caudal_dre)} m³/s DRE"),
            ("Flujos piroclásticos", f"{_fmt(pdc.sum() * mundo.area_celda_km2, 1)} km²",
             f"{_personas(pob_pdc)} personas en la zona"),
            ("Lahares", f"{_fmt(lahar.sum() * mundo.area_celda_km2, 1)} km²",
             f"{len(inicios)} cauces · {_personas(pob_lahar)} personas"),
            ("Ceniza ≥ 1 cm", _personas(pob_ceniza) + " personas",
             f"{_fmt(float(((espesor_cm >= 1) & ~mundo.mar).sum() * mundo.area_celda_km2), 1)} km²"),
            ("Víctimas sin alerta", _personas(victimas),
             f"Evacuación {_fmt(100 * evacuacion)} % · letalidad supuesta PDC 90 %, lahar 50 %"),
        ],
        resumen={"area_km2": float((zona_lahar_pdc | (espesor_cm >= 1)).sum() * mundo.area_celda_km2),
                 "expuestos": pob_pdc + pob_lahar + pob_ceniza, "victimas": victimas, "perdidas_usd": None},
        tabla=pd.DataFrame([
            {"Peligro": "Flujo piroclástico", "Área (km²)": round(float(pdc.sum() * mundo.area_celda_km2), 2),
             "Población": int(pob_pdc), "Modelo": f"Cono de energía H/L = {h_l:.2f}, Hc = {hc:.0f} m"},
            {"Peligro": "Lahar", "Área (km²)": round(float(lahar.sum() * mundo.area_celda_km2), 2),
             "Población": int(pob_lahar), "Modelo": f"LAHARZ, V = {volumen_lahar_hm3:g} hm³ por cauce"},
            {"Peligro": "Ceniza ≥ 1 cm", "Área (km²)": round(float(((espesor_cm >= 1) & ~mundo.mar).sum()
                                                                     * mundo.area_celda_km2), 2),
             "Población": int(pob_ceniza), "Modelo": "Advección–difusión (3 clases)"},
            {"Peligro": "Techos colapsados (viviendas)", "Área (km²)": None, "Población": int(viviendas_colapso),
             "Modelo": "Carga húmeda vs. techos débiles (Spence et al., 2005)"},
        ]),
        notas=[f"Cráter a {_fmt(zv)} m. Volumen de tefra {_fmt(v_bulk / 1e6)} hm³ en {_fmt(duracion_h)} h; "
               f"queda dentro del mundo el {_fmt(100 * float(carga.sum()) * pix ** 2 / masa)} % de la masa.",
               "Las velocidades del lahar (8 m/s) y del flujo piroclástico (40 m/s), la altura de colapso y las "
               "letalidades son supuestos del juego; las áreas sí provienen de los modelos publicados.",
               "Ecuador cuenta con sistemas de alerta temprana de lahares (p. ej. Cotopaxi): sube la evacuación para "
               "ver su efecto."],
        modelos=["Iverson, R. M., Schilling, S. P. y Vallance, J. W. (1998). Objective delineation of lahar-inundation "
                 "hazard zones. *GSA Bull.* 110(8).",
                 "Malin, M. C. y Sheridan, M. F. (1982). Computer-assisted mapping of pyroclastic surges. *Science* 217.",
                 "Hayashi, J. N. y Self, S. (1992). A comparison of pyroclastic flow and debris avalanche mobility. "
                 "*J. Geophys. Res.* 97(B6).",
                 "Mastin, L. G. et al. (2009). A multidisciplinary effort to assign realistic source parameters to "
                 "models of volcanic ash-cloud transport. *J. Volcanol. Geotherm. Res.* 186.",
                 "Suzuki, T. (1983). A theoretical model for dispersion of tephra. *Arc Volcanism: Physics and Tectonics*.",
                 "Bonadonna, C. et al. (2005). Probabilistic modeling of tephra dispersal (TEPHRA2). *J. Geophys. Res.* 110.",
                 "Spence, R. J. S. et al. (2005). Building vulnerability and human casualty estimation for a pyroclastic "
                 "flow / tephra fall. *Nat. Hazards Earth Syst. Sci.* 5.",
                 "Newhall, C. G. y Self, S. (1982). The Volcanic Explosivity Index (VEI). *J. Geophys. Res.* 87."],
    )
    _nisar_volcan(evento, mundo, lahar | pdc, espesor_cm, rng)
    return evento


def _conectado(mascara: np.ndarray, i: int, j: int) -> np.ndarray:
    """Celdas de la máscara conectadas (vecindad 8) con (i, j)."""
    salida = np.zeros_like(mascara)
    if not mascara[i, j]:
        return salida
    n0, n1 = mascara.shape
    pila = [(i, j)]
    salida[i, j] = True
    while pila:
        a, b = pila.pop()
        for di, dj in VECINOS:
            c, d = a + di, b + dj
            if 0 <= c < n0 and 0 <= d < n1 and mascara[c, d] and not salida[c, d]:
                salida[c, d] = True
                pila.append((c, d))
    return salida


# ---------------------------------------------------------------------------
# 8. Fundar ciudad (herramienta creativa del jugador)
# ---------------------------------------------------------------------------

def ciudad_fundada(mundo: Mundo, i: int, j: int, habitantes: int, nombre: str) -> tuple:
    """Tupla (nombre, lat, lon, habitantes) para volver a crear el mundo con la nueva ciudad."""
    lat, lon = mundo.latlon(i, j)
    return (nombre, round(lat, 5), round(lon, 5), int(habitantes))


# ---------------------------------------------------------------------------
# 9. Observación NISAR simulada y detección
# ---------------------------------------------------------------------------

LOOKS_NISAR = 12.0          # ENL de un píxel GCOV de ~20 m
PIXEL_GCOV_M = 20.0


def enl_celda(mundo: Mundo) -> float:
    """Looks equivalentes de una celda del mundo: los píxeles GCOV que contiene × su ENL (máx. 500)."""
    return float(min(LOOKS_NISAR * (mundo.pixel_m / PIXEL_GCOV_M) ** 2, 500.0))


def _iou(a: np.ndarray, b: np.ndarray) -> float:
    union = (a | b).sum()
    return float((a & b).sum() / union) if union else 1.0


def _metricas_deteccion(detectado: np.ndarray, verdad: np.ndarray, mundo: Mundo, nombre: str) -> list:
    tp = float((detectado & verdad).sum())
    precision = tp / max(float(detectado.sum()), 1.0)
    recall = tp / max(float(verdad.sum()), 1.0)
    return [
        (f"{nombre} detectado por NISAR", f"{_fmt(detectado.sum() * mundo.area_celda_km2, 1)} km²",
         f"Real: {_fmt(verdad.sum() * mundo.area_celda_km2, 1)} km²"),
        ("Acierto (IoU)", f"{_fmt(100 * _iou(detectado, verdad))} %", "Intersección / unión con la verdad del modelo"),
        ("Precisión · exhaustividad", f"{_fmt(100 * precision)} % · {_fmt(100 * recall)} %",
         "Falsas alarmas · áreas no vistas"),
    ]


def _proxima_pasada(rng) -> str:
    return f"{int(rng.integers(1, nisar.CICLO_DIAS + 1))} días después del evento (ciclo de {nisar.CICLO_DIAS} días)"


def _nisar_incendio(ev: Evento, mundo: Mundo, biomasa_post, quemado, rng) -> None:
    textura = nisar.de_db(0.7 * nisar.campo_suave(rng, mundo.n, 1.5))
    hv = []
    for b in (mundo.biomasa, biomasa_post):
        s = nisar.nube_de_agua(b, nisar.HV_BOSQUE["A"], nisar.HV_BOSQUE["s_suelo"], nisar.HV_BOSQUE["b"]) * textura
        s = np.where(mundo.mar, 1e-4, s)
        hv.append(nisar.speckle(rng, s, enl_celda(mundo)))
    lr = nisar.a_db(nisar.promedio_movil(hv[1], 3) / nisar.promedio_movil(hv[0], 3))
    detectado = (lr < -2.5) & ~mundo.mar
    ev.nisar_paneles = [
        nisar.Panel("σ⁰ HV antes (dB)", nisar.a_db(hv[0]), "gris", -30, -8, "dB"),
        nisar.Panel("σ⁰ HV después (dB)", nisar.a_db(hv[1]), "gris", -30, -8, "dB"),
        nisar.Panel("Razón logarítmica HV después/antes", lr, "divergente", -6, 6, "dB"),
    ]
    ev.nisar_metricas = _metricas_deteccion(detectado, quemado, mundo, "Área quemada")
    ev.notas.append("NISAR: la próxima pasada llega " + _proxima_pasada(rng) + "; quemado ⟺ LR < −2,5 dB en HV.")


def _sigma_cobertura(mundo: Mundo, calado: np.ndarray, rng, textura: np.ndarray, viento: float):
    """σ⁰ HH y HV (dB) por cobertura y calado, con las firmas de la app (tabla de humedales).

    La textura del terreno es la misma en las dos fechas; cambian el speckle y el viento sobre el agua.
    """
    cob = mundo.cobertura
    bosque = np.isin(cob, [BOSQUE_ANDINO, BOSQUE_HUMEDO, BOSQUE_SECO])
    urbano = cob == URBANO
    mojado = calado > 0.15                              # mismo umbral que la «verdad» del modelo
    clase = np.where(bosque, 3, 4)                     # bosque / herbácea (índices de nisar.TABLA_HH)
    clase = np.where(mojado & ~bosque & (calado > 0.25), 0, clase)
    clase = np.where(mojado & ~bosque & (calado <= 0.25), 1, clase)
    clase = np.where(mojado & bosque, 2, clase)
    clase = np.where(mundo.mar, 0, clase)
    hh = nisar.TABLA_HH[clase] + np.where(urbano & ~mojado, 6.0, 0.0)
    hv = nisar.TABLA_HV[clase] + np.where(urbano & ~mojado, 3.0, 0.0)
    hh = hh + textura + np.where(clase == 0, viento, 0)
    hv = hv + textura + np.where(clase == 0, viento / 2, 0)
    enl = enl_celda(mundo)
    return (nisar.a_db(nisar.speckle(rng, nisar.de_db(hh), enl)),
            nisar.a_db(nisar.speckle(rng, nisar.de_db(hv), enl)))


def _nisar_agua(ev: Evento, mundo: Mundo, hmax: np.ndarray, rng, desliz: np.ndarray | None = None) -> None:
    textura = 0.8 * nisar.campo_suave(rng, mundo.n, 1.5)
    hh0, hv0 = _sigma_cobertura(mundo, np.zeros_like(hmax), rng, textura, rng.uniform(0, 3))
    hh1, hv1 = _sigma_cobertura(mundo, hmax, rng, textura, rng.uniform(0, 3))
    antes = nisar.clasificar_inundacion(hh0, hv0)
    despues = nisar.clasificar_inundacion(hh1, hv1)
    # Detección bitemporal: clase nueva o cambio fuerte de HH (agua abierta oscurece; el doble rebote realza).
    d_hh = hh1 - hh0
    detectado = ((despues & ~antes) | (d_hh < -5.0) | (d_hh > 3.0)) & ~mundo.mar
    verdad = (hmax > 0.15) & ~mundo.mar
    cat = np.zeros(hmax.shape, np.int8)
    cat[detectado & verdad] = 1
    cat[detectado & ~verdad] = 2
    cat[~detectado & verdad] = 3
    ev.nisar_paneles = [
        nisar.Panel("σ⁰ HH antes (dB)", hh0, "gris", -25, 0, "dB"),
        nisar.Panel("σ⁰ HH en el pico de la crecida (dB)", hh1, "gris", -25, 0, "dB"),
        nisar.Panel("Detección de inundación", cat, "categorias",
                    leyenda=[("Detectado", nisar.AZUL), ("Falsa alarma", nisar.NARANJA), ("No detectado", nisar.NEUTRO)]),
    ]
    ev.nisar_metricas = _metricas_deteccion(detectado, verdad, mundo, "Área inundada")
    ev.notas.append("NISAR (GCOV): cambio de HH entre fechas (< −5 dB agua abierta, > +3 dB doble rebote) y clasificación de "
                    "inundación de la app. Se compara la "
                    "extensión máxima simulada; en la pasada real el agua puede haber bajado ("
                    + _proxima_pasada(rng) + ").")


def _nisar_deformacion(ev: Evento, mundo: Mundo, ue, un, uz, desliz, rng) -> None:
    le, ln, lu = nisar.vector_los(mundo.lat, "Ascendente", 40.0)
    los_cm = 100.0 * (ue * le + un * ln + uz * lu)
    atm = 1.2 * nisar.campo_turbulento(rng, mundo.n)
    coh = np.clip(0.75 - 0.15 * nisar.campo_suave(rng, mundo.n, 5), 0.3, 0.95)
    coh[desliz] = 0.08
    ruido = nisar.sigma_fase(coh, enl_celda(mundo)) * rng.standard_normal(los_cm.shape)
    fase = -4 * math.pi / (nisar.LAMBDA_L_M * 100.0) * (los_cm + atm) + ruido
    envuelta = np.angle(np.exp(1j * fase))
    envuelta[mundo.mar] = np.nan
    obs = np.where(mundo.mar, np.nan, los_cm + atm)
    lim = max(float(np.nanpercentile(np.abs(obs), 99)), 1.0) if np.isfinite(obs).any() else 1.0
    ev.nisar_paneles = [
        nisar.Panel("Interferograma envuelto (fase LOS)", envuelta, "ciclico", -math.pi, math.pi, "rad"),
        nisar.Panel("Desplazamiento en la línea de vista", obs, "divergente", -lim, lim, "cm (+ hacia el satélite)"),
        nisar.Panel("Coherencia interferométrica", np.where(mundo.mar, np.nan, coh), "secuencial", 0, 1, "γ"),
    ]
    franjas = float(np.nanmax(obs) - np.nanmin(obs)) / (nisar.LAMBDA_L_M * 50.0) if np.isfinite(obs).any() else 0.0
    detectado = (coh < 0.2) & ~mundo.mar
    ev.nisar_metricas = [
        ("Franjas en el interferograma", _fmt(franjas), f"Una franja = λ/2 = {_fmt(nisar.LAMBDA_L_M * 50, 1)} cm"),
        ("Desplazamiento LOS máximo", f"{_fmt(float(np.nanmax(np.abs(los_cm[~mundo.mar]))) if (~mundo.mar).any() else 0, 1)} cm",
         "Okada (1985) proyectado a la LOS ascendente"),
        ("Deslizamientos (pérdida de coherencia)", f"{_fmt(detectado.sum() * mundo.area_celda_km2, 2)} km²",
         f"Acierto (IoU) {_fmt(100 * _iou(detectado, desliz & ~mundo.mar))} %"),
    ]
    ev.notas.append("NISAR (GUNW): interferograma de 12 días que abarca el sismo; la atmósfera añade ~1 cm de ruido "
                    "turbulento. El mar no tiene coherencia.")


def _nisar_volcan(ev: Evento, mundo: Mundo, flujos: np.ndarray, espesor_cm: np.ndarray, rng) -> None:
    coh0 = np.clip(0.65 - 0.15 * nisar.campo_suave(rng, mundo.n, 5), 0.25, 0.92)
    coh = coh0 * np.exp(-np.clip(espesor_cm, 0, None) / 5.0)      # la ceniza decorrelaciona la fase
    coh = np.where(flujos, 0.06, coh)
    obs = np.clip(coh + 0.04 * rng.standard_normal(coh.shape), 0, 1)
    detectado = (obs < 0.15) & ~mundo.mar
    verdad = (flujos | (espesor_cm > 10)) & ~mundo.mar
    ev.nisar_paneles = [
        nisar.Panel("Coherencia antes de la erupción", np.where(mundo.mar, np.nan, coh0), "secuencial", 0, 1, "γ"),
        nisar.Panel("Coherencia con la erupción", np.where(mundo.mar, np.nan, obs), "secuencial", 0, 1, "γ"),
        nisar.Panel("Pérdida de coherencia (antes − después)", np.where(mundo.mar, np.nan, coh0 - obs),
                    "divergente", -1, 1, "Δγ"),
    ]
    ev.nisar_metricas = _metricas_deteccion(detectado, verdad, mundo, "Flujos y ceniza > 10 cm")
    ev.notas.append("NISAR: la banda L ve a través de la nube de ceniza; los depósitos de lahar y flujo piroclástico "
                    "destruyen la coherencia interferométrica (" + _proxima_pasada(rng) + ").")


# ---------------------------------------------------------------------------
# Herramientas del juego
# ---------------------------------------------------------------------------

HERRAMIENTAS = {
    "incendio": ("🔥", "Incendio"),
    "tormenta": ("⛈️", "Tormenta"),
    "inundacion": ("🌊", "Desborde / marejada"),
    "terremoto": ("🌍", "Terremoto"),
    "erupcion": ("🌋", "Erupción"),
    "ciudad": ("🏙️", "Fundar ciudad"),
}

DESASTRES = {"incendio": incendio, "tormenta": tormenta, "inundacion": inundacion, "terremoto": terremoto,
             "erupcion": erupcion}


def desatar(tipo: str, mundo: Mundo, i: int, j: int, **parametros) -> Evento:
    """Ejecuta el desastre «tipo» en la celda (i, j) del mundo."""
    if tipo not in DESASTRES:
        raise ValueError(f"Desastre desconocido: {tipo}")
    return DESASTRES[tipo](mundo, int(i), int(j), **parametros)


# ---------------------------------------------------------------------------
# Pruebas unitarias (sin red: terreno sintético)
# ---------------------------------------------------------------------------

class TestDesastres(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mundo = crear_mundo(-1.40, -78.45, extension_km=20.0, n=60, fecha=date(2026, 8, 15), usar_dem=False)

    def test_mundo_coherente(self):
        m = self.mundo
        self.assertEqual(m.z.shape, (60, 60))
        self.assertTrue(np.all(m.poblacion >= 0))
        self.assertTrue(np.all(m.z_relleno >= m.z - 1e-9))
        self.assertAlmostEqual(float(m.acumulacion.max()) <= m.n ** 2, True)

    def test_allen2012_decrece_con_distancia(self):
        mmi = intensidad_allen2012(7.0, np.array([5.0, 20.0, 80.0, 200.0]))
        self.assertTrue(np.all(np.diff(mmi) < 0))
        self.assertTrue(7.5 < mmi[0] <= 10.0)

    def test_pager_y_jonkman_son_probabilidades(self):
        self.assertTrue(np.all((mortalidad_pager(np.arange(1, 11)) >= 0) & (mortalidad_pager(np.arange(1, 11)) <= 1)))
        self.assertLess(float(mortalidad_jonkman(1.0)), float(mortalidad_jonkman(5.0)))
        self.assertEqual(float(dano_inundacion(0.0)), 0.0)
        self.assertEqual(float(dano_inundacion(10.0)), 1.0)

    def test_wells_coppersmith_pedernales(self):
        largo, ancho, desliz = dimensiones_ruptura(7.8)
        self.assertTrue(100 < largo < 200 and 20 < ancho < 45 and 2 < desliz < 8)

    def test_aguas_someras_conserva_masa_en_cuenca_cerrada(self):
        m = self.mundo
        h0 = np.zeros((m.n, m.n))
        h0[25:35, 25:35] = 2.0
        cuenca = Mundo(**{**m.__dict__, "z": np.zeros((m.n, m.n)), "mar": np.zeros((m.n, m.n), bool)})
        cuenca.z[[0, -1], :] = cuenca.z[:, [0, -1]] = 100.0   # paredes
        sim = aguas_someras(cuenca, 0.5, h0=h0, cuadros=2)
        self.assertAlmostEqual(float(sim["h"].sum()), float(h0.sum()), delta=0.01 * float(h0.sum()))

    def test_laharz_respeta_area_planimetrica(self):
        zona, calado, _ = laharz(self.mundo, [(5, 30)], 1e6)
        b = 200 * (1e6) ** (2 / 3)
        self.assertLessEqual(zona.sum() * self.mundo.pixel_m ** 2, b + 30 * self.mundo.pixel_m ** 2)
        self.assertTrue(np.all(calado >= 0))

    def test_incendio_solo_quema_combustible(self):
        ev = incendio(self.mundo, 30, 30, horas=6.0)
        final = ev.cuadros[-1]["fuego"]
        no_combustible = np.isin(self.mundo.cobertura, [AGUA, GLACIAR])
        self.assertFalse(np.any((final > 0) & no_combustible))

    def test_desastres_devuelven_eventos(self):
        for tipo in ("tormenta", "terremoto", "erupcion"):
            ev = desatar(tipo, self.mundo, 30, 30)
            self.assertTrue(ev.cuadros and len(ev.cuadros) == len(ev.tiempos))
            self.assertTrue(ev.nisar_paneles)


if __name__ == "__main__":
    unittest.main()
