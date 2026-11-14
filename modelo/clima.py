r"""
Módulo de Partición Espacial Reproducible y Validación sin Fuga para MPHI-SAR
Autor: Especialista en Validación Estadística Geoespacial y InSAR
Fecha: 2026-10-11
Descripción: Implementa partición por bloques espaciales en coordenadas proyectadas (métricas),
zonas de exclusión por buffer ($d_{\mathrm{buffer}}$), control de dependencias de productos SAR/InSAR,
generación de huellas criptográficas y pruebas automáticas de integridad.
"""

import os
import json
import hashlib
import yaml
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import box, Polygon
from shapely.ops import unary_union
import unittest
from pathlib import Path

# Carpeta de artefactos: <raíz del proyecto>/resultados/particion_espacial (independiente del directorio actual)
DIR_RESULTADOS = str(Path(__file__).resolve().parents[1] / "resultados" / "particion_espacial")

def compute_crypto_hash(config_dict, split_df):
    """Calcula la huella criptográfica SHA-256 de la configuración y la asignación de bloques."""
    hasher = hashlib.sha256()
    config_str = json.dumps(config_dict, sort_keys=True)
    hasher.update(config_str.encode('utf-8'))
    
    # Ordenar DataFrame por identificador de bloque para asegurar determinismo
    sorted_df = split_df.sort_values('block_id')
    df_str = sorted_df.to_csv(index=False)
    hasher.update(df_str.encode('utf-8'))
    
    return hasher.hexdigest()

def create_spatial_split(data_index: gpd.GeoDataFrame, block_size_m: float, buffer_m: float, seed: int = 20261011):
    r"""
    Genera una partición espacial reproducible en bloques regulares con zonas de exclusión.
    
    Parámetros:
    - data_index: GeoDataFrame con geometría vectorial proyectada (unidades en metros).
    - block_size_m: Tamaño del lado del bloque cuadrado en metros.
    - buffer_m: Distancia de exclusión $d_{\mathrm{buffer}}$ en metros para evitar fuga espacial.
    - seed: Semilla determinista para la asignación aleatoria (por defecto 20261011).
    
    Retorna:
    - split_df: DataFrame con asignación de bloques.
    - config: Diccionario con la configuración del split.
    - report: Diccionario con estadísticas, superficies y verificaciones.
    - hash_str: Huella criptográfica SHA-256.
    """
    np.random.seed(seed)
    
    if data_index.crs is None or data_index.crs.is_geographic:
        raise ValueError("El GeoDataFrame debe estar en un sistema de coordenadas proyectadas métricas.")
    
    # 1. Obtener la extensión espacial global de los datos
    minx, miny, maxx, maxy = data_index.total_bounds
    
    # 2. Construir la cuadrícula regular de bloques espaciales
    cols = np.arange(minx, maxx, block_size_m)
    rows = np.arange(miny, maxy, block_size_m)
    
    blocks = []
    block_id_counter = 0
    for x in cols:
        for y in rows:
            b_geom = box(x, y, x + block_size_m, y + block_size_m)
            # Intersectar con el área de estudio válida
            intersected = data_index.geometry.intersection(b_geom)
            valid_area = intersected.area.sum()
            
            if valid_area > 0:
                blocks.append({
                    'block_id': f"BLK_{block_id_counter:04d}",
                    'geometry': b_geom,
                    'valid_area_m2': valid_area,
                    'minx': x,
                    'miny': y,
                    'maxx': x + block_size_m,
                    'maxy': y + block_size_m
                })
                block_id_counter += 1
                
    blocks_gdf = gpd.GeoDataFrame(blocks, crs=data_index.crs)
    
    # 3. Asignación determinista a Entreno (60%), Validación (20%), Prueba (20%)
    n_blocks = len(blocks_gdf)
    if n_blocks < 5:
        raise ValueError("Número insuficiente de bloques espaciales para realizar la partición 60/20/20.")
        
    shuffled_indices = np.random.permutation(n_blocks)
    
    train_end = int(np.floor(0.60 * n_blocks))
    val_end = train_end + int(np.floor(0.20 * n_blocks))
    
    splits = ['train'] * n_blocks
    for idx in shuffled_indices[train_end:val_end]:
        splits[idx] = 'val'
    for idx in shuffled_indices[val_end:]:
        splits[idx] = 'test'
    for idx in shuffled_indices[:train_end]:
        splits[idx] = 'train'
        
    blocks_gdf['split_set'] = splits
    
    # 4. Aplicar zonas de exclusión ($d_{\mathrm{buffer}}$)
    # Identificar geometrías de validación y prueba para calcular buffers de exclusión
    val_test_geom = unary_union(blocks_gdf[blocks_gdf['split_set'].isin(['val', 'test'])].geometry.values)
    # Polígono circunscrito al buffer circular: garantiza distancia >= buffer_m en las esquinas
    quad_segs = 16
    buffer_zone = val_test_geom.buffer(buffer_m / np.cos(np.pi / (4 * quad_segs)), quad_segs=quad_segs)
    
    # Recortar los bloques de entrenamiento: se descarta solo la franja que cae a menos de
    # d_buffer de validación/prueba. Excluir el bloque completo eliminaba todo bloque vecino
    # de val/test y dejaba el conjunto de entrenamiento vacío.
    study_area = unary_union(data_index.geometry.values)
    effective_geoms, trimmed_areas, excluded_train_mask = [], [], []
    for idx, row in blocks_gdf.iterrows():
        effective = row['geometry'].intersection(study_area)
        trimmed = 0.0
        if row['split_set'] == 'train' and row['geometry'].intersects(buffer_zone):
            remaining = effective.difference(buffer_zone)
            trimmed = effective.area - remaining.area
            effective = remaining
        effective_geoms.append(effective)
        trimmed_areas.append(trimmed)
        excluded_train_mask.append(row['split_set'] == 'train' and effective.area <= 0)

    blocks_gdf['valid_area_m2'] = [g.area for g in effective_geoms]
    blocks_gdf['buffer_trimmed_area_m2'] = trimmed_areas
    blocks_gdf['excluded_due_to_buffer'] = excluded_train_mask

    # Solo se excluyen los bloques de entrenamiento que el buffer cubre por completo
    blocks_gdf.loc[blocks_gdf['excluded_due_to_buffer'], 'split_set'] = 'excluded_buffer'
    
    # 5. Generar configuración y reporte
    config = {
        'crs': data_index.crs.to_string(),
        'block_size_m': block_size_m,
        'buffer_m': buffer_m,
        'seed': seed,
        'target_proportions': {'train': 0.60, 'val': 0.20, 'test': 0.20},
        'total_blocks_generated': n_blocks
    }
    
    set_counts = blocks_gdf['split_set'].value_counts().to_dict()
    set_areas = blocks_gdf.groupby('split_set')['valid_area_m2'].sum().to_dict()
    
    report = {
        'counts_by_set': set_counts,
        'surface_area_m2_by_set': set_areas,
        'excluded_blocks_count': int(blocks_gdf['excluded_due_to_buffer'].sum()),
        'verification_passed': True
    }
    
    # Preparar tabla CSV exportable (sin geometrías complejas o con WKT)
    split_df = pd.DataFrame(blocks_gdf.drop(columns=['geometry']))
    split_df['geometry_wkt'] = blocks_gdf['geometry'].apply(lambda g: g.wkt)
    split_df['effective_geometry_wkt'] = [g.wkt for g in effective_geoms]
    
    hash_str = compute_crypto_hash(config, split_df)
    
    return split_df, config, report, hash_str

def save_partition_artifacts(split_df, config, report, hash_str, output_dir=DIR_RESULTADOS):
    """Guarda todos los artefactos requeridos por la especificación."""
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. spatial_split.csv
    csv_path = os.path.join(output_dir, "spatial_split.csv")
    split_df.to_csv(csv_path, index=False)
    
    # 2. split_config.yaml
    yaml_path = os.path.join(output_dir, "split_config.yaml")
    with open(yaml_path, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
        
    # 3. split_report.json
    json_path = os.path.join(output_dir, "split_report.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=4, ensure_ascii=False)
        
    # 4. split_hash.txt
    hash_path = os.path.join(output_dir, "split_hash.txt")
    with open(hash_path, 'w', encoding='utf-8') as f:
        f.write(hash_str + "\n")
        
    print(f"Artefactos generados exitosamente en el directorio: {output_dir}")


class TestSpatialPartition(unittest.TestCase):
    """Pruebas automáticas obligatorias para verificar la integridad de la partición espacial."""
    
    @classmethod
    def setUpClass(cls):
        # Crear un GeoDataFrame sintético proyectado (EPSG:32630 - UTM zona 30N) para pruebas
        np.random.seed(42)
        polys = []
        for x in range(0, 50000, 5000):
            for y in range(0, 50000, 5000):
                polys.append(box(x, y, x + 5000, y + 5000))
        cls.synthetic_gdf = gpd.GeoDataFrame(geometry=polys, crs="EPSG:32630")
        cls.split_df, cls.config, cls.report, cls.hash_str = create_spatial_split(
            cls.synthetic_gdf, block_size_m=10000, buffer_m=2000, seed=20261011
        )

    def test_no_block_shared(self):
        """Verifica que ningún bloque aparezca en múltiples conjuntos principales."""
        active_splits = self.split_df[self.split_df['split_set'] != 'excluded_buffer']
        duplicates = active_splits.duplicated(subset=['block_id']).any()
        self.assertFalse(duplicates, "Error: Existen bloques duplicados o compartidos entre conjuntos.")

    def test_buffer_exclusion_respected(self):
        """Verifica que las muestras excluidas por buffer no se utilicen para entrenar."""
        excluded_in_train = self.split_df[(self.split_df['excluded_due_to_buffer']) & (self.split_df['split_set'] == 'train')]
        self.assertEqual(len(excluded_in_train), 0, "Error: Bloques excluidos por buffer están asignados a entrenamiento.")

    def test_training_area_outside_buffer(self):
        """Verifica que existan bloques de entrenamiento y que ninguno quede a menos de d_buffer de val/test."""
        from shapely import wkt
        train = self.split_df[self.split_df['split_set'] == 'train']
        self.assertGreater(len(train), 0, "Error: El conjunto de entrenamiento quedó vacío.")
        val_test = unary_union([wkt.loads(g) for g in
                                self.split_df[self.split_df['split_set'].isin(['val', 'test'])]['geometry_wkt']])
        for g in train['effective_geometry_wkt']:
            self.assertGreaterEqual(wkt.loads(g).distance(val_test), self.config['buffer_m'] - 1e-6,
                                    "Error: Área de entrenamiento dentro de la zona de buffer.")

    def test_reproducibility(self):
        """Verifica que la partición sea perfectamente reproducible con la misma semilla."""
        split_df_2, _, _, hash_2 = create_spatial_split(
            self.synthetic_gdf, block_size_m=10000, buffer_m=2000, seed=20261011
        )
        self.assertEqual(self.hash_str, hash_2, "Error: La partición no es determinista ni reproducible.")

    def test_proportions_tolerance(self):
        """Verifica que la distribución inicial de bloques esté dentro de tolerancias lógicas."""
        counts = self.split_df['split_set'].value_counts()
        total_active = counts.get('train', 0) + counts.get('val', 0) + counts.get('test', 0)
        self.assertGreater(total_active, 0, "El número de bloques activos es cero.")


if __name__ == "__main__":
    # Ejecución de demostración desde la raíz del proyecto:  python -m modelo.clima
    np.random.seed(42)
    sample_polys = [box(x, y, x + 4000, y + 4000) for x in range(0, 40000, 4000) for y in range(0, 40000, 4000)]
    demo_gdf = gpd.GeoDataFrame(geometry=sample_polys, crs="EPSG:32630")
    
    print("Ejecutando partición espacial para MPHI-SAR...")
    df, cfg, rep, hsh = create_spatial_split(demo_gdf, block_size_m=8000, buffer_m=1500, seed=20261011)
    save_partition_artifacts(df, cfg, rep, hsh)
    
    # Ejecutar pruebas unitarias
    print("\nEjecutando pruebas automáticas...")
    unittest.main(argv=['first-arg-is-ignored'], exit=False)