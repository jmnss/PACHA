# Simulador de Eventos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrar el Modo Dios a React como «Simulador de Eventos», con gemelo del radar, espera hasta la primera imagen y escenario compartible por URL.

**Architecture:** `datos/simulador.py` (+ `datos/simulador_render.py`) envuelve `modelo/desastres.py` sin tocarlo y serializa; `api/rutas/simulador.py` solo habla con `datos/`; la pantalla `/simulador` consume la API. La física y la colorización viven en el servidor.

**Tech Stack:** Python 3.13, FastAPI, pydantic v2, pytest · React 18, TypeScript, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-simulador-de-eventos-design.md`

## Global Constraints

- Todo dato del simulador lleva `Origen(tipo="sintetico", fuente="Simulador de eventos (modelos físicos publicados sobre relieve SRTM)", generador="datos/simulador.py", version="1")`.
- El ciclo de 12 días (`nisar.CICLO_DIAS`) se rotula siempre «pendiente de confirmar con la documentación oficial»; `verificado=false`.
- `modelo/` y `interfaz/` no se modifican. Pruebas con `usar_dem=False` (sin red).
- Extensiones permitidas `{20,30,40,60,80,120}` km; ≤ 8 ciudades extra; nombres ≤ 40 caracteres; punto dentro de `datos.geografia.en_ecuador`.
- Textos en español llano; términos con `Termino`; estilos solo de `tokens.css`/`rampas.ts`; un commit por tarea con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Todo comando de Node tras `source scripts/entorno.sh`.

## Review Focus

1. Celda fuera de la malla o herramienta desconocida → 422 en español, no 500.
2. Clic en el mar con «incendio»/«erupción», o fundar ciudad en el mar → mensaje legible (el modelo lanza `ValueError`; debe volverse 422).
3. Enlace compartido con valores inválidos/manipulados → se ignoran y se usan los defectos.
4. Informe PNG/CSV de la bitácora sin marca de demostración → nunca.
5. Paneles de radar incompatibles (terremoto, erupción) → rejilla, no comparador roto.

---

### Task 1: Mundo (catálogo, creación, relieve, marcas)

**Files:**
- Create: `datos/simulador.py`, `datos/simulador_render.py`, `tests/datos/test_simulador.py`

**Interfaces:**
- Produces (`datos/simulador.py`):
  - `ORIGEN_SIMULADOR() -> Origen`
  - `EXTENSIONES_KM: tuple[int, ...] = (20, 30, 40, 60, 80, 120)`
  - `catalogo() -> dict` con claves `herramientas` (lista de `{id, icono, nombre, controles:[{id, etiqueta, tipo:"numero"|"seleccion"|"interruptor"|"texto", minimo, maximo, paso, defecto, opciones, ayuda, unidad}]}`), `mundos` (lista de `{nombre, lat, lon, extension_km, herramienta, descripcion}` desde `desastres.ESCENARIOS`), `volcanes`, `extensiones_km`.
  - `PeticionMundo` (pydantic): `lat, lon, extension_km:int, fecha:date, usar_dem:bool=True, ciudades: list[CiudadExtra]=[]`; `CiudadExtra{nombre, lat, lon, habitantes}`; valida rangos y Ecuador (`EntradaNoValida` en español).
  - `crear(p: PeticionMundo) -> tuple[desastres.Mundo, dict]` (caché LRU 6, clave canónica; el dict es el `MundoDto`: `id, n, bbox, region, fuente_dem, pixel_m, habitantes, humedad_suelo_pct, temporada, relieve_png_b64, marcas:[{x,y,texto,tipo}], origen`).
- (`datos/simulador_render.py`): `relieve_rgba(mundo, escala=4) -> np.ndarray`, `png_b64(rgba) -> str`, `COLOR_COBERTURA` (portar de `interfaz/modo_dios.py:61-126` sin importar Streamlit).

- [ ] **Step 1: Write failing tests** `test_catalogo_trae_seis_herramientas_y_ocho_mundos`, `test_crear_mundo_es_determinista` (dos `crear` con `usar_dem=False` → mismo `id`, mismo `relieve_png_b64`), `test_fuera_de_ecuador_rechazado` (`EntradaNoValida`), `test_extension_no_permitida_rechazada`, `test_mas_de_8_ciudades_rechazado`, `test_origen_sintetico`.
- [ ] **Step 2:** `python -m pytest tests/datos/test_simulador.py -q` → FAIL (módulo no existe).
- [ ] **Step 3:** Implementar; controles del catálogo con los rangos/defectos de `interfaz/modo_dios.py:_parametros` (líneas 233-294) y `humedad_comb` defecto = `desastres.humedad_combustible(mundo.humedad_suelo)` resuelto en `crear` (se expone `humedad_combustible_defecto_pct` en el `MundoDto`).
- [ ] **Step 4:** pytest verde. **Step 5:** commit `feat(datos): mundos del simulador de eventos`.

### Task 2: Evento (cuadros, paneles, espera del radar)

**Files:**
- Modify: `datos/simulador.py`, `datos/simulador_render.py`; Test: `tests/datos/test_simulador.py`

**Interfaces:**
- Produces: `PeticionEvento{mundo: PeticionMundo, herramienta: str, celda: tuple[int,int], parametros: dict[str, bool|int|float|str]}`; `desatar(p) -> dict` (`EventoDto`): `herramienta, titulo, celda, latlon, tiempos:[str], cuadros_png_b64:[str] (≤48, RGBA a escala del relieve), capas:[{clave,nombre,estilo,unidad,etiquetas}], metricas:[{etiqueta,valor,ayuda}], tabla:{columnas,filas}|None, notas, modelos, paneles:[PanelDto{titulo,paleta,vmin,vmax,unidad,leyenda,rejilla:Rejilla-like(png_b64 coloreado + filas/columnas)}], comparable: bool, polarizacion: str|None, metricas_radar:[...], espera_radar{ciclo_dias:12, minimo_dias:0, maximo_dias:12, medio_dias:6.0, duracion_evento_h, verificado:false}, resumen, origen`; `ciudad(p: PeticionMundo, i, j, nombre, habitantes) -> PeticionMundo` (devuelve la petición con la ciudad añadida; `EntradaNoValida` si es mar).
- `comparable` = los dos primeros paneles comparten paleta, vmin y vmax; `polarizacion` se deduce del título («HV»/«HH»).
- Los cuadros se colorean con la lógica de `componer`/`_colorear_capa` (`interfaz/modo_dios.py:104-160`) portada a `simulador_render`.

- [ ] **Step 1: Failing tests:** `test_cada_herramienta_devuelve_cuadros_y_origen_sintetico` (incendio, tormenta, inundacion, terremoto, erupcion; semilla 7; mundo 60 celdas `usar_dem=False`; `len(cuadros)==len(tiempos)`), `test_incendio_es_comparable_en_hv` (`comparable and polarizacion=="HV"`), `test_terremoto_no_comparable`, `test_espera_radar_determinista_y_no_verificada` (dos llamadas iguales; `verificado is False`; `medio_dias==6.0`), `test_evento_determinista_por_semilla`, `test_celda_fuera_de_malla_422`, `test_herramienta_desconocida_422`, `test_incendio_en_el_mar_da_entrada_no_valida` (convierte `ValueError` del modelo en `EntradaNoValida`), `test_ciudad_en_el_mar_rechazada`, `test_parametro_fuera_de_rango_422`.
- [ ] **Step 2:** correr → FAIL. **Step 3:** implementar (cache LRU 12 por JSON canónico; validar parámetros contra el catálogo). **Step 4:** verde. **Step 5:** commit `feat(datos): eventos del simulador con espera del radar`.

### Task 3: API `/api/simulador/*`

**Files:**
- Create: `api/rutas/simulador.py`, `tests/api/test_simulador.py`; Modify: `api/app.py` (incluir router), `frontend/openapi.json` (vía `python scripts/exportar_openapi.py`), `frontend/src/api/tipos.ts` (vía `npm run tipos`)

**Interfaces:**
- Produces: `GET /api/simulador/catalogo`, `POST /api/simulador/mundo` (`PeticionMundo`→`MundoDto`), `POST /api/simulador/evento` (`PeticionEvento`→`EventoDto`), `POST /api/simulador/ciudad` (`{mundo, celda, nombre, habitantes}`→`PeticionMundo`). Modelos de respuesta pydantic en `api/schemas.py` o en `datos/simulador.py` (tipos del OpenAPI estables).
- `GET /api/salud` no cambia; la banda de demostración del frontend se activa por el `origen` de las respuestas del simulador (ya la cubre `useHayDatosSinteticos`, que mira cachés).

- [ ] **Step 1: Failing tests:** `test_catalogo`, `test_mundo_con_origen_sintetico`, `test_evento_incendio_completo`, `test_fuera_de_ecuador_422_en_espanol`, `test_parametro_fuera_de_rango_422`, `test_celda_fuera_de_malla_422`, `test_demasiadas_ciudades_422`, `test_misma_peticion_misma_respuesta`, `test_openapi_al_dia` (el existente `tests/api/test_contrato_openapi.py` debe seguir verde tras re-exportar).
- [ ] **Step 2:** FAIL. **Step 3:** implementar rutas; errores `EntradaNoValida`. **Step 4:** `python -m pytest tests -q` verde; `python scripts/exportar_openapi.py && (cd frontend && npm run tipos)`. **Step 5:** commit `feat(api): simulador de eventos`.

### Task 4: Frontend — cliente, estado en la URL y ruta

**Files:**
- Create: `frontend/src/pantallas/simulador/estadoSimulador.ts`, `.../estadoSimulador.test.ts`, `.../Simulador.tsx` (esqueleto), `frontend/src/api/simulador.ts`
- Modify: `frontend/src/App.tsx` (ruta lazy `simulador`), `frontend/src/diseno/Estructura.tsx` (destino «Simulador», `etiquetaCorta: 'Simul.'`), `frontend/src/diseno/iconos.tsx` (`IconoSimulador`)

**Interfaces:**
- Produces: `useCatalogo()`, `useMundo(p)`, `useEvento(p)` (queries con `llamar`, para que `useHayDatosSinteticos` las vea), `type EstadoSimulador = {lat, lon, ext, fecha, dem, h, i, j, p: Record<string, number|string|boolean>}`, `leerEstado(search: URLSearchParams): EstadoSimulador` (valida contra el catálogo/rangos; inválidos → defectos), `escribirEstado(e): string` (ida y vuelta).

- [ ] **Step 1: Failing tests:** `ida y vuelta conserva el estado`, `valores inválidos o manipulados se ignoran` (lat fuera, ext=7, h desconocida, i<0, p con claves ajenas), `la ruta /simulador existe y el riel la nombra`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `npm test && npm run lint && npx tsc -b` verde. **Step 5:** commit `feat(frontend): ruta y estado del simulador`.

### Task 5: Frontend — mundo, tablero y reproductor

**Files:**
- Create: `.../simulador/PanelMundo.tsx`, `Tablero.tsx`, `PanelHerramienta.tsx`, `simulador.css`, `tablero.test.tsx`

**Interfaces:**
- Consumes: Task 4; `usePlayback`, `ControlesReproductor`, `Selector`, `Deslizador`, `Interruptor`, `Termino`, `Cargando`, `ErrorBloque`, `SelloOrigen`.
- Produces: `Tablero({mundo: MundoDto, evento?: EventoDto, onClic(i, j)})` — `<img>` del relieve + `<img>` del cuadro activo + marcas (ciudades, volcanes, evento) con `role="img"`/etiquetas; clic y Enter/Espacio en celda enfocada (teclado: flechas mueven un cursor visible); `PanelHerramienta` genera los controles desde `catalogo.herramientas[].controles`.
- Animación: cuadros por `usePlayback({total: cuadros.length, intervaloMs: 170})`; con `prefers-reduced-motion` no arranca sola.

- [ ] **Step 1: Failing tests:** `el clic emite la celda i, j correcta`, `el teclado mueve el cursor y Enter desata`, `los controles salen del catálogo`, `con reduced-motion no arranca sola`, `el mar no se puede fundar ciudad: muestra el mensaje del servidor`.
- [ ] **Step 2–4:** FAIL → implementar → verde (`npm test`, lint). **Step 5:** commit `feat(frontend): tablero del simulador`.

### Task 6: Frontend — resultados, gemelo del radar, espera, bitácora y compartir

**Files:**
- Create: `.../simulador/ResultadosEvento.tsx`, `GemeloRadar.tsx`, `EsperaRadar.tsx`, `Bitacora.tsx`, `informe.ts`, `*.test.tsx`

**Interfaces:**
- Produces: `GemeloRadar({evento})` — con `evento.comparable` usa `Comparador` (mismas props que en Historias, `etiquetaAntes/Despues` con la polarización y una frase de por qué la resalta); si no, rejilla de paneles con leyenda. `EsperaRadar({espera})` — `Barras` de 0…12 días (una barra por día, misma altura = igual probabilidad) + texto «Ciclo supuesto de 12 días, pendiente de confirmar con la documentación oficial» + comparación con `duracion_evento_h`. `Bitacora` guarda en `localStorage` (try/catch) y exporta CSV con `aCsv(..., origen)`. `informe.ts`: `aInformePng(canvas…, origen) -> Blob` (relieve + estado final + KPIs, franja con `aPng`). Botón «Copiar enlace» con `escribirEstado`.

- [ ] **Step 1: Failing tests:** `incendio usa el comparador y nombra HV`, `terremoto muestra rejilla de paneles`, `la espera dice pendiente de confirmar y no inventa cifras distintas de las del servidor`, `el CSV de la bitácora empieza con las líneas de origen sintético`, `el informe PNG lleva la franja de demostración` (píxeles de la franja ≠ imagen original), `sin localStorage la bitácora sigue funcionando`, `copiar enlace escribe el estado en la URL`.
- [ ] **Step 2–4:** FAIL → implementar → `npm test`, `npm run lint`, `npx tsc -b` verde. **Step 5:** commit `feat(frontend): resultados del simulador`.

### Task 7: Cierre — e2e, revisión visual, informe

**Files:**
- Create: `frontend/e2e/simulador.spec.ts`; Modify: `INFORME.md`, `README.md`, `README.es.md`, `docs/capturas-nuevas/simulador/`

- [ ] **Step 1:** e2e (1440 y 390): crear mundo «Bosques secos de Loja», clic en el tablero con incendio, ver comparador HV y la tarjeta de espera, «Copiar enlace» y recargar con la URL recrea el evento, banda de demostración visible, sin desborde horizontal.
- [ ] **Step 2:** `cd frontend && VITE_MAPA_REMOTO=0 npm run build && npx playwright test` verde; `bash scripts/revision_visual.sh /simulador simulador` → `RESULT: 0 FAIL` (máx. 3 rondas).
- [ ] **Step 3:** actualizar `INFORME.md` (paridad «Modo Dios» → «Simulador de Eventos», pendientes de fase 2) y READMEs (sección breve). **Step 4:** pytest, unittest, vitest, lint verdes. **Step 5:** commit `docs: informe del simulador de eventos`.

---

Cobertura de la spec: mundo/evento/API → T1–T3; pantalla y tablero → T4–T5; ideas 1, 2 y 6 → T6; pruebas/e2e/visual → T7. Fase 2 (A/B, cascadas, retos) queda fuera.
