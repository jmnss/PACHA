# Catálogo NISAR sobre Ecuador (solo metadatos)

Generado por `scripts/explorar_catalogo.py` el 2026-11-14 15:28 UTC con `asf_search` (`dataset='NISAR'`, productos GCOV y GUNW, sin cuenta). **No se descargó ningún granulo.** Madurez según el nombre de la colección: con `BETA` o `PROVISIONAL` en el nombre, esa; sin marca, VALIDATED (`docs/nisar-verificado.md` §2). Frecuencia A = banda principal (`mainBandPolarization`); B = banda lateral (`sideBandPolarization`). Tamaño = el archivo `.h5`. Fechas en UTC. «UR» = respuesta urgente (`NISAR_UR_L2`): órbita de pronóstico, menos correcciones, y el archivo los borra a los 30 días (GU `urgent-response`); no sirven de base para la app.

Las cajas de «resto de Ecuador» y Galápagos son aproximadas: un granulo que solo roza el mar también cuenta.

## Humedal La Segua (Manabí)

Caja (oeste, sur, este, norte): `(-80.3, -0.8, -80.1, -0.6)`.

| Producto | Granulos | Primera | Última | BETA | PROVISIONAL | VALIDATED | UR | Tamaño total (GB) |
|---|---:|---|---|---:|---:|---:|---:|---:|
| GCOV | 20 | 2026-06-21 | 2026-10-31 | 0 | 18 | 2 | 0 | 136.6 |
| GUNW | 16 | 2026-06-21 | 2026-10-07 | 0 | 16 | 0 | 0 | 38.2 |

Se quitaron 2 granulos repetidos (misma adquisición reprocesada).

| Dirección | Track | Frame | Centro (lon, lat) | GCOV | GUNW | Polarizaciones (frecuencia) | Ancho de banda (MHz) | Fechas GCOV |
|---|---:|---:|---|---:|---:|---|---|---|
| asc. | 4 | 1 | -80.07, -1.12 | 10 | 8 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-26 → 2026-10-24 |
| desc. | 112 | 89 | -79.51, -0.99 | 10 | 8 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-21 → 2026-10-31 |

<details><summary>Lista de granulos GCOV</summary>

| Fecha (UTC) | Dir. | Track/frame | Madurez | Polarizaciones | Cobertura | GB | Granulo |
|---|---|---|---|---|---|---:|---|
| 2026-06-21 23:39 | desc. | 112/89 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 7.41 | `NISAR_L2_PR_GCOV_023_112_D_089_4005_DHDH_A_20260621T233911_20260621T233948_P05023_N_F_J_001` |
| 2026-06-26 11:01 | asc. | 4/1 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.07 | `NISAR_L2_PR_GCOV_024_004_A_001_4005_DHDH_A_20260626T110150_20260626T110224_P05023_N_F_J_001` |
| 2026-07-03 23:39 | desc. | 112/89 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 7.41 | `NISAR_L2_PR_GCOV_024_112_D_089_4005_DHDH_A_20260703T233910_20260703T233947_P05023_N_F_J_001` |
| 2026-07-08 11:01 | asc. | 4/1 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.22 | `NISAR_L2_PR_GCOV_025_004_A_001_4005_DHDH_A_20260708T110149_20260708T110224_P05023_N_F_J_001` |
| 2026-07-15 23:39 | desc. | 112/89 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 7.6 | `NISAR_L2_PR_GCOV_025_112_D_089_4005_DHDH_A_20260715T233909_20260715T233947_P05023_N_F_J_001` |
| 2026-07-20 11:01 | asc. | 4/1 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.06 | `NISAR_L2_PR_GCOV_026_004_A_001_4005_DHDH_A_20260720T110149_20260720T110223_P05023_N_F_J_001` |
| 2026-08-13 11:01 | asc. | 4/1 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.23 | `NISAR_L2_PR_GCOV_028_004_A_001_4005_DHDH_A_20260813T110147_20260813T110222_P05023_N_F_J_001` |
| 2026-08-20 23:39 | desc. | 112/89 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 7.41 | `NISAR_L2_PR_GCOV_028_112_D_089_4005_DHDH_A_20260820T233908_20260820T233945_P05023_N_F_J_001` |
| 2026-08-25 11:01 | asc. | 4/1 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.22 | `NISAR_L2_PR_GCOV_029_004_A_001_4005_DHDH_A_20260825T110147_20260825T110222_P05023_N_F_J_001` |
| 2026-09-01 23:39 | desc. | 112/89 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 7.6 | `NISAR_L2_PR_GCOV_029_112_D_089_4005_DHDH_A_20260901T233907_20260901T233945_P05023_N_F_J_001` |
| 2026-09-06 11:01 | asc. | 4/1 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.22 | `NISAR_L2_PR_GCOV_030_004_A_001_4005_DHDH_A_20260906T110147_20260906T110222_P05023_N_F_J_002` |
| 2026-09-13 23:39 | desc. | 112/89 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 7.6 | `NISAR_L2_PR_GCOV_030_112_D_089_4005_DHDH_A_20260913T233907_20260913T233945_P05023_N_F_J_001` |
| 2026-09-18 11:01 | asc. | 4/1 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.22 | `NISAR_L2_PR_GCOV_031_004_A_001_4005_DHDH_A_20260918T110147_20260918T110222_P05023_F_F_J_001` |
| 2026-09-25 23:39 | desc. | 112/89 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 7.6 | `NISAR_L2_PR_GCOV_031_112_D_089_4005_DHDH_A_20260925T233907_20260925T233945_P05023_N_F_J_001` |
| 2026-09-30 11:01 | asc. | 4/1 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.22 | `NISAR_L2_PR_GCOV_032_004_A_001_4005_DHDH_A_20260930T110147_20260930T110222_P05023_N_F_J_001` |
| 2026-10-07 23:39 | desc. | 112/89 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 7.41 | `NISAR_L2_PR_GCOV_032_112_D_089_4005_DHDH_A_20261007T233908_20261007T233945_P05023_N_F_J_001` |
| 2026-10-12 11:01 | asc. | 4/1 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.22 | `NISAR_L2_PR_GCOV_033_004_A_001_4005_DHDH_A_20261012T110147_20261012T110222_P05023_N_F_J_001` |
| 2026-10-19 23:39 | desc. | 112/89 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 7.41 | `NISAR_L2_PR_GCOV_033_112_D_089_4005_DHDH_A_20261019T233908_20261019T233945_P05023_N_F_J_001` |
| 2026-10-24 11:01 | asc. | 4/1 | VALIDATED | A: HH+HV · B: HH+HV | Full | 6.06 | `NISAR_L2_PR_GCOV_034_004_A_001_4005_DHDH_A_20261024T110148_20261024T110222_P05036_N_F_J_001` |
| 2026-10-31 23:39 | desc. | 112/89 | VALIDATED | A: HH+HV · B: HH+HV | Full | 7.4 | `NISAR_L2_PR_GCOV_034_112_D_089_4005_DHDH_A_20261031T233908_20261031T233945_P05036_N_F_J_001` |

</details>

<details><summary>Pares GUNW (referencia → secundaria)</summary>

| Referencia | Secundaria | Días | Dir. | Track/frame | Madurez | Pol. | GB |
|---|---|---:|---|---|---|---|---:|
| 2026-06-21 | 2026-07-03 | 11 | desc. | 112/89 | PROVISIONAL | HH | 2.45 |
| 2026-06-26 | 2026-07-08 | 11 | asc. | 4/1 | PROVISIONAL | HH | 2.27 |
| 2026-07-03 | 2026-07-15 | 11 | desc. | 112/89 | PROVISIONAL | HH | 2.46 |
| 2026-07-08 | 2026-07-20 | 12 | asc. | 4/1 | PROVISIONAL | HH | 2.27 |
| 2026-07-15 | 2026-08-20 | 35 | desc. | 112/89 | PROVISIONAL | HH | 2.47 |
| 2026-07-20 | 2026-08-13 | 23 | asc. | 4/1 | PROVISIONAL | HH | 2.28 |
| 2026-08-13 | 2026-08-25 | 12 | asc. | 4/1 | PROVISIONAL | HH | 2.29 |
| 2026-08-20 | 2026-09-01 | 11 | desc. | 112/89 | PROVISIONAL | HH | 2.47 |
| 2026-08-25 | 2026-09-06 | 12 | asc. | 4/1 | PROVISIONAL | HH | 2.31 |
| 2026-09-01 | 2026-09-13 | 12 | desc. | 112/89 | PROVISIONAL | HH | 2.5 |
| 2026-09-06 | 2026-09-18 | 12 | asc. | 4/1 | PROVISIONAL | HH | 2.32 |
| 2026-09-13 | 2026-09-25 | 12 | desc. | 112/89 | PROVISIONAL | HH | 2.52 |
| 2026-09-18 | 2026-09-30 | 12 | asc. | 4/1 | PROVISIONAL | HH | 2.32 |
| 2026-09-25 | 2026-10-07 | 12 | desc. | 112/89 | PROVISIONAL | HH | 2.48 |
| 2026-09-30 | 2026-10-12 | 12 | asc. | 4/1 | PROVISIONAL | HH | 2.32 |
| 2026-10-07 | 2026-10-19 | 12 | desc. | 112/89 | PROVISIONAL | HH | 2.46 |

</details>

## Bosques andinos de Loja (Sierra)

Caja (oeste, sur, este, norte): `(-79.35, -4.15, -79.15, -3.95)`.

| Producto | Granulos | Primera | Última | BETA | PROVISIONAL | VALIDATED | UR | Tamaño total (GB) |
|---|---:|---|---|---:|---:|---:|---:|---:|
| GCOV | 62 | 2025-10-29 | 2026-11-05 | 6 | 46 | 8 | 2 | 218.8 |
| GUNW | 43 | 2025-10-29 | 2026-10-07 | 5 | 37 | 0 | 1 | 86.1 |

Se quitaron 5 granulos repetidos (misma adquisición reprocesada).

| Dirección | Track | Frame | Centro (lon, lat) | GCOV | GUNW | Polarizaciones (frecuencia) | Ancho de banda (MHz) | Fechas GCOV |
|---|---:|---:|---|---:|---:|---|---|---|
| asc. | 3 | 175 | -79.23, -5.06 | 11 | 8 | A: HH+HV · B: HH+HV | 20, 20+5, 40+5 | 2026-06-26 → 2026-10-24 |
| asc. | 3 | 176 | -79.63, -3.19 | 10 | 8 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-26 → 2026-10-24 |
| desc. | 11 | 91 | -78.21, -4.57 | 28 | 18 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5, 40, 40+5 | 2025-10-29 → 2026-11-05 |
| desc. | 112 | 90 | -79.96, -3.07 | 10 | 8 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-21 → 2026-10-31 |
| desc. | 112 | 91 | -80.39, -5.03 | 3 | 1 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-08-20 → 2026-10-31 |

<details><summary>Lista de granulos GCOV</summary>

| Fecha (UTC) | Dir. | Track/frame | Madurez | Polarizaciones | Cobertura | GB | Granulo |
|---|---|---|---|---|---|---:|---|
| 2025-10-29 23:31 | desc. | 11/91 | BETA | A: HH+HV · B: HH+HV | Partial | 1.61 | `NISAR_L2_PR_GCOV_004_011_D_091_4005_DHDH_A_20251029T233159_20251029T233205_X05009_N_P_J_001` |
| 2025-11-22 23:32 | desc. | 11/91 | BETA | A: HH+HV · B: HH+HV | Partial | 1.61 | `NISAR_L2_PR_GCOV_006_011_D_091_4005_DHDH_A_20251122T233200_20251122T233206_X05009_N_P_J_001` |
| 2025-12-04 23:32 | desc. | 11/91 | BETA | A: HH+HV · B: HH+HV | Partial | 1.79 | `NISAR_L2_PR_GCOV_007_011_D_091_4005_DHDH_A_20251204T233200_20251204T233207_X05009_N_P_J_001` |
| 2025-12-16 23:32 | desc. | 11/91 | BETA | A: HH+HV · B: HH+HV | Partial | 1.79 | `NISAR_L2_PR_GCOV_008_011_D_091_4005_DHDH_A_20251216T233201_20251216T233208_X05009_N_P_J_001` |
| 2025-12-28 23:32 | desc. | 11/91 | BETA | A: HH+HV · B: HH+HV | Partial | 1.79 | `NISAR_L2_PR_GCOV_009_011_D_091_4005_DHDH_A_20251228T233201_20251228T233208_X05009_N_P_J_001` |
| 2026-01-09 23:32 | desc. | 11/91 | BETA | A: HH+HV · B: HH+HV | Partial | 1.79 | `NISAR_L2_PR_GCOV_010_011_D_091_4005_DHDH_A_20260109T233202_20260109T233209_X05009_N_P_J_001` |
| 2026-06-21 23:39 | desc. | 112/90 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.27 | `NISAR_L2_PR_GCOV_023_112_D_090_4005_DHDH_A_20260621T233947_20260621T234022_P05023_N_F_J_001` |
| 2026-06-26 11:00 | asc. | 3/175 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.04 | `NISAR_L2_PR_GCOV_024_003_A_175_2005_DHDH_M_20260626T110043_20260626T110118_P05023_N_F_J_001` |
| 2026-06-26 11:01 | asc. | 3/176 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.82 | `NISAR_L2_PR_GCOV_024_003_A_176_4005_DHDH_A_20260626T110114_20260626T110151_P05023_N_F_J_001` |
| 2026-06-26 23:32 | desc. | 11/91 | PROVISIONAL | A: HH · B: HH | Full | 1.64 | `NISAR_L2_PR_GCOV_024_011_D_091_2005_SHSH_M_20260626T233200_20260626T233235_P05023_N_F_J_001` |
| 2026-06-26 23:32 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Partial | 1.79 | `NISAR_L2_PR_GCOV_024_011_D_091_4005_DHDH_A_20260626T233200_20260626T233207_P05023_N_P_J_001` |
| 2026-07-03 23:39 | desc. | 112/90 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.27 | `NISAR_L2_PR_GCOV_024_112_D_090_4005_DHDH_A_20260703T233946_20260703T234021_P05023_N_F_J_001` |
| 2026-07-08 11:00 | asc. | 3/175 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.04 | `NISAR_L2_PR_GCOV_025_003_A_175_2005_DHDH_M_20260708T110042_20260708T110117_P05023_N_F_J_001` |
| 2026-07-08 11:01 | asc. | 3/175 | PROVISIONAL | A: HH+HV · B: HH+HV | Partial | 1.25 | `NISAR_L2_PR_GCOV_025_003_A_175_4005_DHDH_A_20260708T110113_20260708T110117_P05023_N_P_J_001` |
| 2026-07-08 11:01 | asc. | 3/176 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.83 | `NISAR_L2_PR_GCOV_025_003_A_176_4005_DHDH_A_20260708T110113_20260708T110150_P05023_N_F_J_001` |
| 2026-07-08 23:32 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.0 | `NISAR_L2_PR_GCOV_025_011_D_091_2005_DHDH_M_20260708T233200_20260708T233234_P05023_N_F_J_001` |
| 2026-07-08 23:32 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Partial | 1.61 | `NISAR_L2_PR_GCOV_025_011_D_091_4005_DHDH_A_20260708T233200_20260708T233206_P05023_N_P_J_001` |
| 2026-07-15 23:39 | desc. | 112/90 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.1 | `NISAR_L2_PR_GCOV_025_112_D_090_4005_DHDH_A_20260715T233946_20260715T234020_P05023_N_F_J_001` |
| 2026-07-20 11:00 | asc. | 3/175 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 1.99 | `NISAR_L2_PR_GCOV_026_003_A_175_2005_DHDH_M_20260720T110042_20260720T110116_P05023_N_F_J_001` |
| 2026-07-20 11:01 | asc. | 3/176 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.83 | `NISAR_L2_PR_GCOV_026_003_A_176_4005_DHDH_A_20260720T110113_20260720T110150_P05023_N_F_J_001` |
| 2026-07-20 23:31 | desc. | 11/91 | PROVISIONAL | A: HH · B: HH | Full | 1.64 | `NISAR_L2_PR_GCOV_026_011_D_091_2005_SHSH_M_20260720T233159_20260720T233234_P05023_N_F_J_001` |
| 2026-07-20 23:31 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Partial | 1.8 | `NISAR_L2_PR_GCOV_026_011_D_091_4005_DHDH_A_20260720T233159_20260720T233206_P05023_N_P_J_001` |
| 2026-08-13 11:00 | asc. | 3/175 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 1.99 | `NISAR_L2_PR_GCOV_028_003_A_175_2005_DHDH_M_20260813T110041_20260813T110115_P05023_N_F_J_001` |
| 2026-08-13 11:01 | asc. | 3/176 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.65 | `NISAR_L2_PR_GCOV_028_003_A_176_4005_DHDH_A_20260813T110112_20260813T110148_P05023_N_F_J_001` |
| 2026-08-13 23:31 | desc. | 11/91 | PROVISIONAL | A: HH · B: HH | Full | 1.61 | `NISAR_L2_PR_GCOV_028_011_D_091_2005_SHSH_M_20260813T233158_20260813T233232_P05023_N_F_J_001` |
| 2026-08-13 23:31 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Partial | 1.79 | `NISAR_L2_PR_GCOV_028_011_D_091_4005_DHDH_A_20260813T233158_20260813T233205_P05023_N_P_J_001` |
| 2026-08-20 23:39 | desc. | 112/90 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.09 | `NISAR_L2_PR_GCOV_028_112_D_090_4005_DHDH_A_20260820T233944_20260820T234018_P05023_N_F_J_001` |
| 2026-08-20 23:40 | desc. | 112/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.47 | `NISAR_L2_PR_GCOV_028_112_D_091_4005_DHDH_A_20260820T234017_20260820T234052_P05023_N_F_J_001` |
| 2026-08-25 11:00 | asc. | 3/175 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.04 | `NISAR_L2_PR_GCOV_029_003_A_175_2005_DHDH_M_20260825T110040_20260825T110115_P05023_N_F_J_001` |
| 2026-08-25 11:01 | asc. | 3/176 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.64 | `NISAR_L2_PR_GCOV_029_003_A_176_4005_DHDH_A_20260825T110112_20260825T110148_P05023_N_F_J_001` |
| 2026-08-25 23:31 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.0 | `NISAR_L2_PR_GCOV_029_011_D_091_2005_DHDH_M_20260825T233158_20260825T233232_P05023_N_F_J_001` |
| 2026-08-25 23:31 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Partial | 1.61 | `NISAR_L2_PR_GCOV_029_011_D_091_4005_DHDH_A_20260825T233158_20260825T233204_P05023_N_P_J_001` |
| 2026-09-01 23:39 | desc. | 112/90 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.1 | `NISAR_L2_PR_GCOV_029_112_D_090_4005_DHDH_A_20260901T233944_20260901T234018_P05023_N_F_J_001` |
| 2026-09-06 11:00 | asc. | 3/175 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.04 | `NISAR_L2_PR_GCOV_030_003_A_175_2005_DHDH_M_20260906T110040_20260906T110115_P05023_N_F_J_001` |
| 2026-09-06 11:01 | asc. | 3/176 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.82 | `NISAR_L2_PR_GCOV_030_003_A_176_4005_DHDH_A_20260906T110111_20260906T110148_P05023_N_F_J_002` |
| 2026-09-06 23:31 | desc. | 11/91 | UR | A: HH · B: HH | Full | 1.6 | `NISAR_L2_UR_GCOV_030_011_D_091_2005_SHSH_M_20260906T233158_20260906T233232_P05023_F_F_J_001` |
| 2026-09-06 23:31 | desc. | 11/91 | UR | A: HH+HV · B: HH+HV | Partial | 1.61 | `NISAR_L2_UR_GCOV_030_011_D_091_4005_DHDH_A_20260906T233158_20260906T233204_P05023_F_P_J_001` |
| 2026-09-13 23:39 | desc. | 112/90 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.09 | `NISAR_L2_PR_GCOV_030_112_D_090_4005_DHDH_A_20260913T233944_20260913T234018_P05023_N_F_J_001` |
| 2026-09-18 11:00 | asc. | 3/175 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.04 | `NISAR_L2_PR_GCOV_031_003_A_175_2005_DHDH_M_20260918T110040_20260918T110115_P05023_F_F_J_001` |
| 2026-09-18 11:01 | asc. | 3/176 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.83 | `NISAR_L2_PR_GCOV_031_003_A_176_4005_DHDH_A_20260918T110111_20260918T110148_P05023_F_F_J_001` |
| 2026-09-18 23:31 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.0 | `NISAR_L2_PR_GCOV_031_011_D_091_2005_DHDH_M_20260918T233158_20260918T233232_P05023_F_F_J_001` |
| 2026-09-18 23:31 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Partial | 1.61 | `NISAR_L2_PR_GCOV_031_011_D_091_4005_DHDH_A_20260918T233158_20260918T233204_P05023_F_P_J_001` |
| 2026-09-25 23:39 | desc. | 112/90 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.09 | `NISAR_L2_PR_GCOV_031_112_D_090_4005_DHDH_A_20260925T233944_20260925T234018_P05023_N_F_J_001` |
| 2026-09-30 11:00 | asc. | 3/175 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.04 | `NISAR_L2_PR_GCOV_032_003_A_175_2005_DHDH_M_20260930T110040_20260930T110115_P05023_N_F_J_001` |
| 2026-09-30 11:01 | asc. | 3/176 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.64 | `NISAR_L2_PR_GCOV_032_003_A_176_4005_DHDH_A_20260930T110112_20260930T110148_P05023_N_F_J_001` |
| 2026-09-30 23:31 | desc. | 11/91 | PROVISIONAL | A: HH · B: HH | Full | 1.6 | `NISAR_L2_PR_GCOV_032_011_D_091_2005_SHSH_M_20260930T233158_20260930T233232_P05023_N_F_J_001` |
| 2026-09-30 23:31 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Partial | 1.8 | `NISAR_L2_PR_GCOV_032_011_D_091_4005_DHDH_A_20260930T233158_20260930T233205_P05023_N_P_J_001` |
| 2026-10-07 23:39 | desc. | 112/90 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.09 | `NISAR_L2_PR_GCOV_032_112_D_090_4005_DHDH_A_20261007T233944_20261007T234018_P05023_N_F_J_001` |
| 2026-10-12 11:00 | asc. | 3/175 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.04 | `NISAR_L2_PR_GCOV_033_003_A_175_2005_DHDH_M_20261012T110040_20261012T110115_P05023_N_F_J_001` |
| 2026-10-12 11:01 | asc. | 3/176 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.64 | `NISAR_L2_PR_GCOV_033_003_A_176_4005_DHDH_A_20261012T110112_20261012T110148_P05023_N_F_J_001` |
| 2026-10-12 23:31 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 2.0 | `NISAR_L2_PR_GCOV_033_011_D_091_2005_DHDH_M_20261012T233158_20261012T233232_P05023_N_F_J_001` |
| 2026-10-12 23:31 | desc. | 11/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Partial | 1.8 | `NISAR_L2_PR_GCOV_033_011_D_091_4005_DHDH_A_20261012T233158_20261012T233205_P05023_N_P_J_001` |
| 2026-10-19 23:39 | desc. | 112/90 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.09 | `NISAR_L2_PR_GCOV_033_112_D_090_4005_DHDH_A_20261019T233944_20261019T234018_P05023_N_F_J_001` |
| 2026-10-19 23:40 | desc. | 112/91 | PROVISIONAL | A: HH+HV · B: HH+HV | Full | 6.47 | `NISAR_L2_PR_GCOV_033_112_D_091_4005_DHDH_A_20261019T234017_20261019T234052_P05023_N_F_J_001` |
| 2026-10-24 11:00 | asc. | 3/175 | VALIDATED | A: HH+HV · B: HH+HV | Full | 1.99 | `NISAR_L2_PR_GCOV_034_003_A_175_2005_DHDH_M_20261024T110041_20261024T110115_P05036_N_F_J_001` |
| 2026-10-24 11:01 | asc. | 3/176 | VALIDATED | A: HH+HV · B: HH+HV | Full | 6.82 | `NISAR_L2_PR_GCOV_034_003_A_176_4005_DHDH_A_20261024T110112_20261024T110149_P05036_N_F_J_001` |
| 2026-10-24 23:31 | desc. | 11/91 | VALIDATED | A: HH · B: HH | Full | 1.64 | `NISAR_L2_PR_GCOV_034_011_D_091_2005_SHSH_M_20261024T233158_20261024T233233_P05036_N_F_J_001` |
| 2026-10-24 23:31 | desc. | 11/91 | VALIDATED | A: HH+HV · B: HH+HV | Partial | 1.79 | `NISAR_L2_PR_GCOV_034_011_D_091_4005_DHDH_A_20261024T233158_20261024T233205_P05036_N_P_J_001` |
| 2026-10-31 23:39 | desc. | 112/90 | VALIDATED | A: HH+HV · B: HH+HV | Full | 6.09 | `NISAR_L2_PR_GCOV_034_112_D_090_4005_DHDH_A_20261031T233944_20261031T234018_P05036_N_F_J_001` |
| 2026-10-31 23:40 | desc. | 112/91 | VALIDATED | A: HH+HV · B: HH+HV | Full | 6.48 | `NISAR_L2_PR_GCOV_034_112_D_091_4005_DHDH_A_20261031T234017_20261031T234052_P05036_N_F_J_001` |
| 2026-11-05 23:31 | desc. | 11/91 | VALIDATED | A: HH+HV · B: HH+HV | Full | 2.01 | `NISAR_L2_PR_GCOV_035_011_D_091_2005_DHDH_M_20261105T233159_20261105T233233_P05036_N_F_J_001` |
| 2026-11-05 23:31 | desc. | 11/91 | VALIDATED | A: HH+HV · B: HH+HV | Partial | 1.8 | `NISAR_L2_PR_GCOV_035_011_D_091_4005_DHDH_A_20261105T233159_20261105T233206_P05036_N_P_J_001` |

</details>

<details><summary>Pares GUNW (referencia → secundaria)</summary>

| Referencia | Secundaria | Días | Dir. | Track/frame | Madurez | Pol. | GB |
|---|---|---:|---|---|---|---|---:|
| 2025-10-29 | 2025-11-22 | 24 | desc. | 11/91 | BETA | HH | 0.94 |
| 2025-11-22 | 2025-12-04 | 12 | desc. | 11/91 | BETA | HH | 0.94 |
| 2025-12-04 | 2025-12-16 | 12 | desc. | 11/91 | BETA | HH | 0.95 |
| 2025-12-16 | 2025-12-28 | 12 | desc. | 11/91 | BETA | HH | 0.95 |
| 2025-12-28 | 2026-01-09 | 12 | desc. | 11/91 | BETA | HH | 0.96 |
| 2026-06-21 | 2026-07-03 | 11 | desc. | 112/90 | PROVISIONAL | HH | 2.34 |
| 2026-06-26 | 2026-07-08 | 11 | asc. | 3/175 | PROVISIONAL | HH | 2.32 |
| 2026-06-26 | 2026-07-08 | 11 | asc. | 3/176 | PROVISIONAL | HH | 2.39 |
| 2026-06-26 | 2026-07-08 | 12 | desc. | 11/91 | PROVISIONAL | HH | 2.31 |
| 2026-06-26 | 2026-07-08 | 12 | desc. | 11/91 | PROVISIONAL | HH | 0.98 |
| 2026-07-03 | 2026-07-15 | 12 | desc. | 112/90 | PROVISIONAL | HH | 2.3 |
| 2026-07-08 | 2026-07-20 | 12 | asc. | 3/175 | PROVISIONAL | HH | 2.29 |
| 2026-07-08 | 2026-07-20 | 12 | asc. | 3/176 | PROVISIONAL | HH | 2.37 |
| 2026-07-08 | 2026-07-20 | 11 | desc. | 11/91 | PROVISIONAL | HH | 2.29 |
| 2026-07-15 | 2026-08-20 | 35 | desc. | 112/90 | PROVISIONAL | HH | 2.29 |
| 2026-07-20 | 2026-08-13 | 23 | asc. | 3/175 | PROVISIONAL | HH | 2.28 |
| 2026-07-20 | 2026-08-13 | 23 | asc. | 3/176 | PROVISIONAL | HH | 2.37 |
| 2026-07-20 | 2026-08-13 | 23 | desc. | 11/91 | PROVISIONAL | HH | 2.3 |
| 2026-07-20 | 2026-08-13 | 23 | desc. | 11/91 | PROVISIONAL | HH | 1.01 |
| 2026-08-13 | 2026-08-25 | 11 | asc. | 3/175 | PROVISIONAL | HH | 2.26 |
| 2026-08-13 | 2026-08-25 | 12 | asc. | 3/176 | PROVISIONAL | HH | 2.34 |
| 2026-08-13 | 2026-08-25 | 12 | desc. | 11/91 | PROVISIONAL | HH | 2.31 |
| 2026-08-13 | 2026-08-25 | 12 | desc. | 11/91 | PROVISIONAL | HH | 0.99 |
| 2026-08-20 | 2026-09-01 | 12 | desc. | 112/90 | PROVISIONAL | HH | 2.29 |
| 2026-08-20 | 2026-09-01 | 12 | desc. | 112/91 | PROVISIONAL | HH | 2.31 |
| 2026-08-25 | 2026-09-06 | 12 | asc. | 3/175 | PROVISIONAL | HH | 2.32 |
| 2026-08-25 | 2026-09-06 | 11 | asc. | 3/176 | PROVISIONAL | HH | 2.35 |
| 2026-08-25 | 2026-09-06 | 12 | desc. | 11/91 | UR | HH | 2.19 |
| 2026-09-01 | 2026-09-13 | 12 | desc. | 112/90 | PROVISIONAL | HH | 2.29 |
| 2026-09-06 | 2026-09-18 | 12 | asc. | 3/175 | PROVISIONAL | HH | 2.32 |
| 2026-09-06 | 2026-09-18 | 12 | asc. | 3/176 | PROVISIONAL | HH | 2.41 |
| 2026-09-06 | 2026-09-18 | 12 | desc. | 11/91 | PROVISIONAL | HH | 2.29 |
| 2026-09-06 | 2026-09-18 | 12 | desc. | 11/91 | PROVISIONAL | HH | 0.97 |
| 2026-09-13 | 2026-09-25 | 12 | desc. | 112/90 | PROVISIONAL | HH | 2.31 |
| 2026-09-18 | 2026-09-30 | 12 | asc. | 3/175 | PROVISIONAL | HH | 2.33 |
| 2026-09-18 | 2026-09-30 | 12 | asc. | 3/176 | PROVISIONAL | HH | 2.38 |
| 2026-09-18 | 2026-09-30 | 12 | desc. | 11/91 | PROVISIONAL | HH | 2.31 |
| 2026-09-25 | 2026-10-07 | 12 | desc. | 112/90 | PROVISIONAL | HH | 2.3 |
| 2026-09-30 | 2026-10-12 | 12 | asc. | 3/175 | PROVISIONAL | HH | 2.31 |
| 2026-09-30 | 2026-10-12 | 12 | asc. | 3/176 | PROVISIONAL | HH | 2.36 |
| 2026-09-30 | 2026-10-12 | 12 | desc. | 11/91 | PROVISIONAL | HH | 2.29 |
| 2026-09-30 | 2026-10-12 | 12 | desc. | 11/91 | PROVISIONAL | HH | 1.02 |
| 2026-10-07 | 2026-10-19 | 12 | desc. | 112/90 | PROVISIONAL | HH | 2.31 |

</details>

## Resto de Ecuador continental (caja aproximada)

Caja (oeste, sur, este, norte): `(-81.1, -5.1, -75.2, 1.5)`.

| Producto | Granulos | Primera | Última | BETA | PROVISIONAL | VALIDATED | UR | Tamaño total (GB) |
|---|---:|---|---|---:|---:|---:|---:|---:|
| GCOV | 454 | 2025-10-27 | 2026-11-05 | 59 | 347 | 33 | 15 | 1534.1 |
| GUNW | 372 | 2025-10-29 | 2026-10-19 | 44 | 314 | 0 | 14 | 791.5 |

Se quitaron 80 granulos repetidos (misma adquisición reprocesada).

| Dirección | Track | Frame | Centro (lon, lat) | GCOV | GUNW | Polarizaciones (frecuencia) | Ancho de banda (MHz) | Fechas GCOV |
|---|---:|---:|---|---:|---:|---|---|---|
| asc. | 3 | 175 | -79.23, -5.06 | 11 | 8 | A: HH+HV · B: HH+HV | 20, 20+5, 40+5 | 2026-06-26 → 2026-10-24 |
| asc. | 3 | 176 | -79.63, -3.19 | 10 | 8 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-26 → 2026-10-24 |
| asc. | 4 | 1 | -80.07, -1.12 | 10 | 8 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-26 → 2026-10-24 |
| asc. | 4 | 2 | -80.32, 0.08 | 10 | 8 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-26 → 2026-10-24 |
| asc. | 47 | 2 | -74.28, 0.92 | 11 | 9 | A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-17 → 2026-10-27 |
| asc. | 75 | 175 | -77.17, -4.84 | 15 | 12 | A: HH+HV · B: HH+HV | 20, 20+5, 40, 40+5 | 2026-06-19 → 2026-10-29 |
| asc. | 75 | 176 | -77.53, -3.17 | 11 | 9 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-19 → 2026-10-29 |
| asc. | 76 | 1 | -77.98, -1.11 | 11 | 9 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-19 → 2026-10-29 |
| asc. | 76 | 2 | -78.42, 0.93 | 11 | 9 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-19 → 2026-10-29 |
| asc. | 104 | 175 | -81.32, -5.10 | 11 | 9 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-21 → 2026-10-31 |
| asc. | 104 | 176 | -81.75, -3.09 | 10 | 9 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-21 → 2026-10-19 |
| asc. | 147 | 175 | -75.08, -5.09 | 25 | 23 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2025-12-02 → 2026-10-22 |
| asc. | 147 | 176 | -75.51, -3.05 | 10 | 8 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-24 → 2026-10-22 |
| asc. | 148 | 1 | -75.99, -0.63 | 21 | 16 | A: HH · B: HH; A: HH+HV · B: HH+HV; A: HV · B: HV | 20, 20+5, 40, 40+5 | 2025-10-27 → 2026-10-22 |
| asc. | 148 | 2 | -76.32, 0.81 | 18 | 14 | A: HH · B: HH; A: HH+HV · B: HH+HV; A: HV · B: HV | 40, 40+5 | 2025-10-27 → 2026-10-22 |
| desc. | 11 | 88 | -77.02, 0.93 | 16 | 13 | A: HH+HV · B: HH+HV | 40, 40+5 | 2025-10-29 → 2026-10-24 |
| desc. | 11 | 89 | -77.45, -1.06 | 16 | 13 | A: HH+HV · B: HH+HV | 40, 40+5 | 2025-10-29 → 2026-10-24 |
| desc. | 11 | 90 | -77.88, -3.05 | 16 | 13 | A: HH+HV · B: HH+HV | 40, 40+5 | 2025-10-29 → 2026-10-24 |
| desc. | 11 | 91 | -78.21, -4.57 | 28 | 18 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5, 40, 40+5 | 2025-10-29 → 2026-11-05 |
| desc. | 40 | 88 | -81.23, 0.59 | 6 | 4 | A: HH · B: HH | 20, 20+5 | 2026-06-28 → 2026-10-26 |
| desc. | 40 | 89 | -81.61, -1.14 | 11 | 9 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-16 → 2026-10-26 |
| desc. | 40 | 90 | -81.95, -2.70 | 10 | 7 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-16 → 2026-10-26 |
| desc. | 83 | 88 | -74.93, 0.92 | 29 | 26 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2025-11-03 → 2026-10-29 |
| desc. | 83 | 89 | -75.36, -1.07 | 14 | 11 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2025-11-03 → 2026-10-29 |
| desc. | 83 | 90 | -75.80, -3.10 | 14 | 11 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2025-11-03 → 2026-10-29 |
| desc. | 83 | 91 | -76.21, -5.06 | 29 | 28 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2025-11-03 → 2026-10-29 |
| desc. | 112 | 88 | -79.16, 0.63 | 15 | 13 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5, 40, 40+5 | 2026-06-21 → 2026-10-31 |
| desc. | 112 | 89 | -79.51, -0.99 | 10 | 8 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-21 → 2026-10-31 |
| desc. | 112 | 90 | -79.96, -3.07 | 10 | 8 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-21 → 2026-10-31 |
| desc. | 112 | 91 | -80.40, -5.08 | 10 | 8 | A: HH+HV · B: HH+HV | 40, 40+5 | 2026-06-21 → 2026-10-31 |
| desc. | 155 | 91 | -74.13, -5.09 | 25 | 23 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2025-11-20 → 2026-10-22 |

## Galápagos (caja aproximada)

Caja (oeste, sur, este, norte): `(-92.1, -1.5, -89.2, 0.7)`.

| Producto | Granulos | Primera | Última | BETA | PROVISIONAL | VALIDATED | UR | Tamaño total (GB) |
|---|---:|---|---|---:|---:|---:|---:|---:|
| GCOV | 63 | 2026-06-21 | 2026-10-31 | 0 | 56 | 7 | 0 | 49.3 |
| GUNW | 41 | 2026-06-21 | 2026-09-29 | 0 | 41 | 0 | 0 | 66.4 |

| Dirección | Track | Frame | Centro (lon, lat) | GCOV | GUNW | Polarizaciones (frecuencia) | Ancho de banda (MHz) | Fechas GCOV |
|---|---:|---:|---|---:|---:|---|---|---|
| asc. | 62 | 1 | -88.53, -0.55 | 1 | 0 | A: HH+HV · B: HH+HV | 20+5 | 2026-10-28 → 2026-10-28 |
| asc. | 163 | 1 | -90.55, -0.82 | 10 | 8 | A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-25 → 2026-10-23 |
| asc. | 163 | 2 | -90.81, 0.37 | 10 | 8 | A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-25 → 2026-10-23 |
| desc. | 26 | 88 | -91.66, 0.53 | 10 | 6 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-28 → 2026-10-26 |
| desc. | 26 | 89 | -91.91, -0.63 | 10 | 7 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-28 → 2026-10-26 |
| desc. | 98 | 88 | -89.64, 0.24 | 11 | 4 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-21 → 2026-10-31 |
| desc. | 98 | 89 | -89.88, -0.85 | 11 | 8 | A: HH · B: HH; A: HH+HV · B: HH+HV | 20, 20+5 | 2026-06-21 → 2026-10-31 |

<!-- notas-a-mano: lo que sigue lo conserva explorar_catalogo.py al regenerar -->

## Lectura (escrita a mano, 2026-11-14)

Lo que dice el catálogo y no la app. Nada de esto es un hallazgo sobre los datos: todavía no se ha abierto ningún
granulo.

**Cobertura útil.** Las dos zonas de las historias tienen series regulares **desde el 17–26 jun 2026** (PROVISIONAL)
**hasta el 31 oct – 5 nov 2026** (VALIDATED), en dos geometrías cada una (ascendente hacia las 11:00 UTC y
descendente hacia las 23:30 UTC, es decir, ~06:00 y ~18:30 en Ecuador), cada 12 días por geometría.
- **La Segua:** 20 GCOV (asc. 4/1 y desc. 112/89), Frecuencia A **HH+HV** a 40 MHz (píxel de 10 m), 16 GUNW HH.
  Sin BETA: no hay nada de la temporada lluviosa (ene–may); toda la serie cae en la estación seca de la Costa.
- **Loja:** 62 GCOV en cinco geometrías (asc. 3/175–176; desc. 11/91 y 112/90–91), HH+HV casi siempre; el track
  desc. 11/91 alterna HH solo y HH+HV y a veces trae dos granulos por pasada (cambio de modo dentro del frame).
  6 GCOV BETA del 29 oct 2025 al 9 ene 2026 (no se mezclan con PROVISIONAL: GU `availability-overview`).
- **Hueco permanente** del 27 jul al 10 ago 2026: se ve en las series (p. ej. La Segua salta del 20 jul al 13 ago).
- **No hay VV ni cuadripolarimetría** en ninguna zona de Ecuador: el conmutador solo puede ofrecer HH y HV.
- **Galápagos** tiene cobertura semejante (63 GCOV); no es una historia de la app.

**Peso.** Un GCOV de Frecuencia A pesa 1,2–7,6 GB (La Segua: 136,6 GB en total). Descargar series enteras no es
razonable: la guía documenta lectura parcial por HTTPS (`fsspec` + `h5netcdf`, GU `asf-search`) y GDAL `vsicurl`
(GU `access-overview`), que también exigen Earthdata Login. La Frecuencia B (80 m) es mucho más ligera
(GU `nisar-intro`).

**Respuesta urgente (UR).** Hay granulos `NISAR_L2_UR_*` sobre Ecuador entre el 11 ago y el 19 oct 2026, entre ellos el
desc. 11/91 del 6 sep 2026 sobre Loja. La guía dice que UR se activa por sismos (PAGER naranja o rojo), alertas
volcánicas de aviación naranja o roja, o a pedido de USGS, NOAA o NASA, y que esos productos se borran a los 30 días.
**No se sabe qué motivó estas peticiones**: no se atribuyen a ningún evento.

**Eventos reales con fuente (solo como pistas para elegir fechas, no como resultados):**
- Incendios en Loja en 2026: según la SNGR, citada por El Comercio (balance del 21 oct 2026), Loja suma
  5 490 ha de cobertura vegetal afectada en 2026 y un incendio seguía activo en Vilcabamba esa mañana
  (`https://www.elcomercio.com/actualidad/ecuador/ecuador-registra-incendios-forestales-hectareas-afectadas-balance/`).
  Teleamazonas (1 oct 2026, con datos de la SNGR) da dos incendios activos en Loja, en Sucre y Carigán
  (`https://www.teleamazonas.com/actualidad/noticias/ecuador/tres-incendios-forestales-permanecen-activos-loja-e-imbabura-129354/`).
  Ninguna de las dos da el perímetro ni la fecha de inicio.
- **Descartado:** el incendio de ~3 709 ha en San Pedro de Vilcabamba (Parque Nacional Podocarpus) que aparece en
  algunas búsquedas es de **noviembre de 2024** (El Oriente), fuera de la cobertura de NISAR.
- La Segua: no se encontró ninguna fuente de 2026 sobre el espejo de agua. Solo hay contexto general (déficit de
  lluvias en Manabí en marzo de 2026, El Diario; desconexión del humedal por obras, Mongabay 2020 y ULEAM 2021).
