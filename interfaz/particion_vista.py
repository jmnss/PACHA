"""Vista de la partición espacial reproducible (modelo/clima.py) para validar modelos entrenados con SAR."""

import json
from pathlib import Path

import altair as alt
import geopandas as gpd
import pandas as pd
import streamlit as st
import yaml
from shapely.geometry import box

from interfaz import tema


PROJECT_DIR = Path(__file__).resolve().parents[1]  # raíz del proyecto (interfaz/ está un nivel abajo)
OUTPUT_DIR = PROJECT_DIR / "resultados" / "particion_espacial"
ARCHIVOS = {
    "spatial_split.csv": OUTPUT_DIR / "spatial_split.csv",
    "split_config.yaml": OUTPUT_DIR / "split_config.yaml",
    "split_report.json": OUTPUT_DIR / "split_report.json",
    "split_hash.txt": OUTPUT_DIR / "split_hash.txt",
}
COLORES_CONJUNTO = {  # colores de datos del tema cyberpunk (orden fijo) y gris neutro para lo excluido
    "train": tema.SERIES[0],
    "val": tema.SERIES[1],
    "test": tema.SERIES[2],
    "excluded_buffer": tema.NEUTRO,
}
NOMBRES_CONJUNTO = {
    "train": "Entrenamiento",
    "val": "Validación",
    "test": "Prueba",
    "excluded_buffer": "Excluido por buffer",
}


def generar_artefactos() -> None:
    from modelo.clima import create_spatial_split, save_partition_artifacts

    sample_polys = [box(x, y, x + 4000, y + 4000) for x in range(0, 40000, 4000) for y in range(0, 40000, 4000)]
    demo_gdf = gpd.GeoDataFrame(geometry=sample_polys, crs="EPSG:32630")
    df, cfg, rep, hsh = create_spatial_split(demo_gdf, block_size_m=8000, buffer_m=1500, seed=20261011)
    save_partition_artifacts(df, cfg, rep, hsh, output_dir=str(OUTPUT_DIR))


def _kpi(columna, etiqueta, valor):
    columna.markdown(
        f"<div class='kpi-card'><div class='kpi-label'>{etiqueta}</div><div class='kpi-value'>{valor}</div></div>",
        unsafe_allow_html=True,
    )


def mostrar_particion() -> None:
    st.markdown(
        "Antes de entrenar un clasificador de cambios con píxeles NISAR, el dominio se divide en bloques "
        "espaciales con una zona de exclusión (buffer) entre entrenamiento y validación/prueba. Así la "
        "autocorrelación espacial del radar no infla las métricas."
    )
    if any(not ruta.is_file() for ruta in ARCHIVOS.values()):
        try:
            generar_artefactos()
        except Exception as exc:
            st.error(f"Faltan los artefactos de la partición y no pudieron generarse: {exc}")
            return

    split_df = pd.read_csv(ARCHIVOS["spatial_split.csv"])
    with ARCHIVOS["split_config.yaml"].open(encoding="utf-8") as f:
        config = yaml.safe_load(f)
    with ARCHIVOS["split_report.json"].open(encoding="utf-8") as f:
        report = json.load(f)
    hash_value = ARCHIVOS["split_hash.txt"].read_text(encoding="utf-8").strip()

    counts = report["counts_by_set"]
    columnas = st.columns(4)
    for columna, clave in zip(columnas, ["train", "val", "test", "excluded_buffer"]):
        _kpi(columna, NOMBRES_CONJUNTO[clave], int(counts.get(clave, 0)))

    if int(counts.get("train", 0)) == 0:
        st.warning("La partición actual no tiene bloques de entrenamiento: regenera los artefactos con `python -m modelo.clima`.")

    st.markdown("<div style='height: 1rem'></div>", unsafe_allow_html=True)
    disponibles = [c for c in NOMBRES_CONJUNTO if c in set(split_df["split_set"].dropna())]
    elegidos = st.multiselect(
        "Conjuntos visibles", options=disponibles, default=disponibles, format_func=NOMBRES_CONJUNTO.get
    )
    visibles = split_df[split_df["split_set"].isin(elegidos)].dropna(subset=["minx", "miny", "maxx", "maxy"]).copy()
    visibles["conjunto"] = visibles["split_set"].map(NOMBRES_CONJUNTO)

    if visibles.empty:
        st.info("Selecciona al menos un conjunto para mostrar sus bloques.")
    else:
        dominio = [NOMBRES_CONJUNTO[c] for c in disponibles]
        tooltip = [
            alt.Tooltip("block_id:N", title="Bloque"),
            alt.Tooltip("conjunto:N", title="Conjunto"),
            alt.Tooltip("valid_area_m2:Q", title="Área válida (m²)", format=",.0f"),
        ]
        if "buffer_trimmed_area_m2" in visibles.columns:
            tooltip.append(alt.Tooltip("buffer_trimmed_area_m2:Q", title="Recortado por buffer (m²)", format=",.0f"))
        grafico = tema.estilo_grafico(
            alt.Chart(visibles)
            .mark_rect(stroke=tema.FONDO, strokeWidth=2, cornerRadius=4)
            .encode(
                x=alt.X("minx:Q", title="Este (m)"),
                x2="maxx:Q",
                y=alt.Y("miny:Q", title="Norte (m)"),
                y2="maxy:Q",
                color=alt.Color(
                    "conjunto:N",
                    title=None,
                    scale=alt.Scale(domain=dominio, range=[COLORES_CONJUNTO[c] for c in disponibles]),
                    legend=alt.Legend(orient="top"),
                ),
                tooltip=tooltip,
            )
            .properties(height=480)
        )
        st.altair_chart(grafico, width="stretch", theme=None)
        st.caption(
            f"Cada bloque de entrenamiento pierde la franja situada a menos de {config.get('buffer_m')} m de "
            "validación o prueba (columna «Recortado por buffer»); solo se excluye si el recorte lo cubre entero."
        )

    with st.expander("Detalle de bloques y configuración"):
        st.dataframe(visibles.drop(columns=["geometry_wkt", "effective_geometry_wkt"], errors="ignore"),
                     hide_index=True)
        st.download_button(
            "Descargar CSV filtrado",
            data=visibles.to_csv(index=False).encode("utf-8"),
            file_name="spatial_split_filtrado.csv",
            mime="text/csv",
        )
        st.json({"configuración": config, "superficie_m2": report["surface_area_m2_by_set"],
                 "verificación": report["verification_passed"]})
        st.caption(f"SHA-256 de la partición: `{hash_value}`")
    st.caption("Artefactos en resultados/particion_espacial/ · desarrollo teórico en "
               "docs/teoria_particion_espacial.pdf")
