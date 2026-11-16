# PACHA

**NASA Space Apps Challenge 2026 · «Dancing with the SARs»**

PACHA es una app web abierta que convierte las observaciones del radar de banda L de NISAR en mapas y cifras legibles sobre el cambio de la superficie en Ecuador: embalses que se reducen y un incendio forestal.

**App en línea:** https://jmnss.github.io/PACHA/ · English: [README.md](README.md)

## Qué muestra

Datos reales NISAR L2 GCOV (banda L, polarizaciones HH/HV, píxel de unos 10 m, en dB), procesados por el equipo a partir de granulos publicados en ASF DAAC, sobre tres sitios:

| Sitio | Resultado (medición del equipo) |
|---|---|
| Embalse Mazar | Agua: 7,08 -> 5,67 km2 (-19,9 % en 77 días) |
| Embalse Daule-Peripa | 116,0 -> 113,4 km2 (-2,2 %) |
| Incendio del cerro Casitagua (17 sep 2026) | Máscara de quemado del equipo: 19,4 km2, frente a 300 ha publicadas por la prensa; cambio en el RFDI (índice radar de degradación forestal) |

La comparación de Casitagua y cualquier lectura de estos cambios se presentan como **hipótesis por comprobar**, no como conclusiones. Cada capa indica su procedencia (producto, fecha de adquisición, polarizaciones, procesado por el equipo). Los datos de prensa de las fichas (`data/*/*/ficha.json`) citan fuente, URL y cita textual.

## Cuatro destinos

- **Inicio**: qué es PACHA y por dónde empezar.
- **Explorar**: *Historias* (lecturas guiadas de cada caso, antes/después) y *Observatorio* (exploración libre de capas y pasadas).
- **Simular**: simulador de eventos (100 % sintético, y así se rotula) con acciones sugeridas, cada una con su fuente citada.
- **Aprender**: *Fundamentos* (cómo ve el radar), *Laboratorio*, *Recorrido* y *Cómo lo hacemos* (método).

Tres idiomas: español, inglés y kichwa (el kichwa está en borrador, pendiente de revisión).

Accesibilidad: objetivo WCAG 2.2 AA; pruebas automáticas con axe en CI.

## Arquitectura

- Frontend: React 18 + Vite + TypeScript.
- Backend: FastAPI sin estado, que solo lee un contrato de datos (`datos/`). En GitHub Pages no hay servidor: la misma API corre **en el navegador con Pyodide** en un Web Worker.
- La preparación fuera de línea (`scripts/preparar_datos_reales.py`) descarga y reduce granulos NISAR a derivados pequeños en `data/`; los HDF5 crudos nunca se versionan.

## Correr en local

```bash
source scripts/entorno.sh
python -m pip install -r requirements.txt -r requirements-api.txt
cd frontend && npm install && npm run build && cd ..
python servidor.py          # http://localhost:8000
```

Desarrollo: `python servidor.py` y `cd frontend && npm run dev` (http://localhost:5173). Pruebas: `python -m pytest tests -q`, `cd frontend && npm test`.

## Fuentes de datos

- NISAR L2 GCOV (banda L), ASF DAAC / NASA Earthdata: https://asf.alaska.edu/ · Guía de datos de NISAR: https://nisar-docs.asf.alaska.edu/
- Copernicus DEM GLO-30 (ESA)
- geoBoundaries (límites administrativos)
- Mapas base de Esri
- Climatología NASA POWER (contexto complementario, no es NISAR)
- Fuentes de prensa citadas en cada `ficha.json` (El Universo, KCH Comunicación / CELEC EP, Primicias, El Comercio, Teleamazonas)

Lo que se dice de NISAR se limita a lo registrado con su fuente en [docs/nisar-verificado.md](docs/nisar-verificado.md).

## Uso de IA

Desarrollado con la asistencia de Claude Code (Anthropic). El equipo revisó los resultados y responde por ellos.

## Licencia y equipo

MIT, ver [LICENSE](LICENSE). Créditos: [CREDITOS.md](CREDITOS.md). Equipo: **Equipo PACHA**.
