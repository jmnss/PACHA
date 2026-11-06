# Despliegue público (GitHub Pages + Hugging Face Spaces) — Diseño

Fecha: 2026-11-06 · Rama: `migracion-react` (integrada en `main` el 2026-11-06 con permiso del usuario) ·
Estado: secciones 1 y 2 aprobadas en conversación; pendiente de revisión escrita.

## 1. Propósito

`docs/challenge.md` pide una «solución de código abierto, fácil de usar» y que los datos sean «accesibles a un
público amplio». Hoy la app solo corre en `localhost`. Este diseño la deja lista para publicarse en una URL
que el jurado pueda abrir, sin cambiar su comportamiento local.

### Decisiones del usuario (no se reabren)

| Tema | Decisión |
|---|---|
| Frontend | GitHub Pages (`https://jmnss.github.io/NISAR-Ecuador/`) |
| API | Aparte, en Hugging Face Spaces (Docker, plan gratuito) |
| Visibilidad | **Todo privado por ahora**: repositorio privado, Space privado, Pages sin activar |
| Rama desplegada | `main` |

### Criterios de éxito

1. Con las variables nuevas vacías, todo se comporta como hoy: `python servidor.py`, `npm run dev`, todas
   las suites (pytest, unittest, vitest, lint, build, Playwright) en verde sin cambios en sus comandos.
2. **Fase 1:** el Space privado compila y sirve la app completa (API + frontend) en su URL; el usuario la
   prueba con su sesión de Hugging Face.
3. **Fase 2:** tras tres pasos manuales sin tocar código (Space público, `PAGES_ACTIVO=si`, Pages con origen
   «GitHub Actions»), `https://jmnss.github.io/NISAR-Ecuador/` funciona en todas las pantallas, incluido el
   Simulador, y recargar cualquier ruta funciona.
4. La banda «DATOS DE DEMOSTRACIÓN» se ve en ambas URL, también mientras la API no responde.
5. Si la API está dormida, la app lo dice en lugar de mostrar errores sueltos.

## 2. Fases

**Fase 1 (privada, este plan).** El código, el Dockerfile y el workflow quedan en `main`. El Space privado
sirve la app completa. El trabajo `pages` del workflow no corre (variable `PAGES_ACTIVO` distinta de `si`):
no se publica nada. Pages, aunque el repo sea privado, sería público; por eso no se activa todavía. Un Space
privado no puede usarse desde Pages sin poner un token en el navegador, lo que está prohibido.

**Fase 2 (pública, la hace el usuario cuando decida).** (1) Space → público; (2) variable del repositorio
`PAGES_ACTIVO=si`; (3) Settings → Pages → Source «GitHub Actions»; (4) opcional: repositorio público
(«código abierto» del challenge). Volver a ejecutar el workflow.

## 3. Cambios en el código

### 3.1 Frontend

| Archivo | Cambio |
|---|---|
| `frontend/src/api/cliente.ts` | `llamar()` antepone `import.meta.env.VITE_API_URL` (sin barra final) a la URL `/api/...` solo si es una cadena no vacía. Función pura exportada `urlApi(ruta, base)` para probarla. |
| `frontend/vite.config.ts` | `base: process.env.VITE_BASE \|\| '/'`. |
| `frontend/src/main.tsx` | `<BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') \|\| undefined}>`. |
| `frontend/src/rutaBase.ts` (nuevo) | `conBase(ruta: string, base: string = import.meta.env.BASE_URL): string` = `base` sin barra final + `ruta` (ruta empieza por `/`). Única fuente de la base para lo que no pasa por el router. |
| `frontend/src/pantallas/recorrido/Recorrido.tsx` | El `src` del iframe usa `conBase(conIncrustado(paso.ruta))`. |
| `frontend/src/pantallas/simulador/ResultadosEvento.tsx` | «Copiar enlace» usa `window.location.origin + conBase('/simulador') + consulta`. |
| `frontend/src/diseno/AvisoServidor.tsx` (nuevo) | Ver §5. Se monta en `Estructura` bajo la banda de demostración; no se muestra en modo incrustado. |
| `frontend/src/vite-env.d.ts` | Tipos de `VITE_API_URL` (opcional). |
| Catálogos `es`/`en`/`qu` (área `comun`) | Claves de `AvisoServidor` (kichwa como borrador sin validar, como el resto). |

Toda otra navegación interna ya usa React Router (`Link`, `useNavigate`) y hereda `basename`. El plan incluye
un paso de búsqueda (`grep`) de `href="/`, `src="/"`, `window.location` y `fetch(` para confirmar que no
queda ninguna ruta absoluta sin base; lo que aparezca se corrige con `conBase`.

### 3.2 API y servidor

| Archivo | Cambio |
|---|---|
| `api/app.py` | Si `NISAR_CORS_ORIGENES` (lista separada por comas) no está vacía, añade `CORSMiddleware` con esos orígenes, métodos `GET, POST`, cabecera `Content-Type`, sin credenciales. Vacía: sin CORS (como hoy). |
| `servidor.py` | `uvicorn.run(app, host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "8000")))`. |
| `api/rutas/simulador.py` | Semáforo no bloqueante (`threading.BoundedSemaphore(2)`) alrededor de `POST /evento`: si no se obtiene, 503 con `mensaje` «El simulador está ocupado; inténtalo en unos segundos.» y `clave_texto` `api.error.simulador_ocupado`. Registrar la clave en `datos/claves.py`, regenerar `api/claves.json` y añadirla a los tres catálogos. |
| `requirements-servidor.txt` (nuevo) | Solo lo que importa el servidor: `numpy`, `pandas`, `Pillow`, `fastapi`, `uvicorn[standard]`, `pydantic`, con las versiones de `requirements-api.txt` y las instaladas hoy (`pip freeze` del entorno) para numpy, pandas y Pillow. Sin pytest, httpx, streamlit ni geopandas. |

### 3.3 Empaquetado y workflow

- `Dockerfile` (raíz), dos etapas:
  1. `node:22-slim`: `npm ci` y `npm run build` en `frontend/` con base `/` y sin `VITE_API_URL`.
  2. `python:3.13-slim`: usuario no root con UID 1000 (requisito de Spaces), `pip install --no-cache-dir -r
     requirements-servidor.txt`, copia `servidor.py`, `api/`, `datos/`, `modelo/`, `data/` y el `dist`
     de la etapa 1; `ENV HOST=0.0.0.0 PORT=7860 NISAR_PROVEEDOR=demo`; `EXPOSE 7860`; `CMD ["python", "servidor.py"]`.
- `.dockerignore`: `node_modules`, `frontend/dist`, `.git`, `.venv`, `__pycache__`, `docs/capturas-nuevas`,
  `test-results`, `playwright-report`, `archivo/`, `interfaz/`, `app.py`, `.superpowers`.
- `despliegue/space-README.md`: cabecera YAML del Space (`title: NISAR · Ecuador`, `sdk: docker`,
  `app_port: 7860`, `pinned: false`) y un párrafo con el aviso de datos de demostración y el enlace al
  repositorio. La Action lo sube como `README.md` del Space.
- `.github/workflows/desplegar.yml`, en `push` a `main` y `workflow_dispatch`:
  - **`space`**: si `secrets.HF_TOKEN` o `vars.HF_SPACE` están vacíos, imprime un aviso y termina en verde.
    Si no, arma una carpeta temporal con los archivos del Dockerfile, `Dockerfile`, `.dockerignore`,
    `requirements-servidor.txt` y `despliegue/space-README.md` como `README.md`, y la sube con
    `hf upload <HF_SPACE> <carpeta> . --repo-type space` (paquete `huggingface_hub` de PyPI).
  - **`pages`**: solo si `vars.PAGES_ACTIVO == 'si'`. Node 22, `npm ci`, `npm run build` con
    `VITE_BASE=/NISAR-Ecuador/` y `VITE_API_URL=${{ vars.HF_SPACE_URL }}`, copia `dist/index.html` a
    `dist/404.html`, y publica con `actions/upload-pages-artifact` + `actions/deploy-pages`
    (permisos `pages: write`, `id-token: write`).
  - Las acciones se fijan a versiones mayores existentes (`actions/checkout@v4`, `actions/setup-node@v4`,
    `actions/setup-python@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`).

**Variables y secretos (los define el usuario; Claude no crea cuentas ni maneja credenciales):**

| Nombre | Tipo | Ejemplo |
|---|---|---|
| `HF_TOKEN` | secreto del repo | token de Hugging Face con permiso de escritura |
| `HF_SPACE` | variable del repo | `jmnss/nisar-ecuador` |
| `HF_SPACE_URL` | variable del repo | `https://jmnss-nisar-ecuador.hf.space` |
| `PAGES_ACTIVO` | variable del repo | `si` solo en la fase 2 |
| `NISAR_CORS_ORIGENES` | variable del Space | `https://jmnss.github.io` |

## 4. Honestidad

- Nada cambia en la banda, los sellos ni las exportaciones. `NISAR_PROVEEDOR=demo` fijo en la imagen.
- El README del Space empieza con el aviso «DATOS DE DEMOSTRACIÓN: no son observaciones reales de NISAR».
- `AvisoServidor` no oculta ni sustituye la banda.

## 5. Arranque en frío: `AvisoServidor`

- Observa la consulta `salud` existente (`useSalud`). Estados: `ok` (no muestra nada), `despertando` (la
  consulta lleva ≥ 4 s sin respuesta o falló por red y aún no pasan 120 s desde el primer intento),
  `caido` (120 s sin respuesta).
- `despertando`: «El servidor se está despertando; puede tardar hasta un minuto.» con `role="status"`.
- `caido`: «No se pudo conectar con el servidor.» y botón «Reintentar» que reinicia el ciclo; `role="alert"`.
- Reintentos de `salud` cada 5 s mientras no esté `ok` (`refetchInterval` condicionado); cuando responde,
  TanStack Query reintenta las consultas fallidas (`queryClient.invalidateQueries()`) una vez.
- Estilo: tokens de `tokens.css`, sin colores nuevos; respeta `docs/diseno.md` §12. Sin animación (o con
  `prefers-reduced-motion` respetado).
- Si despierta el Space una petición a `*.hf.space` desde Pages, o solo abrir su página: **por comprobar en
  la fase 2**; se anota en `INFORME.md`.

## 6. Pruebas

| Capa | Pruebas |
|---|---|
| pytest | `test_sin_cors_por_defecto` (sin cabecera `access-control-allow-origin`); `test_cors_con_origen_permitido` y `test_cors_rechaza_otro_origen` (con `NISAR_CORS_ORIGENES=https://jmnss.github.io`); `test_servidor_lee_host_y_puerto` (monkeypatch de `uvicorn.run`); `test_simulador_ocupado_503_con_clave` (semáforo agotado a mano); `test_requirements_servidor_cubre_importaciones` (los módulos de terceros importados por `api/`, `datos/`, `modelo/{nisar,estaciones,desastres}.py` están en `requirements-servidor.txt`, con tabla de nombres `PIL`→`Pillow`); `claves.json` al día |
| vitest | `urlApi` con base vacía, con base y con base con barra final; `conBase` con `BASE_URL` `/` y `/NISAR-Ecuador/`; `AvisoServidor` en los tres estados con temporizadores simulados; la nueva clave está en los tres catálogos |
| Playwright | proyecto `pages`: build con `VITE_BASE=/NISAR-Ecuador/` y `VITE_API_URL=http://127.0.0.1:8000` en una carpeta propia, `vite preview --port 4174`, API con `NISAR_CORS_ORIGENES=http://localhost:4174`. Casos: carga `/NISAR-Ecuador/` con la banda visible y datos; recarga directa de `/NISAR-Ecuador/observatorio`; el iframe del recorrido apunta a `/NISAR-Ecuador/...?incrustado=1` y carga |
| Regresión | las suites actuales con sus comandos de `CLAUDE.md`, sin variables nuevas |
| Visual | El inspector no puede retener `/api/salud`, así que `AvisoServidor` se revisa con capturas de Playwright a 1440, 768 y 390 px (interceptando `/api/salud` con `page.route` para que no responda), guardadas en `docs/capturas-nuevas/aviso-servidor/`; sin código de prueba en producción. `revision_visual.sh /` debe seguir en 0 FAIL |
| Manual (usuario, fase 1) | build del Space en verde; app completa en la URL privada; tiempos de `incendio`, `tormenta` e `inundacion` y memoria anotados en `INFORME.md`. Si `tormenta` pasa de 60 s, se anota como tarea aparte (precalcular mundos), sin bloquear |

No hay Docker en el entorno de desarrollo y no se instalan paquetes del sistema: la imagen se compila por
primera vez en Hugging Face (verificación manual de la fase 1).

## 7. Fuera de alcance

Dominio propio, CDN, analítica, autenticación, réplicas, precálculo de mundos del simulador, cambiar la
visibilidad del repositorio o del Space (lo hace el usuario).

## 8. Reglas de ejecución

- Un commit por tarea; pruebas y build en verde antes de seguir (`CLAUDE.md`).
- `modelo/`, `app.py` e `interfaz/` no se tocan.
- Sin `git push` durante la ejecución; al final se pide permiso para subir a `main`.
- Sin crear cuentas ni usar credenciales: el usuario crea el Space, el token y las variables.
- `CLAUDE.md`: actualizar «No se toca `main`» por «Se trabaja en ramas; se integra en `main` con permiso» y
  añadir el despliegue a la tabla de comandos y a «Arquitectura».
