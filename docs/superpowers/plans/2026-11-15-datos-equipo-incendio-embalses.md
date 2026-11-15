# Datos del equipo (incendio de Casitagua y máscaras de Mazar) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Ejecutor previsto:** Sonnet para T1–T5 (bien especificadas); Opus para la revisión de cada tarea y la final.
> Antes de cada tarea: `source scripts/entorno.sh`. **Se trabaja en el worktree `../PACHA-datos`, rama `datos-equipo`**
> (Tarea 0), nunca en la carpeta principal, donde otro agente hace el rediseño en la rama `rediseno-pacha`.

**Goal:** Convertir la entrega del equipo del 2026-11-15 (incendio de Casitagua: HH/HV antes, imagen después, máscara y
ΔRFDI) y las máscaras de Mazar en derivados de `data/` que el proveedor `mixto` sirva con procedencia, sin tocar el
frontend.

**Architecture:** Un manifiesto versionado (`preparacion/entregas.json`) dice qué archivo suelto del equipo es qué
(sitio, fecha, papel, banda, valores sin dato). `scripts/organizar_entregas.py` lo normaliza a la carpeta que ya lee la
fase 1 (`datos_imagenes/<sitio>/<AAAAMMDD>/{stack,mascara,delta_rfdi}.tif` + `procedencia.json`) en una rejilla
EPSG:32717 de 10 m. `preparacion/` y `ProveedorDerivados` aprenden dos cosas: una fecha de incendio puede no tener
máscara (la fecha «antes») y una fecha puede traer ΔRFDI. El resto de la cadena (`preparar_embalses.py`, `mixto`) no cambia.

**Tech Stack:** Python 3.13, rasterio/numpy (solo preparación), pydantic (contrato), pytest.

**Spec:** `docs/superpowers/specs/2026-11-14-embalses-incendios-design.md` (§5, §6) y `docs/datos-equipo-embalses.md`
(formato de entrega). Plan de la fase 1 (lo que ya existe): `docs/superpowers/plans/2026-11-14-fase1-datos-embalses.md`.

## Inventario de `datos_imagenes/` y decisión por archivo

Inspeccionado el 2026-11-15 (rasterio; cuadros de vista rápida comparados entre sí).

| Archivo | Qué es (medido) | Decisión |
|---|---|---|
| `HH2_db_2026_09_13.tif`, `HV2_db_2026_09_13.tif` | 1 banda float32 cada uno, EPSG:32717, 10 m, 631×928, origen (778380, 10000750). lon −78,499…−78,442, lat −0,077…0,007. HH mediana −6,8 dB, HV −13,4 dB. **El valor 40,0 es «sin dato»** (triángulo de la esquina superior, 42 800 px); sin `nodata` declarado. | **Usar**: stack «antes» del incendio, fecha **2026-09-13** (en el nombre; el incendio es el 17 sep). |
| `ImageNISAR_Incendio.tif` | 3 bandas float32, **EPSG:32617** con origen norte 745 m y **píxel de 10 × 5 m** (629×1853): misma huella que el anterior (32617 y 32717 son la misma proyección salvo el falso norte). Banda 1 ≈ HH (mediana −4,5), banda 2 ≈ HV (−8,0), **banda 3 = banda 2 exacta**. 0 = sin dato (86 800 px). Geometría de iluminación distinta de la del 13 sep (otra pasada). | **Usar**: stack «después» (bandas 1 y 2; la 3 se descarta). Fecha **2026-09-25** (equipo). |
| `InfoNISAR.tif` | uint8 0/1, nodata 255, EPSG:32717, rejilla de 10 × 5 m de la imagen «después». 1 = 37 % de la escena (~21,6 km²). | **Usar** como máscara de quemado de la fecha «después». Equipo (2026-11-15): clasificación supervisada con aprendizaje automático para detectar el incendio. Se toma 1 = quemado. Nota para la ficha: el 37 % de la escena no coincide con el ΔRFDI (mediana 0,26 en ambas clases); la superficie quemada se presenta como **estimación del equipo**, no como conclusión. |
| `RFDI_antes_despues.tif` | float32, EPSG:32717, 10 m, 629×926, origen (778390, 10000740); nodata −3,4e38 (10 % NaN). Rango −1,5…1,3, mediana 0,27. Correlación −0,64 con RFDI(después) − RFDI(antes) calculado de las dos imágenes → **es ΔRFDI = antes − después** (positivo = menos vegetación); **confirmado por el equipo**. | **Usar** como capa continua «pérdida de vegetación» de la fecha «después». **Esta rejilla es la de referencia del sitio.** |
| `HH2_HV2_db_2026_09_13.tif` | 1 banda, rejilla de 10 × 5 m en 32617; ~HH−HV en dB **de la imagen «después»** (corr. 0,73), no del 13 sep (corr. 0,00) pese al nombre; 116 px corruptos (hasta 1e7). | **Descartar**: redundante (HH−HV se obtiene del stack) y su nombre contradice su contenido. |
| `imagenes.zip`, `*.aux.xml` | El zip repite los 6 archivos sueltos; los `.aux.xml` solo traen estadísticas. | **Descartar.** |
| `mazar/20261029/mascara.tif` (= `Mazar_CS1029.tif`) | Ya procesado en la fase 1 (5,43 km²). | **Usar** (vía manifiesto, igual que hoy). |
| `Clas_Super.tif` + `Mazar_Stack.tif` | Máscara supervisada y stack HH/HV de la **primera fecha de Mazar: 2026-08-13** (equipo, 2026-11-15). | **Usar** como «antes» de Mazar. |
| `Mascara.tif`, `Tabla2.csv` | Prueba de formato superada / tabla sin geometría. | **Descartar.** |
| `daule_stack0626.tif` | 3 bandas float32 (HH, HV, HH−HV en dB; 0 = sin dato, 83 900 px), EPSG:32717, 10 m, 5441×3625, origen (627670, 9929740); lon −79,853…−79,364, lat −0,963…−0,635. 237 MB. | **Usar**: stack de Daule-Peripa **2026-06-26** (bandas 1 y 2). |
| `masacara0626Daule.tif` | uint8 0/1, nodata 255, **misma rejilla exacta** que el stack. 122,1 km² de agua; el agua es ~11 dB más oscura en HH (−17,7 frente a −6,4). Embalse continuo. | **Usar**: máscara 2026-06-26. Es la **rejilla de referencia** de Daule-Peripa. |
| `Daule_Stack1.tif` | Igual que el anterior (misma rejilla), otro contenido. | **Usar**: stack **2026-10-12** (por descarte: el del 26 jun lleva la fecha en el nombre). Confirmar con el equipo. |
| `masacara1.tif` | uint8 0/1, nodata 255, 5443×3627, origen (627660, 9929750): **un píxel desplazado** respecto de la referencia. 120,1 km² de agua. | **Usar**: máscara **2026-10-12** (misma suposición; `preparar_embalses.py` la remuestrea por vecino más cercano). |
| `daule_stack0626.tif.aux.xml`, `masacara0626Daule.tif.aux.xml` | Estadísticas e histograma de ArcGIS. | **Descartar.** |

**Daule-Peripa:** entregado (2026-11-15): fechas 2026-06-26 y 2026-10-12. La escena (lon −79,853…−79,364, lat −0,963…−0,635) se sale de la bbox actual de `preparacion/sitios.json` por el oeste y el norte → T4 la amplía. Una carpeta `Daule1012/` apareció y desapareció durante la inspección: si el equipo vuelve a dejar ahí archivos, revisarlos antes de T4. Cada stack ocupa 237 MB; normalizado (2 bandas) son ~158 MB más por fecha en `datos_imagenes/` (fuera de git; el disco aguanta).

**Respuestas del equipo (2026-11-15):** productos GCOV con HH y HV, leídos de los granulos HDF5 (`.h5`); resolución ~10 m; unidades en dB (potencia); incendio «después» = 2026-09-25; máscara de incendio por clasificación supervisada (aprendizaje automático); ΔRFDI = antes − después; la escena cubre el incendio. **Aún faltan para la procedencia completa** (`datos/contrato.py`, `_EXIGIDOS["nisar"]`): `coleccion`, `granulos`, `fecha_adquisicion` con hora UTC, `frecuencia` y `madurez`. Los cinco salen del **nombre del archivo `.h5`** que usó el equipo (el nombre del granulo NISAR es el id) y de sus metadatos → pedir los nombres de los `.h5`; mientras tanto, la Tarea 5 propone los granulos candidatos desde el catálogo (solo metadatos) y el equipo confirma.

**Orden:** los tres sitios tienen ya sus dos fechas. Casitagua es la que exige código nuevo (T1–T3); Mazar y Daule-Peripa
solo pasan por el manifiesto y se regeneran con Casitagua en T4.

## ¿En paralelo con el rediseño? Sí, la parte A; la B después

- **Parte A (este plan, T0–T5): segura en paralelo.** Solo toca `preparacion/`, `scripts/organizar_entregas.py`,
  `scripts/granulos_candidatos.py`, `tests/scripts/`,
  `datos/proveedores/derivados.py`, `tests/preparacion/`, `tests/datos/`, `data/incendios/`, `data/embalses/` y
  `docs/datos-equipo-embalses.md`. El rediseño (`docs/superpowers/plans/2026-11-15-rediseno-t1b-t9.md`) toca
  `frontend/`, `docs/diseno.md`, capturas, y en T7/T8 `INFORME.md`, `docs/retomar.md`, `api/claves.json` y el CSV kichwa.
  Sin archivos en común **si**: (1) se trabaja en un worktree aparte (la carpeta principal tiene 48 archivos sin
  confirmar del otro agente: nada de `git add -A`, `stash` ni cambio de rama allí); (2) no se añaden claves de texto a
  `datos/claves.py` (→ `api/claves.json`); (3) no se editan `INFORME.md` ni `docs/retomar.md` (lo que iría allí va al
  informe final de cada tarea y se vuelca en la integración).
- **Acoplamiento semántico:** mientras la procedencia del equipo esté incompleta (hoy lo está: no hay ids de granulo),
  `mixto` sigue sirviendo el sustituto de `incendio-casitagua` y la app no cambia. Cuando esté completa, cambian las
  adquisiciones del escenario que usa la Vía A del rediseño → **integrar después de la T8 del rediseño** y correr todas
  las suites.
- **Parte B (después del rediseño):** mostrar en la interfaz la imagen «después», la máscara de quemado y el ΔRFDI
  (paso «Lo que ve el satélite» de Incendios), y precalcularlos para Pages (`frontend/scripts/precalcular.mts`, que hoy
  edita el otro agente). Se planifica **contra la interfaz nueva**, reconciliando la fase 4; ver «Entrega» al final.

## Global Constraints

- Regla 7 de `CLAUDE.md`: **una capa real sin procedencia completa no se muestra**; el script nunca inventa una fecha,
  un granulo ni una madurez. Lo desconocido va `null`/vacío en el manifiesto y la fecha queda con `procedencia_completa = false`.
- Regla 6: nada sobre NISAR que no esté en `docs/nisar-verificado.md`.
- `preparacion/` y `scripts/` nunca se importan desde `api/`, `datos/` ni `modelo/`. `datos/` sigue compatible con Pyodide (sin rasterio).
- Rejilla de referencia de Casitagua: EPSG:32717, `transform = [10, 0, 778390, 0, -10, 10000740]`, forma `[926, 629]` (la del ΔRFDI).
- Sin dato: valores ≥ 39,99 en los dB del 13 sep; 0 exacto en `ImageNISAR_Incendio.tif`; ±3,4e38, NaN y |v| > 1e5 en cualquier float.
- Remuestreo: vecino más cercano para máscaras; bilineal para dB y ΔRFDI.
- Cuantización ΔRFDI en el `.npz`: rango `[-1.0, 1.0]` con `cuantizar` (0 = sin dato).
- Presupuesto de derivados ≤ 10 MB en total (`data/embalses` + `data/incendios`).
- `datos_imagenes/` no se versiona; el manifiesto sí. Sin `git push`. Un commit por tarea con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Pruebas: `python -m pytest tests -q` en verde antes de cada commit (382 + 2 omitidas el 2026-11-14, más las nuevas).

## Review Focus

1. Valores centinela (40 dB, 0 dB en la imagen «después», 1e7 corrupto, −3,4e38) que se cuelan como datos y estiran
   la escala de grises → prueba en T1 (`test_centinelas_son_nan`).
2. Ráster en EPSG:32617 cerca del ecuador con píxel no cuadrado: debe caer en el mismo sitio que su gemelo en 32717
   → prueba en T1 (`test_32617_alinea_con_32717`).
3. Entrada del manifiesto sin fecha: se omite con aviso, nunca se escribe una carpeta con fecha inventada → T1.
4. Fecha de **embalse** sin máscara: sigue siendo un error (falta `mascara.tif`); solo el incendio admite fechas sin
   máscara → T2.
5. Par antes/después de incendio donde «antes» no tiene máscara: el cambio sale de la máscara «después» y la serie de
   superficie no inventa un 0 para «antes» → T3.

---

### Task 0: Worktree y plan versionado

**Files:** ninguno de código.

- [ ] **Step 1:** Desde la carpeta principal, sin tocar su árbol de trabajo:
  `git worktree add ../PACHA-datos -b datos-equipo embalses` (base `embalses`, que ya es antecesora de `rediseno-pacha`).
- [ ] **Step 2:** Copiar este archivo a `../PACHA-datos/docs/superpowers/plans/` y, en el worktree,
  `git add docs/superpowers/plans/2026-11-15-datos-equipo-incendio-embalses.md && git commit -m "docs: plan de integración de los datos del equipo (incendio y Mazar)"`.
  Después, borrar la copia sin versionar de la carpeta principal (es solo de este plan; no tocar nada más allí).
- [ ] **Step 3:** En el worktree: `source scripts/entorno.sh && python -m pytest tests -q` → todo en verde (línea base).

### Task 1: Manifiesto y normalización de las entregas

**Files:**
- Create: `preparacion/entregas.json`, `preparacion/normalizar.py`, `scripts/organizar_entregas.py`
- Modify: `preparacion/rejilla.py` (añadir `remuestrear_continua`)
- Test: `tests/preparacion/test_normalizar.py` (fixtures en su `conftest.py` existente)

**Interfaces:**
- Consumes: `Rejilla`, `remuestrear_categorica` (`preparacion/rejilla.py`); `Raster`, `SIN_DATO` (`preparacion/entrada.py`).
- Produces:
  - `remuestrear_continua(r: Raster, destino: Rejilla) -> np.ndarray` (float32, bilineal, NaN donde no hay fuente).
  - `leer_banda(ruta: Path, banda: int = 1, sin_dato: list[float] = [], umbral_sin_dato: float | None = None) -> Raster` — float32; NaN en `sin_dato`, en `>= umbral_sin_dato`, en NaN/inf, en |v| > 1e5 y en el `nodata` declarado.
  - `rejilla_de(d: dict) -> Rejilla` (desde `{"epsg", "transform", "forma"}` del manifiesto).
  - `organizar(manifiesto: dict, entrada: Path, salida: Path) -> list[str]` — escribe `salida/<sitio>/<AAAAMMDD>/` y devuelve líneas de informe.
  - Archivos escritos por fecha: `stack.tif` (2 bandas float32 HH, HV; NaN = sin dato), `mascara.tif` (uint8, 255 = sin dato), `delta_rfdi.tif` (float32), `procedencia.json` (el dict `procedencia` de la entrada, tal cual; no se escribe si ya existe un `procedencia.json` del equipo en esa carpeta).

Contenido de `preparacion/entregas.json` (valores decididos; los `null` los rellena el equipo):

```json
{"version": 1,
 "sitios": {
  "casitagua": {
   "rejilla": {"epsg": 32717, "transform": [10, 0, 778390, 0, -10, 10000740], "forma": [926, 629]},
   "fechas": [
    {"fecha": "2026-09-13", "papel": "antes",
     "stack": {"HH": {"archivo": "HH2_db_2026_09_13.tif", "banda": 1, "umbral_sin_dato": 39.99},
               "HV": {"archivo": "HV2_db_2026_09_13.tif", "banda": 1, "umbral_sin_dato": 39.99}},
     "procedencia": {"fecha_adquisicion_utc": null, "granulos": [], "producto": "GCOV", "coleccion": null,
                     "frecuencia": null, "madurez": null, "polarizaciones": ["HH", "HV"], "unidades_stack": "dB",
                     "autor": "equipo PACHA"}},
    {"fecha": "2026-09-25", "papel": "despues",
     "stack": {"HH": {"archivo": "ImageNISAR_Incendio.tif", "banda": 1, "sin_dato": [0]},
               "HV": {"archivo": "ImageNISAR_Incendio.tif", "banda": 2, "sin_dato": [0]}},
     "mascara": {"archivo": "InfoNISAR.tif", "clases": {"1": "quemado", "0": "no quemado", "255": "sin dato"}},
     "delta_rfdi": {"archivo": "RFDI_antes_despues.tif", "signo": "antes_menos_despues"},
     "procedencia": {"fecha_adquisicion_utc": null, "granulos": [], "producto": "GCOV", "coleccion": null,
                     "frecuencia": null, "madurez": null, "polarizaciones": ["HH", "HV"], "unidades_stack": "dB",
                     "metodo": {"nombre": "clasificación supervisada (aprendizaje automático)", "clases": 2,
                                "parametros": {}},
                     "autor": "equipo PACHA"}}]},
  "mazar": {
   "rejilla": null,
   "fechas": [
    {"fecha": "2026-08-13", "papel": "antes", "mascara": {"archivo": "Clas_Super.tif"},
     "stack": {"HH": {"archivo": "Mazar_Stack.tif", "banda": 1, "sin_dato": [0]},
               "HV": {"archivo": "Mazar_Stack.tif", "banda": 2, "sin_dato": [0]}},
     "procedencia": {"fecha_adquisicion_utc": null, "granulos": [], "producto": "GCOV", "coleccion": null,
                     "frecuencia": null, "madurez": null, "polarizaciones": ["HH", "HV"], "unidades_stack": "dB",
                     "metodo": {"nombre": "clasificación supervisada", "clases": 2, "parametros": {}},
                     "autor": "equipo PACHA"}},
    {"fecha": "2026-10-29", "papel": "despues", "mascara": {"archivo": "Mazar_CS1029.tif"},
     "procedencia": {"fecha_adquisicion_utc": null, "granulos": [], "producto": "GCOV", "coleccion": null,
                     "frecuencia": null, "madurez": null, "polarizaciones": ["HH", "HV"], "unidades_stack": "dB",
                     "metodo": {"nombre": "clasificación supervisada", "clases": 2, "parametros": {}},
                     "autor": "equipo PACHA"}}]},
  "daule-peripa": {
   "rejilla": null,
   "fechas": [
    {"fecha": "2026-06-26", "papel": "antes", "mascara": {"archivo": "masacara0626Daule.tif"},
     "stack": {"HH": {"archivo": "daule_stack0626.tif", "banda": 1, "sin_dato": [0]},
               "HV": {"archivo": "daule_stack0626.tif", "banda": 2, "sin_dato": [0]}},
     "procedencia": {"fecha_adquisicion_utc": null, "granulos": [], "producto": "GCOV", "coleccion": null,
                     "frecuencia": null, "madurez": null, "polarizaciones": ["HH", "HV"], "unidades_stack": "dB",
                     "metodo": {"nombre": "clasificación supervisada", "clases": 2, "parametros": {}},
                     "autor": "equipo PACHA"}},
    {"fecha": "2026-10-12", "papel": "despues", "mascara": {"archivo": "masacara1.tif"},
     "stack": {"HH": {"archivo": "Daule_Stack1.tif", "banda": 1, "sin_dato": [0]},
               "HV": {"archivo": "Daule_Stack1.tif", "banda": 2, "sin_dato": [0]}},
     "procedencia": {"fecha_adquisicion_utc": null, "granulos": [], "producto": "GCOV", "coleccion": null,
                     "frecuencia": null, "madurez": null, "polarizaciones": ["HH", "HV"], "unidades_stack": "dB",
                     "metodo": {"nombre": "clasificación supervisada", "clases": 2, "parametros": {}},
                     "autor": "equipo PACHA"}}]}},
 "descartados": {
  "HH2_HV2_db_2026_09_13.tif": "HH−HV de la imagen «después» pese al nombre; redundante; 116 px corruptos",
  "imagenes.zip": "repite los archivos sueltos", "Mascara.tif": "prueba de formato superada",
  "Tabla2.csv": "tabla de atributos sin geometría"}}
```

Reglas: `"rejilla": null` → se copia el archivo tal cual (Mazar ya funciona así; `preparar_embalses.py` remuestrea);
`"procedencia": null` → no se escribe `procedencia.json`; `"fecha": null` → la entrada se omite y el informe dice
`casitagua: entrada «despues» omitida: falta la fecha (pedir al equipo)`; `"archivo": null` o un archivo que no existe →
se omite con `<sitio> <fecha>: falta el archivo de la máscara (pedir al equipo)`. Para Mazar, `organizar`
copia `Clas_Super.tif`/`Mazar_Stack.tif` a `mazar/20260813/{mascara,stack}.tif` (stack con bandas 1 y 2) y escribe
el `procedencia.json` de cada fecha.

- [ ] **Step 1: Escribir las pruebas que fallan** en `tests/preparacion/test_normalizar.py`:
  - `test_centinelas_son_nan`: banda con 40,0, 0,0, 1e7 y −3,4e38 → `leer_banda(..., sin_dato=[0], umbral_sin_dato=39.99)` deja NaN en las cuatro y conserva −7,5.
  - `test_32617_alinea_con_32717`: el mismo patrón (un bloque de 1 en filas 10–19, cols 5–14 de una rejilla de 10 m en 32717 con origen norte 10000300) escrito en EPSG:32617 con origen norte 300 y píxel de 10 × 5 m (filas duplicadas) → `remuestrear_categorica` a la rejilla de 32717 devuelve el bloque en las mismas filas y columnas (igualdad exacta).
  - `test_remuestrear_continua_bilineal_y_nan`: fuera de la huella → NaN; dentro, valores constantes se conservan.
  - `test_organizar_omite_fecha_null`: manifiesto con una entrada sin fecha → no crea carpeta y una línea del informe contiene `falta la fecha`.
  - `test_organizar_omite_archivo_null`: entrada con `"archivo": null` → no crea carpeta; el informe contiene `falta el archivo`.
  - `test_organizar_escribe_stack_mascara_delta`: entrada completa de prueba → existen `stack.tif` (2 bandas, EPSG:32717, transform de la rejilla), `mascara.tif` (uint8, sin dato = 255) y `delta_rfdi.tif`; la banda 3 del origen se ignora.
  - `test_no_pisa_procedencia_del_equipo`: si la carpeta destino ya tiene `procedencia.json`, su contenido no cambia.
- [ ] **Step 2:** `python -m pytest tests/preparacion/test_normalizar.py -q` → FALLA (módulo inexistente).
- [ ] **Step 3:** Implementar `remuestrear_continua` en `preparacion/rejilla.py` (`reproject`, `Resampling.bilinear`, `src_nodata=np.nan`, `dst_nodata=np.nan`), y `leer_banda`, `rejilla_de`, `organizar` en `preparacion/normalizar.py` con las firmas de arriba; `scripts/organizar_entregas.py` con `--manifiesto preparacion/entregas.json --entrada datos_imagenes --salida datos_imagenes` (mismo patrón de `sys.path` que `preparar_embalses.py`), imprime el informe y la lista de descartados.
- [ ] **Step 4:** `python -m pytest tests -q` → PASA.
- [ ] **Step 5:** Ejecutar contra los datos reales (en el worktree, `--entrada` y `--salida` apuntan a `../NISAR-Ecuador/datos_imagenes`, que está fuera de git) y comprobar: existen `casitagua/20260913/stack.tif` y `casitagua/20260925/{stack,mascara,delta_rfdi}.tif` (todos 926×629, EPSG:32717), `mazar/20260813/{mascara,stack}.tif`, `daule-peripa/20260626/` y `daule-peripa/20261012/`; `mazar/20261029/mascara.tif` sigue igual; el informe lista los descartados.
- [ ] **Step 6: Commit** `feat(datos-equipo): manifiesto y normalización de las entregas del equipo`.

### Task 2: Fechas de incendio sin máscara y ΔRFDI en la preparación

**Files:**
- Modify: `preparacion/entrada.py` (`Fecha`, `descubrir`), `preparacion/salida.py` (`escribir_sitio`), `preparacion/rejilla.py` (`rejilla_referencia`)
- Test: `tests/preparacion/test_entrada.py`, `tests/preparacion/test_salida.py`

**Interfaces:**
- Consumes: `remuestrear_continua` (T1), `cuantizar` (`salida.py`).
- Produces (formato de `sitio.json`, lo lee T3):
  - `Fecha.mascara: Path | None`; `Fecha.delta_rfdi: Path | None`.
  - `descubrir(raiz, sitio, tipo: str)`: para `tipo == "embalse"` falta `mascara.tif` sigue en `faltan`; para `"incendio"`, una carpeta con `stack.tif` o `mascara.tif` es válida.
  - `rejilla_referencia(sitio, rasters: list[Raster])`: máscaras primero, luego HH de los stacks, luego ΔRFDI (misma regla: primera en 32717 con píxel cuadrado).
  - Fila de fecha en `sitio.json`: `"mascara": bool`; `"superficie_km2": {clase: float | null}` (`null` sin máscara); `"delta_rfdi": [-1.0, 1.0] | null`. El `.npz` no lleva la clave `mascara` si no hay máscara y lleva `delta_rfdi` (uint8 cuantizado) si lo hay.
  - `VERSION = 2` en `salida.py`.

- [ ] **Step 1: Pruebas que fallan:**
  - `test_descubrir_incendio_sin_mascara`: carpeta `casitagua/20260913/` con solo `stack.tif` → una `Fecha` con `mascara is None` y `"mascara.tif"` fuera de `faltan`.
  - `test_descubrir_embalse_sin_mascara_falta`: lo mismo para `mazar` → `"mascara.tif"` en `faltan`.
  - `test_escribir_sitio_fecha_sin_mascara`: fila con `mascara: false`, `superficie_km2 == {"quemado": None}`, npz sin clave `mascara` y con `HH`/`HV`.
  - `test_escribir_sitio_delta_rfdi`: fila con `delta_rfdi == [-1.0, 1.0]`; `descuantizar(npz["delta_rfdi"], -1, 1)` recupera 0,3 ± 0,01 y NaN donde la fuente es NaN.
  - `test_rejilla_referencia_desde_stack`: sin máscaras, la rejilla es la del HH en 32717.
- [ ] **Step 2:** `python -m pytest tests/preparacion -q` → FALLAN las nuevas.
- [ ] **Step 3:** Implementar. `scripts/preparar_embalses.py` pasa `s.tipo` a `descubrir` e imprime `sin máscara` en lugar de la superficie cuando es `null`. Las fechas sin máscara no entran en `contorno(...)`.
- [ ] **Step 4:** `python -m pytest tests -q` → PASA (incluidas las de `tests/datos/` que leen `sitio.json` v1 de prueba: si alguna rompe por `VERSION`, el proveedor debe aceptar 1 y 2).
- [ ] **Step 5: Commit** `feat(datos-equipo): fechas de incendio sin máscara y ΔRFDI en los derivados`.

### Task 3: El proveedor de derivados sirve fechas sin máscara y el ΔRFDI

**Files:**
- Modify: `datos/proveedores/derivados.py`
- Test: `tests/datos/test_derivados_incendio.py` (nuevo; fixtures con un `sitio.json` v2 escrito en `tmp_path`)

**Interfaces:**
- Consumes: formato de T2.
- Produces:
  - `Escenario.variables`: `"mascara"` si alguna fecha la trae, `"gamma0"` si hay stack, `"delta_rfdi"` si alguna fecha lo trae.
  - `capa(..., variable="delta_rfdi")` → `CapaRaster(variable="delta_rfdi", unidad="", paleta="divergente", vmin=-1.0, vmax=1.0, leyenda=None)`; en una fecha sin él, `EntradaNoValida` con la clave existente `api.error.variable_desconocida` (no se añaden claves nuevas).
  - `capa(..., variable="mascara")` en una fecha sin máscara → `EntradaNoValida` con la misma clave.
  - `cambio()` de incendio cuando «antes» no tiene máscara: `ma = np.where(md == 0, 0, 2)` (la máscara del equipo es el quemado entre ambas fechas: cambio de «no quemado» a «quemado»); `capa_a`/`capa_d` = gamma0 si ambas tienen stack. Para embalses, sin cambios.
  - `serie_superficie()` omite las fechas con superficie `null`; `metricas_cambio` recibe 0,0 como superficie «antes» solo en el caso de incendio descrito arriba (documentado en el docstring).
  - Verificar antes que la paleta `"divergente"` existe en `frontend/src/diseno/rampas.ts`/el contrato; si no existe, usar el nombre que exista para rampas divergentes y anotarlo para la parte B. **No** tocar `frontend/`.

- [ ] **Step 1: Pruebas que fallan** en `tests/datos/test_derivados_incendio.py`:
  - `test_variables_incendio`: escenario con «antes» (stack) y «después» (stack + máscara + ΔRFDI), ambas con procedencia completa → `variables == ["mascara", "gamma0", "delta_rfdi"]`.
  - `test_capa_delta_rfdi`: valores en [−1, 1], `paleta`, `origen.clase == "nisar"`.
  - `test_mascara_en_fecha_sin_mascara_es_400`: `EntradaNoValida`.
  - `test_cambio_incendio_sin_mascara_antes`: píxeles 1 en «después» → código 2 («ganada» = quemado); píxeles sin dato → 0.
  - `test_serie_omite_null`: la serie tiene un punto (la fecha «después»).
  - `test_procedencia_incompleta_no_se_muestra`: con «después» sin granulos → el escenario no está en `ProveedorDerivados.escenarios()` y `ProveedorMixto` sirve el sustituto de `incendio-casitagua` (origen `sintetico`).
- [ ] **Step 2:** `python -m pytest tests/datos/test_derivados_incendio.py -q` → FALLAN.
- [ ] **Step 3:** Implementar en `derivados.py` con las interfaces de arriba.
- [ ] **Step 4:** `python -m pytest tests -q` y `python -m pytest tests/motor/test_compatibilidad_pyodide.py -q` → PASAN.
- [ ] **Step 5: Commit** `feat(datos-equipo): el proveedor de derivados sirve el incendio (sin máscara antes, ΔRFDI)`.

### Task 4: Regenerar los derivados de Casitagua y Mazar, y documentar la entrega

**Files:**
- Modify: `preparacion/sitios.json` (Casitagua), `data/incendios/casitagua/*`, `data/embalses/mazar/*`, `docs/datos-equipo-embalses.md`

- [ ] **Step 1:** En `preparacion/sitios.json`: Casitagua `"bbox": [-78.56, -0.09, -78.43, 0.02]` (cubre la huella entregada, lon −78,499…−78,442, que hoy se sale por el este en −78,47); Daule-Peripa `"bbox": [-79.86, -1.14, -79.30, -0.63]` (unión de la actual y la escena entregada). Las semillas no cambian (la de Daule-Peripa, −0,9127 / −79,4430, cae dentro de la escena). Ajustar la prueba de `tests/preparacion` que fije la bbox, si la hay.
- [ ] **Step 2:** `E=../NISAR-Ecuador/datos_imagenes; python scripts/organizar_entregas.py --entrada $E --salida $E && python scripts/preparar_embalses.py --sitio todos --entrada ../NISAR-Ecuador/datos_imagenes --regenerar-contorno`
  Esperado: Casitagua con la fecha 2026-09-13 (stack, sin máscara, procedencia incompleta) y 2026-09-25 (stack + máscara de quemado + ΔRFDI), ambas con procedencia incompleta; Mazar con 2026-08-13 (stack + máscara; la evaluación de la fase 1 midió ~7,0 km² dentro de un contorno provisional) y 2026-10-29 (~5,4–5,7 km²), ambas con procedencia incompleta; Daule-Peripa con 2026-06-26 (~122 km² en la escena; menos dentro del contorno) y 2026-10-12 (~120 km²), rejilla de derivados a 60 m (factor 6); «Total … de 10 MB» por debajo de 10.
- [ ] **Step 3:** Vista rápida (fuera del repo, en el scratchpad) de HH antes/después, máscara y ΔRFDI desde los `.npz`, para comprobar alineación y que no hay centinelas (mín./máx. dentro de los rangos de `RANGOS_DB`).
- [ ] **Step 4:** `python -m pytest tests -q` → PASA; `python -c "from datos.proveedores.mixto import ProveedorMixto as P; print([ (e.id, e.origen.tipo) for e in P().escenarios()])"` → `incendio-casitagua` sigue `sintetico` mientras falte la procedencia.
- [ ] **Step 5:** Añadir a `docs/datos-equipo-embalses.md` la sección «Tercera entrega (2026-11-15): Casitagua» con la tabla del inventario de este plan, las respuestas del equipo y lo que **sigue faltando** (abajo).
- [ ] **Step 6: Commit** `feat(datos-equipo): derivados de Casitagua (antes 13 sep) y Mazar desde el manifiesto`.

### Task 5: Granulos candidatos desde el catálogo (solo metadatos)

Para completar la procedencia sin que el equipo tenga que buscar a mano: por sitio y fecha, los granulos GCOV del
catálogo de ASF cuya huella cubre la del sitio y cuya adquisición cae ese día (UTC). **Solo metadatos** (regla 5; no
exige cuenta) y **nunca se escriben en el manifiesto sin que el equipo confirme cuál usó**.

**Files:**
- Create: `scripts/granulos_candidatos.py`
- Test: `tests/scripts/test_granulos_candidatos.py`

**Interfaces:**
- Consumes: `preparacion/entregas.json` (fechas), `preparacion/sitios.json` (bbox); las convenciones de campos y
  colecciones que ya usa `scripts/explorar_catalogo.py` (verificadas en `docs/nisar-verificado.md`): reutilizar sus
  funciones de normalización en lugar de duplicarlas.
- Produces: `candidatos(granulos: list[dict], bbox: tuple[float, float, float, float], dia: date) -> list[dict]` (pura,
  sin red: filtra por día UTC y por intersección de huella, ordena por cobertura de la bbox, de mayor a menor) y una
  tabla Markdown por sitio y fecha (id, instante UTC, colección, frecuencia, madurez, polarizaciones, % de la bbox
  cubierto) que se añade a `docs/datos-equipo-embalses.md` bajo «Granulos candidatos (por confirmar con el equipo)».

- [ ] **Step 1: Pruebas que fallan** (granulos de ejemplo en memoria, sin red): `test_filtra_por_dia_utc` (uno del día anterior a las 23:59Z queda fuera), `test_filtra_por_huella`, `test_ordena_por_cobertura`.
- [ ] **Step 2:** `python -m pytest tests/scripts/test_granulos_candidatos.py -q` → FALLA.
- [ ] **Step 3:** Implementar `candidatos` y el `main` (`asf_search`, de `requirements-preparacion.txt`; nunca importado desde `api/`, `datos/` ni `modelo/`).
- [ ] **Step 4:** `python -m pytest tests -q` → PASA; correr el script (red, solo metadatos) para Casitagua 2026-09-13, Mazar 2026-08-13 y 2026-10-29, Daule-Peripa 2026-06-26 y 2026-10-12, y pegar las tablas en el documento. Si una fecha no tiene candidatos, decirlo así (puede ser una fecha mal transcrita).
- [ ] **Step 5: Commit** `feat(datos-equipo): granulos candidatos del catálogo para completar la procedencia`.

**Cuando el equipo confirme** un granulo por fecha: copiar a `procedencia` del manifiesto `granulos`, `coleccion`,
`fecha_adquisicion_utc`, `frecuencia` y `madurez` tal como los da el catálogo, volver a correr el Step 2 de T4 y
comprobar que la fecha pasa a `procedencia completa` y que `mixto` sirve el escenario con origen `nisar`. Ese cambio
de datos se integra con la misma regla de abajo (después de la T8 del rediseño).

## Lo que sigue faltando del equipo (bloquea mostrar los datos como reales, no el código)

1. **El nombre de cada archivo `.h5`** usado (uno por fecha: Casitagua 13 y 25 sep; Mazar 13 ago y 29 oct;
   Daule-Peripa 26 jun y 12 oct). Con eso la procedencia queda completa sin adivinar; si no los tienen, confirmar entre los
   candidatos de la Tarea 5.
2. Confirmar que `Daule_Stack1.tif` y `masacara1.tif` son del 12 de octubre.

## Entrega

- Parte A terminada = T0–T5 en verde en la rama `datos-equipo`. Revisión final de rama con Opus.
- **Integración:** después de la T8 del rediseño, `git merge datos-equipo` en `rediseno-pacha` (o en `embalses`, lo que
  el usuario decida), suites completas (pytest, unittest, vitest, lint, build, Playwright, Pages), y entonces anotar en
  `INFORME.md` y `docs/retomar.md` lo que devolvieron los informes de T1–T4.
- **Parte B** (plan aparte, tras el rediseño): reconciliar la fase 4 con la interfaz nueva y añadir al paso «Lo que ve
  el satélite» de Incendios la imagen «después», la máscara de quemado y la capa ΔRFDI (con `Termino` que explique RFDI),
  más su precálculo en Pages.
