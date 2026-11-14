# Fase 2 — Página de lecciones: embalses (sin simulación) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Ejecutor previsto: Claude Sonnet** (subagentes con `model: "sonnet"`, o una sesión Sonnet con executing-plans).
> Requiere la **fase 1 terminada** (`docs/superpowers/plans/2026-11-14-fase1-datos-embalses.md`).
> Antes de cada tarea: `source scripts/entorno.sh`. Rama `embalses`. Un commit por tarea.

**Goal:** La portada `/` pasa a ser la página de lecciones con dos opciones (Embalses y lluvia | Incendios); la
opción de embalses muestra Mazar, Daule-Peripa y su comparación con las partes Datos, Lo que ve el satélite e
Impactos observados.

**Architecture:** Backend: módulo `datos/lecciones/` (fichas estáticas y comparación) con rutas
`api/rutas/lecciones.py` (GET, sin estado, precalculables). Frontend: pantalla `pantallas/lecciones/` que reutiliza
`Comparador`, `CintaPasadas`, `SelloOrigen`, `BandaDemostracion`, `Termino`, gráficos y `useContexto`. Las capas y
el cambio entre fechas siguen pasando por el contrato (`/api/escenarios/...`).

**Tech Stack:** FastAPI, pydantic 2; React 18, TypeScript estricto, TanStack Query, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-14-embalses-incendios-design.md` (§8 fichas y comparación, §9 interfaz).

## Global Constraints

- Todo lo de la fase 1 sigue valiendo (honestidad, Pyodide, presupuesto).
- Nada de lógica científica en el frontend: superficies, variaciones, «en común/diferencias» y orilla expuesta se
  calculan en Python; el frontend solo los muestra.
- `docs/diseno.md` manda en lo visual; colores de `frontend/src/diseno/tokens.css` y rampas de
  `frontend/src/diseno/rampas.ts`. Pantalla nueva → Taste Skill (`design-taste-frontend`, camino de apps:
  `lint.mjs --app`, `inspect.mjs --app`). Revisión visual: `bash scripts/revision_visual.sh / lecciones` a 1440,
  768 y 390; máximo tres rondas; capturas en `docs/capturas-nuevas/lecciones/`.
- Textos en es, en y qu (kichwa marcado sin validar como el resto); términos técnicos con `Termino`.
- **Cifras de las fichas:** cada una con `fuente` (URL + fecha de consulta) o `valor: null` con la marca
  «por confirmar con fuente». No se inventan cifras. Un evento real (p. ej. cortes de luz de 2024) solo se nombra con
  fuente en `fichas.json`.
- La banda «DATOS DE DEMOSTRACIÓN» se ve cuando cualquier escenario en pantalla es sintético (sustitutos incluidos).
- Estado en la URL: `?leccion=embalses|incendios&sitio=mazar|daule-peripa|comparar|casitagua`.

## Review Focus

1. Sitio con una sola fecha real (Mazar hoy): la parte del satélite muestra esa fecha y un aviso «falta la segunda
   fecha» en lugar del comparador; nunca un error rojo → test en Tarea 4.
2. Mezcla real + sustituto en la comparación (Mazar real, Daule-Peripa sustituto): cada columna lleva su sello de
   origen y la banda de demostración está visible → test en Tarea 5.
3. Ficha con cifra sin fuente: se muestra «por confirmar», no un número → test en Tarea 1 (backend) y Tarea 3.
4. URL con `sitio` inválido o de la otra lección (`?leccion=embalses&sitio=casitagua`): cae al primer sitio de la
   lección → test en Tarea 3.
5. Móvil 390 px: selector de lección y de sitio sin desbordar; comparador usable → revisión visual de la Tarea 6.

---

### Task 1: Fichas de los sitios

**Files:**
- Create: `datos/lecciones/__init__.py`, `datos/lecciones/fichas.json`, `datos/lecciones/fichas.py`
- Modify: `scripts/empaquetar_app.py` (incluir `datos/**/*.json`), `tests/motor/test_empaquetar_app.py`
- Test: `tests/datos/test_fichas.py`

**Interfaces:**
- Produces:
  - `class Cifra(BaseModel)`: `clave: str`, `valor: float | None`, `unidad: str`, `fuente: str | None`,
    `url: str | None`, `consultado: date | None`, `ilustrativo: bool = False`. Validador: `valor` no nulo exige
    `fuente` y `url`, o `ilustrativo=True`.
  - `class Ficha(BaseModel)`: `sitio: str`, `tipo: Literal["embalse","incendio"]`, `nombre: str`, `region: str`,
    `rio: str | None`, `usos: list[str]` (claves: `hidroelectrica`, `riego`, `agua_potable`, `control_crecidas`),
    `cifras: list[Cifra]`, `eventos: list[Evento]` (`Evento`: `fecha: date`, `clave: str`, `fuente: str`,
    `url: str` — obligatorios), `hidro: dict | None` (parámetros de la fase 3; aquí vacío).
  - `def fichas() -> dict[str, Ficha]` (lee `fichas.json` junto al módulo; `functools.cache`).
  - Cifras de embalse: `capacidad_hm3`, `potencia_mw`, `area_cuenca_km2`, `cota_maxima_msnm`,
    `cota_minima_operacion_msnm`, `superficie_maxima_km2`. Incendio: `superficie_reportada_ha`.
- [ ] **Step 1: Test que falla** (`tests/datos/test_fichas.py`): `test_cifra_con_valor_exige_fuente`,
  `test_fichas_tres_sitios` (claves `mazar`, `daule-peripa`, `casitagua`), `test_evento_exige_fuente`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar.
- [ ] **Step 4: Rellenar `fichas.json` con fuentes.** Buscar en la web (WebSearch, modo standard; varias en
  paralelo) fuentes oficiales o de prensa seria (CELEC EP, ARCONEL/ARCERNNR, SENAGUA, informes técnicos): para
  cada cifra, `fuente`, `url` y `consultado = 2026-11-14` (o la fecha del día). **Si no hay fuente fiable, `valor:
  null`.** Casitagua: evento `2026-09-17`, clave `incendio_casitagua_2026` **solo si** se encuentra una fuente
  publicada; si no, no se añade el evento y se anota en `INFORME.md`. Usos de cada embalse: solo los que diga una
  fuente; si no, lista vacía.
- [ ] **Step 5:** `python -m pytest tests -q` → PASS.
- [ ] **Step 6: Commit** `feat(lecciones): fichas de Mazar, Daule-Peripa y Casitagua con fuentes`

---

### Task 2: Comparación de embalses y rutas de lecciones

**Files:**
- Create: `datos/lecciones/comparacion.py`, `api/rutas/lecciones.py`, `api/schemas_lecciones.py`
- Modify: `api/app.py` (registrar el router), `datos/claves.py` + `api/claves.json`
  (`python scripts/exportar_claves_api.py`), OpenAPI y tipos del frontend
  (`python scripts/exportar_openapi.py && cd frontend && npm run tipos`)
- Test: `tests/datos/test_comparacion.py`, `tests/api/test_lecciones.py`

**Interfaces:**
- Consumes: `ProveedorDatos` (con `serie_superficie` opcional: en `ProveedorDerivados`, en los sustitutos y
  delegado por `ProveedorMixto`; **si la fase 1 no lo expuso en sustitutos y mixto, añadirlo aquí**),
  `fichas()`, `modelo.estaciones.climatologia(lat, lon)` (`.prec_mm_mes`, 12 valores) y
  `estaciones.regimen_lluvias(clim)`.
- Produces:
  - `comparar_embalses(prov: ProveedorDatos, sitios: list[str]) -> Comparacion` con, por sitio
    (`ResumenEmbalse`): `escenario_id`, `origen` (`Origen`), `superficie` (`SerieTemporal`),
    `variacion_km2: float | None`, `variacion_pct: float | None` (primera → última fecha; `None` con < 2),
    `orilla_expuesta_km2: float | None` (máxima observada − última), `lluvia_mm_mes: list[float]` (12),
    `regimen: str` (texto de `regimen_lluvias`, con `TextoClave`), `region_natural: str`; y a nivel global:
    `en_comun: list[TextoClave]`, `diferencias: list[TextoClave]`. Reglas (en Python, con claves en
    `datos/claves.py`): mismo/distinto régimen de lluvias; mes más lluvioso de cada uno; mayor variación relativa;
    usos compartidos o no (de las fichas); región (Sierra/Costa) por `estaciones.region_natural`.
  - Rutas (prefijo `/api/lecciones`):
    - `GET /fichas` → `list[FichaDto]` (Ficha tal cual).
    - `GET /embalses/comparacion?sitios=mazar,daule-peripa` → `ComparacionDto`. Sitio desconocido → 404 con
      clave `api.error.sitio_desconocido`.
- [ ] **Step 1: Tests que fallan:**
  - `test_comparacion_con_una_fecha_sin_variacion`: escenario con una fecha → `variacion_km2 is None`.
  - `test_orilla_expuesta`: superficies 7,0 → 5,6 km² → `orilla_expuesta_km2 == 1.4` (± 1e-9).
  - `test_regimen_distinto_va_a_diferencias`: climatologías unimodal vs bimodal simuladas (monkeypatch) → una
    `TextoClave` de régimen en `diferencias`.
  - `test_ruta_comparacion_200_y_404` en `tests/api/test_lecciones.py` (con `ProveedorMixto` sobre la raíz de
    prueba de la fase 1).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `python -m pytest tests -q` PASS.
- [ ] **Step 5: Commit** `feat(lecciones): comparación de embalses y rutas /api/lecciones`

---

### Task 3: Estructura de la página de lecciones y navegación

**Files:**
- Create: `frontend/src/pantallas/lecciones/Lecciones.tsx`, `SelectorLeccion.tsx`, `SelectorSitio.tsx`,
  `lecciones.css`, `lecciones.test.tsx`
- Create: `frontend/src/api/lecciones.ts` (`useFichas()`, `useComparacion(sitios: string[])`, tipos desde el
  esquema generado)
- Create: `frontend/src/idioma/catalogos/{es,en,qu}/lecciones.ts` y registrarlos en cada `index.ts`
- Modify: `frontend/src/App.tsx` (índice `/` → `Lecciones`; `Historias` pasa a `/historias` hasta la fase 5),
  `frontend/src/diseno/Estructura.tsx` (riel: «Lecciones» en `/`, «Historias» en `/historias`),
  `frontend/scripts/precalcular.mts` (visitar `/`, `/?leccion=embalses&sitio=daule-peripa`,
  `/?leccion=embalses&sitio=comparar`, `/?leccion=incendios`, `/historias`, `/historias?historia=incendio`)

**Interfaces:**
- Consumes: `useEscenarios()` (escenarios con `sitio`), `useFichas()`.
- Produces: `Lecciones` (default export, ruta `/`); esquema de URL con `useEstadoUrl`:
  `leccion: enum ['embalses','incendios'] = 'embalses'`, `sitio: string` validado contra los sitios de la lección
  (embalses: `mazar`, `daule-peripa`, `comparar`; incendios: `casitagua`; inválido → primero de la lección).
  Componentes de partes que recibe la página (Tareas 4 y 5): `ParteDatos`, `ParteSatelite`, `ParteImpactos`,
  `ComparacionEmbalses`, con props `{ esc: Escenario; ficha: Ficha }` (la comparación: `{ sitios: string[] }`).
- [ ] **Step 1: Tests que fallan** (`lecciones.test.tsx`, con los ayudantes de prueba existentes —ver
  `historias.test.tsx` para el patrón de mocks de la API):
  - `muestra las dos lecciones y marca embalses por defecto`.
  - `sitio inválido cae al primero de la lección` (`?leccion=embalses&sitio=casitagua` → Mazar activo).
  - `cambiar de lección conserva la URL coherente`.
- [ ] **Step 2:** `cd frontend && npx vitest run src/pantallas/lecciones` → FAIL.
- [ ] **Step 3:** Implementar la estructura con huecos para las partes (los componentes de la Tarea 4 pueden
  empezar como placeholders internos de este archivo y moverse en la Tarea 4). Textos en los tres catálogos.
- [ ] **Step 4:** `npm test && npm run lint` → PASS; `npx playwright test` → PASS (corregir pruebas que asumían
  Historias en `/`, apuntándolas a `/historias`).
- [ ] **Step 5: Commit** `feat(frontend): página de lecciones en la portada; historias pasan a /historias`

---

### Task 4: Partes Datos, Lo que ve el satélite e Impactos observados

**Files:**
- Create: `frontend/src/pantallas/lecciones/ParteDatos.tsx`, `ParteSatelite.tsx`, `ParteImpactos.tsx`,
  `FichaSitio.tsx`, `partes.test.tsx`
- Create: `frontend/src/pantallas/lecciones/contenido/{embalses,incendios}.{es,en,qu}.ts` y `contenido/tipos.ts`
  (texto didáctico de cada parte, con `Parrafo`/`Termino` como en `historias/contenido`)

**Interfaces:**
- Consumes: `useCambio`, `useCapa`, `useContexto`, `CintaPasadas`, `Comparador`, `SelloOrigen`, `useComparacion`.
- Produces:
  - `ParteDatos`: ficha (cifras con fuente enlazada o «por confirmar»), lluvia mensual (gráfico existente de
    contexto/clima), superficie por fecha (serie del escenario); cada bloque con su `SelloOrigen`.
  - `ParteSatelite`: con ≥ 2 adquisiciones → cinta + comparador HH/HV (o máscara si no hay stack) + capa de
    clasificación (agua persistente/ganada/perdida) con leyenda; con 1 → la capa de esa fecha y el aviso
    `lecciones.satelite.falta_segunda_fecha`. Texto «qué ve el radar»: el agua en calma es oscura en banda L. Las variables salen de `esc.variables` (`gamma0` en datos reales,
    `sigma0` en demo): **no fijar `'sigma0'`** como hace `historias/Historia.tsx`.
  - `ParteImpactos` (observados): variación de superficie y orilla expuesta (de `useComparacion([sitio])`), usos
    del embalse (ficha) y, si la ficha tiene eventos con fuente, su mención con enlace. La energía y la seguridad
    eléctrica llegan en la fase 3: hasta entonces la tarjeta dice que se exploran en «Simular».
- [ ] **Step 1: Tests que fallan** (`partes.test.tsx`):
  - `con una sola fecha muestra el aviso y no el comparador`.
  - `cifra sin fuente se muestra como por confirmar`.
  - `cada bloque lleva su sello de origen`.
  - `sustituto sintético muestra la banda de demostración`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm test && npm run lint` PASS.
- [ ] **Step 5: Commit** `feat(lecciones): partes de datos, satélite e impactos observados`

---

### Task 5: Comparación Mazar – Daule-Peripa

**Files:**
- Create: `frontend/src/pantallas/lecciones/ComparacionEmbalses.tsx`, `comparacion.test.tsx`

**Interfaces:**
- Consumes: `useComparacion(['mazar','daule-peripa'])`, `TextoApi`/`clavesApi` para `TextoClave`.
- Produces: vista `sitio=comparar`: dos columnas (una por embalse; apiladas en móvil) con superficie por fecha,
  variación, lluvia mensual en la misma escala y su sello de origen; debajo, «En común» y «Diferencias» (listas de
  `TextoClave` traducidas).
- [ ] **Step 1: Tests que fallan:** `muestra en común y diferencias traducidas`, `cada columna lleva su origen`,
  `con un sustituto aparece la banda de demostración`, `lluvia en la misma escala` (mismo `max` de eje en ambos
  gráficos).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm test && npm run lint` PASS.
- [ ] **Step 5: Commit** `feat(lecciones): comparación de Mazar y Daule-Peripa`

---

### Task 6: Revisión visual, e2e y Pages

**Files:**
- Create: `frontend/e2e/lecciones.spec.ts`
- Modify: `INFORME.md`, `docs/retomar.md`

- [ ] **Step 1:** e2e `lecciones.spec.ts`: portada carga embalses/Mazar; cambio a Daule-Peripa y a comparar;
  cambio a incendios; la banda de demostración visible si hay sustitutos; sin errores de consola.
- [ ] **Step 2:** `cd frontend && npx playwright test` → PASS.
- [ ] **Step 3:** Taste Skill (camino de apps) y `bash scripts/revision_visual.sh / lecciones`,
  `bash scripts/revision_visual.sh "/?leccion=embalses&sitio=comparar" lecciones-comparar`; revisar las capturas a
  1440/768/390 contra `docs/diseno.md` §12 (anti-slop) y §13; hasta tres rondas de corrección; lo pendiente a
  `INFORME.md`.
- [ ] **Step 4:** `bash scripts/construir_pages.sh` y `cd frontend && npx playwright test -c playwright.pages.config.ts`
  → PASS.
- [ ] **Step 5:** Actualizar `docs/retomar.md` e `INFORME.md`.
- [ ] **Step 6: Commit** `test(lecciones): e2e y revisión visual de la página de embalses`
