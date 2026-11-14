# CLAUDE.md — PACHA

Instrucciones del proyecto para Claude Code. La app Streamlit heredada (`app.py`, `interfaz/`) se retiró el 2026-11-14;
su último estado está en la etiqueta `legado-streamlit`.

## Qué es

**PACHA** (antes «NISAR · Ecuador»; repositorio `jmnss/PACHA`, publicado en `https://jmnss.github.io/PACHA/`).
Proyecto para el NASA Space Apps Challenge «Dancing with the SARs» (`docs/challenge.md`). Una app web
abierta que muestra cómo el radar NISAR ve **inundaciones y humedales** (historia principal, Costa baja
de Ecuador) e **incendios forestales** (segunda historia, Sierra), con un observatorio para los seis
tipos de cambio. Se migra de Streamlit a React en la rama `migracion-react`. Se trabaja en ramas; se integra en `main` con permiso;
**cada push a `main` publica la app en GitHub Pages**.

**Situación de los datos (fase de datos reales, desde 2026-11-14, rama `datos-reales`):** ya están los
recursos oficiales del challenge (`docs/challenge.md`, «Recursos») y NISAR publica productos de banda L en ASF
DAAC (BETA, PROVISIONAL y VALIDATED; ver `docs/nisar-verificado.md`). La app sigue funcionando con **datos de
demostración sintéticos** (`scripts/generar_datos_demo.py`) detrás de una capa de datos intercambiable mientras
el proveedor real se construye según la sección «Integración de datos reales» del plan. La app será **mixta**:
cada capa dice de dónde sale.

**Al empezar una sesión, lee primero `docs/retomar.md`** (estado, decisiones y pendientes en una página).

**Foco actual (decisión del equipo, 2026-11-14):** embalses y lluvia + incendios, en una página con dos opciones;
el equipo segmenta el agua y la app solo lee sus resultados (`docs/datos-equipo-embalses.md`). Se trabaja en la rama
`embalses`; el material crudo del equipo va en `datos_imagenes/` (fuera de git).

Documentos que mandan: `docs/challenge.md` (qué lograr), `docs/plan-migracion.md` (tareas, orden,
alcance de la noche, contratos), `docs/diseno.md` (visual), `docs/contrato-datos.md` (datos). El avance y
los problemas van a `INFORME.md`.

## Reglas de oro

1. **Toda decisión de producto se evalúa contra `docs/challenge.md`; si una tarea no sirve a los
   objetivos del challenge, no se hace.**
2. **No pases a la siguiente tarea si las pruebas o el build fallan.**
3. **Un commit por tarea**, con el mensaje que indica el plan.
4. **Todo el frontend sigue `docs/diseno.md`** y se verifica en navegador real a tres anchos (1440, 768,
   390) con `bash scripts/revision_visual.sh <ruta> <nombre>`.
5. **Datos reales: metadatos libres, descargas solo con la credencial del usuario y fuera del repo.**
   - Se permite consultar el catálogo de ASF/Earthdata **solo para metadatos** (granulos, fechas, huellas,
     polarizaciones, tamaños), que no exige cuenta (`scripts/explorar_catalogo.py`).
   - Las **descargas** de granulos NISAR solo cuando el usuario avise de que su credencial de Earthdata existe.
     La credencial vive en `~/.netrc` o en `EARTHDATA_TOKEN`, fuera del repo: **nunca se escribe, se imprime,
     se registra en un log ni se pone en un commit**. No se crean cuentas; no se registra nadie en SAOCOM,
     RCM ni Bhoonidhi.
   - Los HDF5 crudos van a `data/nisar/crudo/` (en `.gitignore`) y **nunca se versionan**. Solo se versionan
     los derivados pequeños (`data/nisar/<zona>/`, con su `procedencia.json`) dentro del presupuesto de MB
     que fije el spec.
6. **No inventes detalles técnicos de NISAR** (productos, rutas de archivos, bandas, URLs, fechas de la
   misión). Lo verificado se registra en `docs/nisar-verificado.md` con la URL, la fecha de consulta y una
   cita corta. **Solo lo que está en ese archivo puede dejar de decir «pendiente de confirmar con la
   documentación oficial»**; todo lo demás sigue marcado. El código heredado de `modelo/nisar.py:1550-1820` y
   `nisar.MISION` se revisó contra ese archivo (su §5): lo que no figura allí como verificado no lo está.
7. **Honestidad en una app mixta.** Nunca se presenta como real lo que no lo es.
   - Cada capa, serie y exportación lleva `origen` (`nisar`, `otro_sensor`, `sintetico` o `complementario`)
     y su **procedencia**: producto, colección, id del granulo, fecha de adquisición, polarización, frecuencia
     (A/B) y madurez (BETA, PROVISIONAL o VALIDATED).
   - **Una capa real sin procedencia completa no se muestra.**
   - La banda «DATOS DE DEMOSTRACIÓN» se muestra siempre que haya algo sintético en pantalla.
   - El Simulador sigue siendo 100 % sintético.
   - Las hipótesis sobre datos sintéticos se redactan como ejemplos ilustrativos; las hipótesis sobre datos
     reales, como **hipótesis** por comprobar, nunca como conclusiones. Un evento real (fecha, lugar) solo se
     nombra con su fuente.

## Arquitectura

- `datos/` — contrato de datos (`contrato.py`) y proveedores: `demo` (sintético, hoy) y `real`
  (esqueleto). Se elige con `NISAR_PROVEEDOR=demo|real` (por defecto `demo`).
- `api/` — FastAPI sin estado. **Solo habla con el contrato de `datos/`, nunca con `modelo/` directamente**
  (excepto `/api/contexto`, que usa los datos reales complementarios de `modelo/estaciones.py`).
- `frontend/` — React 18 + Vite + TypeScript. Estado en la URL y en el navegador; sin cuentas.
- `frontend/src/motor/` — en modo `navegador` (GitHub Pages, `VITE_MOTOR=navegador`) la API corre en el navegador con
  Pyodide en un Web Worker; en local (`servidor`) sigue corriendo en el servidor. El motor solo transporta: la ciencia
  sigue en Python (nada de lógica científica en el frontend).
- **Dependencias Python:** toda dependencia nueva de `api/`, `datos/` o `modelo/` debe existir en la distribución de
  Pyodide, y el código debe funcionar en Python 3.13 (local) y en el de la versión de Pyodide fijada (hoy 3.14).
  `tests/motor/test_compatibilidad_pyodide.py` lo vigila.
- `scripts/preparar_datos_reales.py` — preparación **fuera de línea** (descarga con permiso, recorte, dB,
  reducción y cuantización) a `data/nisar/<zona>/`. Sus dependencias (`requirements-preparacion.txt`:
  `asf_search`, `earthaccess`, `h5py`…) **nunca** se importan desde `api/`, `datos/` ni `modelo/`; la app solo lee
  los derivados.
- `modelo/` — física y generador sintético. Solo se modifica en la Tarea 0.3 o para corregir un error
  con su prueba.
- `python servidor.py` sirve la API y `frontend/dist` en `http://localhost:8000`.

## Comandos

Siempre primero, en cada shell: `source scripts/entorno.sh` (Node 22 con nvm, `CHROME_PATH`,
`NISAR_PROVEEDOR`). Python es `python` (3.13, miniforge).

| Tarea | Comando |
|---|---|
| Instalar Python | `python -m pip install -r requirements.txt -r requirements-api.txt` |
| Generar datos de demostración | `python scripts/generar_datos_demo.py` |
| Explorar el catálogo NISAR (solo metadatos) | `python -m pip install -r requirements-preparacion.txt && python scripts/explorar_catalogo.py` |
| Instalar frontend | `cd frontend && npm install` |
| Correr todo (producción) | `cd frontend && npm run build && cd .. && python servidor.py` |
| Desarrollo | `python servidor.py` y en otra terminal `cd frontend && npm run dev` (http://localhost:5173) |
| Pruebas del núcleo | `python -m unittest modelo.clima modelo.desastres` |
| Pruebas de datos y API | `python -m pytest tests -q` |
| Pruebas del frontend | `cd frontend && npm test` |
| Lint del frontend | `cd frontend && npm run lint` |
| Sitio de Pages (precálculo + motor + build) | `bash scripts/construir_pages.sh` |
| E2e del modo Pages | `cd frontend && npx playwright test -c playwright.pages.config.ts` |
| Tipos desde la API | `python scripts/exportar_openapi.py && cd frontend && npm run tipos` |
| Extremo a extremo | `cd frontend && npx playwright test` |
| Revisión visual de una pantalla | `bash scripts/revision_visual.sh <ruta> <nombre>` |
| Revisión visual en otro idioma | `bash scripts/revision_visual.sh <ruta> <nombre> <es\|en\|qu>` |
| Claves de texto de la API (`api/claves.json`) | `python scripts/exportar_claves_api.py` |
| Kichwa: exportar / importar el CSV de revisión | `node scripts/traducciones_csv.mjs exportar` · `node scripts/traducciones_csv.mjs importar docs/traduccion-kichwa.csv` |

## Convenciones

- Python: el estilo del código existente (español, comentarios útiles); tipos en las firmas de `datos/` y `api/`.
- TypeScript: modo estricto, componentes de función, un componente por archivo; nombres de dominio en
  español (`Observatorio`, `CintaPasadas`), técnicos en inglés (`usePlayback`).
- Archivos pequeños con una sola responsabilidad. Nada de lógica científica en el frontend.
- Textos de interfaz y errores en español llano; cada término técnico con su explicación (`Termino`).
- Sin secretos en el código; `.env` nunca se versiona. Validar toda entrada externa.

## Diseño

- Todo el frontend sigue `docs/diseno.md`; colores, tamaños y radios salen de
  `frontend/src/diseno/tokens.css` y las rampas de `frontend/src/diseno/rampas.ts`. Nada de valores sueltos.
- Usa Taste Skill (`design-taste-frontend`, en `.claude/skills/`) para cualquier pantalla nueva, por el
  camino de apps (`lint.mjs --app`, `inspect.mjs --app`).
- Capturas en `docs/capturas-nuevas/<nombre>/`. Máximo tres rondas de corrección por pantalla; lo
  pendiente va a `INFORME.md` y se sigue.
- No uses componentes ni estilos genéricos fuera del sistema de diseño. La lista «anti-slop» de
  `docs/diseno.md §12` es obligatoria.
- Si Superpowers y Taste Skill chocan: Superpowers manda sobre el proceso y el orden; Taste Skill sobre lo visual.

## Si algo se bloquea

Anótalo en `INFORME.md` (qué, por qué, qué intentaste), aparta lo incompleto con `git stash` si rompe el
build y sigue con la siguiente tarea cuya dependencia esté cumplida. El bloque 5 del plan (cierre) se
ejecuta siempre.

## Prohibido sin pedir permiso

Descargar granulos de NISAR sin el aviso del usuario de que su credencial existe; crear cuentas; escribir,
imprimir o versionar credenciales; versionar HDF5 crudos; borrar `data/`, `modelo/`
o la historia de git; `git push`; instalar paquetes del sistema; modificar la rama `main`.
