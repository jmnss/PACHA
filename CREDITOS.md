# Créditos

Fuentes de datos, tipografía y referencias científicas que usa este proyecto. Los datos de NISAR **no** se
usan todavía: todo lo que muestra la app es sintético (ver `README.es.md`).

## Datos y cartografía

| Recurso | Uso | Licencia / acceso |
|---|---|---|
| NASA POWER (power.larc.nasa.gov) | Climatología 2001–2025 (`data/clima_ecuador_power.csv`) | Datos abiertos de la NASA; cita al proyecto NASA POWER |
| geoBoundaries | Límites provinciales (`data/ecuador_provincias.geojson`) | CC0 |
| SRTM / Terrain Tiles (AWS Open Data) | Relieve del Modo Dios, **solo en la app Streamlit heredada** (`data/terreno/`) | AWS Open Data |
| OpenFreeMap | Mapa base opcional del Observatorio (desactivable) | Datos abiertos; atribución en el mapa |
| OpenStreetMap | Datos de OpenFreeMap | ODbL, © colaboradores de OpenStreetMap |
| ASF DAAC y productos NISAR | — | Se acreditarán cuando se usen datos reales |

## Tipografía

- Public Sans (vía `@fontsource/public-sans`), SIL Open Font License 1.1.

## Modelos científicos y referencias (tal como se citan en `app.py`)

- NISAR Science Users' Handbook, NASA-JPL / ISRO.
- ASF DAAC, documentación de productos NISAR: nisar-docs.asf.alaska.edu
- Okada, Y. (1985). Surface deformation due to shear and tensile faults in a half-space. *BSSA* 75(4).
- Attema, E. y Ulaby, F. (1978). Vegetation modeled as a water cloud. *Radio Science* 13(2).
- Hanssen, R. (2001). *Radar Interferometry: Data Interpretation and Error Analysis*. Kluwer.
- Glen, J. W. (1955). The creep of polycrystalline ice. *Proc. R. Soc. A* 228.
- Allen, R. G. et al. (1998). *Crop evapotranspiration* (FAO Irrigation and Drainage Paper 56).
- Hargreaves, G. H. y Samani, Z. A. (1985). Reference crop evapotranspiration from temperature.
  *Appl. Eng. Agric.* 1(2).
- NASA POWER Project: power.larc.nasa.gov (climatología 2001–2025).

El desarrollo matemático completo está en `docs/modelo_nisar_ecuador.pdf`.
