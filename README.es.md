# NISAR · Ecuador

English: [README.md](README.md)

> **AVISO: DATOS DE DEMOSTRACIÓN.** Todo lo que muestra esta app es **sintético**, producido por un generador reproducible (`scripts/generar_datos_demo.py`, semilla fija). **Nada es una observación real de NISAR.** La app muestra siempre una banda naranja «DATOS DE DEMOSTRACIÓN» y cada capa y exportación lleva su origen. El proveedor de datos reales (`NISAR_PROVEEDOR=real`) es un **esqueleto** que falla con un mensaje claro hasta que estén los recursos oficiales del challenge. Los detalles técnicos de NISAR (productos, bandas, fechas) están *pendientes de confirmar con la documentación oficial*. La única excepción es el contexto climático (climatología de NASA POWER): es dato real complementario, no es de NISAR ni viene del radar; todo lo demás es sintético.

## Qué es

Una app web abierta que muestra cómo el radar NISAR (NASA-ISRO) puede «ver» **inundaciones y humedales** (historia principal, Costa baja de Ecuador) e **incendios forestales** (segunda historia, Sierra), con un observatorio para los seis tipos de cambio que menciona el challenge. Se hizo para el NASA Space Apps Challenge **«Dancing with the SARs»**, cuyo objetivo (resumen propio, no el texto oficial) es una app interactiva y fácil de usar que traduzca observaciones de radar en información legible sobre cambios en la superficie. Ver [docs/challenge.md](docs/challenge.md).

- **Historias** (`/`): lectura guiada de cada caso, con comparador antes/después, polarizaciones, cinta de pasadas e hipótesis ilustrativas.
- **Observatorio** (`/observatorio`): vistas Mapa, Antes y después y Serie, mediciones y un panel de simulación. El mapa es una carta geográfica con mapas base Oscuro, Satélite y Relieve de **Esri**, que se piden por internet (sin clave ni cuenta); sin conexión sigue funcionando con las provincias locales y las ciudades principales, sin las etiquetas ni el terreno de Esri.

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
- Docs: [challenge](docs/challenge.md), [diseño](docs/diseno.md), [guion de presentación](docs/historia-datos.md).

## App Streamlit heredada

La app original sigue funcionando y no se modifica: `python app.py` (http://localhost:8501). Su README está en [docs/README-streamlit.md](docs/README-streamlit.md).

## Requisitos de entrega

Requisitos oficiales de entrega: pendiente de confirmar.

## Licencia y créditos

MIT ([LICENSE](LICENSE)); provisional, pendiente de confirmar por el equipo. Fuentes de datos, tipografía y referencias: [CREDITOS.md](CREDITOS.md).
