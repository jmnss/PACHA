# Fase 1 — Datos: contrato, preparación y proveedor mixto · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Ejecutor previsto: Claude Sonnet** (subagentes con `model: "sonnet"`, o una sesión Sonnet con executing-plans).
> Antes de cada tarea: `source scripts/entorno.sh`. Rama `embalses`. Un commit por tarea con el mensaje indicado.

**Goal:** Que la app sirva escenarios de embalses (Mazar, Daule-Peripa) e incendio (Casitagua) desde derivados
reales del equipo cuando tengan procedencia, y desde sustitutos sintéticos con la forma real del sitio cuando no.

**Architecture:** El contrato (`datos/contrato.py`) gana procedencia y `historia="embalse"`. Un paquete de
preparación fuera de línea (`preparacion/`, CLI `scripts/preparar_embalses.py`) convierte `datos_imagenes/` +
DEM Copernicus en derivados pequeños (`data/embalses/`, `data/incendios/`). Tres proveedores nuevos en
`datos/proveedores/`: `derivados` (lee los derivados), `sustituto` (sintético sobre el DEM real) y `mixto`
(compone derivados + sustitutos + demo), elegido por defecto.

**Tech Stack:** Python 3.13 (y Pyodide 3.14 para `datos/`), numpy, scipy, pydantic 2; preparación con rasterio,
pyproj, shapely (solo en `requirements-preparacion.txt`).

**Spec:** `docs/superpowers/specs/2026-11-14-embalses-incendios-design.md` (§5, §6, §7). Evaluación de los datos
del equipo: `docs/datos-equipo-embalses.md`.

## Global Constraints

- `datos/`, `api/`, `modelo/` **nunca** importan rasterio, pyproj, shapely, requests ni nada de
  `requirements-preparacion.txt` (`tests/motor/test_compatibilidad_pyodide.py`). `datos/` solo usa numpy, scipy,
  pydantic y la biblioteca estándar; lee `.npz` y `.json`.
- `modelo/` no se modifica.
- Regla 7 de `CLAUDE.md`: una capa con `clase` `nisar` u `otro_sensor` sin procedencia completa **no se muestra**;
  nunca se mezclan fechas sintéticas dentro de un escenario real.
- Presupuesto de derivados versionados: `data/embalses/` + `data/incendios/` ≤ **10 MB** en total.
- Disco del usuario: ≤ ~10 GB libres. Descargas de una en una; si el espacio libre es < 2 GB, abortar con mensaje.
  Descargas abiertas no-NISAR (DEM, WorldCover) autorizadas; granulos NISAR **no** (no hay credencial).
- Lo crudo va a `data/crudo/` (añadirlo a `.gitignore`); `datos_imagenes/` ya está ignorado y **no se modifica ni
  se mueve** (solo se lee).
- Rejilla de referencia de los tres sitios: **EPSG:32717**. Derivados con lado largo ≤ **1024 px**.
- Ids de escenario fijos: `embalse-mazar`, `embalse-daule-peripa`, `incendio-casitagua`.
- Códigos de capa categórica del contrato: valor k = `leyenda[k-1]`, 0 = sin dato.
- Textos de la API con clave en `datos/claves.py` (`REGISTRO`) y `python scripts/exportar_claves_api.py` tras
  añadir claves.
- Pruebas en verde antes de cada commit: `python -m pytest tests -q` (y las del frontend en la Tarea 1).

## Review Focus

1. Máscara de 2 bits de ArcGIS con `GDAL_NODATA=3`, y uint8 con `GDAL_NODATA=256` (inválido): ambas deben leerse
   sin error y sin tomar el 256 como valor → pruebas en Tarea 3.
2. Fecha de una máscara en otra rejilla (píxel 10,063 × 9,950 m, origen desplazado ~2 m, o UTM 18S): debe
   remuestrearse a la rejilla de referencia por vecino más cercano y medirse antes de remuestrear → Tarea 4.
3. Borde sin dato del stack (HH == 0) marcado como 0 («no agua») en la máscara: debe salir como sin dato → Tarea 3.
4. Sitio con una sola fecha mostrable: `cambio` debe dar 409 legible, no 500 ni una fecha inventada → Tarea 7.
5. `procedencia.json` ausente o incompleto: la fecha se prepara pero el proveedor no la expone, y el informe del
   script dice qué falta → Tareas 2, 5 y 7.

---

### Task 1: Procedencia en el contrato

**Files:**
- Modify: `datos/contrato.py` (Origen, Escenario, nuevo `Procedencia`, `faltantes_procedencia`)
- Modify: `docs/contrato-datos.md` (tabla de modelos)
- Modify: `frontend/src/api/` tipos generados (`python scripts/exportar_openapi.py && cd frontend && npm run tipos`)
- Test: `tests/datos/test_contrato.py`

**Interfaces:**
- Produces:
  - `class Procedencia(BaseModel)` (frozen): `producto: str | None`, `coleccion: str | None`,
    `granulos: list[str] = []`, `fecha_adquisicion: AwareDatetime | None`, `polarizaciones: list[str] = []`,
    `frecuencia: Literal["A","B"] | None`, `madurez: Literal["BETA","PROVISIONAL","VALIDATED"] | None`,
    `unidades: str | None`, `metodo: dict | None` (nombre, clases, parametros), `autor: str | None`,
    `fecha_proceso: str | None`.
  - `ClaseOrigen = Literal["nisar","otro_sensor","sintetico","complementario"]`.
  - `Origen.clase: ClaseOrigen | None = None`, `Origen.procedencia: Procedencia | None = None`.
  - `def faltantes_procedencia(clase: ClaseOrigen, p: Procedencia | None) -> list[str]`: nombres de campos que
    faltan. `nisar` exige producto, coleccion, granulos (≥1), fecha_adquisicion, polarizaciones (≥1), frecuencia,
    madurez. `otro_sensor` exige producto, granulos, fecha_adquisicion, polarizaciones. Las demás clases: `[]`.
  - `Escenario.historia: Literal["inundacion","incendio","embalse"] | None`, `Escenario.sitio: str | None = None`.

- [x] **Step 1: Tests que fallan** en `tests/datos/test_contrato.py`:
  - `test_origen_nisar_sin_procedencia_completa_se_rechaza`: `Origen(tipo="real", clase="nisar", fuente="x",
    fecha_generacion=…, procedencia=Procedencia(producto="GCOV"))` lanza `ValidationError` cuyo texto nombra
    `coleccion`.
  - `test_origen_clase_sintetico_exige_tipo_sintetico`: `clase="sintetico", tipo="real"` → `ValidationError`;
    `clase` `nisar`/`otro_sensor` con `tipo="sintetico"` → `ValidationError`.
  - `test_origen_sin_clase_sigue_valiendo`: `Origen(tipo="real", fuente="ficticio", fecha_generacion=…)` válido
    (compatibilidad con el proveedor ficticio).
  - `test_faltantes_procedencia`: con una `Procedencia` completa de ejemplo (`granulos=["NISAR_L2_PR_GCOV_X"]`,
    `fecha_adquisicion=2026-10-29T23:31:00Z`, `polarizaciones=["HH","HV"]`, `frecuencia="A"`,
    `madurez="VALIDATED"`, `producto="GCOV"`, `coleccion="NISAR_L2_GCOV_V1"`) → `[]`; sin `madurez` → `["madurez"]`;
    para `otro_sensor` sin `coleccion` → `[]`.
  - `test_escenario_admite_embalse_y_sitio`: `Escenario(..., historia="embalse", sitio="mazar")` válido.
- [x] **Step 2:** `python -m pytest tests/datos/test_contrato.py -q` → FAIL (`Procedencia` no existe).
- [x] **Step 3:** Implementar en `datos/contrato.py`. Validador `model_validator(mode="after")` en `Origen`:
  coherencia `clase`↔`tipo` y `faltantes_procedencia(...) == []` cuando `clase` ∈ {nisar, otro_sensor}.
  Mensaje: `"Procedencia incompleta: faltan {campos}"`.
- [x] **Step 4:** `python -m pytest tests -q` → PASS (incluye `tests/api/test_contrato_openapi.py`: si falla,
  regenerar con `python scripts/exportar_openapi.py && cd frontend && npm run tipos` y volver a correr).
  `cd frontend && npm test && npm run lint` → PASS.
- [x] **Step 5:** Actualizar `docs/contrato-datos.md` (filas `Origen`, `Escenario`, nueva `Procedencia`).
- [x] **Step 6: Commit** `feat(datos): procedencia y clase de origen en el contrato; historia «embalse»`

---

### Task 2: Paquete de preparación — sitios y lectura de entradas del equipo

**Files:**
- Create: `preparacion/__init__.py`, `preparacion/sitios.py`, `preparacion/entrada.py`
- Create: `preparacion/sitios.json`
- Modify: `requirements-preparacion.txt` (añadir `rasterio`), `.gitignore` (añadir `data/crudo/`)
- Test: `tests/preparacion/__init__.py`, `tests/preparacion/test_entrada.py`, `tests/preparacion/conftest.py`
- Modify: `tests/motor/test_compatibilidad_pyodide.py` solo si hace falta para que `preparacion/` quede fuera del
  zip y de la comprobación de dependencias de la app (no debe estar en el zip).

**Interfaces:**
- Produces:
  - `preparacion/sitios.json`: lista de sitios
    `{"sitio","tipo":"embalse"|"incendio","nombre","region","bbox":[o,s,e,n],"semilla":[lat,lon],"epsg":32717,
      "clases_defecto":{...}}`. Valores iniciales (aproximados; el script ajusta la caja a la de la máscara del
    equipo si existe):
    - `mazar`: embalse, bbox `[-78.74,-2.80,-78.55,-2.55]`, semilla aproximada en el vaso
      (tomarla de la máscara `Clas_Super.tif`: centroide de la región de agua más grande, convertido a WGS84),
      clases `{"1":"agua","0":"no agua","3":"sin dato","255":"sin dato"}`.
    - `daule-peripa`: embalse, bbox `[-79.80,-1.20,-79.35,-0.55]`, semilla `[-0.95,-79.60]` (aproximada; Step 0).
    - `casitagua`: incendio, bbox `[-78.56,-0.08,-78.47,0.02]`, semilla `[-0.03,-78.52]` (aproximada),
      clases `{"1":"quemado","0":"no quemado","3":"sin dato","255":"sin dato"}`.
  - `preparacion.sitios.cargar_sitios() -> dict[str, Sitio]` (dataclass `Sitio` con los campos anteriores).
  - `preparacion.entrada.Fecha` (dataclass): `sitio: str`, `fecha: date`, `mascara: Path`, `stack: Path | None`,
    `procedencia: dict | None`, `faltan: list[str]`.
  - `preparacion.entrada.descubrir(raiz: Path, sitio: str) -> list[Fecha]`: lee
    `raiz/<sitio>/<AAAAMMDD>/{mascara.tif, stack.tif?, procedencia.json?}`, ordenadas por fecha. Carpetas con otro
    nombre se ignoran con aviso.
  - `preparacion.entrada.leer_mascara(ruta: Path, stack_hh: np.ndarray | None = None) -> Raster`:
    `Raster` (dataclass) = `datos: np.ndarray (uint8)`, `transform: affine.Affine`, `crs: str`,
    `nodata: int = 255`. Los códigos sin dato del archivo (3, 255, el `nodata` declarado si cabe en uint8) pasan a
    255; si `stack_hh` se da, los píxeles con `stack_hh == 0` pasan a 255.
  - `preparacion.entrada.leer_stack(ruta: Path) -> tuple[Raster, Raster]` (HH, HV en dB, float32, NaN = sin dato;
    el valor 0 exacto es sin dato).
  - `preparacion.entrada.validar_procedencia(p: dict | None, clase: str = "nisar") -> list[str]`: construye
    `datos.contrato.Procedencia` desde el JSON del equipo (claves `granulos`, `fecha_adquisicion_utc`,
    `producto`, `coleccion`, `madurez`, `frecuencia`, `polarizaciones`, `unidades_stack`, `metodo`, `autor`,
    `fecha_proceso`) y devuelve `faltantes_procedencia(...)`; `None` → `["procedencia.json"]`.

- [x] **Step 0:** Instalar: `python -m pip install -r requirements-preparacion.txt`. Las cajas y semillas de
  Daule-Peripa y Casitagua son aproximadas: comprobarlas pintando el DEM en la Tarea 6 (el vaso de Daule-Peripa
  debe caer dentro de la caja; si no, ampliar la caja) y anotarlo en `INFORME.md`.
- [x] **Step 1: Tests que fallan** (`tests/preparacion/test_entrada.py`). Fixtures en `conftest.py` que escriben
  GeoTIFF pequeños con rasterio en `tmp_path` (EPSG:32717, 10 m, 40 × 30 px):
  - `test_leer_mascara_2bits_nodata_3`: GeoTIFF `NBITS=2`, `nodata=3`, con valores {0,1,3} → `datos` con
    {0,1,255}.
  - `test_leer_mascara_nodata_256_no_rompe`: uint8 cuya etiqueta GDAL_NODATA es `"256"` (escribir con
    `rasterio` y luego `tifffile`/edición de la etiqueta, o `gdal` vía rasterio `nodata=None` + `update_tags`;
    lo esencial: la etiqueta dice 256) → lee sin excepción y los valores 0/1 se conservan.
  - `test_borde_sin_dato_del_stack`: `stack_hh` con una franja de ceros → esa franja vale 255 en la máscara.
  - `test_descubrir_ordena_y_marca_faltantes`: dos carpetas `20261029` y `20260701`, una sin `procedencia.json`
    → orden por fecha y `faltan == ["procedencia.json"]` en la que no lo tiene.
  - `test_validar_procedencia_ejemplo_del_doc`: el JSON de ejemplo de `docs/datos-equipo-embalses.md` → `[]`.
- [x] **Step 2:** `python -m pytest tests/preparacion -q` → FAIL.
- [x] **Step 3:** Implementar `preparacion/` (rasterio para leer; GDAL lee 2 bits sin `imagecodecs`).
- [x] **Step 4:** `python -m pytest tests -q` → PASS (incluida la compatibilidad con Pyodide).
- [x] **Step 5: Commit** `feat(preparacion): sitios y lectura de las entregas del equipo`

---

### Task 3: Rejilla de referencia, remuestreo y medida de superficie

**Files:**
- Create: `preparacion/rejilla.py`, `preparacion/medidas.py`
- Test: `tests/preparacion/test_rejilla.py`, `tests/preparacion/test_medidas.py`

**Interfaces:**
- Consumes: `Raster`, `Sitio` (Tarea 2).
- Produces:
  - `Rejilla` (dataclass): `transform: Affine`, `ancho: int`, `alto: int`, `crs: str = "EPSG:32717"`;
    `bbox_wgs84() -> tuple[float,float,float,float]`; `resolucion_m: float`.
  - `rejilla_referencia(sitio: Sitio, mascaras: list[Raster]) -> Rejilla`: la de la primera máscara que esté en
    EPSG:32717 con píxel cuadrado; si ninguna, la caja del sitio en EPSG:32717 a 10 m.
  - `rejilla_derivados(ref: Rejilla, lado_max: int = 1024) -> Rejilla`: misma extensión, factor entero
    `ceil(max(ancho, alto) / lado_max)`.
  - `remuestrear_categorica(r: Raster, destino: Rejilla) -> np.ndarray` (vecino más cercano, sin dato = 255).
  - `reducir_categorica(datos: np.ndarray, ref: Rejilla, destino: Rejilla) -> np.ndarray` (moda; 255 solo si todo
    el bloque es 255).
  - `reducir_continua(datos: np.ndarray, ref: Rejilla, destino: Rejilla) -> np.ndarray` (media ignorando NaN, en
    lineal: convertir dB→lineal, promediar, volver a dB).
  - `medidas.superficie_km2(r: Raster, codigo: int, dentro: np.ndarray | None) -> float`: área por píxel real
    (`abs(a*e)` del transform) × píxeles con ese código (y dentro de la máscara booleana `dentro`, en la rejilla
    de `r`). **Siempre en la rejilla original.**
  - `medidas.contorno(mascaras_ref: list[np.ndarray], ref: Rejilla, codigo: int = 1, min_ha: float = 10,
    margen_m: float = 150) -> np.ndarray[bool]`: unión de regiones conectadas (8-vecinos) ≥ `min_ha` de todas las
    fechas, dilatada `margen_m`.
  - `medidas.contorno_a_geojson(contorno: np.ndarray, ref: Rejilla, simplificar_m: float = 20) -> dict`
    (polígonos en WGS84; shapely) y `medidas.geojson_a_mascara(gj: dict, rejilla: Rejilla) -> np.ndarray[bool]`.

- [x] **Step 1: Tests que fallan:**
  - `test_remuestreo_rejilla_no_cuadrada`: máscara origen con píxel 10,063 × 9,950 m desplazada 2 m; un bloque de
    agua de 100 × 100 m → en la rejilla de 10 m queda un bloque de 10 ± 1 px de lado en la posición esperada.
  - `test_remuestreo_desde_utm18`: la misma máscara reproyectada a EPSG:32718 y vuelta a la de referencia →
    coincide en ≥ 95 % de los píxeles de agua.
  - `test_superficie_en_rejilla_original`: 141 716 px de 10 × 10 m → 14,1716 km²; con píxel 10,063 × 9,950 →
    usa ese área (exacta a 1e-6).
  - `test_contorno_descarta_manchas_pequenas`: una región de 20 ha y 50 manchas de 0,5 ha → el contorno contiene
    la región y ninguna mancha lejana (> 150 m).
  - `test_reducir_categorica_moda` y `test_reducir_continua_promedia_en_lineal` (−10 dB y −20 dB → −12,6 dB).
- [x] **Step 2:** `python -m pytest tests/preparacion -q` → FAIL.
- [x] **Step 3:** Implementar con `rasterio.warp.reproject` (`Resampling.nearest` para máscaras, `bilinear` para
  dB al reproyectar) y `scipy.ndimage` para regiones y dilatación.
- [x] **Step 4:** `python -m pytest tests -q` → PASS.
- [x] **Step 5: Commit** `feat(preparacion): rejilla de referencia, remuestreo y superficie dentro del contorno`

---

### Task 4: Relieve (DEM Copernicus) y curva nivel–superficie

**Files:**
- Create: `preparacion/disco.py`, `preparacion/relieve.py`
- Test: `tests/preparacion/test_relieve.py`, `tests/preparacion/test_disco.py`

**Interfaces:**
- Produces:
  - `disco.comprobar_espacio(ruta: Path, minimo_gb: float = 2.0) -> None`: lanza `SystemExit` con mensaje en
    español si `shutil.disk_usage(ruta).free` < mínimo.
  - `relieve.teselas_copernicus(bbox: tuple) -> list[str]`: URLs de Copernicus GLO-30 en AWS Open Data,
    formato `https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_{S|N}{lat:02d}_00_{W|E}{lon:03d}_00_DEM/Copernicus_DSM_COG_10_..._DEM.tif`
    donde `lat`, `lon` son la esquina suroeste entera de cada tesela de 1°. **Verificar** con una petición HEAD a
    una tesela antes de implementar; si la URL no responde 200, buscar el formato vigente en
    `https://registry.opendata.aws/copernicus-dem/`, usarlo y anotar la URL y la fecha en `INFORME.md`.
  - `relieve.dem_en_rejilla(bbox: tuple, destino: Rejilla, crudo: Path) -> np.ndarray[float32]`: lee las teselas
    por ventana con rasterio (`/vsicurl/`, sin descargar la tesela entera; si falla, descarga a `crudo/` tras
    `comprobar_espacio` y la borra al terminar), reproyecta bilineal a `destino`.
  - `relieve.superficie_agua_dem(dem: np.ndarray, semilla_rc: tuple[int,int], tol_m: float = 0.5) ->
    tuple[np.ndarray[bool], float]`: región conectada a la semilla con cota ≤ cota(semilla) + `tol_m`; devuelve
    máscara y cota del agua en el DEM.
  - `relieve.curva_nivel_superficie(dem: np.ndarray, agua_dem: np.ndarray, area_px_km2: float,
    paso_m: float = 0.5, subida_max_m: float = 40.0, bajada_max_m: float = 30.0) -> dict`:
    `{"cota_dem_m","niveles_m":[...],"superficie_km2":[...],"volumen_hm3":[...],"extrapolado":[bool,...]}`.
    Por encima de `cota_dem`: superficie = celdas ≤ nivel conectadas al agua del DEM; volumen = suma de
    (nivel − dem) en esas celdas. Por debajo: **extrapolación ilustrativa** (no hay batimetría): superficie
    decrece linealmente hasta 30 % de la superficie a `cota_dem` en `bajada_max_m`; `extrapolado=True` en esos
    niveles; volumen relativo negativo integrado de esa superficie.
- [x] **Step 1: Tests que fallan** con un DEM sintético en V (cañón) de 200 × 100 celdas:
  - `test_superficie_agua_dem_conectada`: dos depresiones a la misma cota; solo la conectada a la semilla.
  - `test_curva_monotona`: `superficie_km2` y `volumen_hm3` crecientes con el nivel; `extrapolado` True solo por
    debajo de `cota_dem_m`.
  - `test_comprobar_espacio_aborta`: con `shutil.disk_usage` simulado a 1 GB libre → `SystemExit`.
  - `test_teselas_copernicus_mazar`: bbox de Mazar → incluye la tesela con `S03_00_W079_00`.
- [x] **Step 2:** `python -m pytest tests/preparacion -q` → FAIL.
- [x] **Step 3:** Implementar. Sin red en las pruebas (la red solo en el Step 5).
- [x] **Step 4:** `python -m pytest tests -q` → PASS.
- [x] **Step 5:** Comprobación con red (no es prueba automática): `python -c "from preparacion.relieve import
  teselas_copernicus; print(teselas_copernicus((-78.74,-2.80,-78.55,-2.55)))"` y HEAD a la primera URL → 200.
- [x] **Step 6: Commit** `feat(preparacion): relieve Copernicus y curva nivel–superficie`

---

### Task 5: Escritura de derivados y CLI `scripts/preparar_embalses.py`

**Files:**
- Create: `preparacion/salida.py`, `scripts/preparar_embalses.py`
- Test: `tests/preparacion/test_salida.py`, `tests/preparacion/test_cli.py`

**Interfaces:**
- Consumes: Tareas 2–4.
- Produces — **formato de derivados** (lo leen las Tareas 7 y 8; no cambiarlo sin cambiar ambas):
  - Carpeta: `data/embalses/<sitio>/` (tipo embalse) o `data/incendios/<sitio>/` (tipo incendio).
  - `sitio.json`:
    ```json
    {"version": 1, "sitio": "mazar", "tipo": "embalse", "nombre": "Mazar", "region": "Azuay y Cañar",
     "epsg": 32717, "transform": [a, b, c, d, e, f], "forma": [alto, ancho], "resolucion_m": 30.0,
     "bbox": [o, s, e, n],
     "leyenda": [["agua", "#…"], ["no agua", "#…"]],
     "fechas": [{"fecha": "2026-10-29", "archivo": "20261029.npz", "instante": "2026-10-29T23:31:00Z" | null,
                 "superficie_km2": {"agua": 5.65}, "procedencia": {…} | null,
                 "procedencia_completa": false, "faltan": ["procedencia.json"],
                 "stack": {"HH": [-25.0, 0.0], "HV": [-30.0, -5.0]} | null}],
     "contorno": "contorno.geojson", "dem": "dem.npz" | null, "curva": "curva.json" | null,
     "fecha_preparacion": "…Z"}
    ```
    `leyenda` ordenada por código de clase ascendente sin «sin dato» (código del contrato = posición + 1).
    Colores: los de la leyenda de inundación del proveedor demo para agua/no agua y los de la clasificación de
    incendio para quemado/no quemado (copiarlos de `datos/proveedores/demo.py` o `modelo/`; anotar de dónde).
  - `<AAAAMMDD>.npz` (`np.savez_compressed`): `mascara` uint8 en códigos del contrato (0 sin dato), y si hay stack
    `HH`, `HV` uint8 cuantizados: 0 = sin dato, 1–255 = `vmin + (q-1)/254·(vmax−vmin)`. Rangos fijos
    HH [−25, 0] dB, HV [−30, −5] dB.
  - `dem.npz`: `dem` int16 en metros (−32768 sin dato), misma rejilla de derivados; `agua_dem` bool empaquetado
    (`np.packbits`).
  - `curva.json`: salida de `curva_nivel_superficie`.
  - `contorno.geojson`: WGS84. **Si ya existe, no se sobrescribe** salvo con `--regenerar-contorno`.
  - `salida.escribir_sitio(sitio: Sitio, fechas: list[Fecha], destino: Path, ...) -> dict` (devuelve el
    `sitio.json` escrito) y `salida.tamano_mb(raiz: Path) -> float`.
- CLI: `python scripts/preparar_embalses.py [--sitio mazar|daule-peripa|casitagua|todos] [--entrada datos_imagenes]
  [--salida data] [--regenerar-contorno] [--sin-dem]`. Imprime un informe por sitio: fechas, superficie, qué falta
  de la procedencia, tamaño escrito y el total frente a 10 MB. Sitios sin entregas del equipo: solo DEM, curva y
  contorno (agua del DEM dilatada) — es lo que usan los sustitutos.
- [x] **Step 1: Tests que fallan:**
  - `test_cuantizacion_ida_y_vuelta`: −12,3 dB → q → valor con error ≤ (vmax−vmin)/254; NaN → 0.
  - `test_escribir_sitio_formato`: con fixtures de la Tarea 2 (dos fechas, una sin procedencia) → `sitio.json`
    con dos fechas, `procedencia_completa` [True, False], `faltan` [[], ["procedencia.json"]], `.npz` con
    `mascara` de la forma de `forma`.
  - `test_no_sobrescribe_contorno`: contorno existente con contenido marcado se conserva.
  - `test_cli_sin_dem_en_tmp`: `main(["--sitio","mazar","--entrada",tmp,"--salida",tmp2,"--sin-dem"])` termina con
    código 0 y escribe `tmp2/embalses/mazar/sitio.json`.
- [x] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `python -m pytest tests -q` PASS.
- [x] **Step 5: Commit** `feat(preparacion): derivados de embalses e incendio y CLI preparar_embalses`

---

### Task 6: Derivados reales versionados y presupuesto

**Files:**
- Create: `data/embalses/mazar/…`, `data/embalses/daule-peripa/…`, `data/incendios/casitagua/…` (salida del script)
- Create: `tests/datos/test_presupuesto_derivados.py`
- Modify: `INFORME.md`, `docs/datos-equipo-embalses.md` (§ estado)

- [x] **Step 1: Test que falla:** `test_derivados_dentro_del_presupuesto`: suma de tamaños bajo `data/embalses` y
  `data/incendios` ≤ 10 × 1024² bytes; y `test_sitio_json_valido`: cada `sitio.json` existe, tiene `version == 1`
  y sus `archivo`, `dem`, `curva`, `contorno` existen. (Falla hoy porque no existen las carpetas.)
- [x] **Step 2: Organizar la entrada sin tocar los originales.** El script espera
  `datos_imagenes/<sitio>/<AAAAMMDD>/`. Hoy hay archivos sueltos (`Mazar_Stack.tif`, `Clas_Super.tif` —primera
  fecha, **fecha desconocida**—, `Mazar_CS1029.tif` —29 oct 2026—). **Copiar** (`cp`, nunca `mv`) solo lo que
  tenga fecha conocida: `datos_imagenes/mazar/20261029/mascara.tif` ← `Mazar_CS1029.tif`. La primera fecha **no**
  se copia hasta que el equipo diga su fecha (anotarlo en `INFORME.md` como pendiente). Ninguna fecha tiene
  `procedencia.json`: es lo esperado; el informe lo dirá.
- [x] **Step 3:** `python scripts/preparar_embalses.py --sitio todos`. Comprobar a ojo (PNG en el scratchpad, no
  en el repo) que el agua del DEM de Daule-Peripa y Mazar cae en el vaso; si no, ajustar `semilla`/`bbox` en
  `preparacion/sitios.json` y repetir.
- [x] **Step 4:** `python -m pytest tests -q` → PASS (si el presupuesto no alcanza: bajar `lado_max`, no quitar
  fechas).
- [x] **Step 5:** Anotar en `INFORME.md`: superficies por fecha, tamaño total, qué falta del equipo (fecha de la
  primera máscara de Mazar, procedencia de todas, stack del 29 oct, Daule-Peripa, Casitagua antes/después del
  17 sep 2026).
- [x] **Step 6: Commit** `data: derivados de Mazar, Daule-Peripa y Casitagua (relieve y máscaras del equipo)`

---

### Task 7: Proveedor de derivados

**Files:**
- Create: `datos/proveedores/derivados.py`
- Create: `tests/datos/derivados_prueba.py` (genera en `tmp_path` un sitio de 2–3 fechas **con procedencia
  completa sintética de prueba**, usando el formato de la Tarea 5 sin rasterio: escribe `sitio.json` y `.npz`
  directamente con numpy)
- Modify: `tests/datos/test_conformidad.py` (añadir el parámetro `"derivados"` con la raíz de prueba)
- Modify: `datos/claves.py` (claves nuevas), `api/claves.json` (regenerado)
- Test: `tests/datos/test_proveedor_derivados.py`

**Interfaces:**
- Consumes: formato de derivados (Tarea 5); `Procedencia`, `Origen.clase` (Tarea 1).
- Produces:
  - `class ProveedorDerivados` con `__init__(self, raiz: Path = DIR_DATOS)` (`DIR_DATOS` = carpeta `data/` del
    proyecto, igual que `modelo/estaciones.py`), cumple `ProveedorDatos` y además:
    - `sitios(self) -> dict[str, dict]` (todos los `sitio.json` leídos, mostrables o no),
    - `serie_superficie(self, escenario_id: str) -> SerieTemporal` (agua o quemado por fecha mostrable),
    - `intervalo_por_defecto(self, escenario_id) -> tuple[str, str]` (primera y última fecha mostrables).
  - Escenario por sitio con ≥ 1 fecha con `procedencia_completa`: `id = f"{tipo}-{sitio}"`,
    `tipo_cambio = "embalses" | "incendios"`, `historia = "embalse" | "incendio"`, `sitio`, `bbox`,
    `resolucion_m`, `polarizaciones` (["HH","HV"] si alguna fecha mostrable tiene stack, si no `[]`),
    `variables = ["mascara"] + (["gamma0"] si hay stack)`, adquisiciones = fechas mostrables
    (`id = "AAAAMMDD"`, `instante` = `procedencia.fecha_adquisicion`), `capacidades` todo `False`,
    `origen` = `Origen(tipo="real", clase="nisar", fuente="equipo PACHA", producto=…, procedencia=<de la última
    fecha>)`. **Fechas sin procedencia completa no aparecen.**
  - `capa(esc, adq, "mascara", None)` → `CapaRaster` paleta `categorias`, `leyenda` del `sitio.json`,
    `vmin=0`, `vmax=len(leyenda)`, `origen` con la procedencia **de esa fecha**.
  - `capa(esc, adq, "gamma0", "HH"|"HV")` → dB descuantizados (NaN sin dato), paleta `gris`, unidad `dB`.
  - `cambio(esc, antes, despues, pol)`: `antes`/`despues` = gamma0 de `pol` si ambas fechas tienen stack, si no
    la máscara; `cambio` y `clasificacion` = categórica con leyenda embalse
    `[("Agua persistente",…),("Agua ganada",…),("Agua perdida",…),("Sin agua",…)]` o incendio
    `[("Quemado en ambas",…),("Quemado nuevo",…),("Recuperado",…),("Sin quemar",…)]`, restringida al contorno
    (fuera del contorno = 0 sin dato); `metricas` = superficie antes, después, variación km² y % (valores del
    `sitio.json`, medidos en la rejilla original); `series` = `[serie_superficie]`; con `antes == despues` o una
    sola fecha → `CapacidadNoDisponible("Hace falta una segunda fecha con procedencia para comparar.")`.
  - `medir`: cuadrante → píxeles de cada clase de `despues` dentro del cuadrante en km²; punto → clase y dB de
    ambas fechas. `origen` de `despues`.
- [x] **Step 1: Tests que fallan** (`tests/datos/test_proveedor_derivados.py`, con `derivados_prueba`):
  - `test_fecha_sin_procedencia_no_se_expone`: sitio con 3 fechas, una sin procedencia → 2 adquisiciones.
  - `test_sitio_sin_fechas_mostrables_no_tiene_escenario`.
  - `test_capa_mascara_codigos_contrato`: códigos ∈ {0,1,2}, `leyenda[0][0] == "agua"`.
  - `test_cambio_categorias_y_metricas`: máscara antes con 100 px de agua, después 80 (60 persistentes) →
    conteos 60/20/40 en `clasificacion`; métrica de variación con el valor del `sitio.json`.
  - `test_una_sola_fecha_cambio_409`: `CapacidadNoDisponible`.
  - `test_origen_lleva_procedencia_de_su_fecha`: `capa(..., "20261029").origen.procedencia.fecha_adquisicion`
    es la de esa fecha.
  - En `test_conformidad.py`, el parámetro `"derivados"`; adaptar `test_origenes_validos…` para aceptar `clase`
    y exigir `procedencia` no nula cuando `clase == "nisar"`.
- [x] **Step 2:** FAIL → **Step 3:** implementar (solo numpy/json/pydantic) → **Step 4:**
  `python -m pytest tests -q` PASS.
- [x] **Step 5: Commit** `feat(datos): proveedor de derivados del equipo (embalses e incendio)`

---

### Task 8: Sustitutos sintéticos con la forma del sitio

**Files:**
- Create: `datos/proveedores/sustituto.py`
- Test: `tests/datos/test_proveedor_sustituto.py`

**Interfaces:**
- Consumes: `sitio.json`, `dem.npz`, `curva.json` (Tarea 5); `ProveedorDemostracion.simular` (existente).
- Produces:
  - `class SustitutoEmbalse` (`__init__(self, sitio_json: dict, carpeta: Path)`), cumple `ProveedorDatos` para un
    escenario `embalse-<sitio>`: dos adquisiciones sintéticas `sim-alta` (2026-06-17T00:00Z) y `sim-baja`
    (2026-11-05T00:00Z) — ventana de cobertura NISAR sobre Ecuador, ilustrativas. Agua = celdas del DEM con cota
    ≤ nivel, conectadas a `agua_dem`; `sim-alta` = `cota_dem_m + 2`, `sim-baja` = nivel de la curva con
    superficie = 70 % de la de `cota_dem_m`. `gamma0` sintético: agua −18 dB (HH) / −26 dB (HV); tierra
    −7 dB / −14 dB + efecto de pendiente (iluminación desde el oeste, ±3 dB) + moteado gamma (L=4, semilla fija
    por sitio). Variables `["mascara","gamma0"]`, pols `["HH","HV"]`. `origen = Origen(tipo="sintetico",
    clase="sintetico", fuente="demo", generador="datos/proveedores/sustituto.py", semilla=…,
    notas="Sustituto de demostración sobre el relieve real; no son observaciones.")`. `cambio`/`medir` con las
    mismas leyendas y métricas que `ProveedorDerivados`, y `serie_superficie(escenario_id)` (superficie de
    `sim-alta` y `sim-baja`) (reutilizar sus funciones de clasificación: extraerlas a
    `datos/proveedores/_embalse_comun.py` si hace falta).
  - `class SustitutoIncendio` (`__init__(self, sitio_json: dict, demo: ProveedorDemostracion)`): envuelve el
    escenario demo `ec_loja` simulado en las coordenadas del sitio (`demo.simular("ec_loja", {"lat": …,
    "lon": …})`, centro del `bbox`); expone id `incendio-casitagua`, `historia="incendio"`,
    `sitio="casitagua"`, `nombre="Casitagua"`; traduce ids en cada llamada (`dataclasses.replace(capa,
    escenario_id=…)`) y **vuelve a simular** si el id derivado caducó (`NoEncontrado`).
- [x] **Step 1: Tests que fallan:**
  - `test_sustituto_embalse_forma_del_vaso`: con un DEM sintético en V → el agua de `sim-alta` contiene
    `agua_dem` y su superficie > la de `sim-baja`.
  - `test_sustituto_embalse_es_sintetico`: todos los orígenes `tipo == "sintetico"`.
  - `test_sustituto_incendio_id_estable`: `escenarios()[0].id == "incendio-casitagua"`; tras vaciar la caché LRU
    del demo, `capa(...)` sigue funcionando.
- [x] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `python -m pytest tests -q` PASS.
- [x] **Step 5: Commit** `feat(datos): sustitutos sintéticos de embalse (sobre el DEM) e incendio (Casitagua)`

---

### Task 9: Proveedor mixto, selección por defecto y empaquetado para Pages

**Files:**
- Create: `datos/proveedores/mixto.py`
- Modify: `datos/seleccion.py` (`mixto` por defecto), `scripts/empaquetar_app.py` (incluir derivados),
  `scripts/entorno.sh` (si fija `NISAR_PROVEEDOR=demo`, pasar a `mixto`), `CLAUDE.md` (línea de arquitectura sobre
  `NISAR_PROVEEDOR`), `docs/contrato-datos.md`
- Modify: `tests/datos/test_conformidad.py` (parámetro `"mixto"`), `tests/motor/test_empaquetar_app.py`
- Test: `tests/datos/test_proveedor_mixto.py`

**Interfaces:**
- Consumes: Tareas 7 y 8; `ProveedorDemostracion`.
- Produces:
  - `class ProveedorMixto` (`__init__(self, raiz: Path = DIR_DATOS, demo: ProveedorDemostracion | None = None)`),
    `nombre() == "mixto"`. `escenarios()` = para cada `sitio.json` bajo `raiz` (`data/embalses/*/`, `data/incendios/*/`) → escenario real (derivados) si tiene fechas mostrables, si no el sustituto; después
    todos los escenarios demo. Delegación por id (dict id → proveedor). Métodos opcionales (`tipos`,
    `intervalo_por_defecto`, `serie_seleccion`, `serie_superficie`, `simular`, `fotogramas`) se delegan al proveedor dueño del id; si
    no lo tiene → `CapacidadNoDisponible`. `tipos()` = los del demo.
  - `obtener_proveedor()` admite `demo | real | mixto`; por defecto `mixto`.
  - `empaquetar_app.py` añade al zip todo `data/embalses/**` y `data/incendios/**` (sin `data/crudo/`).
- [x] **Step 1: Tests que fallan:**
  - `test_mixto_sustituye_si_no_hay_reales`: raíz de prueba con Mazar sin fechas mostrables →
    `escenario("embalse-mazar").origen.tipo == "sintetico"`.
  - `test_mixto_prefiere_reales`: raíz con fechas mostrables → `origen.clase == "nisar"`.
  - `test_mixto_incluye_demo`: `ec_la_segua` presente.
  - `test_seleccion_por_defecto_mixto` (sin variable de entorno).
  - `test_zip_incluye_derivados` en `tests/motor/test_empaquetar_app.py`.
  - Conformidad con `"mixto"`.
- [x] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** verificación completa:
  `python -m pytest tests -q`, `python -m unittest modelo.clima modelo.desastres`,
  `cd frontend && npm test && npm run lint && npm run build`, `npx playwright test` → todo PASS. Si algún e2e
  dependía de que el proveedor por defecto fuera `demo`, corregir la prueba (no el proveedor) y anotarlo.
- [x] **Step 5:** `bash scripts/construir_pages.sh` → termina «Listo»; anotar el tamaño de `frontend/dist-pages`
  en `INFORME.md` (antes 42 MB).
- [x] **Step 6: Commit** `feat(datos): proveedor mixto por defecto (reales, sustitutos y demo) y derivados en Pages`

---

## Cierre de la fase

- [x] Actualizar `docs/retomar.md` (estado de la fase 1, qué falta del equipo).
- [x] Commit `docs: cierre de la fase 1 (datos de embalses e incendio)`.
- [x] No se hace `git push` ni se toca `main`.
