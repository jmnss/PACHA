# Migración a React — Plan de implementación (revisión 2)

> **Para quien ejecute el plan:** usar `superpowers:subagent-driven-development` (recomendado) o
> `superpowers:executing-plans`. Cada paso es una casilla `- [ ]`. Antes de cualquier trabajo visual,
> leer `docs/diseno.md` y usar `design-taste-frontend`. Toda decisión se evalúa contra `docs/challenge.md`.

**Meta:** una app web abierta que muestre a un público amplio cómo el radar NISAR ve **inundaciones y
humedales** (historia principal, Costa baja de Ecuador) e **incendios forestales** (segunda historia,
Sierra), con una capa de datos intercambiable que hoy sirve datos de demostración sintéticos,
etiquetados con honestidad, y mañana datos reales sin reescribir la interfaz.

**Arquitectura:** `datos/` define el contrato de datos y sus proveedores (demostración hoy; real como
esqueleto). `api/` (FastAPI, sin estado) solo habla con el contrato, nunca con `modelo/` directamente.
`frontend/` (React + Vite + TypeScript) solo habla con la API. `modelo/` sigue siendo el motor del
generador sintético y de la física.

**Tecnologías:** Python 3.13 (miniforge, `python`), FastAPI, uvicorn, pydantic v2, pytest, httpx ·
Node 22.23.4 (nvm), React 18, Vite, TypeScript estricto, react-router, TanStack Query, MapLibre GL,
vitest, Testing Library, Playwright · Public Sans autoalojada (`@fontsource/public-sans`).

**Spec:** `docs/challenge.md` (qué se debe lograr), `docs/diseno.md` (cómo se ve),
`docs/contrato-datos.md` (lo crea la Tarea 1.1) y las secciones «Contrato de datos» y «Contrato de la
API» de este plan.

---

## Orden de ejecución

```
Bloque 0  Entorno, red de seguridad, honestidad del núcleo       0.1 → 0.2 → 0.3
Bloque 1  Capa de datos intercambiable (prioridad 1)             1.1 → 1.2 → 1.3 → 1.4 → 1.5
Bloque 2  API sobre el contrato                                   2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7
Bloque 3  Frontend base y sistema de diseño                       3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8 → 3.9 → 3.10
Bloque 4  Pantallas de la primera noche                           4.1 → 4.2 → 4.3 → 4.4 → 4.5
Bloque 5  Cierre de la noche (SIEMPRE se ejecuta)                 5.1 → 5.2 → 5.3
Noche 2   Estación, Modo Dios, Fundamentos, Validación, auditoría N2.1 … N2.6
Pendiente Integración de datos reales (NO se ejecuta hasta habilitar los recursos)
```

Los bloques 0–2 no tocan el frontend; el bloque 4 depende de 2 y 3.

## Alcance de la primera noche

**Entra:** bloques 0, 1, 2, 3, 4 y 5. Resultado esperado al amanecer: `python servidor.py` abre una app
con la banda de «DATOS DE DEMOSTRACIÓN» siempre visible, la pantalla **Historias** (inundación en la
Costa e incendio en la Sierra, con física, polarizaciones, hipótesis ilustrativas y aplicaciones
futuras) y la pantalla **Observatorio** (mapa con capa de cambio, cinta de pasadas con reproductor,
comparador deslizante antes/después con medición, series temporales y panel de simulación para los seis
tipos de cambio), README bilingüe, licencia y créditos.

**No entra (noche 2):** Estación y temporada como pantalla propia (su contexto sí aparece en el
Observatorio), Modo Dios, Fundamentos completos, Validación.

**No entra (hasta tener los recursos oficiales):** catálogo ASF, explorador geográfico, lectura de HDF5,
proveedor real. **Esta noche no se descarga ni se busca ningún dato de NISAR, no se crean cuentas y no
se manejan credenciales.**

**Corte por tiempo:** al empezar, guardar la hora con `date +%s > .inicio_noche`. Antes de empezar cada
tarea del bloque 4, si `$(( $(date +%s) - $(cat .inicio_noche) ))` supera 21 600 s (6 h), saltar al
bloque 5. La app debe quedar funcionando y coherente aunque no se termine todo.

## Restricciones globales

- **Honestidad:** nada sintético se presenta como dato real de NISAR. Toda respuesta de la API que lleve
  datos incluye `origen`. La banda de demostración se muestra siempre que algún `origen.tipo` sea
  `"sintetico"`, y no se puede cerrar. Textos sobre datos sintéticos se redactan como «en este escenario
  de demostración…». No se inventan mediciones, fechas ni resultados de eventos reales.
- **Nada de NISAR inventado:** ningún nombre de producto, ruta HDF5, banda, URL ni fecha de la misión se
  añade al código o a los textos sin fuente oficial; lo existente se marca «pendiente de confirmar con la
  documentación oficial» (`docs/challenge.md`, tabla de referencias).
- `modelo/` y `data/` solo se modifican en la Tarea 0.3 (textos de honestidad) o para corregir un error
  con su prueba. `app.py` e `interfaz/` (Streamlit) no se tocan; se documentan como heredados en la 5.2.
- Python: `python` (3.13, miniforge). Node: antes de cualquier comando, `source scripts/entorno.sh`.
- Las 13 pruebas existentes (`python -m unittest modelo.clima modelo.desastres`) siguen en verde siempre.
- Valores visuales: los de `docs/diseno.md`, literalmente. Ningún color, tamaño o sombra fuera de tokens.
- Interfaz en español; README en inglés y español.
- Pantalla terminada = `scripts/revision_visual.sh` (Tarea 3.3) con `RESULT: 0 FAIL`, capturas a 1440 /
  768 / 390 px en `docs/capturas-nuevas/<pantalla>/` y crítica escrita en `INFORME.md`. Máximo tres rondas.
- Un commit por tarea, con el mensaje indicado y la línea `Co-Authored-By` que pida el entorno. Rama
  `migracion-react`. Nunca `git push` ni tocar `main`.

## Foco de revisión (lo que el spec no dice pero morderá)

1. **Datos reales de otra forma y tamaño:** un proveedor con rejillas de 2048×2048, 5 adquisiciones y
   otros nombres de polarización debe funcionar igual; la API reduce a ≤ 512 px por lado (Tareas 1.5, 2.2).
2. **Proveedor real usado antes de tiempo:** error explícito y legible, no un 500 (Tareas 1.4, 2.1).
3. **Etiqueta de origen perdida en una exportación** (CSV o PNG sin la marca de demostración) (Tarea 3.10).
4. **Clic fuera de Ecuador o fuera de la escena:** aviso, sin llamada a la API (Tareas 2.4, 4.1).
5. **Sin red** (mapa base, fuentes): el mapa se dibuja con el GeoJSON local; nada depende de servicios
   externos para funcionar (Tarea 3.7).

---

## Contrato de datos (lo que la interfaz necesita, venga de donde venga)

Vive en `datos/contrato.py` (pydantic v2) y se documenta en `docs/contrato-datos.md`. Los nombres son
fijos para todas las tareas.

- `Origen {tipo: "sintetico" | "real", fuente: str, producto: str | None, generador: str | None, version: str | None, semilla: int | None, fecha_generacion: datetime, notas: str | None}`
- `Escenario {id: str, nombre: str, tipo_cambio: str, historia: "inundacion" | "incendio" | None, region: str, bbox: [oeste, sur, este, norte] (WGS84), resolucion_m: float, polarizaciones: list[str], variables: list[str], adquisiciones: list[Adquisicion], capacidades: Capacidades, origen: Origen}`
- `Adquisicion {id: str, instante: datetime (UTC), direccion_orbital: str | None, polarizaciones: list[str]}`
- `Capacidades {simulacion: bool, modelo_continuo: bool, verdad_terreno: bool}` (el proveedor real tendrá todo en `false`).
- `CapaRaster {escenario_id, adquisicion_id | None, variable: str, polarizacion: str | None, unidad: str, paleta: "gris" | "secuencial" | "divergente" | "ciclico" | "categorias", vmin: float, vmax: float, leyenda: list[[str, str]] | None, datos: np.ndarray (2D float32, NaN = sin dato), bbox, origen: Origen}`
- `SerieTemporal {titulo, unidad, puntos: list[(instante, valor, serie)], origen}`
- `ResultadoCambio {antes: CapaRaster, despues: CapaRaster, cambio: CapaRaster, clasificacion: CapaRaster | None, metricas: list[Metrica], series: list[SerieTemporal], notas: list[str], origen}`; `Metrica {etiqueta, valor, unidad, ayuda}`.
- `ProveedorDatos` (Protocol): `nombre() -> str`, `escenarios() -> list[Escenario]`, `escenario(id) -> Escenario`, `capa(escenario_id, adquisicion_id, variable, polarizacion) -> CapaRaster`, `cambio(escenario_id, antes_id, despues_id, polarizacion) -> ResultadoCambio`, `medir(escenario_id, antes_id, despues_id, cuadrante | punto) -> Medicion`. Opcional si `capacidades.simulacion`: `simular(escenario_id, parametros) -> Escenario` y `fotogramas(escenario_id, parametros, inicio, fin, paso_min) -> list[CapaRaster]`.

**Pendiente de confirmar con la documentación oficial de NISAR** (se marca así en `docs/contrato-datos.md`):
la proyección y la rejilla de los productos reales; los nombres exactos de las polarizaciones y sus
unidades (σ⁰ o γ⁰, lineal o dB); el valor de «sin dato»; la dirección orbital y su codificación; el
tamaño típico de un producto; los productos disponibles y su formato. El contrato no depende de ninguno.

## Contrato de la API (primera noche)

Todas bajo `/api`, sin estado, modelos en `api/schemas.py`. Las rejillas viajan como
`Rejilla {filas, columnas, vmin, vmax, bbox, datos_b64}` (uint8, 0 = sin dato, ≤ 512 por lado).

| Ruta | Respuesta |
|---|---|
| `GET /salud` | `{estado, version, proveedor, origen_tipo}` |
| `GET /tipos` | los seis tipos con sus controles (si el proveedor simula) |
| `GET /escenarios` · `GET /escenarios/{id}` | `Escenario` sin datos ráster |
| `GET /escenarios/{id}/capa?adquisicion&variable&polarizacion` | `CapaDto` (con `origen`) |
| `POST /escenarios/{id}/cambio` `{antes, despues, polarizacion}` | `ResultadoCambioDto` |
| `POST /escenarios/{id}/medicion` `{antes, despues, cuadrante?, punto?}` | `MedicionDto` |
| `POST /simulacion/escenario` `{escenario_id, parametros}` | `Escenario` (409 si el proveedor no simula) |
| `POST /simulacion/fotogramas` `{escenario_id, parametros, inicio, fin, paso_min}` | `list[CapaDto]` (≤ 120; 422 si no) |
| `GET /contexto?lat&lon&fecha` | región, estación astronómica, temporada, clima mensual (origen: NASA POWER, `real`) |

---

## Mapa de archivos

```
datos/                      capa de datos intercambiable (nuevo)
  contrato.py               modelos y Protocol ProveedorDatos
  generador.py              generador sintético reproducible (en memoria; exporta instantánea a data/demo/)
  proveedores/demo.py       ProveedorDemostracion (usa el generador y la física de modelo/)
  proveedores/real.py       ProveedorReal: esqueleto que lanza DatosRealesNoDisponibles
  seleccion.py              obtener_proveedor() según NISAR_PROVEEDOR=demo|real (por defecto demo)
scripts/generar_datos_demo.py  generador sintético reproducible → data/demo/ (no se versiona)
api/                        FastAPI (nuevo): app.py, schemas.py, encoding.py, rutas/*.py
servidor.py                 python servidor.py → API + frontend/dist en :8000
frontend/                   React (nuevo): src/diseno, src/graficos, src/mapa, src/tiempo, src/api,
                            src/estado, src/exportar, src/pantallas/{historias,observatorio}
tests/modelo  tests/datos  tests/api      pytest
frontend/e2e/               Playwright
scripts/entorno.sh  scripts/revision_visual.sh  scripts/generar_dorados.py
docs/contrato-datos.md  docs/historia-datos.md  docs/capturas-nuevas/
LICENSE  README.md (inglés)  README.es.md  CREDITOS.md
```

## Paridad funcional (verificada contra `app.py` y `interfaz/`)

Marca en `INFORME.md`: **N1** = primera noche, **N2** = segunda, **R** = integración de datos reales.

- **N1 · Parámetros** (`app.py:717-862, 919-944`): tipo de cambio (6); lugar del catálogo; lugar por clic
  en el mapa con sus parámetros genéricos (`sitio_en_mapa`, `app.py:568`); estacionalidad on/off; semilla,
  ENL, paso orbital; intervalo «antes/después» con el aviso «elige dos fechas distintas» (`app.py:805`);
  controles del tipo (`nisar.CONTROLES`), incluido el de **hora** (`time_input`, `app.py:932`); fecha del
  evento; «Restablecer parámetros»; resumen «N adquisiciones cada 12 días · extensión · píxel» (`app.py:814`).
- **N1 · Cabecera y contexto** (`app.py:872-899`): tipo, lugar, observable, región y temporada de hoy, KPI del
  análisis. El chip «Producto: NISAR L2 …» desaparece mientras los datos sean sintéticos.
- **N1 · Mapa** (`app.py:955-1074`): capa del modelo en el tiempo vs. cambio detectado; reproductor (inicio,
  −paso, play/pausa, +paso, final, ir al evento); paso (1 min … 12 días) y velocidad (lenta, normal, rápida);
  deslizador de instante; reloj con la pasada anterior y la siguiente y la temporada; métricas del instante;
  provincias con tooltip de región; marcadores del catálogo; aviso de clic fuera de Ecuador. Mapa base
  satélite: **N2** (servicio externo).
- **N1 · Antes / después** (`app.py:1080-1150`): paneles; punto por clic y cuadrante por arrastre en
  cualquier panel; medición del cuadrante (KPI + tabla + CSV); valores en el punto con coordenadas; serie
  del punto o cuadrante; «Borrar selección»; campo de flujo (glaciares); notas; **descarga del mapa de
  cambio en PNG** (`app.py:1142`); resultados por parcela (agricultura). Nuevo: comparador deslizante.
- **N1 · Serie temporal** (`app.py:1152-1166`): un gráfico por serie con marcas de evento, antes y después;
  tabla y CSV por serie.
- **N1 · Física por tipo** (`app.py:1492-1538`): método, ecuaciones y explicación de cada tipo, dentro de
  Historias (inundación, incendio) y en la ayuda del Observatorio (los otros cuatro).
- **N2 · Estación y temporada** (`app.py:1172-1253`): fecha de consulta; 5 tarjetas de estado; 4 tarjetas del
  Sol (elevación, duración del día, pasos cenitales, próximo hito); climatología con el mes marcado y
  umbral de 60 mm; tabla mensual; efecto estacional por tipo; serie del estado hídrico; método y ecuaciones.
- **N2 · Modo Dios** (`interfaz/modo_dios.py`): mundos, lado, fecha, relieve real o sintético, crear;
  herramientas y parámetros con semilla; clic para desatar; animación; efectos y tabla; vista NISAR;
  bitácora; quitar ciudades; referencias; PNG final; explicación.
- **N2 · Fundamentos** (`app.py:117-208, 1483-1551`): tres secciones (fondo, física SAR, misión); ficha de la
  misión **marcada pendiente de confirmar**; referencias; detector de fenómenos (`FENOMENOS`, `app.py:225`,
  `1328-1343`); referencia de polarización y bandas (`app.py:1452-1481`).
- **N2 · Validación** (`interfaz/particion_vista.py`): se migra solo si el equipo lo confirma; hoy usa
  polígonos de prueba en UTM 30N, sin relación con Ecuador ni con el challenge.
- **R · Fuente HDF5 reales** (`app.py:818-852`), **catálogo ASF** (`app.py:1255-1324`), **explorador
  geográfico** con geocodificación y GeoJSON (`app.py:1345-1449`), avisos ASF e ISRO (`app.py:853-862`).

---

## Bloque 0 — Entorno, red de seguridad y honestidad del núcleo

### Tarea 0.1: Entorno reproducible

**Files:** Create `scripts/entorno.sh`, `.gitignore`, `requirements-api.txt`, `pytest.ini`, `tests/__init__.py`.

**Interfaces:** Produces: `source scripts/entorno.sh` carga nvm, exporta `CHROME_PATH=/home/jnavas/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome` y `NISAR_PROVEEDOR=demo` si no está definida.

- [ ] Escribir los archivos. `.gitignore`: `node_modules/`, `frontend/dist/`, `.taste-skill/**/inspect/`, `__pycache__/`, `.venv/`, `.env`, `data/terreno/`, `data/demo/`, `.inicio_noche`, `test-results/`, `playwright-report/`.
- [ ] `requirements-api.txt`: `fastapi`, `uvicorn[standard]`, `pydantic>=2`, `pytest`, `httpx`. Ejecutar `python -m pip install -r requirements-api.txt`.
- [ ] `pytest.ini`: `testpaths = tests`, `pythonpath = .`.
- [ ] Verificar: `bash -c 'source scripts/entorno.sh && node -v && test -x "$CHROME_PATH" && echo OK'` imprime `v22.23.4` y `OK`; `python -c "import fastapi"` sin error; `python -m unittest modelo.clima modelo.desastres` termina en `OK` (13).
- [ ] `date +%s > .inicio_noche`. Commit: `chore: entorno reproducible y dependencias de la API`.

### Tarea 0.2: Pruebas de caracterización del núcleo

**Files:** Create `scripts/generar_dorados.py`, `tests/modelo/test_caracterizacion.py`, `tests/modelo/dorados.json`.

**Interfaces:** Consumes: `nisar.cargar_sitios()`, `nisar.simular(sitio, semilla=7, looks=12.0, orbita="Ascendente", estacional=True)`, `nisar.intervalo_por_defecto(e)`, `nisar.analizar(e, i0, i1)`, `nisar.estado_modelo(e, instante)`, `estaciones.resumen(lat, lon, fecha)`.

- [ ] `scripts/generar_dorados.py` escribe `tests/modelo/dorados.json`: para los seis sitios de Ecuador (`pais == "Ecuador"`), los títulos y valores de `analizar(...).metricas` y la suma de `np.nansum` de cada panel redondeada a 3 decimales; y, de `resumen(-0.70, -80.20, date(2026, 5, 1))`, solo los campos serializables: `region`, `provincia`, `astronomia["estacion"]`, `temporada["temporada"]` y `humedad_suelo` redondeada a 3 decimales (el campo `climatologia` es un objeto y no se guarda). Ejecutarlo una vez: `python scripts/generar_dorados.py`.
- [ ] Pruebas: `test_metricas_coinciden_con_dorados[<sitio>]` (6 casos), `test_estado_modelo_es_continuo` (dos instantes a 1 min dan rejillas distintas y finitas), `test_resumen_coincide`, `test_resumen_fuera_de_malla_es_none` (`resumen(40.0, -3.7, ...)`).
- [ ] Verificar: `python -m pytest tests/modelo -q` pasa dos veces seguidas.
- [ ] Commit: `test: caracterización del núcleo científico`.

### Tarea 0.3: Licencia y honestidad de los textos del núcleo

**Files:** Create `LICENSE` (MIT, titular «Jose Miguel y colaboradores», 2026; **pendiente de confirmar por el equipo**). Modify `data/nisar_sample.csv` (columna `descripcion`), `modelo/nisar.py` (etiquetas de métricas y `MISION`). Create `tests/modelo/test_honestidad.py`. Regenerar `tests/modelo/dorados.json` tras el cambio de etiquetas.

**Interfaces:** Produces: `nisar.MISION_VERIFICADA: bool = False`.

- [ ] Pruebas que deben fallar primero: `test_descripciones_sin_eventos_reales` (ninguna descripción contiene «reproduce», «sismo de 2016» ni un año entre 1900 y 2025), `test_metricas_no_dicen_real` (ninguna etiqueta de métricas de `analizar` contiene «real» ni «Exactitud vs. verdad»), `test_mision_marcada_sin_verificar` (`MISION_VERIFICADA is False`).
- [ ] Cambios en `data/nisar_sample.csv`: las seis descripciones de `pais == "Ecuador"` empiezan por «Escenario ilustrativo: » y no citan eventos reales (Pedernales: «Escenario ilustrativo: sismo de subducción frente a Manabí. El océano, al oeste, no tiene datos de radar.»). Las de otros países no se tocan.
- [ ] Cambios en `modelo/nisar.py` (exactamente estas seis etiquetas): línea 1196 «Exactitud vs. verdad» → «Acierto del detector (verdad sintética)»; 1241 «Área quemada real» → «Área quemada simulada (verdad sintética)»; 1242 «Puntuación F1» → «F1 del detector (verdad sintética)»; 1345 panel «Error vs. verdad del modelo» → «Error frente a la verdad sintética»; 1352 «RMSE vs. verdad» → «RMSE frente a la verdad sintética»; 1514 «Exactitud de detección» → «Acierto de detección (verdad sintética)». Añadir `MISION_VERIFICADA = False` junto a `MISION` con el comentario «pendiente de confirmar con la documentación oficial».
- [ ] `python scripts/generar_dorados.py`; verificar `python -m pytest tests -q` y `python -m unittest modelo.clima modelo.desastres`.
- [ ] Commit: `fix: textos honestos en el núcleo y licencia MIT provisional`.

**Punto de control 0:** pytest + unittest en verde; `git status` limpio.

---

## Bloque 1 — Capa de datos intercambiable

### Tarea 1.1: Contrato de datos

**Files:** Create `datos/__init__.py`, `datos/contrato.py`, `docs/contrato-datos.md`, `tests/datos/test_contrato.py`.

**Interfaces:** Produces: todos los modelos de la sección «Contrato de datos» y `class DatosRealesNoDisponibles(RuntimeError)`, `class CapacidadNoDisponible(RuntimeError)`.

- [ ] `CapaRaster` es un `@dataclass(frozen=True)` (lleva `np.ndarray`, que pydantic no valida sin configuración especial) con validación en `__post_init__`; los demás modelos son pydantic v2.
- [ ] Pruebas: `test_origen_exige_tipo_valido` (pydantic rechaza `tipo="otro"`), `test_capa_rechaza_datos_no_2d`, `test_bbox_valida_orden` (oeste < este, sur < norte), `test_escenario_sin_adquisiciones_es_invalido`.
- [ ] Implementar. `docs/contrato-datos.md`: qué es cada campo, unidades, ejemplos, y la lista «Pendiente de confirmar con la documentación oficial de NISAR» copiada de este plan.
- [ ] Verificar `python -m pytest tests/datos -q`; commit: `feat(datos): contrato de datos genérico`.

### Tarea 1.2: Generador sintético reproducible

**Files:** Create `datos/generador.py`, `scripts/generar_datos_demo.py`, `tests/datos/test_generador.py`.

**Interfaces:** Consumes: `nisar.simular`, `nisar.cargar_sitios`. Produces:
`ESCENARIOS_DEMO: dict[str, dict]` (los seis sitios de Ecuador; `ec_la_segua` con `historia="inundacion"`, `ec_loja` con `historia="incendio"`, el resto `None`);
`PARAMETROS_DEMO = {"semilla": 7, "looks": 12.0, "orbita": "Ascendente", "estacional": True}`;
`origen_demo(parametros: dict) -> Origen` (`tipo="sintetico"`, `fuente="Generador de demostración NISAR·Ecuador"`, `generador="datos/generador.py"`, `version="1"`, `semilla`, `fecha_generacion`, `notas` con los parámetros no por defecto);
`generar_escena(sitio_id: str, parametros: dict | None = None, sitio: dict | None = None) -> nisar.Escena` (en memoria, con `functools.lru_cache` sobre la clave canónica; `sitio` permite un punto elegido en el mapa);
`exportar(destino: Path, sitios: list[str] | None = None) -> Path`, que escribe `manifest.json` (origen, parámetros, bbox, fechas, hash SHA-256 del contenido de cada cubo) y `<id>.npz` como instantánea abierta y verificable. La CLI `scripts/generar_datos_demo.py` llama a `exportar(Path("data/demo"))`.

- [ ] Pruebas: `test_misma_semilla_mismos_cubos` (hash de `cubo.tobytes()` igual en dos llamadas sin caché), `test_semilla_distinta_cambia_cubos`, `test_exportar_dos_veces_mismos_hashes_en_manifiesto` (en `tmp_path`, con `sitios=["ec_la_segua"]`), `test_origen_demo_es_sintetico`, `test_historias_asignadas`.
- [ ] Ejecutar `python scripts/generar_datos_demo.py` (menos de 1 min; unos 40 MB, fuera de git). La app no depende de estos archivos: son la instantánea publicada del conjunto sintético. Commit: `feat(datos): generador sintético reproducible`.

### Tarea 1.3: Proveedor de demostración

**Files:** Create `datos/proveedores/__init__.py`, `datos/proveedores/demo.py`, `tests/datos/test_proveedor_demo.py`.

**Interfaces:** Consumes: 1.1, 1.2, `nisar.analizar`, `nisar.medir_cuadrante`, `nisar.valores_en_punto`, `nisar.serie_seleccion`, `nisar.estado_modelo`, `nisar.parametros_sitio`. Produces: `ProveedorDemostracion()` que cumple `ProveedorDatos` con `capacidades = {simulacion: true, modelo_continuo: true, verdad_terreno: true}` y obtiene sus escenas con `generar_escena` (la escena en memoria es necesaria porque `nisar.analizar` usa información del modelo que no cabe en un `.npz`).

- [ ] Pruebas: `test_escenarios_son_seis_y_sinteticos`, `test_cambio_la_segua_coincide_con_dorados` (métricas = Tarea 0.2), `test_simular_con_parametros_devuelve_origen_con_parametros`, `test_simular_en_punto_del_mapa_usa_sitio_en_mapa` (misma lógica que `app.py:568-582`), `test_fotogramas_respetan_el_paso`.
- [ ] Implementar traduciendo `Escena`/`Analisis`/`Panel` de `modelo/` a los modelos del contrato; cada `CapaRaster` y `SerieTemporal` copia el `origen` del escenario.
- [ ] Commit: `feat(datos): proveedor de demostración`.

### Tarea 1.4: Proveedor real (esqueleto) y selección

**Files:** Create `datos/proveedores/real.py`, `datos/seleccion.py`, `tests/datos/test_proveedor_real.py`.

**Interfaces:** Produces: `obtener_proveedor() -> ProveedorDatos` (lee `NISAR_PROVEEDOR`, por defecto `demo`); `ProveedorReal` cuyos métodos lanzan `DatosRealesNoDisponibles("El proveedor de datos reales de NISAR aún no está implementado. Sigue la sección «Integración de datos reales» de docs/plan-migracion.md.")`.

- [ ] Pruebas: `test_por_defecto_es_demo`, `test_real_lanza_error_legible`, `test_valor_desconocido_lanza_valueerror`.
- [ ] El archivo `real.py` lleva arriba, como comentario, la lista de verificación de la sección «Integración de datos reales» y ningún detalle técnico de NISAR no verificado.
- [ ] Commit: `feat(datos): esqueleto del proveedor real y selección`.

### Tarea 1.5: Suite de conformidad del contrato

**Files:** Create `tests/datos/proveedor_ficticio.py`, `tests/datos/test_conformidad.py`.

**Interfaces:** Produces: `ProveedorFicticio` (2 escenarios, rejillas de 2048×2048, 5 adquisiciones, polarizaciones `["P1", "P2"]`, `origen.tipo = "real"`, `fuente = "ficticio de pruebas"`, `capacidades` todas en `false`) y el fixture parametrizado `proveedor` = [demo, ficticio].

- [ ] Pruebas parametrizadas: `test_cada_capa_tiene_origen`, `test_cambio_devuelve_tres_capas_coherentes` (mismas dimensiones y bbox), `test_medir_cuadrante_y_punto`, `test_simular_sin_capacidad_lanza_CapacidadNoDisponible` (solo ficticio), `test_sinteticos_siempre_marcados` (todo lo del demo tiene `tipo == "sintetico"`).
- [ ] Verificar `python -m pytest tests/datos -q`. Commit: `test(datos): conformidad del contrato con dos proveedores`.

**Punto de control 1:** `python -m pytest tests -q` y unittest en verde.

---

## Bloque 2 — API sobre el contrato

### Tarea 2.1: Esqueleto y arranque

**Files:** Create `api/__init__.py`, `api/app.py`, `api/schemas.py`, `servidor.py`, `tests/api/conftest.py`, `tests/api/test_salud.py`.

**Interfaces:** Produces: `create_app(proveedor: ProveedorDatos | None = None) -> FastAPI` (por defecto `obtener_proveedor()`); manejadores: `DatosRealesNoDisponibles` → 503 `{mensaje}`, `CapacidadNoDisponible` → 409, `KeyError` de escenario → 404. `servidor.py` corre uvicorn en `127.0.0.1:8000` y sirve `frontend/dist` (con vuelta a `index.html` para rutas del cliente) si existe.

- [ ] Pruebas: `test_salud_informa_proveedor_y_origen` (`origen_tipo == "sintetico"` con demo), `test_proveedor_real_da_503_legible`, `test_gzip` (respuesta > 1 KB con `Accept-Encoding: gzip` lleva `content-encoding: gzip`).
- [ ] Verificar `python -m pytest tests/api -q`; arrancar `python servidor.py` en segundo plano, esperar con `for i in $(seq 30); do curl -sf localhost:8000/api/salud && break; sleep 1; done` (devuelve `"estado":"ok"`) y detenerlo con `pkill -f "python servidor.py"`. Commit: `feat(api): esqueleto y arranque único`.

### Tarea 2.2: Rejillas cuantizadas

**Files:** Create `api/encoding.py`, `tests/api/test_encoding.py`.

**Interfaces:** Produces: `a_rejilla(capa: CapaRaster, max_lado: int = 512) -> Rejilla` y `de_rejilla(r: Rejilla) -> np.ndarray`.

- [ ] Pruebas: `test_ida_y_vuelta_dentro_del_paso` (error ≤ (vmax−vmin)/254), `test_nan_es_cero`, `test_2048_se_reduce_a_512_conservando_bbox`, `test_capa_pequena_no_se_amplia`.
- [ ] Implementar (reducción por promedio de bloques ignorando NaN; base64). Commit: `feat(api): rejillas cuantizadas y reducidas`.

### Tarea 2.3: Tipos y escenarios

**Files:** Create `api/rutas/escenarios.py`, `tests/api/test_escenarios.py`.

**Interfaces:** Consumes: `nisar.TIPOS`, `nisar.CONTROLES` (solo si `capacidades.simulacion`). Produces: `GET /api/tipos`, `GET /api/escenarios`, `GET /api/escenarios/{id}`.

- [ ] Pruebas (con demo y ficticio): `test_lista_escenarios_con_origen`, `test_tipos_traen_controles_si_simula`, `test_tipos_sin_controles_si_no_simula`, `test_escenario_inexistente_404`.
- [ ] Commit: `feat(api): tipos y escenarios`.

### Tarea 2.4: Capas, cambio y medición

**Files:** Create `api/rutas/capas.py`, `tests/api/test_capas.py`.

**Interfaces:** Produces: `GET /api/escenarios/{id}/capa`, `POST /api/escenarios/{id}/cambio`, `POST /api/escenarios/{id}/medicion` (`cuadrante: [x0, y0, x1, y1]`, `punto: [x, y]` en 0–1).

- [ ] Pruebas (demo y ficticio): `test_cambio_devuelve_antes_despues_cambio_con_origen`, `test_antes_igual_despues_422` («Elige dos fechas distintas»), `test_cuadrante_vacio_422`, `test_punto_fuera_de_0_1_422`, `test_medicion_devuelve_tabla`.
- [ ] Commit: `feat(api): capas, cambio y medición`.

### Tarea 2.5: Simulación y fotogramas

**Files:** Create `api/rutas/simulacion.py`, `tests/api/test_simulacion.py`.

**Interfaces:** Produces: `POST /api/simulacion/escenario`, `POST /api/simulacion/fotogramas`; la clave de caché es el JSON canónico de la petición (12 entradas).

- [ ] Pruebas: `test_parametro_fuera_de_rango_422` (rango de `nisar.CONTROLES`), `test_lat_lon_fuera_de_ecuador_422` (mensaje en español), `test_lote_mayor_de_120_422`, `test_mismo_rango_de_color_en_el_lote`, `test_ficticio_da_409`, `test_misma_peticion_usa_cache`.
- [ ] Commit: `feat(api): simulación y fotogramas`.

### Tarea 2.6: Contexto (clima y temporada)

**Files:** Create `api/rutas/contexto.py`, `tests/api/test_contexto.py`.

**Interfaces:** Consumes: `estaciones.resumen`, `estaciones.tabla_mensual`. Produces: `GET /api/contexto` con `origen = {tipo: "real", fuente: "NASA POWER (climatología 2001–2025) y geoBoundaries"}` o `null`.

- [ ] Pruebas: `test_la_segua_coincide_con_dorado`, `test_fuera_de_malla_es_null_con_200`, `test_fecha_invalida_422`.
- [ ] Commit: `feat(api): contexto climático`.

### Tarea 2.7: Contrato OpenAPI versionado

**Files:** Create `scripts/exportar_openapi.py`, `frontend/openapi.json` (lo crea el script), `tests/api/test_contrato_openapi.py`.

- [ ] Prueba: `test_openapi_publicado_esta_al_dia` (igual a `create_app().openapi()`).
- [ ] `python scripts/exportar_openapi.py`. Commit: `feat(api): contrato OpenAPI`.

**Punto de control 2:** `python -m pytest tests -q`, unittest, y `python servidor.py` + `curl localhost:8000/api/escenarios` lista seis escenarios sintéticos.

---

## Bloque 3 — Frontend base y sistema de diseño

### Tarea 3.1: Proyecto y tokens

**Files:** Create `frontend/` con `npm create vite@5 frontend -- --template react-ts` (dentro de la raíz), `vite.config.ts` (proxy `/api` → `http://127.0.0.1:8000`), `src/diseno/tokens.css`, `src/diseno/tokens.test.ts`, eslint y vitest (`jsdom`). Dependencias: `react-router-dom@6`, `@tanstack/react-query@5`, `maplibre-gl@4`, `@fontsource/public-sans@5`, `openapi-typescript@7` (dev), `@testing-library/react`, `@testing-library/jest-dom`, `vitest`, `jsdom`, `@playwright/test` (dev). Las versiones exactas quedan en `package-lock.json`.

**Interfaces:** Produces: `npm run dev | build | preview | test | lint | tipos` (`tipos` = `openapi-typescript openapi.json -o src/api/tipos.ts`).

- [ ] `tokens.test.ts`: cada variable del bloque `css` de `docs/diseno.md §4` existe en `tokens.css` con el mismo valor (lee el archivo con `fs`).
- [ ] Crear `frontend/playwright.config.ts` (navegador en `CHROME_PATH`; `webServer`: `npm run preview` en el puerto 4173) y `frontend/e2e/fuente.spec.ts` (jsdom no mide texto): en la app compilada, el ancho de «111111» y «888888» con `tabular-nums` en Public Sans es igual ±0,5 px. Ejecutar `npx playwright test e2e/fuente.spec.ts`. Si falla: cambiar a «IBM Plex Sans» (tiene tabulares), actualizar `docs/diseno.md §5` y anotarlo en `INFORME.md`.
- [ ] Verificar `npm run build && npm test && npm run lint`. Commit: `feat(frontend): proyecto, tokens y tipografía`.

### Tarea 3.2: Cliente de la API, tipos y estado en la URL

**Files:** Create `src/api/tipos.ts` (generado), `src/api/cliente.ts`, `src/api/consultas.ts`, `src/api/rejilla.ts`, `src/estado/useEstadoUrl.ts`, pruebas junto a cada uno.

**Interfaces:** Produces: `llamar<T>(ruta, cuerpo?) : Promise<T>` (lanza `ErrorApi {estado, mensaje, reintentable}`); `decodificarRejilla(r: Rejilla): Uint8Array`; `useEstadoUrl<T>(esquema)`; `useHayDatosSinteticos(): boolean` (true si cualquier respuesta cacheada tiene `origen.tipo === "sintetico"`).

- [ ] Pruebas: `traduce 422 y 503 a ErrorApi con mensaje`, `decodifica la rejilla con sus dimensiones`, `useEstadoUrl ida y vuelta e ignora valores inválidos`, `useHayDatosSinteticos se activa con un origen sintético`.
- [ ] Commit: `feat(frontend): cliente de la API y estado`.

### Tarea 3.3: Script de revisión visual

**Files:** Create `scripts/revision_visual.sh`.

**Interfaces:** Produces: `bash scripts/revision_visual.sh <ruta> <nombre>`: carga el entorno; si no corre, levanta `python servidor.py` en segundo plano; compila `frontend` (`npm run build`), espera a que `curl -sf localhost:8000/api/salud` responda (máx. 60 s); ejecuta `node .claude/skills/design-taste-frontend/scripts/lint.mjs --app frontend/src` y `node .claude/skills/design-taste-frontend/scripts/inspect.mjs --app http://localhost:8000<ruta> --out docs/capturas-nuevas/<nombre>`; imprime la línea `RESULT:` y apaga el servidor que levantó. Código de salida ≠ 0 si hay FAIL.

- [ ] Verificar con una página temporal: `bash scripts/revision_visual.sh / prueba` termina, deja `docs/capturas-nuevas/prueba/desktop-fold.jpg` y `report.json`. Borrar `docs/capturas-nuevas/prueba/`.
- [ ] Commit: `chore: script de revisión visual`.

### Tarea 3.4: Sistema de diseño y estructura

**Files:** Create en `src/diseno/`: `Estructura.tsx` (riel + lienzo + barra inferior en móvil), `BandaDemostracion.tsx`, `SelloOrigen.tsx`, `CabeceraPantalla.tsx`, `Tarjeta.tsx`, `FranjaKpi.tsx`, `Tabla.tsx`, `Campo.tsx`, `Selector.tsx`, `Deslizador.tsx`, `Interruptor.tsx`, `Boton.tsx`, `Pestanas.tsx`, `Termino.tsx`, `Estados.tsx`, `iconos.tsx`, `marca.tsx`; `src/App.tsx` con rutas `/` (Historias), `/observatorio` y `/_sistema` (galería con datos reales de la API).

**Interfaces:** Produces: `BandaDemostracion()` visible cuando `useHayDatosSinteticos()`; `SelloOrigen({origen})`; `Termino({nombre, explicacion})` (glosario en el sitio, `docs/diseno.md §8`); `Pestanas` con la línea de 1 px; `Tabla` con numéricos a la derecha.

- [ ] Pruebas: `BandaDemostracion aparece con datos sintéticos y no tiene botón de cerrar`, `BandaDemostracion no aparece si todo es real`, `SelloOrigen muestra tipo, fuente y fecha`, `Pestanas marca solo la activa`, `Tabla alinea a la derecha las columnas numéricas`, `Riel da nombre accesible a cada icono`, `Termino se abre con teclado`.
- [ ] Revisión visual: `bash scripts/revision_visual.sh /_sistema sistema` → `RESULT: 0 FAIL` (máx. 3 rondas). Crítica en `INFORME.md`.
- [ ] Commit: `feat(frontend): sistema de diseño, banda de demostración y estructura`.

### Tarea 3.5: Rampas de color y leyendas

**Files:** Create `src/diseno/rampas.ts`, `src/diseno/Leyenda.tsx`, `src/diseno/rampas.test.ts`.

**Interfaces:** Produces: `RAMPAS: Record<"gris" | "agua" | "fuego" | "divergente" | "ciclico" | "mmi" | "lahar" | "ceniza", string[]>` con los valores exactos de `docs/diseno.md §4`; `colorear(rejilla: Uint8Array, rampa, categorias?) : ImageData`; `Leyenda({paleta, vmin, vmax, unidad, leyenda})` en pasos (sin degradado).

- [ ] Pruebas: `luminancia L* monótona en cada rampa secuencial` (CIELAB), `divergente simétrica con centro oscuro`, `cíclica empieza y termina en el mismo color`, `categorías distinguibles con deuteranopía y protanopía` (ΔE2000 ≥ 15 entre pares tras simular con la matriz de Machado 2009), `el 0 es transparente`.
- [ ] Commit: `feat(frontend): rampas de color verificadas y leyendas`.

### Tarea 3.6: Gráficos

**Files:** Create `src/graficos/escala.ts`, `src/graficos/Linea.tsx`, `src/graficos/Barras.tsx`, pruebas.

**Interfaces:** Produces: `escalaRedonda(min, max, n) : {ticks, tope}`; `Linea({series, marcas, unidad, origen})` con `SelloOrigen` al pie.

- [ ] Pruebas: `ticks redondos y tope sobre el máximo`, `sin leyenda con una serie`, `la verdad sintética va punteada y nombrada «verdad sintética»`, `las etiquetas de marcas no se solapan`, `lleva sello de origen`.
- [ ] Commit: `feat(frontend): gráficos`.

### Tarea 3.7: Mapa

**Files:** Create `src/mapa/MapaBase.tsx`, `src/mapa/CapaLienzo.tsx`, `src/mapa/estilo.ts`, `src/mapa/dentroDeEcuador.ts`, `src/mapa/ecuador.geojson` (generado una vez desde `data/ecuador_provincias.geojson` con `scripts/exportar_ecuador_web.py`, simplificado a < 300 KB), pruebas.

**Interfaces:** Produces: `dentroDeEcuador(lat, lon): boolean`; `MapaBase({bbox, onClic, children})`; `CapaLienzo({rejilla, bbox, rampa})`. El estilo usa solo capas locales (fondo, provincias, contorno, máscara exterior) y añade el mapa vectorial de OpenFreeMap como capa opcional que, si falla, no rompe nada.

- [ ] Pruebas: `acepta Quito (−0.18, −78.47) y Puerto Ayora (−0.74, −90.31)`, `rechaza Lima (−12.05, −77.04) y el Pacífico (−1, −83)`, `CapaLienzo deja el 0 transparente`, `el estilo funciona sin la fuente remota` (construcción del objeto de estilo con la remota desactivada).
- [ ] Commit: `feat(frontend): mapa local con capa de lienzo`.

### Tarea 3.8: Cinta de pasadas y reproductor

**Files:** Create `src/tiempo/usePlayback.ts`, `src/tiempo/CintaPasadas.tsx`, `src/tiempo/ControlesReproductor.tsx`, pruebas.

**Interfaces:** Produces: `usePlayback({total, intervaloMs}) : {indice, reproduciendo, play, pausa, ir, paso}`; `CintaPasadas({adquisiciones, evento, instante, temporadas, onCambio})` (una muesca por adquisición, el número que sea); `ControlesReproductor` con inicio, −paso, play/pausa, +paso, final, ir al evento, paso (1 min, 10 min, 1 h, 6 h, 1 día, 12 días) y velocidad (lenta 1 s, normal 0,5 s, rápida 0,25 s).

- [ ] Pruebas (temporizadores simulados): `avanza y se detiene al final`, `play al final reinicia desde el inicio`, `con prefers-reduced-motion no arranca solo`, `la cinta dibuja tantas muescas como adquisiciones` (30 y 5), `arrastrar llama a onCambio con el instante más cercano`, `todos los controles tienen nombre accesible`.
- [ ] Commit: `feat(frontend): cinta de pasadas y reproductor`.

### Tarea 3.9: Comparador deslizante antes/después

**Files:** Create `src/comparador/Comparador.tsx`, `src/comparador/Comparador.test.tsx`.

**Interfaces:** Produces: `Comparador({antes, despues, rampa, etiquetaAntes, etiquetaDespues, onPunto, onCuadrante})`: dos lienzos con la misma escala; divisor arrastrable; teclado ←/→ 1 %, Mayús+←/→ 10 %; clic = punto, arrastre = cuadrante (coordenadas 0–1, como `app.py:602-612`).

- [ ] Pruebas: `el divisor empieza al 50 %`, `las flechas lo mueven 1 % y con Mayús 10 %`, `un clic sin arrastre emite punto`, `un arrastre de más del 1,2 % emite cuadrante normalizado`, `ambas mitades usan la misma rampa y rango`.
- [ ] Commit: `feat(frontend): comparador deslizante`.

### Tarea 3.10: Exportaciones con origen

**Files:** Create `src/exportar/csv.ts`, `src/exportar/png.ts`, pruebas.

**Interfaces:** Produces: `aCsv(filas, columnas, origen): string` (primeras líneas `# origen: sintético`, `# fuente`, `# generador`, `# semilla`, `# fecha de generación`, `# DATOS DE DEMOSTRACIÓN: no son observaciones reales de NISAR` si es sintético); `aPng(lienzo, origen): Blob` con una franja inferior de 24 px dibujada en la imagen con el mismo texto.

- [ ] Pruebas: `CSV sintético empieza con las seis líneas de origen`, `CSV real no lleva la advertencia`, `PNG sintético contiene la franja` (píxeles de la franja ≠ imagen original).
- [ ] Commit: `feat(frontend): exportaciones con metadatos de origen`.

**Punto de control 3:** `npm run build && npm test && npm run lint` en `frontend/`; pytest; `/_sistema` con 0 FAIL.

---

## Bloque 4 — Pantallas de la primera noche

Antes de cada tarea: comprobar el corte por tiempo. Cada pantalla cierra con `bash scripts/revision_visual.sh <ruta> <nombre>` → `RESULT: 0 FAIL` (máx. 3 rondas; lo pendiente va a `INFORME.md`) y la crítica escrita.

### Tarea 4.1: Observatorio — mapa y tiempo

**Files:** Create `src/pantallas/observatorio/Observatorio.tsx`, `VistaMapa.tsx`, `PanelContexto.tsx`, pruebas.

**Interfaces:** Consumes: 2.3–2.6, 3.4–3.8. Produces: ruta `/observatorio?escenario&antes&despues&t&vista`.

- [ ] Pruebas: `clic fuera de Ecuador muestra el aviso y no llama a la API`, `clic dentro crea un escenario en el punto` (`POST /simulacion/escenario`), `la capa alterna entre «modelo en el tiempo» y «cambio detectado»`, `el reloj muestra la pasada anterior y la siguiente`, `el panel de contexto muestra región y temporada con sello de origen NASA POWER`.
- [ ] Implementar; cabecera con el hallazgo **calculado** y redactado como «En este escenario de demostración…». Revisión visual `/observatorio` → `observatorio-mapa`. Commit: `feat(frontend): observatorio, mapa y tiempo`.

### Tarea 4.2: Observatorio — antes/después y medición

**Files:** Create `VistaAntesDespues.tsx`, `Mediciones.tsx`, pruebas.

- [ ] Pruebas: `el comparador usa las fechas elegidas`, `antes = después muestra «Elige dos fechas distintas»`, `el cuadrante muestra KPI y tabla con CSV`, `el punto muestra valores, coordenadas y su serie`, `«Borrar selección» limpia punto y cuadrante`, `glaciares muestra el campo de flujo y agricultura la tabla por parcela`, `el PNG del mapa de cambio lleva la franja de demostración`.
- [ ] Implementar; revisión `/observatorio?vista=comparar` → `observatorio-comparar`. Commit: `feat(frontend): antes/después con comparador y medición`.

### Tarea 4.3: Observatorio — series temporales

**Files:** Create `VistaSerie.tsx`, pruebas.

- [ ] Pruebas: `un gráfico por serie con marcas de evento, antes y después`, `tabla y CSV por serie con origen`, `la verdad sintética se rotula como tal`.
- [ ] Implementar; revisión `/observatorio?vista=serie` → `observatorio-serie`. Commit: `feat(frontend): series temporales`.

### Tarea 4.4: Observatorio — panel de simulación

**Files:** Create `PanelSimulacion.tsx`, pruebas.

- [ ] Pruebas: `solo aparece si el escenario tiene capacidades.simulacion`, `incluye semilla, ENL, paso orbital, estacionalidad, fecha del evento y los controles del tipo (incluido el de hora)`, `restablecer vuelve a los valores por defecto`, `cambiar un control pide un escenario nuevo con antirrebote de 300 ms`.
- [ ] Implementar; revisión `/observatorio` en móvil (hoja inferior) dentro de `observatorio-mapa`. Commit: `feat(frontend): panel de simulación`.

### Tarea 4.5: Historias (inundación en la Costa, incendio en la Sierra)

**Files:** Create `src/pantallas/historias/Historias.tsx`, `Historia.tsx`, `contenido/inundacion.ts`, `contenido/incendio.ts`, pruebas; `docs/historia-datos.md` (guion de presentación).

**Interfaces:** Consumes: 2.4, 3.5, 3.9. Cada historia tiene cinco partes fijas: (1) qué cambia y por qué importa, en lenguaje llano; (2) qué ve el radar y por qué (rugosidad y constante dieléctrica; activo, de día y de noche y con nubes); (3) el comparador antes/después con la polarización que mejor lo resalta (inundación: HH, reflexión especular oscura y doble rebote brillante; incendio: HV, pérdida de volumen del dosel) y la otra para comparar; (4) hipótesis de impulsores físicos y humanos **redactadas como ejemplos ilustrativos** (inundación: lluvias de la temporada lluviosa de la Costa, desbordes, expansión agrícola; incendio: temporada seca, viento, combustible, quemas agrícolas); (5) aplicaciones futuras de NISAR y qué haría falta con datos reales.

- [ ] Pruebas: `cada historia tiene las cinco partes`, `el texto de hipótesis empieza por «En este escenario de demostración»`, `ninguna historia contiene cifras de eventos reales ni años entre 1900 y 2025`, `el comparador carga la polarización recomendada`, `hay enlace al observatorio con el mismo escenario`.
- [ ] Implementar. Revisión `/` → `historias`. Commit: `feat(frontend): historias de inundación e incendio`.

---

## Bloque 5 — Cierre de la noche (se ejecuta siempre)

### Tarea 5.1: Extremo a extremo

**Files:** Modify `frontend/playwright.config.ts` (añadir un proyecto `flujos` cuyo `webServer` es `python servidor.py` en el puerto 8000, lanzado desde la raíz), create `frontend/e2e/flujos.spec.ts`.

- [ ] Flujos a 1440 y 390 px: la banda de demostración visible en `/` y `/observatorio`; Historias → comparador se mueve con teclado; Observatorio → play avanza el instante; exportar CSV y comprobar la cabecera de origen; clic fuera de Ecuador muestra el aviso. Solo los flujos de las pantallas que existan.
- [ ] `npx playwright test` en verde. Commit: `test(e2e): flujos principales`.

### Tarea 5.2: Entrega: README, créditos y guion

**Files:** Create `README.md` (inglés), `README.es.md`, `CREDITOS.md`; modify `docs/historia-datos.md`.

- [ ] Contenido: qué es y qué challenge cumple; **aviso de datos de demostración**; instalación y arranque (`python -m pip install -r requirements.txt -r requirements-api.txt`, `python scripts/generar_datos_demo.py`, `cd frontend && npm install && npm run build`, `python servidor.py`); pruebas; arquitectura y contrato de datos; licencia (MIT, pendiente de confirmar); app Streamlit heredada (`python app.py`). `CREDITOS.md`: NASA POWER, geoBoundaries (CC0), SRTM / Terrain Tiles (AWS Open Data), OpenFreeMap y OpenStreetMap, Public Sans (SIL OFL), modelos científicos citados en `app.py:1539-1551`. Requisitos oficiales de entrega: «pendiente de confirmar».
- [ ] Verificar que cada comando del README funciona desde cero en un clon limpio: `D=$(mktemp -d) && git clone . "$D/clon" && cd "$D/clon"` y seguir el README paso a paso hasta ver `/api/salud` en verde. Commit: `docs: README bilingüe, créditos y guion`.

### Tarea 5.3: Informe de la noche

- [ ] Actualizar `INFORME.md`: tareas hechas, pendientes, paridad marcada, pendientes visuales, problemas. Correr todo: pytest, unittest, `npm run build && npm test && npm run lint`, `npx playwright test`. Commit: `chore: informe de la primera noche`.

---

## Noche 2 (no se ejecuta en la primera)

- **N2.1 Estación y temporada:** `GET /api/contexto` ampliado (Sol, forzamiento, efecto estacional) y pantalla con la paridad listada.
- **N2.2 Modo Dios — API:** `POST /api/dios/mundo` y `/evento` sobre `modelo.desastres`, con `origen = sintético (simulación)`, `usar_dem=false` en pruebas.
- **N2.3 Modo Dios — pantalla** con bitácora en el navegador y PNG con franja.
- **N2.4 Fundamentos:** tres secciones, ficha de la misión con aviso «pendiente de confirmar», fenómenos y referencia de polarizaciones y bandas.
- **N2.5 Validación:** solo si el equipo confirma que sirve al challenge.
- **N2.6 Auditoría final:** paridad completa, revisión visual de todas las pantallas, todas las pruebas.

Cada una con la estructura de tareas de este plan (archivos, interfaces, pruebas, revisión visual, commit).

---

## Reglas de ejecución autónoma

- **Puntos de control** al final de cada bloque: `python -m pytest tests -q`, `python -m unittest modelo.clima modelo.desastres` y, desde el bloque 3, `cd frontend && npm run build && npm test && npm run lint`. Si algo falla, se arregla antes de seguir.
- **Ninguna tarea se da por terminada sin su comando de verificación en verde.** Las tareas visuales, además, sin `RESULT: 0 FAIL` en `docs/capturas-nuevas/<nombre>/report.json` (o con el pendiente anotado tras tres rondas).
- **Tarea bloqueada:** anotar en `INFORME.md` qué, por qué y qué se probó; `git stash` de lo incompleto si rompe el build; seguir con la siguiente tarea cuya dependencia esté cumplida (ver «Orden de ejecución»). Nunca saltarse el bloque 5.
- **Prohibido sin pedir permiso:** descargar o buscar datos de NISAR; crear cuentas o usar credenciales; borrar `data/`, `modelo/`, `app.py` o historia de git; `git push`; instalar paquetes del sistema; tocar `main`.

## Estimación

Aproximada, en tokens: bloques 0–2 ≈ 0,6–0,8 M; bloque 3 ≈ 0,8–1,0 M (el sistema de diseño es el build
visual más caro); bloque 4 ≈ 0,7–0,9 M; bloque 5 ≈ 0,2 M. Total ≈ 2,3–2,9 M. El corte por tiempo
protege el bloque 5. Si el presupuesto es menor, se recorta en este orden: primero 4.4, después 4.3.
Nunca se recortan el bloque 1, la Tarea 3.10 (honestidad de las exportaciones), la 4.2 (comparador) ni
la 4.5 (historias): son el núcleo del challenge.

## Apéndice: comandos y permisos de la ejecución

Python: `python -m pip install -r requirements-api.txt`, `python -m pytest …`, `python -m unittest …`,
`python servidor.py`, `python scripts/{generar_dorados,generar_datos_demo,exportar_openapi,exportar_ecuador_web}.py`.
Node (tras `source scripts/entorno.sh`): `npm create vite@5`, `npm install`, `npm run dev|build|preview|test|lint|tipos`,
`npx playwright test`. Taste Skill: `node .claude/skills/design-taste-frontend/scripts/{lint,inspect}.mjs`.
Scripts: `bash scripts/revision_visual.sh …`. Git: `add`, `commit`, `status`, `diff`, `log`, `stash`.
Procesos en segundo plano: `python servidor.py`, Chromium. Red: npm y PyPI (instalación), OpenFreeMap
(opcional). **Sin** ASF, Earthdata, Bhoonidhi ni descargas de NISAR.

---

## Integración de datos reales (PENDIENTE: se ejecuta cuando se habiliten los recursos)

**No se ejecuta esta noche.** Lista de verificación, en orden:

- [ ] Pegar la lista oficial de recursos y los requisitos de entrega en `docs/challenge.md`.
- [ ] Leer la documentación oficial de los productos NISAR elegidos y completar cada punto «pendiente de confirmar» de `docs/contrato-datos.md` (proyección, polarizaciones, unidades, sin dato, tamaño, formato).
- [ ] Revisar contra esa documentación el código heredado no verificado: `modelo/nisar.py:1550-1820` (búsqueda ASF, `leer_gcov`, `leer_gunw`, nombres de colección, convención de signo) y `nisar.MISION`; corregir o descartar lo que no coincida. Poner `MISION_VERIFICADA = True` solo con fuente citada.
- [ ] Instalar el acceso que indique la documentación oficial (cuenta, credenciales en `.env` nunca versionado).
- [ ] Implementar `datos/proveedores/real.py` cumpliendo el contrato; pasar `tests/datos/test_conformidad.py` añadiéndolo al fixture.
- [ ] Validar con una muestra pequeña (un producto, un área) y comparar visualmente con la vista previa oficial si existe.
- [ ] Comprobar rendimiento con volumen real: tiempo de `capa` y `cambio`, memoria del servidor y fluidez del mapa; si hace falta, generar vistas reducidas o teselas en el proveedor (el contrato no cambia).
- [ ] Migrar catálogo, explorador y lectura de HDF5 (paridad **R**) sobre el proveedor real.
- [ ] Retirar la banda de demostración solo donde `origen.tipo == "real"`; los escenarios sintéticos siguen marcados.
- [ ] Reescribir historias, hipótesis y hallazgos con los datos reales y sus fechas; actualizar `CREDITOS.md` con los productos usados y su cita oficial.
