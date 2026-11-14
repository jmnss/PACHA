# Fase 5 — «Cómo lo hacemos», navegación y cierre · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Ejecutor previsto: Claude Sonnet** (subagentes con `model: "sonnet"`, o una sesión Sonnet con executing-plans).
> Requiere las fases 1–4. Antes de cada tarea: `source scripts/entorno.sh`. Rama `embalses`.

**Goal:** Un apartado didáctico que explica qué es un SAR, qué es NISAR, qué datos usamos, cómo los procesamos y
para qué sirve; la navegación reorganizada (Lecciones primero, escenarios de demostración como material de apoyo);
y la app lista para integrarse.

**Architecture:** Se amplía `pantallas/fundamentos/` (contenido es/en/qu tipado) con nuevas secciones; el método
del equipo se lee de la procedencia servida por la API, no se escribe a mano. Se retiran las historias anteriores.

**Tech Stack:** React, TypeScript, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-14-embalses-incendios-design.md` (§9 «Cómo lo hacemos» y navegación;
§2 objetivo 6).

## Global Constraints

- Sobre NISAR solo se afirma lo que está en `docs/nisar-verificado.md`; lo demás lleva «pendiente de confirmar con
  la documentación oficial» (regla 6).
- El método de segmentación se muestra desde `origen.procedencia.metodo` de los escenarios reales; si no hay datos
  reales, se dice que el equipo aún no ha entregado la procedencia.
- Lectores: público amplio, educadores, gestores y científicos (challenge). Lenguaje llano y `Termino` para cada
  término técnico.
- **Nada se integra en `main` ni se hace `git push` sin permiso del usuario.**

## Review Focus

1. Enlace antiguo a `/?historia=incendio` o `/?historia=inundacion` (compartido antes): debe llevar a la lección
   equivalente (`?leccion=incendios` / `?leccion=embalses`), no a una página vacía → Tarea 2.
2. Sin datos reales: «Cómo lo hacemos» no inventa el método → Tarea 1.
3. Kichwa: textos nuevos presentes y marcados sin validar (export CSV de revisión actualizado) → Tarea 1.
4. Móvil: el riel con el grupo «Más escenarios» no desborda a 390 px → Tarea 2.
5. `fuente por añadir` olvidado en algún texto antes de integrar → Tarea 3 (lista de comprobación).

---

### Task 1: «Cómo lo hacemos»

**Files:**
- Modify: `frontend/src/pantallas/fundamentos/contenido.tipos.ts`, `contenido.{es,en,qu}.ts`, `Fundamentos.tsx`,
  `fundamentos.css`, `fundamentos.test.tsx`; catálogos `fundamentos.ts` (es/en/qu)

**Interfaces:**
- Consumes: `useEscenarios()` (escenarios con `sitio` y `origen.procedencia`), `useFichas()`.
- Produces: `ContenidoFundamentos` gana: `queEsSar: Parrafo[]` (radar activo, ve de día y de noche y a través de
  nubes; banda L y por qué atraviesa vegetación), `nisar: Parrafo[]` (solo lo verificado),
  `queUsamos: Parrafo[]` (producto GCOV, HH y HV, por qué estas polarizaciones para agua y para bosque quemado),
  `comoLoHacemos: Paso[]` (`Paso = { titulo: string; texto: Parrafo }`: 1 descarga del granulo, 2 recorte y dB,
  3 segmentación supervisada del equipo, 4 preparación de derivados, 5 la app compara fechas y simula),
  `paraQue: Parrafo[]` (gestión de embalses y energía, alerta de incendios, educación). La sección «Nuestro método»
  muestra `metodo.nombre`, `metodo.clases` y el `autor` de cada sitio real, o el aviso si no hay.
  Título visible del apartado y del riel: «Cómo lo hacemos» (la ruta sigue siendo `/fundamentos`).
- [ ] **Step 1: Tests que fallan:** `muestra las cinco secciones nuevas en los tres idiomas`,
  `el método sale de la procedencia`, `sin datos reales muestra el aviso y no un método`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar; `node scripts/traducciones_csv.mjs exportar` para el CSV de
  kichwa → **Step 4:** `npm test && npm run lint` PASS.
- [ ] **Step 5: Commit** `feat(fundamentos): apartado «Cómo lo hacemos» (SAR, NISAR, método y usos)`

---

### Task 2: Navegación y retiro de las historias anteriores

**Files:**
- Modify: `frontend/src/App.tsx`, `frontend/src/diseno/Estructura.tsx`, catálogos `estructura.ts`,
  `frontend/scripts/precalcular.mts`, `frontend/src/pantallas/recorrido/guion.{es,en,qu}.ts`, `Recorrido.tsx`
- Delete: `frontend/src/pantallas/historias/` (antes, mover a `pantallas/lecciones/` lo que la página de lecciones
  importe de ahí, p. ej. `pareja.ts`, con sus pruebas)
- Modify: pruebas e2e que visiten `/historias`
- Test: `frontend/src/diseno/estructura-idioma.test.tsx`, `frontend/src/pantallas/lecciones/lecciones.test.tsx`

**Interfaces:**
- Produces: riel en este orden: Lecciones (`/`), Cómo lo hacemos (`/fundamentos`), Recorrido (`/recorrido`), y un
  grupo «Más escenarios para aprender» con Observatorio, Laboratorio y Simulador. Redirección en `Lecciones`:
  `?historia=incendio` → `?leccion=incendios`; `?historia=inundacion` → `?leccion=embalses` (con `replace`). El
  guion del Recorrido recorre la lección de embalses (Mazar: datos → satélite → simular → impactos) y termina en
  «Cómo lo hacemos».
- [ ] **Step 1: Tests que fallan:** `redirige ?historia=incendio a la lección de incendios`, `el riel tiene el grupo
  Más escenarios`, `el recorrido empieza en la lección de embalses`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** `npm test && npm run lint && npx playwright test`
  PASS.
- [ ] **Step 5:** Revisión visual del riel a 1440/768/390 (`bash scripts/revision_visual.sh / navegacion`).
- [ ] **Step 6: Commit** `feat(frontend): navegación centrada en lecciones; se retiran las historias anteriores`

---

### Task 3: Cierre y preparación para integrar

**Files:**
- Modify: `README.md`, `CREDITOS.md` (Copernicus DEM GLO-30 —atribución de la licencia de Copernicus—, ESA
  WorldCover CC BY 4.0, NASA POWER, NISAR/ASF DAAC, datos y método del equipo), `docs/retomar.md`, `INFORME.md`,
  `docs/challenge.md` (solo si la entrega lo pide), `CLAUDE.md` (sección «Foco actual» y arquitectura:
  `datos/lecciones/`, `preparacion/`, `NISAR_PROVEEDOR=mixto`)

- [ ] **Step 1:** Lista de comprobación (cada punto con el comando o la búsqueda que lo demuestra):
  - `grep -rn "fuente por añadir" frontend/src datos` → vacío, o el usuario acepta lo que quede.
  - Toda capa real tiene procedencia completa (`python -m pytest tests -q` con la conformidad).
  - La banda de demostración aparece en toda vista con algo sintético (e2e).
  - Presupuesto de derivados ≤ 10 MB (test) y tamaño de `dist-pages` anotado.
- [ ] **Step 2:** Verificación completa: `python -m pytest tests -q`,
  `python -m unittest modelo.clima modelo.desastres`, `cd frontend && npm test && npm run lint && npm run build`,
  `npx playwright test`, `bash scripts/construir_pages.sh`,
  `npx playwright test -c playwright.pages.config.ts` → todo PASS; pegar el resumen en `INFORME.md`.
- [ ] **Step 3:** README (qué es, las dos lecciones, cómo correr, cómo preparar datos del equipo con
  `scripts/preparar_embalses.py`), CREDITOS, `docs/retomar.md`, `CLAUDE.md`.
- [ ] **Step 4: Commit** `docs: cierre de embalses e incendios (README, créditos, estado)`
- [ ] **Step 5:** Invocar `superpowers:finishing-a-development-branch` y **preguntar al usuario** antes de
  integrar en `main` (cada push a `main` publica la app).
