# PACHA

*Antes «NISAR · Ecuador».*

English: [README.md](README.md)

> **AVISO: DATOS DE DEMOSTRACIÓN.** Todo lo que muestra esta app es **sintético**, producido por un generador reproducible (`scripts/generar_datos_demo.py`, semilla fija). **Nada es una observación real de NISAR.** La app muestra siempre una banda naranja «DATOS DE DEMOSTRACIÓN» y cada capa y exportación lleva su origen. El proveedor de datos reales (`NISAR_PROVEEDOR=real`) es un **esqueleto** que falla con un mensaje claro hasta que estén los recursos oficiales del challenge. Los detalles técnicos de NISAR (productos, bandas, fechas) están *pendientes de confirmar con la documentación oficial*. La única excepción es el contexto climático (climatología de NASA POWER): es dato real complementario, no es de NISAR ni viene del radar; todo lo demás es sintético.

## Qué es

Una app web abierta que muestra cómo el radar NISAR (NASA-ISRO) puede «ver» **inundaciones y humedales** (historia principal, Costa baja de Ecuador) e **incendios forestales** (segunda historia, Sierra), con un observatorio para los seis tipos de cambio que menciona el challenge. Se hizo para el NASA Space Apps Challenge **«Dancing with the SARs»**, cuyo objetivo (resumen propio, no el texto oficial) es una app interactiva y fácil de usar que traduzca observaciones de radar en información legible sobre cambios en la superficie. Ver [docs/challenge.md](docs/challenge.md).

- **Historias** (`/`): lectura guiada de cada caso, con comparador antes/después, polarizaciones, cinta de pasadas e hipótesis ilustrativas.
- **Observatorio** (`/observatorio`): vistas Mapa, Antes y después y Serie, mediciones y un panel de simulación. El mapa es una carta geográfica con mapas base Oscuro, Satélite y Relieve de **Esri**, que se piden por internet (sin clave ni cuenta); sin conexión sigue funcionando con las provincias locales y las ciudades principales, sin las etiquetas ni el terreno de Esri.

- **Laboratorio del radar** (`/laboratorio`): «La nube no lo detiene» (el óptico se pierde con nubes y el radar sigue viendo) y «Polarización y banda» (qué polarización resalta cada cambio). Escena genérica con coeficientes ilustrativos; la banda S es solo un ejemplo, pendiente de confirmar.
- **Impacto** (pestaña del Observatorio, inundación e incendio): hectáreas afectadas, evolución, lectura en lenguaje llano e informe de una página en PNG, con acciones condicionales («si esto fuera un evento real…»).
- **Recorrido** (`/recorrido`): la historia completa en 90 segundos, con pantallas reales incrustadas.
- **Fundamentos** (`/fundamentos`): la física del radar; lo específico de NISAR queda pendiente de confirmar.

## Idioma y accesibilidad

- **Idioma:** selector en el riel con español, English y Kichwa. El cambio es inmediato, sin recargar ni repetir peticiones, y se recuerda en el navegador. El kichwa es un **borrador en revisión por hablantes** (0 de 923 claves validadas; la app muestra un aviso). Para revisarlo: [docs/guia-traduccion-kichwa.md](docs/guia-traduccion-kichwa.md) y [docs/traduccion-kichwa.csv](docs/traduccion-kichwa.csv). La banda de datos de demostración y los sellos de origen se muestran en los tres idiomas.
- **Accesibilidad:** el objetivo es WCAG 2.2 AA. Lo medido: auditoría automática con axe (6 pantallas × 3 idiomas × 2 anchos, sin infracciones graves ni críticas), recorrido solo con teclado y reflujo a 320 px sin scroll horizontal. **No** se ha hecho aún una prueba con lector de pantalla (NVDA u Orca) con personas, así que no se afirma cumplimiento total. Detalle en [INFORME.md](INFORME.md).

## Simulador de eventos

En `/simulador` (antes «Modo Dios» de la app Streamlit) puedes provocar un incendio, una tormenta, una crecida, un terremoto o una erupción sobre el relieve de Ecuador y ver cómo lo vería un radar como NISAR, cuánto tardaría en volver a pasar (ciclo supuesto, pendiente de confirmar) y compartir el escenario por enlace. Todo es simulación y va marcado como datos de demostración.

## Versión publicada

La app está publicada en **https://jmnss.github.io/PACHA/** (GitHub Pages, sitio estático sin servidor). Todo se
calcula en tu navegador: la API Python corre allí con Pyodide. La primera visita descarga unos 25 MB; lo precalculado
(portada, historias y escenarios) se ve de inmediato. El Simulador puede tardar hasta un minuto en tormentas e
inundaciones, y los móviles de gama baja pueden no cargar el motor. El aviso de datos de demostración no cambia: los
datos son sintéticos.

## Instalación y arranque

Requiere Python 3.13 y Node 22. En este repo, `source scripts/entorno.sh` prepara Node 22 (nvm), `CHROME_PATH` y el proveedor.

```bash
python -m pip install -r requirements.txt -r requirements-api.txt
python scripts/generar_datos_demo.py     # opcional: la app no lo necesita
cd frontend && npm install && npm run build && cd ..
python servidor.py                        # API + frontend en http://localhost:8000
```

Comprobación: `curl http://localhost:8000/api/salud` devuelve `"hay_sinteticos":true`.

**Desarrollo:** `python servidor.py` y, en otra terminal, `cd frontend && npm run dev` (http://localhost:5173).

**Proveedor de datos:** `NISAR_PROVEEDOR=demo|real` (por defecto `demo`). `real` es un esqueleto.

## Pruebas

```bash
python -m pytest tests -q                       # datos y API
python -m unittest modelo.clima modelo.desastres # núcleo científico
cd frontend && npm test && npm run lint         # vitest y eslint
cd frontend && npx playwright test              # extremo a extremo (necesita CHROME_PATH y el frontend compilado)
```

## Arquitectura

- `datos/`: contrato de datos (`contrato.py`) y proveedores: `demo` (sintético) y `real` (esqueleto). Contrato: [docs/contrato-datos.md](docs/contrato-datos.md).
- `api/`: FastAPI sin estado; solo habla con el contrato de `datos/` (salvo `/api/contexto`, que usa datos complementarios de `modelo/estaciones.py`).
- `frontend/`: React 18 + Vite + TypeScript; el estado vive en la URL y en el navegador, sin cuentas.
- `modelo/`: física y generador sintético.
- `frontend/src/motor/`: en la versión publicada la API corre en el navegador (Pyodide en un Web Worker).
- Docs: [challenge](docs/challenge.md), [diseño](docs/diseno.md), [guion de presentación](docs/historia-datos.md).

## App Streamlit heredada

La app original sigue funcionando y no se modifica: `python app.py` (http://localhost:8501). Su README está en [docs/README-streamlit.md](docs/README-streamlit.md).

## Requisitos de entrega

Requisitos oficiales de entrega: pendiente de confirmar.

## Licencia y créditos

MIT ([LICENSE](LICENSE)); provisional, pendiente de confirmar por el equipo. Fuentes de datos, tipografía y referencias: [CREDITOS.md](CREDITOS.md).
