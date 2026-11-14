# Despliegue en GitHub Pages sin servidor (API en el navegador con Pyodide) — Diseño

Fecha: 2026-11-06 · Rama: `migracion-react` · Estado: secciones 1–3 aprobadas en conversación; pendiente de
revisión escrita. Sustituye a la versión anterior de este archivo (Pages + Hugging Face Spaces).

## 1. Propósito y decisiones

`docs/challenge.md` pide una «solución de código abierto, fácil de usar», accesible a un público amplio. El
equipo aspira a la fase global: los jueces pueden revisar la app semanas o meses después, sin aviso. El
despliegue debe **funcionar solo, sin encenderlo, sin dormirse y sin coste**.

| Tema | Decisión |
|---|---|
| Alojamiento | **Solo GitHub Pages** (`https://jmnss.github.io/NISAR-Ecuador/`), sitio estático |
| API | La misma app FastAPI (`api/`, `datos/`, `modelo/`) corre **en el navegador** con Pyodide en un Web Worker |
| Primera impresión | Respuestas **precalculadas** al compilar para los caminos fijos |
| Local | Sin cambios: `python servidor.py`, `npm run dev`, todas las suites |
| Descartado | Hugging Face (cuenta gratuita sin Docker), Render/Azure (se duermen o consumen créditos), Vercel (plan B si falla la prueba mínima) |
| Inspiración | Proyecto del año pasado (`neoscience2025/meteor-madness-website` + `Nolaskote/simulatio_next`): cálculo en el navegador (Web Worker + WASM), Python solo fuera de línea, Pages con `404.html` y `deploy-pages` |

### Evidencia del spike (2026-11-06, Node 22, Pyodide 314.0.7, Python 3.14.2, FastAPI 0.136.1)

Código desechable, fuera del repositorio. Las 18 rutas probadas dieron 200.

| Medida | Valor |
|---|---|
| Arranque en frío (librerías en caché local) | ~14 s (Pyodide 3–4 s; numpy/pandas/Pillow/pydantic/shapely 3 s; FastAPI 2–3 s; import + lifespan 5–6 s) |
| Descarga de la primera visita | ~25 MB (núcleo ~12 MB + librerías ~12 MB) |
| `salud` (primera) / `cambio` La Segua / `impacto` | 2,6 s / 0,24 s / 3,0 s |
| Simulador: mundo / incendio / terremoto / erupción | 1,3 / 0,1 / 1,0 / 1,9 s |
| `tormenta` / `inundacion` | 18,9 s / 33,2 s (nativo: 11,4 s / 14,3 s) |
| Memoria máxima | ~600 MB rss (incluye el motor JS) |

Hallazgos: (1) sin hilos: `run_in_threadpool` se sustituye por ejecución en línea; (2) `shapely` es necesario
(`modelo/estaciones.py:108`); (3) `requests` no existe: sin teselas locales el relieve cae a sintético; el
servidor de teselas de AWS responde `Access-Control-Allow-Origin: *`; (4) `data/demo/` y httpx/jinja2 no hacen
falta. **No se probó en un navegador real**: lo cubre la prueba mínima (§6, paso 2).

### Criterios de éxito

1. Con `VITE_MOTOR` sin definir, todo se comporta como hoy y las suites pasan sin cambios en sus comandos.
2. `https://jmnss.github.io/NISAR-Ecuador/` carga Historias con la banda visible **sin esperar al motor**.
3. Todas las pantallas funcionan en Pages, incluido el Simulador y el clic libre en el mapa, con Chromium de
   escritorio; recargar cualquier ruta funciona.
4. Si el motor no carga, lo precalculado sigue funcionando y lo demás muestra un error legible.
5. Nada depende de un servicio externo para funcionar (Esri y las teselas de AWS son opcionales y ya tienen
   respaldo).

## 2. Arquitectura

### 2.1 Modos de `llamar()`

`VITE_MOTOR` (tiempo de compilación): `servidor` (por defecto) o `navegador`.

- `servidor`: `fetch('/api/...')` como hoy.
- `navegador`: para cada petición,
  1. calcula `claveDePeticion(metodo, ruta, cuerpo)`: `METODO ruta?consulta` (parámetros de consulta ordenados por
     nombre) + `\n` + JSON del cuerpo con claves ordenadas recursivamente (vacío si no hay cuerpo); y su SHA-256
     en hex (`crypto.subtle`);
  2. si el hash está en `precalculado/indice.json` (cargado una vez), descarga `precalculado/<hash>.json`
     (`{estado, cuerpo}`) y lo devuelve como una respuesta HTTP;
  3. si no, la envía al motor y trata `{estado, cuerpo}` igual que una respuesta HTTP (los 422/404 con
     `clave_texto` funcionan igual);
  4. si el motor no está disponible: `ErrorApi(503, …, clave 'api.error.motor_no_disponible')`.

### 2.2 El motor (`frontend/src/motor/`)

| Archivo | Responsabilidad |
|---|---|
| `motor.worker.ts` | Worker (dedicado o compartido): carga Pyodide desde `conBase('/motor/pyodide/')`, carga las librerías locales, descomprime `app-<hash>.zip` en `/app`, ejecuta `arranque.py`, atiende `{id, metodo, ruta, cuerpo}` → `{id, estado, cuerpo}` en orden de llegada |
| `clienteMotor.ts` | Crea el worker (`SharedWorker` si existe; si no, `Worker`), correlaciona respuestas por `id`, expone `pedirAlMotor()` y el estado (`inactivo`, `cargando`, `listo`, `error`); empieza a cargar en segundo plano al iniciar la app en modo `navegador` |
| `python/arranque.py` | Parche sin hilos (sustituye `run_in_threadpool` en `starlette.concurrency`, `fastapi.routing` y `fastapi.dependencies.utils`), `create_app()`, lifespan y `async def llamar_asgi(app, metodo, ruta, cuerpo) -> tuple[int, str]`. Funciona también en CPython (se prueba con pytest) |
| `python/requests_navegador.py` | Módulo `requests` mínimo (`get(url, timeout)` → objeto con `content`, `status_code`, `raise_for_status()`), con XHR síncrono (`responseType = 'arraybuffer'`): primero `motor/terreno/<z>_<x>_<y>.png` (traducción con la función pura `ruta_local(url)`), si no la URL original de AWS. Se registra en `sys.modules['requests']` solo dentro del worker |
| `manifiesto.ts` | Lee `motor/manifiesto.json` (versión de Pyodide, lista de librerías, nombre de `app-<hash>.zip`) |

Librerías autoalojadas (versión exacta de Pyodide fijada en `package.json`): numpy, pandas (y python-dateutil,
pytz, six, tzdata si el lock los pide), Pillow, pydantic, pydantic_core, annotated-types, typing-extensions,
typing-inspection, shapely, fastapi, starlette, anyio, sniffio, idna, annotated-doc. Sin httpx ni jinja2:
FastAPI se carga sin sus extras. La lista definitiva sale de las dependencias que declara `pyodide-lock.json`
para esos paquetes; si fastapi exige alguna más, se añade.

`modelo/` no se modifica.

### 2.3 Precálculo

`scripts/precalcular.mjs` (Playwright) abre la app compilada en modo `servidor` contra `python servidor.py`,
intercepta todas las peticiones a `/api/` y guarda cada una como `precalculado/<hash>.json` con su clave en
`precalculado/indice.json` (`{"<hash>": "<clave>"}`). Recorre: `/`, las dos historias; `/observatorio` con
`ec_la_segua` y `ec_loja` en las vistas mapa, comparar, serie e impacto; `/laboratorio` en sus dos vistas;
`/fundamentos`; `/recorrido` paso por paso; `/simulador` sin crear mundo. Espera a que no queden peticiones
pendientes en cada pantalla. Usa la misma función `claveDePeticion` (módulo compartido sin dependencias del
navegador). Solo se guardan respuestas con estado 200.

### 2.4 Estados visibles

- `AvisoMotor` (en `Estructura`, bajo la banda; no en modo incrustado): visible solo mientras una petición
  espera al motor y el motor está `cargando`: «Preparando el motor de cálculo… (primera visita: unos 25 MB)»
  (`role="status"`). Con el motor en `error`: «El motor de cálculo no pudo cargarse en este navegador; lo
  precalculado sigue disponible.» (`role="alert"`). Tokens de `tokens.css`; sin animación.
- Las peticiones largas usan los estados de carga que ya existen («Simulando…»).

### 2.5 Honestidad

Las respuestas precalculadas y las del motor llevan el mismo `origen` sintético; `salud` está precalculada, así
que la banda se ve desde el primer instante. El precálculo cambia cuándo se calcula una respuesta, no qué dice.
Ningún texto nuevo afirma nada sobre NISAR.

## 3. Ruta base

- `vite.config.ts`: `base: process.env.VITE_BASE || '/'`.
- `main.tsx`: `BrowserRouter basename` = `import.meta.env.BASE_URL` sin barra final (o sin `basename` si es `/`).
- `frontend/src/rutaBase.ts`: `conBase(ruta: string, base: string = import.meta.env.BASE_URL): string`.
- Usos: `src` de los iframes del Recorrido, «Copiar enlace» del simulador
  (`window.location.origin + conBase('/simulador') + consulta`), URL del motor y del precálculo.
- El plan incluye un `grep` de `href="/`, `src="/`, `window.location`, `fetch(` y `new Worker(` para corregir con
  `conBase` cualquier ruta absoluta restante.
- `404.html` = copia de `index.html` (rutas del cliente en Pages).

## 4. Compilación y despliegue

### 4.1 Scripts

| Script | Qué hace |
|---|---|
| `scripts/empaquetar_app.py` | `app-<sha256 corto>.zip` determinista (orden fijo, fecha fija 1980-01-01) con `api/`, `datos/`, `modelo/` (sin `__pycache__`), `data/clima_ecuador_power.csv`, `data/ecuador_provincias.geojson`, `data/nisar_sample.csv`, y `frontend/src/motor/python/*.py`. Sin `data/demo/` ni `data/terreno/` |
| `scripts/empaquetar_motor.mjs` | Copia el núcleo de Pyodide desde `node_modules/pyodide` a `<salida>/motor/pyodide/`; descarga de la CDN de Pyodide de esa misma versión cada librería de §2.2 según `pyodide-lock.json`, **verificando su sha256**; copia `data/terreno/*.png` a `<salida>/motor/terreno/`; escribe `motor/manifiesto.json` |
| `scripts/precalcular.mjs` | §2.3 |
| `scripts/construir_pages.sh` | Reproduce el trabajo `construir` en local y deja `frontend/dist-pages/` |

### 4.2 Workflow `.github/workflows/pages.yml`

En `push` a `main` y `workflow_dispatch`; `concurrency: pages`. Permisos: `contents: read`, `pages: write`,
`id-token: write`.

1. **`verificar`**: Python 3.13 (`requirements.txt` + `requirements-api.txt`), Node 22 (`npm ci`); pytest,
   unittest, vitest, lint.
2. **`construir`** (`needs: verificar`): `bash scripts/construir_pages.sh`:
   1. `npm run build` (modo `servidor`, base `/`); `python servidor.py` en segundo plano; `node scripts/precalcular.mjs`;
   2. `python scripts/empaquetar_app.py` y `node scripts/empaquetar_motor.mjs`;
   3. `VITE_MOTOR=navegador VITE_BASE=/NISAR-Ecuador/ npm run build -- --outDir dist-pages`; copia `precalculado/` y
      `motor/`; `404.html`;
   4. `npx playwright test --project=pages`.

   Luego `actions/upload-pages-artifact@v3` con `frontend/dist-pages`.
3. **`publicar`** (`needs: construir`): `actions/deploy-pages@v4`, entorno `github-pages`.

Acciones: `actions/checkout@v4`, `actions/setup-python@v5`, `actions/setup-node@v4`. Playwright instala
Chromium en el runner (`npx playwright install --with-deps chromium`).

### 4.3 Límites y caché de GitHub Pages

Sitio ≤ 1 GB (uso estimado 50–70 MB); ancho de banda blando ~100 GB/mes (> 1500 primeras visitas al mes);
caché de 10 min con revalidación por ETag. El nombre `app-<hash>.zip` evita mezclar un motor viejo con un
frontend nuevo.

### 4.4 Publicación

Funciona con el repositorio privado (GitHub Pro); **el sitio es público** desde el primer despliegue. El usuario
activa una vez *Settings → Pages → Source: GitHub Actions*; sin eso, `publicar` falla y no se publica nada. El
push a `main` lo autoriza el usuario.

## 5. Pruebas

| Capa | Pruebas |
|---|---|
| pytest | `arranque.llamar_asgi` frente a `TestClient` (salud, escenarios, cambio, un 422 y un 404 con `clave_texto`: mismo estado y mismo JSON); el parche sin hilos no rompe rutas síncronas; `ruta_local(url)` (URL de AWS → `motor/terreno/z_x_y.png`; URL ajena → `None`); `empaquetar_app.py` determinista, incluye lo necesario y excluye `data/demo/`; **compatibilidad con Pyodide**: las librerías externas importadas por `api/`, `datos/`, `modelo/{nisar,estaciones,desastres}.py` y `frontend/src/motor/python/` ⊂ {numpy, pandas, PIL, pydantic, shapely, fastapi, starlette} (más `js` y `pyodide` solo en `motor/python/`) |
| vitest | `claveDePeticion` (orden de claves, consulta ordenada, sin cuerpo); `llamar()` en `navegador`: usa el precálculo, recurre al motor, 503 con `api.error.motor_no_disponible`; en `servidor`: sin cambios; `clienteMotor`: correlación por id, `SharedWorker` y caída a `Worker`; `conBase`; `AvisoMotor` (oculto, cargando, error); claves nuevas en los tres catálogos |
| Playwright `pages` | Contra `dist-pages` con `vite preview --base /NISAR-Ecuador/`: (1) la portada carga con la banda e Historias sin peticiones al motor; (2) recarga directa de `/NISAR-Ecuador/observatorio`; (3) cambiar la semilla en el Observatorio → el motor calcula el escenario (límite 120 s); (4) Simulador: crear mundo + incendio con el motor (límite 120 s); (5) los iframes del Recorrido usan la base |
| Regresión | todas las suites actuales con sus comandos de `CLAUDE.md` |
| Visual | `AvisoMotor` con capturas de Playwright a 1440/768/390 en `docs/capturas-nuevas/aviso-motor/`; `revision_visual.sh /` en 0 FAIL |

## 6. Orden de construcción

Un commit por paso, con pruebas en verde.

1. `python/arranque.py` + pytest en CPython.
2. **Prueba mínima en navegador**: `empaquetar_app.py`, `empaquetar_motor.mjs`, `motor.worker.ts` (dedicado) y una
   e2e en Chromium que obtiene `/api/salud` y `cambio` de La Segua por el motor. **Si falla, se para, se anota en
   `INFORME.md` y se vuelve al usuario con el plan B (Vercel).**
3. `llamar()` en modo `navegador`, `claveDePeticion`, consulta del precálculo.
4. Ruta base (`basename`, `conBase`, iframes, «Copiar enlace», `grep`).
5. `requests_navegador.py` y teselas.
6. `SharedWorker` con caída a `Worker`.
7. `AvisoMotor`, `api.error.motor_no_disponible`, tres idiomas (kichwa como borrador sin validar).
8. `precalcular.mjs`.
9. `construir_pages.sh` y proyecto Playwright `pages`.
10. `.github/workflows/pages.yml`.
11. `CLAUDE.md`, README (es/en) con la URL pública y el aviso de primera carga, `INFORME.md` con las cifras del spike.

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| No funciona en Chromium real | Prueba mínima en el paso 2; plan B Vercel |
| Memoria en móvil (~600 MB) | Lo precalculado sigue; error legible; anotado en `INFORME.md` |
| Chrome Android sin `SharedWorker` | Un worker por documento; casi todos los pasos del Recorrido están precalculados |
| Una simulación de 33 s ocupa el motor | Estados de carga existentes; lo precalculado no espera |
| Primera visita lenta (25 MB) | Carga en segundo plano mientras se lee la portada; el aviso dice el tamaño |
| Desaparecen las teselas de AWS | Teselas propias y terreno sintético declarado |
| Cambios futuros de Pyodide | Autoalojado y con versión exacta |
| Precálculo desfasado | Se genera en el mismo workflow y commit |

## 8. Cambios en `CLAUDE.md`

- «No se toca `main`» → «Se trabaja en ramas; se integra en `main` con permiso; **cada push a `main` publica la
  app en GitHub Pages**».
- Arquitectura: `frontend/src/motor/` (la API corre en el navegador con Pyodide en modo `navegador`; en local, en
  el servidor).
- Regla nueva: toda dependencia Python nueva de `api/`, `datos/` o `modelo/` debe existir en la distribución de
  Pyodide, y el código debe funcionar en Python 3.13 (local) y en el de la versión de Pyodide fijada (hoy 3.14).
- Se mantiene: «Nada de lógica científica en el frontend» (el motor solo transporta; la ciencia sigue en Python).
- Tabla de comandos: `bash scripts/construir_pages.sh`, `npx playwright test --project=pages`.

## 9. Fuera de alcance

Dominio propio, analítica, Service Worker o modo sin conexión, soporte de móviles de gama baja para el motor,
reescritura de la física en TypeScript, cambiar la visibilidad del repositorio (decisión del usuario).

## 10. Reglas de ejecución

- Un commit por paso; pruebas y build en verde antes de seguir (`CLAUDE.md`).
- `modelo/`, `app.py` e `interfaz/` no se tocan.
- Sin `git push` durante la ejecución; al final se pide permiso.
- Red solo para npm, PyPI y la CDN de Pyodide (descarga verificada de librerías). Sin datos de NISAR.
