# Fase 4 — Incendio de Casitagua · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Ejecutor previsto: Claude Sonnet** (subagentes con `model: "sonnet"`, o una sesión Sonnet con executing-plans).
> Requiere las fases 1 y 2 (la 3 no). Antes de cada tarea: `source scripts/entorno.sh`. Rama `embalses`.

**Goal:** La opción «Incendios» muestra Casitagua con sus cuatro partes: datos, lo que ve el satélite, simular
(modelo de incendio de demostración colocado en Casitagua) e impactos estimados (superficie quemada por
cobertura, biomasa perdida, emisiones, calidad del aire y clima).

**Architecture:** La preparación añade la cobertura ESA WorldCover recortada a Casitagua. El módulo
`datos/lecciones/impacto_incendio.py` calcula los impactos desde una máscara de quemado (real del equipo, del
sustituto o de una simulación) y la cobertura. Ruta GET precalculable. La simulación reutiliza `simular` del
contrato a través del `SustitutoIncendio`.

**Tech Stack:** rasterio (solo preparación), numpy, pydantic, React.

**Spec:** `docs/superpowers/specs/2026-11-14-embalses-incendios-design.md` (§5 incendio, §8 «Impactos de
incendio» y «Simulación de incendio»).

## Global Constraints

- Incendio de Casitagua: **17 de septiembre de 2026** (dato del equipo). La app lo nombra con fecha solo si
  `fichas.json` tiene un evento con fuente publicada (fase 2, Tarea 1). Sin fuente: «incendio de septiembre de 2026
  en el Casitagua (fuente por añadir)» y se anota como bloqueante de la integración en `main`.
- Densidades de biomasa, fracción de combustión y factores de emisión: cada uno con cita (autor, año, URL) en
  `fichas.json` → `factores_incendio`; sin cita, `valor: null` y la parte correspondiente dice «por confirmar».
- Todo impacto es **estimación ilustrativa**: se rotula así, con su fórmula visible en un «¿Cómo se calcula?».
- No se modela dispersión de humo: la calidad del aire se presenta como masa emitida de PM2.5 y CO y una lectura
  cualitativa, nunca como concentración en una ciudad.
- Cobertura: ESA WorldCover (CC BY 4.0) con atribución en la interfaz y en `CREDITOS.md`.
- Presupuesto ≤ 10 MB de derivados sigue vigente; disco ≤ 10 GB, una descarga a la vez.

## Review Focus

1. Máscara de quemado sobre píxeles de agua o urbanos de WorldCover: no suman biomasa (densidad 0) → Tarea 2.
2. Sin datos reales del equipo: los impactos salen del sustituto, rotulados sintéticos → Tarea 2.
3. Factor de emisión sin cita: la emisión de ese gas no se muestra (no un 0) → Tarea 2.
4. Simulación con id derivado caducado: el impacto se recalcula sin 404 → Tarea 3.
5. Casitagua cruza el borde de una tesela de WorldCover o del DEM: el recorte usa todas las teselas necesarias →
   Tarea 1.

---

### Task 1: Cobertura WorldCover en la preparación

**Files:**
- Create: `preparacion/cobertura.py`
- Modify: `scripts/preparar_embalses.py` (paso de cobertura para sitios `incendio`), `preparacion/salida.py`
  (`cobertura.npz` y su entrada en `sitio.json`: `"cobertura": "cobertura.npz"`)
- Test: `tests/preparacion/test_cobertura.py`

**Interfaces:**
- Produces:
  - `cobertura.teselas_worldcover(bbox) -> list[str]`: URLs de ESA WorldCover 2021 v200 en AWS
    (`https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{N|S}{lat:02d}{E|W}{lon:03d}_Map.tif`,
    teselas de 3° nombradas por la esquina suroeste múltiplo de 3). **Verificar con HEAD** antes de implementar; si
    no responde 200, buscar el formato vigente en `https://registry.opendata.aws/esa-worldcover-vito/`, usarlo y
    anotar URL y fecha en `INFORME.md`.
  - `cobertura.cobertura_en_rejilla(bbox, destino: Rejilla, crudo: Path) -> np.ndarray[uint8]` (moda al reducir;
    clases WorldCover 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100; 0 sin dato).
  - `cobertura.npz`: `cobertura` uint8 en la rejilla de derivados.
- [ ] **Step 1: Tests que fallan:** `test_teselas_worldcover_casitagua` (bbox de Casitagua → una URL con
  `S03W081`; ajustar la expectativa si la verificación del formato dice otra cosa) y
  `test_bbox_entre_dos_teselas` (bbox que cruza lon −78 → 2 URLs).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `python -m pytest tests -q` PASS.
- [ ] **Step 5:** `python scripts/preparar_embalses.py --sitio casitagua`; test de presupuesto PASS.
- [ ] **Step 6: Commit** `feat(preparacion): cobertura ESA WorldCover para Casitagua`

---

### Task 2: Cálculo de impactos del incendio

**Files:**
- Create: `datos/lecciones/impacto_incendio.py`
- Modify: `datos/lecciones/fichas.json` (`factores_incendio`), `datos/lecciones/fichas.py`
- Test: `tests/datos/test_impacto_incendio.py`

**Interfaces:**
- Produces:
  - `fichas.json` → `factores_incendio`: `biomasa_t_ha` por clase WorldCover (10 árboles, 20 matorral,
    30 herbazal, 40 cultivo; 50 urbano, 60 suelo desnudo, 80 agua = 0), `fraccion_combustion` por clase,
    `ef_g_kg` para `CO2`, `CO`, `PM2.5` (factores de emisión por kg de materia seca quemada; buscar fuente
    reconocida, p. ej. la compilación de Andreae 2019 en *Atmospheric Chemistry and Physics*, con URL; cada valor
    como `Cifra`), `carbono_fraccion` (para CO₂ equivalente) y equivalencias comprensibles (p. ej. emisiones anuales
    de un auto promedio; solo con fuente).
  - `class ImpactoIncendio(BaseModel)`: `superficie_ha: float`, `por_cobertura: list[FilaCobertura]`
    (`clase`, `ha`, `biomasa_t`), `biomasa_t: float`, `emisiones_t: dict[str, float | None]` (None si falta el
    factor), `equivalencias: list[TextoClave]`, `calidad_aire: TextoClave` (lectura cualitativa por toneladas de
    PM2.5 con umbrales marcados ilustrativos en `fichas.json`), `formulas: list[TextoClave]`, `origen: Origen`.
  - `def impacto_incendio(quemado: np.ndarray[bool], cobertura: np.ndarray[uint8], area_px_ha: float,
    factores: FactoresIncendio, origen: Origen) -> ImpactoIncendio`:
    `biomasa = Σ_clase ha·biomasa_t_ha·fraccion_combustion`; `emisión_gas = biomasa·1000·ef_g_kg/1e6` (t).
- [ ] **Step 1: Tests que fallan:** `test_agua_y_urbano_no_suman_biomasa`, `test_emision_sin_factor_es_none`,
  `test_formula_biomasa` (10 ha de árboles con 100 t/ha y fracción 0,5 → 500 t), `test_origen_se_hereda`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `python -m pytest tests -q` PASS.
- [ ] **Step 5: Commit** `feat(lecciones): impactos estimados del incendio (biomasa, emisiones, aire)`

---

### Task 3: Ruta de impactos y simulación en Casitagua

**Files:**
- Modify: `api/rutas/lecciones.py`, `api/schemas_lecciones.py`, `datos/claves.py` + `api/claves.json`, OpenAPI y
  tipos; `datos/proveedores/sustituto.py` y `datos/proveedores/mixto.py` si `simular` no llega al sustituto
- Test: `tests/api/test_lecciones_incendio.py`

**Interfaces:**
- Consumes: `ProveedorMixto.cambio` (clasificación de la pareja), `cobertura.npz`, `impacto_incendio`.
- Produces:
  - `GET /api/lecciones/incendios/{escenario_id}/impacto?antes=…&despues=…` → `ImpactoIncendioDto`.
    `escenario_id` puede ser `incendio-casitagua` o un id simulado (`…~huella`). Quemado = códigos de la
    clasificación cuya etiqueta es «Quemado nuevo» (derivados) o está en `datos.impacto.AFECTADO["incendio"]`
    (demo/sustituto), remuestreados a la rejilla de la cobertura si difieren (vecino más cercano).
  - `simular("incendio-casitagua", parametros)` vía mixto → sustituto → demo con `lat`/`lon` de Casitagua
    añadidos; devuelve un `Escenario` con `sitio="casitagua"` y un id derivado estable. Los controles son los del
    tipo `incendios` de `GET /api/tipos`.
- [ ] **Step 1: Tests que fallan:** `test_impacto_casitagua_200`, `test_impacto_sobre_simulado`,
  `test_impacto_id_caducado_se_recalcula` (vaciar la LRU del demo entre llamadas), `test_impacto_sin_cobertura_503`
  (raíz sin `cobertura.npz` → 503 legible).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `python -m pytest tests -q` PASS.
- [ ] **Step 5: Commit** `feat(api): impactos y simulación del incendio de Casitagua`

---

### Task 4: Opción «Incendios» en la página

**Files:**
- Create: `frontend/src/pantallas/lecciones/ParteSimularIncendio.tsx`, `ImpactosIncendio.tsx`,
  `incendio.test.tsx`
- Modify: `Lecciones.tsx`, `frontend/src/api/lecciones.ts` (`useImpactoIncendio`), contenido
  `contenido/incendios.{es,en,qu}.ts`, catálogos

**Interfaces:**
- Consumes: partes genéricas de la fase 2 (`ParteDatos`, `ParteSatelite`), `useTipos()` (controles del tipo
  `incendios`; reutilizar el renderizado de controles de `pantallas/observatorio/PanelSimulacion.tsx` extrayéndolo a
  un componente compartido si hace falta), `useSimular`.
- Produces: Datos (ficha, lluvia previa de POWER y meses secos antes del 17 sep), Satélite (HV antes/después —en
  banda L el bosque quemado pierde retrodispersión en HV—, clasificación de quemado), Simular (controles del modelo
  de incendio; resultado en el mapa), Impactos (superficie por cobertura, biomasa, emisiones, calidad del aire,
  clima; «¿Cómo se calcula?» con las fórmulas y las citas; atribución de WorldCover).
- [ ] **Step 1: Tests que fallan:** `muestra «por confirmar» si falta un factor`, `sin fuente del evento no muestra
  la fecha como evento confirmado`, `al simular, los impactos usan el escenario simulado`, `atribución WorldCover
  visible`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm test && npm run lint` PASS.
- [ ] **Step 5: Commit** `feat(lecciones): incendio de Casitagua con simulación e impactos`

---

### Task 5: Verificación de la fase

- [ ] e2e: `?leccion=incendios` carga; simular cambia la superficie quemada y los impactos.
- [ ] `python -m pytest tests -q`, `cd frontend && npm test && npm run lint && npx playwright test` → PASS.
- [ ] Revisión visual de `/?leccion=incendios` a tres anchos (Taste Skill, hasta tres rondas).
- [ ] `bash scripts/construir_pages.sh` + e2e de Pages → PASS.
- [ ] `INFORME.md` y `docs/retomar.md`. **Commit** `test(lecciones): verificación del incendio de Casitagua`
