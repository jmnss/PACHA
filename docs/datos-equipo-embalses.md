# Datos del equipo para embalses: evaluación y formato pedido

El equipo segmenta los cuerpos de agua (segmentación no supervisada) a partir de NISAR; **la app no recalcula la
segmentación: solo lee sus resultados**. Este documento dice qué llegó, si sirve y qué formato necesita la app.
El material crudo vive en `datos_imagenes/` (fuera de git, `.gitignore`).

## Primera entrega (2026-11-14): Mazar

| Archivo | Qué es | ¿Sirve? |
|---|---|---|
| `Mazar_Stack.tif` (68 MB) | 3 bandas `float32`: banda 1 ≈ HH en dB (mediana −5,7), banda 2 ≈ HV en dB (mediana −11,7), banda 3 = banda 1 − banda 2 exactamente. EPSG:32717 (UTM 17S), píxel 10 m, 2088 × 2725 px (~21 × 27 km), lon −78,74…−78,55, lat −2,80…−2,55 (embalse Mazar y río Paute). Borde con valor 0 (165 230 px) = sin dato, no declarado. | Sí, como «lo que ve el satélite» (HH/HV). **Falta fecha y granulo.** |
| `Mascara.tif` (1,5 MB) | Máscara 1 = agua, 0 = no agua; **misma rejilla exacta** que el stack (mismo origen, píxel y tamaño). 2 bits por píxel en teselas de 128 (exportada con ArcGIS), `GDAL_NODATA = 3`. | Formato sí (georreferenciada y alineada). Contenido: **todavía no** (ver abajo). |
| `Tabla2.csv` (3 588 filas) | `Id;gridcode` (UTF-8 con BOM, `;`, CRLF): tabla de atributos de polígonos (2 660 con `gridcode = 1`, 928 con 0), probablemente de «ráster a polígono». | **No, sola:** no trae geometría ni superficie, así que no se puede ubicar ni medir nada. La máscara ya contiene la misma información. |

### Lo que muestra la máscara

- Marca **110,3 km² de agua, el ~20 % de la zona con datos** (552 km²). El embalse y el río aparecen, pero también
  grandes manchas de ladera y campo: 1 494 regiones de agua separadas.
- La diferencia entre «agua» y «no agua» es pequeña: HH −7,4 frente a −5,6 dB y HV −13,7 frente a −11,5 dB. El agua
  en calma suele verse mucho más oscura que la tierra en banda L, así que la clase 1 parece agrupar «zonas oscuras»
  (pendientes de espaldas al radar, superficies lisas) además del agua. **Es una hipótesis**: hay que confirmarla
  con el equipo (¿las bandas son γ⁰ en dB?, ¿qué algoritmo y cuántas clases?).
- El borde sin dato del stack quedó clasificado como 0 («no agua») en vez de 3 («sin dato»).

### Qué haría falta para usarla en la app

1. **Más de una fecha** del mismo embalse (la historia es el cambio: estación seca frente a otra fecha).
2. **Procedencia de cada fecha** (Regla 7 de honestidad del proyecto: una capa real sin procedencia no se muestra).
3. **Afinar el agua**: recortar al embalse (polígono de interés) o refinar la segmentación para quitar las zonas
   oscuras que no son agua. Lo decide el equipo; la app solo lo lee.
4. Marcar el borde sin dato como 3 en la máscara.

**Aclaración del equipo (2026-11-14):** esta máscara era una **prueba de formato** (el formato sirve). El equipo
pasará a **segmentación supervisada** para mejorar el agua; la evaluación del contenido de arriba aplica solo a la prueba.

**Nombres de las clases:** un GeoTIFF guarda números, no texto. La máscara sigue con códigos (1 agua, 0 no agua,
255 o 3 sin dato) y los nombres van en `procedencia.json` → `"clases": {"1": "agua", "0": "no agua", "255": "sin dato"}`
(opcional también la tabla de atributos de ArcGIS, `.tif.aux.xml`). Si la segmentación supervisada añade clases
(p. ej. vegetación inundada), se añaden códigos y nombres igual. `scripts/preparar_embalses.py` los convierte a la
convención del contrato (código k = `leyenda[k-1]`, 0 = sin dato) y a los tres idiomas.

## Formato que pide la app (por embalse y por fecha)

```
datos_imagenes/<embalse>/<AAAAMMDD>/
  stack.tif        # opcional: HH y HV en dB (float32), para «lo que ve el satélite»
  mascara.tif      # GeoTIFF uint8 (o 2 bits, también se lee): 1 agua, 0 no agua, 255 o 3 sin dato; misma rejilla
  procedencia.json # ver abajo
```

```json
{
  "embalse": "Mazar",
  "granulos": ["NISAR_L2_PR_GCOV_..._P05036_N_F_J_001"],
  "fecha_adquisicion_utc": "2026-10-29T23:31:00Z",
  "producto": "GCOV", "coleccion": "NISAR_L2_GCOV_V1", "madurez": "VALIDATED",
  "frecuencia": "A", "polarizaciones": ["HH", "HV"],
  "unidades_stack": "gamma0 dB",
  "clases": {"1": "agua", "0": "no agua", "255": "sin dato"},
  "metodo": {"nombre": "segmentación no supervisada (p. ej. k-medias)", "clases": 2, "parametros": {}},
  "autor": "equipo PACHA", "fecha_proceso": "2026-11-14"
}
```

El CSV no hace falta. Si el equipo prefiere polígonos, que exporte GeoJSON o shapefile (con geometría), no solo la
tabla de atributos.

## Cómo entra en la app (plan, pendiente de spec)

`scripts/preparar_embalses.py` (fuera de la app) lee cada fecha, valida la rejilla y la procedencia, y escribe en
`data/embalses/<embalse>/` derivados pequeños: superficie de agua por fecha (km²), mapa de agua ganada o perdida
entre fechas, HH/HV reducidos para el comparador y `procedencia.json`. El proveedor de datos los sirve con el contrato
de siempre y `origen = nisar` (derivado por el equipo, con su método en el sello).

## Segunda entrega (2026-11-14): Mazar supervisada, dos fechas

| Archivo | Qué es | Evaluación |
|---|---|---|
| `Clas_Super.tif` | Máscara supervisada de la **primera fecha** (fecha sin declarar). Misma rejilla exacta que `Mazar_Stack.tif` (EPSG:32717, 10 m, 2088 × 2725), 2 bits, `GDAL_NODATA = 3`. | Buena. 14,2 km² de agua en la escena; el agua es ~6 dB más oscura en HH (−11,8 frente a −5,7 dB). El embalse sale continuo; quedan ~5 900 manchas < 1 ha (≈ 5,3 km²) en laderas → se mide dentro del contorno. El borde sin dato sigue como 0. |
| `Mazar_CS1029.tif` | Máscara supervisada del **29 oct 2026** (dato del equipo). Llegó reproyectada a EPSG:32717 por el equipo (el original estaba en 18S), uint8 8 bits, 2075 × 2739, píxel **10,063 × 9,950 m** (no cuadrado), origen ~2 m del de la primera fecha. `GDAL_NODATA = 256` (inválido para uint8: ArcGIS; tratar como «sin nodata declarado»). | Buena y más limpia: 7,6 km² de agua en la escena. **No está en la misma rejilla**: el script la remuestrea (vecino más cercano) a la de referencia. No trae stack (HH/HV) ni procedencia. |

Comparación en la rejilla de referencia, dentro de un contorno provisional (regiones ≥ 10 ha de ambas fechas,
dilatadas 150 m): primera fecha 7,03 km², 29 oct 5,65 km²; persistente 4,43, ganada 1,22, perdida 2,60 km². La pérdida
se concentra en las orillas y en la cola del río. **Hipótesis por comprobar**: descenso del nivel entre las dos fechas;
parte de la diferencia puede deberse a que las dos segmentaciones no son idénticas.

Falta del equipo: fecha y `procedencia.json` de ambas fechas, stack HH/HV del 29 oct (opcional pero útil para el
comparador) y el borde sin dato marcado.

## Estado (2026-11-14, Tarea 6 de la fase 1)
- Derivados versionados en `data/embalses/` y `data/incendios/` (≈1,58 MB de 10 MB), generados con `scripts/preparar_embalses.py`.
- **Mazar**: una fecha (2026-10-29, agua 5,43 km²), sin `procedencia.json`; con relieve Copernicus, curva nivel–superficie y contorno.
- **Daule-Peripa** y **Casitagua**: solo relieve y contorno; esperan máscaras del equipo (Casitagua, antes y después del 17 sep 2026).
- Pendientes del equipo: fecha de la primera máscara de Mazar, procedencia de cada fecha, stack del 29 oct.

## Tercera entrega (2026-11-15): Casitagua, Mazar (13 ago) y Daule-Peripa

Normalizada con `scripts/organizar_entregas.py` según el manifiesto `preparacion/entregas.json` y preparada con
`scripts/preparar_embalses.py`. Todo sigue con **procedencia incompleta** (falta `coleccion`, `granulos`,
`fecha_adquisicion` con hora UTC, `frecuencia` y `madurez`): la app no la muestra y `mixto` sirve los sustitutos.

| Archivo | Qué es (medido) | Decisión |
|---|---|---|
| `HH2_db_2026_09_13.tif`, `HV2_db_2026_09_13.tif` | 1 banda float32, EPSG:32717, 10 m, 631×928. El valor 40,0 es «sin dato» (sin `nodata` declarado). | Usados: stack «antes» de Casitagua, 2026-09-13. |
| `ImageNISAR_Incendio.tif` | 3 bandas float32, EPSG:32617, píxel de 10 × 5 m; 0 = sin dato; la banda 3 repite la 2. | Usado (bandas 1 y 2): stack «después», 2026-09-25. |
| `InfoNISAR.tif` | uint8 0/1, nodata 255. Clasificación supervisada (aprendizaje automático); 1 = quemado. | Usada: máscara de quemado de 2026-09-25. Estimación del equipo, no conclusión. |
| `RFDI_antes_despues.tif` | float32, 10 m, 629×926; ΔRFDI = antes − después (positivo = menos vegetación; confirmado por el equipo). | Usado como capa continua de 2026-09-25; su rejilla es la de referencia de Casitagua. |
| `HH2_HV2_db_2026_09_13.tif` | HH−HV de la imagen «después» pese al nombre; 116 px corruptos. | Descartado. |
| `imagenes.zip`, `*.aux.xml`, `Mascara.tif`, `Tabla2.csv` | Copias, estadísticas, prueba de formato, tabla sin geometría. | Descartados. |
| `Clas_Super.tif` + `Mazar_Stack.tif` | Máscara y stack de Mazar, 2026-08-13 (equipo). | Usados: «antes» de Mazar. |
| `Mazar_CS1029.tif` | Máscara de Mazar, 2026-10-29. | Usada (sin cambios). |
| `daule_stack0626.tif`, `masacara0626Daule.tif` | Stack (3 bandas dB) y máscara de Daule-Peripa, misma rejilla, 2026-06-26. | Usados; rejilla de referencia del sitio. |
| `Daule_Stack1.tif`, `masacara1.tif` | Stack y máscara, 2026-10-12 (por descarte; **por confirmar**); la máscara está desplazada un píxel. | Usados; el manifiesto fija la rejilla de Daule y la máscara se remuestrea por vecino más cercano. |

Respuestas del equipo (2026-11-15): productos GCOV con HH y HV leídos de granulos `.h5`; ~10 m; dB (potencia);
incendio «después» = 2026-09-25; máscara de incendio por clasificación supervisada; ΔRFDI = antes − después.

Cifras de los derivados (dentro del contorno provisional): Casitagua 2026-09-25 quemado 19,42 km² (sin máscara en
2026-09-13: la máscara del equipo es el quemado entre ambas fechas); Mazar 7,08 km² (13 ago) y 5,67 km² (29 oct);
Daule-Peripa 116,02 km² (26 jun) y 113,42 km² (12 oct). Derivados de `embalses` + `incendios`: 6,71 MB de 10 MB.

### Lo que sigue faltando del equipo
1. El **nombre de cada archivo `.h5`** usado (Casitagua 13 y 25 sep; Mazar 13 ago y 29 oct; Daule-Peripa 26 jun y 12 oct),
   de donde salen granulo, colección, instante UTC, frecuencia y madurez; o confirmar uno de los candidatos de abajo.
2. Confirmar que `Daule_Stack1.tif` y `masacara1.tif` son del 12 de octubre.

## Granulos candidatos (por confirmar con el equipo)

Consulta de **solo metadatos** al catálogo de ASF el 2026-11-15 (`scripts/granulos_candidatos.py`, sin cuenta ni descargas): GCOV adquiridos ese día UTC cuya huella cubre la caja del sitio. **No son la procedencia**: el equipo debe confirmar cuál granulo usó (el nombre del `.h5` que abrió); hasta entonces el manifiesto no se toca. Los de la fecha 2026-09-13 de Casitagua con una sola polarización (HH) no pueden ser el stack HH/HV del equipo.

**casitagua · 2026-09-13**

| Granulo (id) | Instante UTC | Colección | Frecuencias (pol.) | Madurez | % de la caja |
|---|---|---|---|---|---|
| `NISAR_L2_PR_GCOV_030_112_D_088_2005_SHSH_M_20260913T233837_20260913T233911_P05023_N_F_J_001` | 2026-09-13T23:38:37Z | NISAR_L2_GCOV_PROVISIONAL_V1 | A: HH; B: HH | PROVISIONAL | 100 % |
| `NISAR_L2_PR_GCOV_030_112_D_088_4005_DHDH_A_20260913T233907_20260913T233911_P05023_N_P_J_001` | 2026-09-13T23:39:07Z | NISAR_L2_GCOV_PROVISIONAL_V1 | A: HH+HV; B: HH+HV | PROVISIONAL | 87 % |
| `NISAR_L2_PR_GCOV_030_112_D_089_4005_DHDH_A_20260913T233907_20260913T233945_P05023_N_F_J_001` | 2026-09-13T23:39:07Z | NISAR_L2_GCOV_PROVISIONAL_V1 | A: HH+HV; B: HH+HV | PROVISIONAL | 87 % |

**casitagua · 2026-09-25**

| Granulo (id) | Instante UTC | Colección | Frecuencias (pol.) | Madurez | % de la caja |
|---|---|---|---|---|---|
| `NISAR_L2_PR_GCOV_031_112_D_088_2005_DHDH_M_20260925T233837_20260925T233911_P05023_N_F_J_001` | 2026-09-25T23:38:37Z | NISAR_L2_GCOV_PROVISIONAL_V1 | A: HH+HV; B: HH+HV | PROVISIONAL | 100 % |
| `NISAR_L2_PR_GCOV_031_112_D_088_4005_DHDH_A_20260925T233907_20260925T233911_P05023_N_P_J_001` | 2026-09-25T23:39:07Z | NISAR_L2_GCOV_PROVISIONAL_V1 | A: HH+HV; B: HH+HV | PROVISIONAL | 88 % |
| `NISAR_L2_PR_GCOV_031_112_D_089_4005_DHDH_A_20260925T233907_20260925T233945_P05023_N_F_J_001` | 2026-09-25T23:39:07Z | NISAR_L2_GCOV_PROVISIONAL_V1 | A: HH+HV; B: HH+HV | PROVISIONAL | 88 % |

**mazar · 2026-08-13**

| Granulo (id) | Instante UTC | Colección | Frecuencias (pol.) | Madurez | % de la caja |
|---|---|---|---|---|---|
| `NISAR_L2_PR_GCOV_028_011_D_090_4005_DHDH_A_20260813T233124_20260813T233159_P05023_N_F_J_001` | 2026-08-13T23:31:24Z | NISAR_L2_GCOV_PROVISIONAL_V1 | A: HH+HV; B: HH+HV | PROVISIONAL | 100 % |
| `NISAR_L2_PR_GCOV_028_003_A_176_4005_DHDH_A_20260813T110112_20260813T110148_P05023_N_F_J_001` | 2026-08-13T11:01:12Z | NISAR_L2_GCOV_PROVISIONAL_V1 | A: HH+HV; B: HH+HV | PROVISIONAL | 77 % |

**mazar · 2026-10-29**

| Granulo (id) | Instante UTC | Colección | Frecuencias (pol.) | Madurez | % de la caja |
|---|---|---|---|---|---|
| `NISAR_L2_PR_GCOV_034_075_A_176_4005_DHDH_A_20261029T105252_20261029T105329_P05036_N_F_J_001` | 2026-10-29T10:52:52Z | NISAR_L2_GCOV_V1 | A: HH+HV; B: HH+HV | VALIDATED | 100 % |

**daule-peripa · 2026-06-26**

| Granulo (id) | Instante UTC | Colección | Frecuencias (pol.) | Madurez | % de la caja |
|---|---|---|---|---|---|
| `NISAR_L2_PR_GCOV_024_004_A_001_4005_DHDH_A_20260626T110150_20260626T110224_P05023_N_F_J_001` | 2026-06-26T11:01:50Z | NISAR_L2_GCOV_PROVISIONAL_V1 | A: HH+HV; B: HH+HV | PROVISIONAL | 100 % |

**daule-peripa · 2026-10-12**

| Granulo (id) | Instante UTC | Colección | Frecuencias (pol.) | Madurez | % de la caja |
|---|---|---|---|---|---|
| `NISAR_L2_PR_GCOV_033_004_A_001_4005_DHDH_A_20261012T110147_20261012T110222_P05023_N_F_J_001` | 2026-10-12T11:01:47Z | NISAR_L2_GCOV_PROVISIONAL_V1 | A: HH+HV; B: HH+HV | PROVISIONAL | 100 % |
