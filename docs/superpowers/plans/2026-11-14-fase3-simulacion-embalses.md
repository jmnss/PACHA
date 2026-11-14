# Fase 3 — Simulación de lluvia y sequía en los embalses · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Ejecutor previsto: Claude Sonnet** (subagentes con `model: "sonnet"`, o una sesión Sonnet con executing-plans).
> Requiere las fases 1 y 2. Antes de cada tarea: `source scripts/entorno.sh`. Rama `embalses`. Un commit por tarea.

**Goal:** En la parte «Simular» de cada embalse, el usuario elige mes de inicio, cuánta lluvia (de sequía a
extrema) y duración, y ve cómo sube o baja el agua sobre el mapa real, con nivel, volumen, vertido, energía
ilustrativa e indicadores de seguridad eléctrica.

**Architecture:** Balance de agua mensual ilustrativo en `datos/lecciones/simulacion_embalse.py` (numpy/scipy,
compatible con Pyodide), sobre el DEM y la curva nivel–superficie de la fase 1 y la climatología de NASA POWER
(`modelo.estaciones`). Ruta `POST /api/lecciones/embalses/{sitio}/simular`. Frontend: panel de controles, mapa
animado por meses y tarjetas de impacto en `pantallas/lecciones/`.

**Tech Stack:** numpy, scipy.ndimage, pydantic; React, TanStack Query, gráficos existentes.

**Spec:** `docs/superpowers/specs/2026-11-14-embalses-incendios-design.md` (§8 «Simulación de embalse» e
«Impactos de embalse»).

## Global Constraints

- La simulación es **100 % sintética**: todas sus salidas llevan `Origen(tipo="sintetico", clase="sintetico",
  generador="datos/lecciones/simulacion_embalse.py")` y la banda de demostración se ve en pantalla.
- Parámetros hidráulicos de cada embalse en `fichas.json` → `hidro`; cada uno con fuente o `ilustrativo: true`. La
  interfaz muestra «ilustrativo» junto a cada cifra que lo sea.
- Por debajo de la cota del agua del DEM no hay batimetría: la bajada se ilustra (curva extrapolada) y una nota lo
  dice siempre que el nivel simulado quede por debajo de esa cota.
- Nada de ciencia en el frontend. Funciona en Pyodide (sin dependencias nuevas fuera de numpy/scipy/pydantic).
- Respuesta de la simulación < 1 s en local para 12 meses (la rejilla de derivados es ≤ 1024 px).

## Review Focus

1. Lluvia extrema prolongada: el nivel nunca supera la cota máxima; el exceso sale por vertido → Tarea 1.
2. Sequía larga: el volumen nunca baja de 0 ni de lo que la curva permite; el turbinado se recorta cuando el nivel
   cae bajo la cota mínima de operación → Tarea 1.
3. Parámetros fuera de rango (mes 13, factor −1, duración 0): 422 con mensaje traducible → Tarea 2.
4. Sitio con sustituto (sin datos reales): la simulación arranca del estado del sustituto, no falla → Tarea 2.
5. Mover los controles rápido en el navegador: solo se muestra el último resultado (sin parpadeo de resultados
   viejos) → Tarea 3.

---

### Task 1: Modelo de balance de agua

**Files:**
- Create: `datos/lecciones/simulacion_embalse.py`
- Modify: `datos/lecciones/fichas.json` (bloque `hidro` por embalse), `datos/lecciones/fichas.py` (modelo
  `Hidro`)
- Test: `tests/datos/test_simulacion_embalse.py`

**Interfaces:**
- Produces:
  - `class Hidro(BaseModel)`: `area_cuenca_km2`, `coef_escorrentia` (0–1), `caudal_turbinado_m3s`, `salto_m`,
    `eficiencia` (0–1), `cota_min_operacion_m` y `cota_max_m` (relativas a `cota_dem_m`, en metros),
    `factor_evaporacion` (fracción de ET0 aplicada a la superficie libre), cada uno como `Cifra`
    (valor + fuente o `ilustrativo`). Valores ilustrativos de partida si no hay fuente: Mazar
    `area_cuenca 2000`, `coef 0.5`, `caudal 140`, `salto 160`, `eficiencia 0.88`, `cota_min −20`, `cota_max +4`;
    Daule-Peripa `area_cuenca 4200`, `coef 0.45`, `caudal 120`, `salto 50`, `eficiencia 0.88`,
    `cota_min −15`, `cota_max +3`; `factor_evaporacion 1.0`. Reemplazar por valores con fuente si la Tarea 1 de la
    fase 2 los encontró.
  - `class ParametrosEmbalse(BaseModel)`: `mes_inicio: int` (1–12), `factor_lluvia: float` (0.0–3.0; etiquetas de
    la interfaz: 0.3 sequía severa, 0.6 sequía, 1.0 normal, 1.6 muy lluvioso, 2.5 extremo),
    `duracion_meses: int` (1–12), `nivel_inicial: Literal["observado","normal"] = "observado"`.
  - `class PasoMes(BaseModel)`: `mes: int`, `lluvia_mm`, `entrada_hm3`, `turbinado_hm3`, `vertido_hm3`,
    `evaporacion_hm3`, `volumen_hm3` (relativo a `cota_dem_m`), `nivel_m` (relativo), `superficie_km2`,
    `energia_gwh`, `bajo_minimo: bool`, `extrapolado: bool`.
  - `def simular_balance(p: ParametrosEmbalse, hidro: Hidro, curva: dict, lluvia_mm_mes: list[float],
    et0_mm_mes: list[float], nivel_inicial_m: float) -> list[PasoMes]`. Por mes `m`:
    ```
    entrada = lluvia[m]·factor · area_cuenca·1e6 · coef / 1e9                 (hm³)
    evap    = et0[m]·factor_evap · superficie(nivel)·1e6 / 1e3 / 1e9          (hm³)
    turb    = caudal·dias_mes·86400/1e9, recortado a 0 si nivel ≤ cota_min y al volumen disponible sobre cota_min
    V'      = V + entrada − evap − turb
    vertido = max(0, V' − V(cota_max));  V' −= vertido
    nivel   = interp(V' → nivel) con la curva; superficie = interp(nivel → superficie)
    energia = 1000·9.81·(turb·1e9/(dias_mes·86400))·salto·eficiencia · horas_mes / 1e9   (GWh)
    ```
  - `def nivel_desde_superficie(curva: dict, superficie_km2: float) -> float` (para arrancar desde la última
    superficie observada).
  - `def mascara_nivel(dem: np.ndarray, agua_dem: np.ndarray, curva: dict, nivel_m: float) -> np.ndarray[bool]`:
    por encima de `cota_dem`: celdas `dem ≤ cota_dem + nivel` conectadas a `agua_dem`; por debajo: erosión de
    `agua_dem` (`scipy.ndimage.binary_erosion`, iteraciones crecientes) hasta la superficie que da la curva.
- [ ] **Step 1: Tests que fallan:**
  - `test_nunca_supera_cota_maxima`: factor 3, 12 meses → `nivel_m ≤ cota_max` en todos los pasos y
    `sum(vertido) > 0`.
  - `test_sequia_recorta_turbinado`: factor 0, 12 meses → algún `bajo_minimo` y `turbinado_hm3 == 0` en esos meses;
    `volumen_hm3` nunca menor que el mínimo de la curva.
  - `test_conservacion_masa`: Σentrada − Σevap − Σturb − Σvert == V_final − V_inicial (± 1e-6).
  - `test_energia_proporcional_al_turbinado`: duplicar `caudal` en régimen sin recorte duplica `energia_gwh`.
  - `test_mascara_nivel_crece_con_el_nivel` y `test_mascara_bajo_cota_dem_es_subconjunto` (DEM sintético en V).
- [ ] **Step 2:** `python -m pytest tests/datos/test_simulacion_embalse.py -q` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `python -m pytest tests -q` → PASS.
- [ ] **Step 5: Commit** `feat(lecciones): balance de agua ilustrativo de los embalses`

---

### Task 2: Ruta de simulación

**Files:**
- Modify: `api/rutas/lecciones.py`, `api/schemas_lecciones.py`, `datos/claves.py` + `api/claves.json`, OpenAPI y
  tipos del frontend
- Create: `datos/lecciones/servicio_simulacion.py` (une derivados, curva, clima y modelo)
- Test: `tests/api/test_lecciones_simulacion.py`

**Interfaces:**
- Consumes: Tarea 1; `ProveedorMixto` (para el escenario y su última superficie observada:
  `serie_superficie`); archivos `dem.npz`/`curva.json` del sitio (rutas desde `sitio.json`; el servicio recibe la
  raíz de datos por parámetro, con valor por defecto `DIR_DATOS`); `estaciones.climatologia(lat, lon)`
  (`prec_mm_mes`, `et0_mm_dia` × días del mes).
- Produces:
  - `POST /api/lecciones/embalses/{sitio}/simular` con cuerpo `ParametrosEmbalse` → `SimEmbalseDto`:
    `pasos: list[PasoMes]`, `mascaras: list[RejillaDto]` (una por mes, categórica: 1 agua simulada,
    2 agua observada/inicial, para dibujar ambas; codificada con `api.encoding.a_rejilla` como las capas),
    `base: RejillaDto` (relieve sombreado o HH de la última fecha, la que exista), `bbox`, `indicadores`:
    `meses_bajo_minimo`, `vertido_total_hm3`, `energia_total_gwh`, `energia_normal_gwh` (misma simulación con
    factor 1.0), `notas: list[TextoClave]` (incluye la de extrapolación si aplica), `origen` sintético,
    `ilustrativos: list[str]` (claves de `hidro` sin fuente).
  - `nivel_inicial="observado"` usa la última superficie de una fecha real; si el sitio es sustituto o no hay, la
    cota del agua del DEM (nivel 0).
  - Errores: sitio desconocido 404 (`api.error.sitio_desconocido`); parámetros fuera de rango 422 con
    `api.error.sim_rango` (existente).
- [ ] **Step 1: Tests que fallan:** `test_simular_200_doce_meses` (12 pasos y 12 máscaras),
  `test_simular_422_mes_13`, `test_simular_sustituto` (raíz de prueba sin fechas reales → 200),
  `test_origen_sintetico`, `test_tiempo_menor_un_segundo` (local, `time.perf_counter`).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `python -m pytest tests -q` PASS.
- [ ] **Step 5: Commit** `feat(api): simulación de lluvia y sequía por embalse`

---

### Task 3: Parte «Simular» en la página

**Files:**
- Create: `frontend/src/pantallas/lecciones/ParteSimular.tsx`, `ControlesEmbalse.tsx`, `MapaSimulacion.tsx`,
  `simular.test.tsx`
- Modify: `frontend/src/api/lecciones.ts` (`useSimularEmbalse()` — mutación o query con clave de parámetros;
  descartar respuestas viejas: TanStack Query con `placeholderData: keepPreviousData` y clave por parámetros),
  catálogos `lecciones.ts` (es/en/qu), `Lecciones.tsx` (insertar la parte 3)

**Interfaces:**
- Consumes: `SimEmbalseDto`; `Deslizador`, `Selector`, `FranjaKpi`, `LienzoCapa` (o el lienzo que usa
  `VistaMapa`), `usePlayback` si existe en `frontend/src/tiempo/` para animar meses.
- Produces: controles (mes de inicio con nombres de mes del idioma; lluvia con las cinco etiquetas de la Tarea 1;
  duración 1–12; nivel inicial observado/normal) que escriben en la URL (`sim_mes`, `sim_lluvia`, `sim_meses`);
  mapa con agua inicial y simulada por mes y reproductor; gráfico de nivel y volumen por mes con la cota mínima y
  máxima dibujadas; notas (`TextoClave`) y marca «ilustrativo».
- [ ] **Step 1: Tests que fallan:** `controles escriben en la URL`, `muestra la nota de extrapolación cuando viene`,
  `marca ilustrativo los parámetros sin fuente`, `banda de demostración visible`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm test && npm run lint` PASS.
- [ ] **Step 5: Commit** `feat(lecciones): parte Simular con el agua sobre el mapa real`

---

### Task 4: Impactos de energía, seguridad eléctrica y vertido

**Files:**
- Modify: `frontend/src/pantallas/lecciones/ParteImpactos.tsx`, catálogos, `contenido/embalses.*.ts`
- Test: `frontend/src/pantallas/lecciones/impactos.test.tsx`

**Interfaces:**
- Consumes: `SimEmbalseDto.indicadores` y `pasos` del escenario de simulación vigente (mismos parámetros de la
  URL); fichas (`potencia_mw`, eventos con fuente).
- Produces: tarjetas (1) energía: `energia_total_gwh` frente a `energia_normal_gwh` (diferencia en % calculada en
  Python: añadir `energia_variacion_pct` al DTO de la Tarea 2 si hace falta), (2) seguridad eléctrica: meses bajo
  la cota mínima y lectura llana («con N meses bajo el mínimo, la central no podría turbinar…»), (3) vertido y
  riesgo aguas abajo, (4) orilla expuesta (de la fase 2). Todas «ilustrativo» y con el sello sintético; eventos
  reales solo de `fichas.eventos` con enlace.
- [ ] **Step 1: Tests que fallan:** `sin simulación muestra solo impactos observados`, `con simulación muestra
  energía y meses bajo mínimo`, `evento sin fuente no aparece` (fixture de ficha sin eventos).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm test && npm run lint` PASS.
- [ ] **Step 5: Commit** `feat(lecciones): impactos de energía, seguridad eléctrica y vertido`

---

### Task 5: Verificación de la fase

- [ ] e2e en `frontend/e2e/lecciones.spec.ts`: mover lluvia a «extremo» y a «sequía severa» cambia la superficie
  mostrada; la banda de demostración visible.
- [ ] `python -m pytest tests -q`, `cd frontend && npm test && npm run lint && npx playwright test` → PASS.
- [ ] Revisión visual de `/?leccion=embalses&sitio=mazar` a tres anchos (Taste Skill, hasta tres rondas).
- [ ] `bash scripts/construir_pages.sh` + e2e de Pages → PASS; comprobar que la simulación responde en Pyodide.
- [ ] `INFORME.md` y `docs/retomar.md`. **Commit** `test(lecciones): verificación de la simulación de embalses`
