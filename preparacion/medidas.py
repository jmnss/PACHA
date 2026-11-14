"""Medidas sobre las máscaras: superficie (en la rejilla original), contorno de análisis y su GeoJSON."""
import numpy as np
from pyproj import Transformer
from rasterio.features import rasterize, shapes
from scipy import ndimage
import shapely
from shapely.geometry import MultiPolygon, mapping, shape

from preparacion.entrada import Raster
from preparacion.rejilla import Rejilla

_OCHO_VECINOS = np.ones((3, 3), int)


def _reproyectar(geom, f):
    return shapely.transform(geom, lambda xy: np.column_stack(f(xy[:, 0], xy[:, 1])))


def _area_pixel_m2(t) -> float:
    return abs(t.a * t.e - t.b * t.d)


def superficie_km2(r: Raster, codigo: int, dentro: np.ndarray | None) -> float:
    """Área real por píxel (de la rejilla original de `r`) × píxeles con ese código, dentro de la máscara booleana."""
    sel = r.datos == codigo
    if dentro is not None:
        sel &= dentro
    return float(sel.sum()) * _area_pixel_m2(r.transform) / 1e6


def contorno(mascaras_ref: list[np.ndarray], ref: Rejilla, codigo: int = 1, min_ha: float = 10,
             margen_m: float = 150) -> np.ndarray:
    """Unión, de todas las fechas, de las regiones conectadas (8 vecinos) de al menos `min_ha`, dilatada `margen_m`."""
    ha_px = _area_pixel_m2(ref.transform) / 1e4
    union = np.zeros(mascaras_ref[0].shape, bool)
    for m in mascaras_ref:
        etiquetas, n = ndimage.label(m == codigo, structure=_OCHO_VECINOS)
        if n == 0:
            continue
        tam = np.bincount(etiquetas.ravel(), minlength=n + 1)
        grandes = tam * ha_px >= min_ha
        grandes[0] = False
        union |= grandes[etiquetas]
    if margen_m > 0 and union.any():
        union = ndimage.distance_transform_edt(~union) * ref.resolucion_m <= margen_m
    return union


def contorno_a_geojson(contorno: np.ndarray, ref: Rejilla, simplificar_m: float = 20) -> dict:
    """FeatureCollection con un MultiPolygon en WGS84 (simplificado en metros antes de reproyectar)."""
    partes = []
    for g, v in shapes(contorno.astype(np.uint8), mask=contorno, transform=ref.transform):
        if v == 1:
            p = shape(g)
            p = p.simplify(simplificar_m) if simplificar_m else p
            partes.extend(p.geoms if p.geom_type == "MultiPolygon" else [p])
    multi = MultiPolygon([p for p in partes if not p.is_empty])
    ida = Transformer.from_crs(ref.crs, "EPSG:4326", always_xy=True).transform
    geom = _reproyectar(multi, ida)
    return {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": mapping(geom)}]}


def geojson_a_mascara(gj: dict, rejilla: Rejilla) -> np.ndarray:
    """Rasteriza un GeoJSON (FeatureCollection, Feature o geometría en WGS84) en la rejilla."""
    if gj.get("type") == "FeatureCollection":
        geoms = [f["geometry"] for f in gj["features"]]
    elif gj.get("type") == "Feature":
        geoms = [gj["geometry"]]
    else:
        geoms = [gj]
    ida = Transformer.from_crs("EPSG:4326", rejilla.crs, always_xy=True).transform
    formas = [mapping(_reproyectar(shape(g), ida)) for g in geoms]
    if not formas:
        return np.zeros((rejilla.alto, rejilla.ancho), bool)
    return rasterize(formas, out_shape=(rejilla.alto, rejilla.ancho), transform=rejilla.transform,
                     fill=0, default_value=1, dtype="uint8").astype(bool)
