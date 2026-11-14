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
2. **Procedencia de cada fecha** (regla 7 de `CLAUDE.md`: una capa real sin procedencia no se muestra).
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
