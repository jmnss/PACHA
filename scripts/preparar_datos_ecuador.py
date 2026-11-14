"""
Prepara los datos de Ecuador que usan la app y el módulo de estaciones (se ejecuta una sola vez).

Genera, en la carpeta data/:
  - ecuador_provincias.geojson  24 provincias (geoBoundaries ADM1, CC0) con su región natural.
  - clima_ecuador_power.csv     Climatología mensual 2001–2025 de NASA POWER en la malla nativa
                                MERRA-2 (0,5° × 0,625°) que cubre el Ecuador continental y Galápagos.

Ejecutar con:  python scripts/preparar_datos_ecuador.py
"""

import json                                                       # lectura/escritura de GeoJSON
from pathlib import Path                                          # rutas independientes del sistema

import pandas as pd                                               # tabla final de la climatología
import requests                                                   # descargas HTTP
from shapely.geometry import mapping, shape                       # conversión GeoJSON ↔ shapely

DATA = Path(__file__).resolve().parents[1] / "data"                  # carpeta de datos del proyecto
URL_PROVINCIAS = ("https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/ECU/ADM1/"
                  "geoBoundaries-ECU-ADM1_simplified.geojson")    # límites provinciales (dominio público)
URL_POWER = "https://power.larc.nasa.gov/api/temporal/climatology/regional"  # API de climatología regional
PARAMETROS_POWER = {                                              # parámetro POWER → columna de salida
    "PRECTOTCORR": "prec_mm_dia",                                 # precipitación corregida por sesgo (mm/día)
    "T2M": "t2m_c",                                               # temperatura media a 2 m (°C)
    "T2M_RANGE": "t2m_rango_c",                                   # rango térmico diario medio (°C)
    "PW": "pw_cm",                                                # agua precipitable de la columna (cm)
}
CAJAS = {                                                         # (lat mín, lat máx, lon mín, lon máx)
    "continente": (-5.5, 2.0, -81.5, -75.0),                      # Ecuador continental con margen
    "galapagos": (-2.0, 2.0, -92.5, -89.0),                       # archipiélago de Galápagos
}
REGIONES = {                                                      # región natural de cada provincia (INEC)
    "Costa": ["El Oro", "Esmeraldas", "Guayas", "Los Ríos", "Manabí", "Santa Elena",
              "Santo Domingo de los Tsáchilas"],
    "Sierra": ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "Imbabura", "Loja",
               "Pichincha", "Tungurahua"],
    "Amazonía": ["Morona Santiago", "Napo", "Orellana", "Pastaza", "Sucumbíos", "Zamora Chinchipe"],
    "Insular": ["Galápagos"],
}
MESES_POWER = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def _normalizar(nombre: str) -> str:
    """Clave sin tildes ni mayúsculas para emparejar nombres de provincias."""
    tabla = str.maketrans("áéíóúñÁÉÍÓÚÑ", "aeiounAEIOUN")         # quita tildes y eñes
    return nombre.translate(tabla).lower().replace("-", " ").strip()


def preparar_provincias() -> None:
    """Descarga las provincias, asigna la región natural y simplifica la geometría (~300 m)."""
    datos = requests.get(URL_PROVINCIAS, timeout=120).json()      # FeatureCollection de geoBoundaries
    region_de = {_normalizar(p): r for r, provs in REGIONES.items() for p in provs}  # índice provincia → región
    nombre_de = {_normalizar(p): p for provs in REGIONES.values() for p in provs}    # nombre oficial con tildes
    salida = []
    for f in datos["features"]:
        clave = _normalizar(f["properties"]["shapeName"])         # nombre de geoBoundaries normalizado
        if clave not in region_de:
            raise ValueError(f"Provincia sin región asignada: {f['properties']['shapeName']}")
        geom = shape(f["geometry"]).buffer(0).simplify(0.003, preserve_topology=True)  # repara y simplifica
        salida.append({"type": "Feature",
                       "properties": {"provincia": nombre_de[clave], "region": region_de[clave],
                                      "iso": f["properties"].get("shapeISO", "")},
                       "geometry": mapping(geom)})
    if len(salida) != 24:                                         # Ecuador tiene 24 provincias
        raise ValueError(f"Se esperaban 24 provincias y llegaron {len(salida)}")
    coleccion = {"type": "FeatureCollection",
                 "fuente": "geoBoundaries gbOpen ECU ADM1 (CC0 1.0); Runfola et al. (2020)",
                 "features": salida}
    texto = json.dumps(coleccion, ensure_ascii=False, separators=(",", ":"))
    (DATA / "ecuador_provincias.geojson").write_text(texto, encoding="utf-8")
    print(f"ecuador_provincias.geojson: {len(salida)} provincias, {len(texto) / 1e3:.0f} kB")


def _power_regional(parametro: str, caja: tuple) -> list[dict]:
    """Climatología mensual de un parámetro POWER en todos los nodos de la malla dentro de la caja."""
    s, n, o, e = caja
    r = requests.get(URL_POWER, params={
        "latitude-min": s, "latitude-max": n, "longitude-min": o, "longitude-max": e,
        "parameters": parametro, "community": "AG", "format": "JSON"}, timeout=300)
    r.raise_for_status()
    cuerpo = r.json()
    filas = []
    for f in cuerpo["features"]:
        lon, lat, elev = f["geometry"]["coordinates"]             # POWER devuelve (lon, lat, elevación)
        valores = f["properties"]["parameter"][parametro]
        for m, clave_mes in enumerate(MESES_POWER, start=1):
            v = valores[clave_mes]
            filas.append({"lat": lat, "lon": lon, "elev_m": elev, "mes": m,
                          "valor": None if v == cuerpo["header"]["fill_value"] else v})
    return filas


def preparar_climatologia() -> None:
    """Descarga los parámetros en ambas cajas y los combina en una tabla larga por nodo y mes.

    PRECTOTCORR, T2M y T2M_RANGE comparten la malla MERRA-2 (0,5° × 0,625°); PW llega en una malla
    más gruesa (1°), así que a cada nodo MERRA-2 se le asigna el valor del nodo PW más cercano.
    """
    tablas = {}
    for parametro, columna in PARAMETROS_POWER.items():
        filas = [f for caja in CAJAS.values() for f in _power_regional(parametro, caja)]
        df = pd.DataFrame(filas).rename(columns={"valor": columna}).drop_duplicates(["lat", "lon", "mes"])
        tablas[parametro] = df
        print(f"  {parametro}: {len(df) // 12} nodos")
    base = tablas["PRECTOTCORR"]                                   # malla de referencia (con elevación)
    for parametro in ("T2M", "T2M_RANGE"):                         # misma malla: unión por nodo y mes
        columna = PARAMETROS_POWER[parametro]
        base = base.merge(tablas[parametro][["lat", "lon", "mes", columna]], on=["lat", "lon", "mes"])
    pw = tablas["PW"]
    nodos_pw = pw[["lat", "lon"]].drop_duplicates().to_numpy()     # nodos de la malla de 1°
    nodos = base[["lat", "lon"]].drop_duplicates().to_numpy()
    cercano = {}
    for lat, lon in nodos:                                         # vecino más próximo en grados
        k = ((nodos_pw[:, 0] - lat) ** 2 + (nodos_pw[:, 1] - lon) ** 2).argmin()
        cercano[(lat, lon)] = tuple(nodos_pw[k])
    base["lat_pw"] = [cercano[(a, b)][0] for a, b in zip(base["lat"], base["lon"])]
    base["lon_pw"] = [cercano[(a, b)][1] for a, b in zip(base["lat"], base["lon"])]
    base = base.merge(pw.rename(columns={"lat": "lat_pw", "lon": "lon_pw"})[["lat_pw", "lon_pw", "mes", "pw_cm"]],
                      on=["lat_pw", "lon_pw", "mes"]).drop(columns=["lat_pw", "lon_pw"])
    clima = base.sort_values(["lat", "lon", "mes"]).reset_index(drop=True)
    if clima[list(PARAMETROS_POWER.values())].isna().any().any():
        raise ValueError("La climatología tiene valores faltantes")
    clima.to_csv(DATA / "clima_ecuador_power.csv", index=False, float_format="%.3f")
    print(f"clima_ecuador_power.csv: {clima[['lat', 'lon']].drop_duplicates().shape[0]} nodos × 12 meses")


if __name__ == "__main__":
    DATA.mkdir(exist_ok=True)
    preparar_provincias()
    preparar_climatologia()
