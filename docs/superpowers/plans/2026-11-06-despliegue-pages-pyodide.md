# Despliegue en GitHub Pages con la API en el navegador — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** publicar NISAR · Ecuador como sitio estático en `https://jmnss.github.io/NISAR-Ecuador/`, con la API Python
ejecutándose en el navegador (Pyodide en un Web Worker) y respuestas precalculadas para la primera impresión.

**Architecture:** `llamar()` usa un *transporte*: `fetch` en modo `servidor` (hoy, por defecto) o, en modo `navegador`,
primero el precálculo (`precalculado/<sha256>.json`) y si no, el motor (Pyodide ejecuta `create_app()` como app ASGI).
Una GitHub Action graba el precálculo contra `python servidor.py`, empaqueta el motor autoalojado y publica en Pages.

**Tech Stack:** Pyodide 314.0.7 (Python 3.14) · FastAPI · React 18 + Vite 5 · Playwright · GitHub Actions (`deploy-pages`).

**Spec:** `docs/superpowers/specs/2026-11-06-despliegue-design.md` (léelo entero antes de empezar).

## Global Constraints

- Primero en cada shell: `source scripts/entorno.sh`. Python es `python` (3.13). Node 22.
- Con `VITE_MOTOR` sin definir, todo se comporta como hoy; las suites de `CLAUDE.md` pasan sin cambiar sus comandos.
- `modelo/`, `app.py`, `interfaz/` no se tocan. `main` no se toca durante la ejecución. Sin `git push`.
- Versión exacta de Pyodide: `314.0.7` (devDependency `"pyodide": "314.0.7"`, sin `^`).
- Base de Pages: `/NISAR-Ecuador/`. URL pública: `https://jmnss.github.io/NISAR-Ecuador/`.
- Paquetes que el motor carga: `['numpy', 'pandas', 'pillow', 'pydantic', 'shapely', 'fastapi']` (el cierre de
  dependencias sale de `pyodide-lock.json`; incluye httpx y jinja2 porque fastapi los declara: se aceptan).
- Red permitida: npm, PyPI y `https://cdn.jsdelivr.net/pyodide/v314.0.7/full/` (descarga verificada con sha256).
  Nada de datos de NISAR.
- Textos nuevos en los tres catálogos (`es`, `en`, `qu`); el kichwa es borrador sin validar (no se añade a
  `validadas.ts`). Tras tocar catálogos: `node scripts/traducciones_csv.mjs exportar`.
- Colores, tamaños y radios solo de `frontend/src/diseno/tokens.css`; `docs/diseno.md §12` es obligatorio.
- Un commit por tarea con el mensaje indicado y la línea `Co-Authored-By` del entorno; pruebas, lint y build en
  verde antes de cada commit.

### Desviaciones del spec ya decididas (no reabrir)

1. Las claves de texto nuevas van al área `estructura` (`estructura.motor.*`), no a `api.error.*`: las claves `api.*`
   reflejan `api/claves.json`, que genera el servidor.
2. Los scripts de Node viven en `frontend/scripts/` (no en `scripts/`) para resolver `node_modules` del frontend:
   `frontend/scripts/empaquetar_motor.mjs` y `frontend/scripts/precalcular.mts` (Node 22 ejecuta `.mts` con
   eliminación de tipos). `scripts/empaquetar_app.py` y `scripts/construir_pages.sh` siguen en la raíz.
3. Las e2e del modo Pages usan su propia configuración `frontend/playwright.pages.config.ts` (comando
   `npx playwright test -c playwright.pages.config.ts`), porque `playwright.config.ts` arranca sus servidores para
   cualquier proyecto.
4. El precálculo graba los seis escenarios en las vistas mapa, comparar y serie (impacto solo los dos con
   historia): coste pequeño y el jurado puede elegir cualquiera.

## Review Focus

1. **Mismo pedido, otro orden de claves o de parámetros** (`?pol=HH&banda=L` frente a `?banda=L&pol=HH`, cuerpo con
   claves en otro orden) debe dar la misma clave de precálculo — Tarea 4.
2. **Varias peticiones mientras el motor carga** (el Observatorio pide escenario, cambio y contexto a la vez) deben
   responderse todas, cada una con su respuesta, sin perder ninguna — Tarea 3.
3. **El motor no puede cargar** (zip 404, WebAssembly no disponible): las peticiones pendientes y futuras terminan en
   un error legible, nunca se quedan colgadas — Tareas 3 y 9.
4. **Enlace profundo con consulta abierto en frío** (`/NISAR-Ecuador/simulador?lat=-4.05&lon=-79.25&dem=0&ext=60&h=incendio&i=64&j=64`)
   recrea el evento — Tarea 9.
5. **Falta el índice del precálculo o una entrada** (despliegue sin precálculo, petición nueva): se usa el motor, sin
   romper nada — Tarea 4.

## Mapa de archivos

```
frontend/src/rutaBase.ts                     conBase()
frontend/src/motor/clave.ts                  claveDePeticion(), hashClave()  (sin dependencias del navegador)
frontend/src/motor/protocolo.ts              tipos de los mensajes cliente ↔ worker
frontend/src/motor/clienteMotor.ts           crearClienteMotor(), motor (instancia), useEstadoMotor()
frontend/src/motor/motor.worker.ts           worker dedicado o compartido: Pyodide + arranque.py
frontend/src/motor/transporte.ts             crearTransporteNavegador(), transporteNavegador
frontend/src/motor/python/arranque.py        parche sin hilos, lifespan, llamar_asgi, iniciar, atender
frontend/src/motor/python/requests_navegador.py  requests mínimo con XHR síncrono, ruta_local()
frontend/src/diseno/AvisoMotor.tsx           aviso «preparando el motor» / «no pudo cargarse»
frontend/scripts/empaquetar_motor.mjs        núcleo Pyodide + librerías verificadas + teselas + manifiesto
frontend/scripts/precalcular.mts             graba las respuestas de la API recorriendo la app
frontend/playwright.pages.config.ts          e2e contra dist-pages bajo /NISAR-Ecuador/
frontend/e2e/pages.spec.ts                   e2e del modo Pages
scripts/empaquetar_app.py                    app-<hash>.zip determinista
scripts/construir_pages.sh                   construcción completa → frontend/dist-pages
.github/workflows/pages.yml                  verificar → construir → publicar
tests/motor/conftest.py, test_arranque.py, test_requests_navegador.py, test_empaquetar_app.py, test_compatibilidad_pyodide.py
```

---

### Task 1: Arranque Python del motor y compatibilidad con Pyodide

**Files:**
- Create: `frontend/src/motor/python/arranque.py`
- Create: `tests/motor/__init__.py`, `tests/motor/conftest.py`, `tests/motor/test_arranque.py`, `tests/motor/test_compatibilidad_pyodide.py`

**Interfaces:**
- Produces (Python, módulo `arranque`):
  - `parchear_sin_hilos() -> None`: sustituye `run_in_threadpool` en `starlette.concurrency`, `fastapi.routing` y
    `fastapi.dependencies.utils` por `async def _en_linea(func, *a, **k): return func(*a, **k)`. Idempotente.
  - `async def arrancar_lifespan(app) -> Callable[[], Awaitable[None]]`: envía `lifespan.startup`, espera
    `lifespan.startup.complete` (falla con `RuntimeError` si llega `lifespan.startup.failed`) y devuelve `detener()`,
    que envía `lifespan.shutdown`.
  - `async def llamar_asgi(app, metodo: str, ruta: str, cuerpo: str | None) -> tuple[int, str]`: `ruta` puede llevar
    `?consulta`; cabeceras `content-type: application/json` y `host: local`; sin `accept-encoding`; devuelve estado y
    cuerpo decodificado en UTF-8.
  - `async def iniciar(proveedor=None) -> None`: idempotente; `parchear_sin_hilos()`, `create_app(proveedor)`,
    `arrancar_lifespan`; guarda la app en un global del módulo.
  - `async def atender(metodo: str, ruta: str, cuerpo: str | None) -> tuple[int, str]`: `llamar_asgi` sobre la app
    de `iniciar` (`RuntimeError("motor no iniciado")` si no se llamó).

- [ ] **Step 1: Write the failing tests**

`tests/motor/conftest.py` añade `frontend/src/motor/python` a `sys.path` (ruta relativa a la raíz del repo).
`tests/motor/test_arranque.py` (cada prueba con `asyncio.run` de una corrutina que arranca, llama y detiene):

```python
def _sin_fechas(x):  # quita "fecha_generacion" a cualquier profundidad (cambia entre llamadas)
    ...

@pytest.mark.parametrize("metodo,ruta,cuerpo", [
    ("GET", "/api/salud", None),
    ("GET", "/api/escenarios", None),
    ("GET", "/api/escenarios/no_existe", None),          # 404 con clave_texto
])
def test_llamar_asgi_igual_que_testclient(cliente_demo, _demo, metodo, ruta, cuerpo): ...
    # mismo estado y _sin_fechas(json) igual que cliente_demo.request(metodo, ruta, json=...)

def test_cambio_y_422_con_clave(cliente_demo, _demo): ...
    # POST /api/escenarios/ec_la_segua/cambio con la primera y la última adquisición → 200 igual que TestClient;
    # con antes == despues → 422 y el JSON trae "clave_texto" igual que TestClient

def test_atender_sin_iniciar_falla(): ...   # RuntimeError("motor no iniciado")

def test_iniciar_es_idempotente(_demo): ... # dos iniciar(_demo) seguidos; atender("GET","/api/salud",None)[0] == 200
```

Reutiliza las fixtures `cliente_demo` y `_demo` de `tests/api/conftest.py`: muévelas a `tests/conftest.py` si pytest
no las ve desde `tests/motor/` (sin cambiar su comportamiento).

`tests/motor/test_compatibilidad_pyodide.py`, con `ast` sobre `api/**/*.py`, `datos/**/*.py`, `modelo/nisar.py`,
`modelo/estaciones.py`, `modelo/desastres.py` y `frontend/src/motor/python/*.py`:

```python
PYODIDE = {"numpy", "pandas", "PIL", "pydantic", "shapely", "fastapi", "starlette"}
SOLO_MOTOR = {"js", "pyodide"}                 # solo en frontend/src/motor/python/
PEREZOSOS = {"requests", "h5py", "pyproj"}     # solo dentro de funciones: requests lo da el shim; h5py/pyproj son
                                               # del lector de datos reales, que el motor no usa
def test_importaciones_de_nivel_de_modulo_existen_en_pyodide(): ...
def test_importaciones_perezosas_conocidas(): ...
```

La primera falla si un `import`/`from` de nivel de módulo (externo: ni stdlib —`sys.stdlib_module_names`— ni
`api`, `datos`, `modelo`, `arranque`, `requests_navegador`) no está en `PYODIDE` (∪ `SOLO_MOTOR` en `motor/python/`).
La segunda, si un import dentro de una función no está en `PYODIDE ∪ PEREZOSOS ∪ SOLO_MOTOR`.

- [ ] **Step 2: Run to verify they fail**

Run: `python -m pytest tests/motor -q`
Expected: FAIL (`ModuleNotFoundError: No module named 'arranque'`); la de compatibilidad puede pasar ya.

- [ ] **Step 3: Implement `frontend/src/motor/python/arranque.py`** con las firmas de Interfaces. El controlador del
lifespan deja la tarea ASGI viva con `asyncio.ensure_future` y una `asyncio.Queue` para los mensajes (como en el spike);
`llamar_asgi` construye un `scope` HTTP 1.1 completo (`raw_path`, `query_string`, `root_path=''`, `client`, `server`,
`state: {}`).

- [ ] **Step 4: Run to verify they pass**

Run: `python -m pytest tests -q && python -m unittest modelo.clima modelo.desastres`
Expected: todo en verde (273 + las nuevas; 13 OK).

- [ ] **Step 5: Commit** — `feat(motor): arranque ASGI sin hilos para ejecutar la API en Pyodide`

---

### Task 2: Ruta base

**Files:**
- Create: `frontend/src/rutaBase.ts`, `frontend/src/rutaBase.test.ts`
- Modify: `frontend/vite.config.ts`, `frontend/src/main.tsx`, `frontend/src/pantallas/recorrido/Recorrido.tsx:70`,
  `frontend/src/pantallas/simulador/ResultadosEvento.tsx:54`

**Interfaces:**
- Produces: `conBase(ruta: string, base: string = import.meta.env.BASE_URL): string` — `base` sin barra final +
  `ruta` (que empieza por `/`).

- [ ] **Step 1: Write the failing test** (`rutaBase.test.ts`)

```ts
expect(conBase('/motor/', '/')).toBe('/motor/')
expect(conBase('/motor/', '/NISAR-Ecuador/')).toBe('/NISAR-Ecuador/motor/')
expect(conBase('/simulador?lat=1', '/NISAR-Ecuador')).toBe('/NISAR-Ecuador/simulador?lat=1')
expect(conBase('/')).toBe('/')            // BASE_URL por defecto en vitest es '/'
```

- [ ] **Step 2: Run** `cd frontend && npx vitest run src/rutaBase.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 3: Implement**
  - `rutaBase.ts` con la firma de Interfaces.
  - `vite.config.ts`: `base: process.env.VITE_BASE || '/'` y `worker: { format: 'es' }`.
  - `main.tsx`: `<BrowserRouter basename={import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')}>`.
  - `Recorrido.tsx`: `src={conBase(conIncrustado(paso.ruta))}`.
  - `ResultadosEvento.tsx`: `` `${window.location.origin}${conBase('/simulador')}${consulta}` ``.
  - Busca rutas absolutas que no pasen por el router:
    `grep -rnE "href=\"/|src=\"/|src=\{'/|window\.location|fetch\(|new (Shared)?Worker\(" frontend/src --include=*.ts --include=*.tsx | grep -v '\.test\.'`
    y corrige con `conBase` las que sean rutas de la app (no las de `/api`, que gestiona `llamar()`).

- [ ] **Step 4: Verify**

Run: `cd frontend && npm test && npm run lint && npm run build && VITE_BASE=/NISAR-Ecuador/ npx vite build --outDir .prueba-base && grep -c '/NISAR-Ecuador/assets/' .prueba-base/index.html; rm -rf .prueba-base`
Expected: verde; el `grep -c` imprime ≥ 1. Luego `npm run build` otra vez (deja `dist` con base `/`) y
`npx playwright test` → 83 passed.

- [ ] **Step 5: Commit** — `feat(frontend): ruta base configurable para publicar bajo /NISAR-Ecuador/`

---

### Task 3: Prueba mínima: motor en el navegador (punto de control)

**Files:**
- Create: `frontend/src/motor/protocolo.ts`, `frontend/src/motor/clienteMotor.ts`, `frontend/src/motor/clienteMotor.test.ts`,
  `frontend/src/motor/motor.worker.ts`, `frontend/src/motor/transporte.ts`, `frontend/src/motor/transporte.test.ts`
- Create: `frontend/scripts/empaquetar_motor.mjs`, `scripts/empaquetar_app.py`, `tests/motor/test_empaquetar_app.py`
- Create: `scripts/construir_pages.sh`, `frontend/playwright.pages.config.ts`, `frontend/e2e/pages.spec.ts`
- Modify: `frontend/src/api/cliente.ts` (`llamar` usa el transporte), `frontend/src/main.tsx` (arranca el motor),
  `frontend/package.json` (devDependency `"pyodide": "314.0.7"`), `.gitignore` (`frontend/dist-pages/`,
  `frontend/.precalculado/`, `frontend/.cache-pyodide/`)

**Interfaces:**
- Consumes: `conBase` (Tarea 2); `arranque.iniciar/atender` (Tarea 1).
- Produces:
  - `protocolo.ts`:
    ```ts
    export type EstadoMotor = 'inactivo' | 'cargando' | 'listo' | 'error'
    export type MensajeAlMotor =
      | { tipo: 'iniciar'; motorUrl: string }
      | { tipo: 'pedir'; id: number; metodo: 'GET' | 'POST'; ruta: string; cuerpo: string | null }
    export type MensajeDelMotor =
      | { tipo: 'estado'; estado: EstadoMotor; detalle?: string }
      | { tipo: 'respuesta'; id: number; estado: number; cuerpo: string }
    export interface PuertoMotor { postMessage(m: MensajeAlMotor): void; onmessage: ((e: { data: MensajeDelMotor }) => void) | null; onerror?: ((e: unknown) => void) | null }
    ```
  - `clienteMotor.ts`:
    - `class MotorNoDisponible extends Error {}`
    - `crearClienteMotor(crearPuerto: () => PuertoMotor, motorUrl: string): ClienteMotor` con
      `iniciar(): void` (idempotente; crea el puerto y envía `iniciar`), `pedir(metodo, ruta, cuerpo): Promise<{ estado: number; cuerpo: string }>`
      (llama a `iniciar()` si hace falta; ids crecientes; rechaza con `MotorNoDisponible` si el estado es o pasa a
      `error`, también las pendientes), `estado(): EstadoMotor`, `pendientes(): number`,
      `suscribir(fn: () => void): () => void`.
    - `motor: ClienteMotor` (instancia de la app; en esta tarea `crearPuerto` = `new Worker(new URL('./motor.worker.ts', import.meta.url), { type: 'module' })`;
      `motorUrl` = `new URL(conBase('/motor/'), location.origin).href`).
    - `useEstadoMotor(): { estado: EstadoMotor; esperando: boolean }` (`useSyncExternalStore`; `esperando` = `pendientes() > 0`).
  - `transporte.ts`:
    - `type Transporte = (url: string, init: RequestInit) => Promise<Response>`
    - `crearTransporteNavegador(dep: { pedirAlMotor: ClienteMotor['pedir'] }): Transporte` — convierte
      `{estado, cuerpo}` en `new Response(cuerpo, { status: estado, headers: { 'content-type': 'application/json' } })`;
      `MotorNoDisponible` → `Response` 503 con cuerpo `{"mensaje": <es de estructura.motor.no_disponible>, "clave_texto": "estructura.motor.no_disponible"}`.
      (La Tarea 4 añade el precálculo a esta misma función.)
    - `transporteNavegador: Transporte` (con `motor.pedir`).
  - `cliente.ts`: `llamar` usa `const transporte: Transporte = import.meta.env.VITE_MOTOR === 'navegador' ? transporteNavegador : fetch` en lugar de `fetch`; nada más cambia.
  - `main.tsx`: si `import.meta.env.VITE_MOTOR === 'navegador'`, `motor.iniciar()` antes de `createRoot`.
  - Worker: al recibir `iniciar` (una sola vez): emite `estado: cargando`; `import(/* @vite-ignore */ motorUrl + 'pyodide/pyodide.mjs')`;
    `loadPyodide({ indexURL: motorUrl + 'pyodide/' })`; lee `motorUrl + 'manifiesto.json'`; `loadPackage(manifiesto.paquetes)`;
    descarga `motorUrl + manifiesto.app` y `unpackArchive(buf, 'zip', { extractDir: '/app' })`; en Python:
    `sys.path.insert(0, '/app')`, `os.chdir('/app')`, `os.environ['NISAR_PROVEEDOR'] = 'demo'`, `import arranque; await arranque.iniciar()`;
    emite `estado: listo`. Atiende `pedir` en orden (cola de promesas) con `arranque.atender(...)` → `respuesta`.
    Cualquier excepción del arranque → `estado: error` con `detalle`.
  - `scripts/empaquetar_app.py --salida <dir>` escribe `<dir>/app-<12 hex del sha256>.zip` y lo imprime. Contenido:
    `api/**`, `datos/**`, `modelo/**` (`*.py`, sin `__pycache__`), `data/clima_ecuador_power.csv`,
    `data/ecuador_provincias.geojson`, `data/nisar_sample.csv`, y `frontend/src/motor/python/*.py` en la raíz del zip.
    Orden alfabético, `ZipInfo.date_time = (1980, 1, 1, 0, 0, 0)`, `ZIP_DEFLATED`. Expone `def construir_zip(raiz: Path) -> bytes`.
  - `frontend/scripts/empaquetar_motor.mjs --salida <dir>`: copia de `node_modules/pyodide` a `<dir>/pyodide/`
    `pyodide.mjs`, `pyodide.asm.mjs`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json`; calcula el cierre de
    los paquetes de Global Constraints con `packages[n].depends` (normaliza nombres: minúsculas y `_`→`-`); para cada
    uno descarga `https://cdn.jsdelivr.net/pyodide/v314.0.7/full/<file_name>` a `frontend/.cache-pyodide/` (si no está
    ya con el sha256 correcto), **verifica el sha256 del lock** (falla con código ≠ 0 si no coincide) y lo copia a
    `<dir>/pyodide/`; copia `data/terreno/*.png` a `<dir>/terreno/` (si existe); escribe `<dir>/manifiesto.json`
    `{ "pyodide": "314.0.7", "paquetes": [...los 6 de Global Constraints], "app": "<único app-*.zip en <dir>>" }`.
  - `scripts/construir_pages.sh` (en esta tarea, sin precálculo): `source scripts/entorno.sh`; `cd frontend`;
    `VITE_MOTOR=navegador VITE_BASE=/NISAR-Ecuador/ npx vite build --outDir dist-pages` (tras `npx tsc -b`);
    `python ../scripts/empaquetar_app.py --salida dist-pages/motor`; `node scripts/empaquetar_motor.mjs --salida dist-pages/motor`;
    `cp dist-pages/index.html dist-pages/404.html`; `set -euo pipefail`.
  - `playwright.pages.config.ts`: `testMatch: ['pages.spec.ts']`, `use: { locale: 'es-EC', baseURL: 'http://localhost:4174/NISAR-Ecuador/', launchOptions: { executablePath: process.env.CHROME_PATH } }`,
    `webServer: { command: 'npx vite preview --outDir dist-pages --base /NISAR-Ecuador/ --port 4174 --strictPort', url: 'http://localhost:4174/NISAR-Ecuador/', reuseExistingServer: true }`,
    `timeout: 180_000`. En los `goto`, usa rutas relativas sin barra inicial (`page.goto('observatorio')`) para conservar la base.

- [ ] **Step 1: Write the failing tests**

`tests/motor/test_empaquetar_app.py`: `test_zip_determinista` (dos `construir_zip(raiz)` dan bytes iguales),
`test_incluye_lo_necesario` (contiene `api/app.py`, `datos/proveedores/demo.py`, `modelo/desastres.py`,
`data/nisar_sample.csv`, `arranque.py`), `test_excluye_lo_que_no_hace_falta` (ningún nombre empieza por `data/demo/`
ni `data/terreno/`, ninguno contiene `__pycache__`).

`clienteMotor.test.ts` (puerto falso que registra mensajes y responde a mano):
```ts
it('envía iniciar una sola vez aunque se llame dos veces')
it('dos pedidos antes de estar listo se responden cada uno con su id')   // Review Focus 2: responde id 2 antes que id 1
it('con estado error rechaza las pendientes y las futuras con MotorNoDisponible')   // Review Focus 3
it('onerror del puerto equivale a estado error')
it('pendientes() vuelve a 0 y notifica a los suscriptores')
```
`transporte.test.ts`:
```ts
it('convierte {estado: 422, cuerpo} en Response 422 con el mismo JSON')
it('MotorNoDisponible → 503 con clave_texto estructura.motor.no_disponible')
it('envía el método, la ruta con consulta y el cuerpo de init.body')
```
`e2e/pages.spec.ts`, primer caso (el resto llega en la Tarea 9):
```ts
test('el motor responde salud y cambio en Chromium', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('region', { name: 'Aviso de datos de demostración' })).toBeVisible({ timeout: 120_000 })
  // el comparador de la historia necesita /cambio: aparece su lienzo
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 120_000 })
})
```
(Antes de `goto`, `page.addInitScript(() => localStorage.setItem('nisar.idioma', 'es'))`, como las demás e2e.)

La clave `estructura.motor.no_disponible` se añade ya en esta tarea a `es/en/qu` (`estructura.ts`), con los textos de
la Tarea 7.

- [ ] **Step 2: Run to verify they fail** — `python -m pytest tests/motor -q` y `cd frontend && npx vitest run src/motor` → FAIL.

- [ ] **Step 3: Implement** según Interfaces. `npm i -D pyodide@314.0.7 --save-exact`.

- [ ] **Step 4: Verify**

Run: `python -m pytest tests -q && cd frontend && npm test && npm run lint && npm run build && cd .. && bash scripts/construir_pages.sh && cd frontend && npx playwright test -c playwright.pages.config.ts && npx playwright test`
Expected: todo en verde; `pages.spec.ts` 1 passed; las 83 e2e de siempre en verde.

**Punto de control:** si el caso de `pages.spec.ts` no pasa tras dos intentos de corrección razonables (errores del
worker, del import dinámico o de `loadPackage`), **detente**: `git stash` de lo que rompa el build, anota en `INFORME.md`
(sección «Despliegue: prueba mínima») qué falló, el mensaje exacto de la consola del worker y qué se intentó, y vuelve al
usuario con el plan B del spec (Vercel). No sigas con la Tarea 4.

- [ ] **Step 5: Commit** — `feat(motor): la API corre en el navegador con Pyodide (prueba mínima)`

---

### Task 4: Precálculo en el transporte

**Files:**
- Create: `frontend/src/motor/clave.ts`, `frontend/src/motor/clave.test.ts`
- Modify: `frontend/src/motor/transporte.ts`, `frontend/src/motor/transporte.test.ts`

**Interfaces:**
- Produces:
  - `claveDePeticion(metodo: string, ruta: string, cuerpo: unknown): string` — `METODO ruta` donde la consulta va
    ordenada (`URLSearchParams` + `sort()`; sin consulta, sin `?`), luego `\n`, luego `JSON.stringify` del cuerpo con
    claves de objeto ordenadas recursivamente (arrays en su orden); sin cuerpo (`undefined`/`null`), cadena vacía tras `\n`.
    Solo sintaxis TypeScript borrable (la usa Node en la Tarea 8).
  - `hashClave(clave: string): Promise<string>` — SHA-256 en hex minúsculas con `crypto.subtle`.
  - `crearTransporteNavegador(dep: { pedirAlMotor; cargarIndice: () => Promise<Record<string, string>>; descargar: (hash: string) => Promise<{ estado: number; cuerpo: string } | null> }): Transporte`
    — el índice se carga una vez (promesa memorizada; si falla, índice vacío); si el hash está, usa `descargar`
    (si devuelve `null`, recurre al motor); si no, el motor.
  - `transporteNavegador` usa `cargarIndice = fetch(conBase('/precalculado/indice.json'))` y
    `descargar = fetch(conBase('/precalculado/' + hash + '.json'))` (`null` si `!ok`).

- [ ] **Step 1: Write the failing tests**

`clave.test.ts`:
```ts
expect(claveDePeticion('GET', '/api/laboratorio/respuesta?pol=HH&banda=L', undefined))
  .toBe(claveDePeticion('GET', '/api/laboratorio/respuesta?banda=L&pol=HH', undefined))       // Review Focus 1
expect(claveDePeticion('POST', '/api/x', { b: 1, a: { d: 2, c: 3 } })).toBe('POST /api/x\n{"a":{"c":3,"d":2},"b":1}')
expect(claveDePeticion('GET', '/api/salud', undefined)).toBe('GET /api/salud\n')
expect(claveDePeticion('POST', '/api/x', { l: [2, 1] })).toBe('POST /api/x\n{"l":[2,1]}')
expect(await hashClave('GET /api/salud\n')).toMatch(/^[0-9a-f]{64}$/)
```
`transporte.test.ts`, nuevos:
```ts
it('con la clave en el índice usa la respuesta precalculada y no llama al motor')
it('sin la clave en el índice llama al motor')
it('si el índice no carga (404) usa el motor sin fallar')                      // Review Focus 5
it('si la descarga de la entrada falla recurre al motor')
it('el índice se pide una sola vez')
```

- [ ] **Step 2: Run** `cd frontend && npx vitest run src/motor` → FAIL.
- [ ] **Step 3: Implement** según Interfaces.
- [ ] **Step 4: Verify** — `cd frontend && npm test && npm run lint && npm run build` → verde.
- [ ] **Step 5: Commit** — `feat(motor): respuestas precalculadas antes de usar el motor`

---

### Task 5: Relieve real en el navegador (`requests` mínimo)

**Files:**
- Create: `frontend/src/motor/python/requests_navegador.py`, `tests/motor/test_requests_navegador.py`
- Modify: `frontend/src/motor/motor.worker.ts` (registrar el shim antes de `import arranque`)

**Interfaces:**
- Produces (módulo `requests_navegador`):
  - `ruta_local(url: str, motor_url: str) -> str | None` — si `url` acaba en `/terrarium/<z>/<x>/<y>.png`,
    devuelve `motor_url + 'terreno/<z>_<x>_<y>.png'`; si no, `None`.
  - `class Respuesta` con `content: bytes`, `status_code: int`, `raise_for_status()` (lanza `HTTPError` si ≥ 400).
  - `class HTTPError(Exception)`.
  - `get(url: str, timeout: float | None = None) -> Respuesta` — XHR síncrono (`from js import XMLHttpRequest`,
    `responseType = 'arraybuffer'`, permitido en workers): primero `ruta_local(url, MOTOR_URL)` si no es `None` y
    responde 200; si no, `url`.
  - `registrar(motor_url: str) -> None` — fija `MOTOR_URL` y hace `sys.modules['requests'] = sys.modules[__name__]`.
  - El import de `js` va dentro de `get` (así el módulo se importa en CPython para las pruebas).

- [ ] **Step 1: Write the failing tests** (`test_requests_navegador.py`)

```python
M = "https://x.github.io/NISAR-Ecuador/motor/"
assert ruta_local("https://s3.amazonaws.com/elevation-tiles-prod/terrarium/10/290/516.png", M) == M + "terreno/10_290_516.png"
assert ruta_local("https://elevation-tiles-prod.s3.amazonaws.com/terrarium/12/1160/2066.png", M) == M + "terreno/12_1160_2066.png"
assert ruta_local("https://example.com/otra.png", M) is None
# registrar() deja `import requests` apuntando al shim (restaura sys.modules al terminar la prueba)
# Respuesta(b"", 404, url).raise_for_status() lanza HTTPError
```

- [ ] **Step 2: Run** `python -m pytest tests/motor/test_requests_navegador.py -q` → FAIL.
- [ ] **Step 3: Implement**; en el worker, antes de `import arranque`: `import requests_navegador; requests_navegador.registrar('<motorUrl>')`.
- [ ] **Step 4: Verify** — `python -m pytest tests -q`; `cd frontend && npm test && npm run lint && npm run build`;
  `bash scripts/construir_pages.sh && cd frontend && npx playwright test -c playwright.pages.config.ts` → verde.
  Comprobación manual: `npx vite preview --outDir dist-pages --base /NISAR-Ecuador/ --port 4174`, abre
  `/NISAR-Ecuador/simulador?lat=-0.68&lon=-78.44&ext=40` (Cotopaxi, con relieve real) y confirma en la ficha del mundo
  que el relieve no dice «terreno sintético». Anota el resultado para la Tarea 11.
- [ ] **Step 5: Commit** — `feat(motor): relieve SRTM en el navegador con teselas propias y de AWS`

---

### Task 6: Un motor compartido entre marcos

**Files:**
- Modify: `frontend/src/motor/clienteMotor.ts`, `frontend/src/motor/clienteMotor.test.ts`, `frontend/src/motor/motor.worker.ts`

**Interfaces:**
- Produces: `elegirPuerto(): PuertoMotor` — si `typeof SharedWorker !== 'undefined'`:
  `new SharedWorker(new URL('./motor.worker.ts', import.meta.url), { type: 'module', name: 'nisar-motor' }).port`
  (con `port.start()`); si no, `new Worker(...)`. `motor` pasa a usar `elegirPuerto`.
- El worker atiende los dos modos: `self.onconnect` (compartido: guarda cada puerto, le envía el estado actual al
  conectar y responde por el puerto que pidió) y `self.onmessage` (dedicado). Una sola inicialización por worker.

- [ ] **Step 1: Write the failing tests** (`clienteMotor.test.ts`)

```ts
it('elegirPuerto usa SharedWorker si existe')      // stub global SharedWorker y Worker con vi.stubGlobal
it('elegirPuerto cae a Worker si no hay SharedWorker')
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.**
- [ ] **Step 4: Verify** — `cd frontend && npm test && npm run lint && npm run build`; `bash scripts/construir_pages.sh`;
  añade a `pages.spec.ts` el caso `test('el recorrido incrusta pantallas con la base', …)`: `goto('recorrido')`,
  el `iframe` tiene `src` que empieza por `/NISAR-Ecuador/` y contiene `incrustado=1`, y dentro del marco la región
  «Aviso de datos de demostración» es visible (límite 120 s). `npx playwright test -c playwright.pages.config.ts` → verde.
- [ ] **Step 5: Commit** — `feat(motor): un solo motor por pestaña con SharedWorker`

---

### Task 7: Aviso del motor

**Files:**
- Create: `frontend/src/diseno/AvisoMotor.tsx`, `frontend/src/diseno/AvisoMotor.test.tsx`
- Modify: `frontend/src/diseno/Estructura.tsx` (bajo `<BandaDemostracion />`, solo si no está incrustado),
  `frontend/src/diseno/componentes.css` (estilo con tokens), catálogos `es/en/qu/estructura.ts`,
  `docs/traduccion-kichwa.csv` (regenerado), `docs/diseno.md` (§8: una línea sobre `AvisoMotor`)

**Interfaces:**
- Consumes: `useEstadoMotor()` (Tarea 3).
- Produces: `AvisoMotor()` — `estado === 'cargando' && esperando` → `<p role="status">` con `estructura.motor.cargando`;
  `estado === 'error'` → `<p role="alert">` con `estructura.motor.error`; si no, nada. Sin animación.

Textos exactos (kichwa: borrador sin validar):

| Clave | es | en | qu |
|---|---|---|---|
| `estructura.motor.cargando` | Preparando el motor de cálculo… (primera visita: unos 25 MB) | Preparing the computation engine… (first visit: about 25 MB) | Yupana motorta allichikun… (punta kutin: 25 MB shina) |
| `estructura.motor.error` | El motor de cálculo no pudo cargarse en este navegador; lo precalculado sigue disponible. | The computation engine could not load in this browser; precomputed content is still available. | Yupana motorka kay navegadorpi mana chaskiyta ushashkachu; ñawpa yupashkaka tiyakunllami. |
| `estructura.motor.no_disponible` | Esta función necesita el motor de cálculo, que no pudo cargarse en este navegador. | This feature needs the computation engine, which could not load in this browser. | Kay ruranaka yupana motorta minishtin, shinapash kay navegadorpi mana chaskiyta ushashkachu. |

(Si `estructura.motor.no_disponible` ya existe desde la Tarea 3, deja esos textos.)

- [ ] **Step 1: Write the failing tests** (`AvisoMotor.test.tsx`, con un cliente falso inyectado vía `vi.mock('../motor/clienteMotor')`)

```ts
it('no muestra nada con el motor inactivo o listo')
it('muestra el aviso de carga con role=status solo si hay una petición esperando')
it('muestra el error con role=alert')
it('existe en los tres idiomas')   // renderConIdioma(..., 'en') y 'qu'
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; `node scripts/traducciones_csv.mjs exportar`.
- [ ] **Step 4: Verify** — `cd frontend && npm test && npm run lint && npm run build && npx playwright test` → verde;
  `bash scripts/revision_visual.sh / historias` → `RESULT: 0 FAIL`.
- [ ] **Step 5: Commit** — `feat(frontend): aviso del motor de cálculo en tres idiomas`

---

### Task 8: Grabación del precálculo

**Files:**
- Create: `frontend/scripts/precalcular.mts`
- Modify: `scripts/construir_pages.sh`

**Interfaces:**
- Consumes: `claveDePeticion`, `hashClave` (Tarea 4) importados como `../src/motor/clave.ts`.
- Produces: `node scripts/precalcular.mts --origen http://127.0.0.1:8000 --salida .precalculado` (desde `frontend/`):
  escribe `<salida>/<hash>.json` = `{"estado": 200, "cuerpo": "<texto>"}` y `<salida>/indice.json` = `{ "<hash>": "<clave>" }`;
  sale con código 1 si graba menos de 40 entradas.
  - Chromium (`executablePath: process.env.CHROME_PATH` si existe), `reducedMotion: 'reduce'`, `locale: 'es-EC'`,
    `addInitScript` con `localStorage.setItem('nisar.idioma', 'es')`.
  - Graba con `page.on('requestfinished')` toda petición cuyo `pathname` empieza por `/api/` y cuya respuesta es 200
    (incluye las de los `iframe`); la clave usa `pathname + search` y el cuerpo `JSON.parse(postData)` si lo hay.
  - Recorre, esperando `networkidle` (límite 120 s) en cada una: `/`, `/?historia=incendio`; para cada escenario de
    `GET /api/escenarios`: `/observatorio?escenario=<id>&vista=mapa|comparar|serie` e `&vista=impacto` si
    `historia !== null`; en la vista mapa pulsa `Reproducir` y espera a que el botón vuelva a llamarse `Reproducir`
    (límite 60 s); `/laboratorio?nubes=<n>` para n = 0, 10, …, 100; `/laboratorio?vista=polarizacion&banda=<L|S>&pol=<HH|HV|VV>`
    (6 combinaciones); `/fundamentos`; `/simulador`.
- `construir_pages.sh`, antes del build de Pages: `VITE_MAPA_REMOTO=0 npm run build` (modo servidor, base `/`); levanta
  `python servidor.py` en segundo plano (desde la raíz), espera `curl -sf localhost:8000/api/salud` (máx. 60 s), corre
  `precalcular.mts`, detiene el servidor (también si falla: `trap`); después del build de Pages copia
  `.precalculado/` a `dist-pages/precalculado/`.

- [ ] **Step 1: Implement** `precalcular.mts` y el cambio en `construir_pages.sh`.
- [ ] **Step 2: Verify**

Run: `bash scripts/construir_pages.sh && ls frontend/dist-pages/precalculado | wc -l && du -sh frontend/dist-pages`
Expected: ≥ 41 archivos; tamaño total < 150 MB (anota la cifra para la Tarea 11). `cd frontend && npx playwright test -c playwright.pages.config.ts` → verde.

- [ ] **Step 3: Commit** — `feat(despliegue): graba las respuestas de los caminos fijos para Pages`

---

### Task 9: E2e del modo Pages

**Files:**
- Modify: `frontend/e2e/pages.spec.ts`

Casos (todos con `localStorage nisar.idioma='es'`; límites indicados):

```ts
test('la portada se ve sin esperar al motor')
  // page.route('**/motor/pyodide/pyodide.asm.wasm', r => new Promise(() => {}))  (el motor nunca termina de cargar)
  // goto('./') → banda visible y un canvas del comparador visibles en ≤ 15 s; el texto de estructura.motor.cargando no aparece
test('recargar una ruta profunda funciona')
  // goto('observatorio?escenario=ec_loja&vista=comparar') → page.reload() → banda y canvas visibles (120 s)
test('el motor calcula un escenario nuevo del Observatorio')
  // goto('observatorio?escenario=ec_la_segua'); getByLabel('Semilla').fill('11') (abre el panel de simulación si está plegado)
  // → expect(page).toHaveURL(/escenario=ec_la_segua(~|%7E)/) en 120 s
test('el simulador crea un mundo y desata un incendio con el motor')
  // pasos de e2e/simulador.spec.ts con goto('simulador?lat=-4.05&lon=-79.25&dem=0&ext=60'); límites 120 s
test('un enlace profundo del simulador recrea el evento')                    // Review Focus 4
  // goto('simulador?lat=-4.05&lon=-79.25&dem=0&ext=60&h=incendio&i=64&j=64') → heading /Incendio/ en 120 s
test('si el motor no carga, se avisa y lo precalculado sigue')               // Review Focus 3
  // page.route('**/motor/app-*.zip', r => r.fulfill({ status: 404 }))
  // goto('observatorio?escenario=ec_la_segua'); getByLabel('Semilla').fill('12')
  // → role=alert con el texto de estructura.motor.error (120 s); la banda sigue visible
test('capturas del aviso del motor a 1440, 768 y 390')
  // con pyodide.asm.wasm retenido y la semilla cambiada (aviso role=status visible),
  // page.screenshot a docs/capturas-nuevas/aviso-motor/{1440,768,390}.png (ruta relativa a frontend: ../docs/…)
```

- [ ] **Step 1: Write the cases.**
- [ ] **Step 2: Verify** — `bash scripts/construir_pages.sh && cd frontend && npx playwright test -c playwright.pages.config.ts`
  → todos en verde. Mira las tres capturas: el aviso no tapa la banda ni el contenido, no se sale de la pantalla a 390 px,
  sigue `docs/diseno.md` (máximo tres rondas de corrección; lo pendiente a `INFORME.md`).
- [ ] **Step 3: Commit** — `test(despliegue): e2e del modo Pages con el motor en el navegador`

---

### Task 10: Workflow de GitHub Pages

**Files:**
- Create: `.github/workflows/pages.yml`

Contenido decidido:
- `name: Publicar en GitHub Pages`; `on: push: branches: [main]` y `workflow_dispatch`;
  `concurrency: { group: pages, cancel-in-progress: false }`;
  `permissions: { contents: read, pages: write, id-token: write }`.
- **`verificar`** (`ubuntu-latest`): `actions/checkout@v4`; `actions/setup-python@v5` (`python-version: '3.13'`,
  `cache: pip`); `pip install -r requirements.txt -r requirements-api.txt`; `actions/setup-node@v4`
  (`node-version: '22'`, `cache: npm`, `cache-dependency-path: frontend/package-lock.json`); `npm ci` en `frontend`;
  `python -m pytest tests -q`; `python -m unittest modelo.clima modelo.desastres`; `npm test`; `npm run lint`.
- **`construir`** (`needs: verificar`): mismos pasos de instalación; `npx playwright install --with-deps chromium`
  (en `frontend`); `bash scripts/construir_pages.sh`; `npx playwright test -c playwright.pages.config.ts` (en `frontend`);
  `actions/upload-pages-artifact@v3` con `path: frontend/dist-pages`.
- **`publicar`** (`needs: construir`): `environment: { name: github-pages, url: ${{ steps.despliegue.outputs.page_url }} }`;
  `actions/deploy-pages@v4` con `id: despliegue`.
- `scripts/entorno.sh` debe funcionar en el runner sin nvm (no fallar si no existe `~/.nvm`); si hoy falla, haz que
  cargue nvm solo si existe y que `CHROME_PATH` solo se exporte si el archivo existe.

- [ ] **Step 1: Implement** `pages.yml` (y el ajuste de `entorno.sh` si hace falta).
- [ ] **Step 2: Verify** — `python -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/pages.yml')); print(list(d['jobs']))"`
  imprime `['verificar', 'construir', 'publicar']`; `bash -c 'HOME=/tmp/sin-nvm source scripts/entorno.sh; echo ok'` imprime `ok`;
  las suites locales siguen en verde.
- [ ] **Step 3: Commit** — `ci: publica la app en GitHub Pages en cada push a main`

---

### Task 11: Documentación e informe

**Files:**
- Modify: `CLAUDE.md`, `README.md`, `README.es.md`, `INFORME.md`, `docs/historia-datos.md` («Antes de empezar»)

Contenido:
- `CLAUDE.md`: los cambios de la sección 8 del spec, literal (regla de `main`, `frontend/src/motor/` en Arquitectura,
  regla de dependencias compatibles con Pyodide y Python 3.13/3.14, comandos `bash scripts/construir_pages.sh` y
  `cd frontend && npx playwright test -c playwright.pages.config.ts`).
- README (es/en): sección «Versión publicada / Published version» con `https://jmnss.github.io/NISAR-Ecuador/`, que todo
  se calcula en el navegador, que la primera visita descarga unos 25 MB y que el Simulador puede tardar hasta un minuto
  en tormentas e inundaciones; móviles de gama baja pueden no cargar el motor. El aviso de datos de demostración no cambia.
- `INFORME.md`: sección «Despliegue en GitHub Pages (2026-11-06)» con las cifras del spike (tabla del spec §1), el tamaño
  final de `dist-pages` y el número de entradas precalculadas (Tarea 8), el resultado del relieve real (Tarea 5) y
  pendientes: activar *Settings → Pages → Source: GitHub Actions* (usuario), push a `main` (usuario), memoria en móvil,
  Chrome Android sin `SharedWorker`, textos kichwa nuevos sin validar, despertar/tiempos no medidos en un navegador lento.
  Actualiza la línea de «Verificación» del encabezado con las cifras de esta corrida.
- `docs/historia-datos.md`: en «Antes de empezar», la URL pública y «abre la página un minuto antes para que el motor ya
  esté cargado».

- [ ] **Step 1: Write** los cambios.
- [ ] **Step 2: Verify** — `python -m pytest tests -q && python -m unittest modelo.clima modelo.desastres && cd frontend && npm test && npm run lint && npm run build && npx playwright test && cd .. && bash scripts/construir_pages.sh && cd frontend && npx playwright test -c playwright.pages.config.ts` → todo en verde.
- [ ] **Step 3: Commit** — `docs: despliegue en GitHub Pages, reglas nuevas e informe`

Al terminar: no hagas push. Informa al usuario de que (1) active *Settings → Pages → Source: GitHub Actions* y (2) autorice
el push de `migracion-react` a `main`, que dispara la publicación.
