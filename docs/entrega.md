# Textos de entrega (Space Apps 2026)

> Nota: comprobar el formato exacto del formulario en https://www.spaceappschallenge.org/resources/project-submission-guide/ antes de pegar.

## Título

PACHA: Seeing Ecuador's Reservoirs and Fires with NISAR Radar

## Resumen de alto nivel (≤ 150 palabras, inglés)

PACHA is an open web app that turns NISAR L-band radar data into clear, readable information about surface change in Ecuador. Using real NISAR L2 GCOV products (HH/HV, about 10 m, in dB) processed by our team, it shows how the Mazar reservoir lost about 20 % of its water area in 77 days, how Daule-Peripa changed by about 2 %, and how radar saw the Casitagua forest fire of 17 September 2026. Every layer states its provenance, and interpretations are framed as hypotheses to check. An event simulator with cited suggested actions and a learning section explain how radar sees the world. The app is available in Spanish, English and a Kichwa draft, targets WCAG 2.2 AA, and runs entirely in the browser.

## Descripción del proyecto (inglés)

**What it does.** PACHA lets anyone explore how NISAR sees change on the ground. Explore offers guided Stories and a free Observatory over three sites: the Mazar and Daule-Peripa reservoirs and the Casitagua fire. Simulate lets users create synthetic events and read suggested actions, each with a cited source. Learn explains radar fundamentals, with a laboratory, a tour and a method page.

**How it works.** Our team downloaded NISAR L2 GCOV granules from ASF DAAC, cropped them, converted to dB, segmented water and burned area, and reduced them to small derivatives. Results: Mazar water 7.08 to 5.67 km2 (-19.9 % in 77 days); Daule-Peripa 116.0 to 113.4 km2 (-2.2 %); Casitagua team burn mask of 19.4 km2 versus 300 ha published by the press, plus change in RFDI. These are presented as hypotheses. Each layer lists product, granule, date, polarization, frequency and maturity. The front end is React + Vite + TypeScript; the API is FastAPI, which on GitHub Pages runs in the browser through Pyodide, so no server is needed.

**Benefits.** Radar sees through cloud, which is common in Ecuador, and gives numbers that people can compare with news reports. The app makes this accessible to non-experts, in their own language, with explained terms and accessibility checks (WCAG 2.2 AA target, axe in CI).

**Goals.** Make radar observations of change easy to read and honest about uncertainty; separate real data from synthetic examples; be reusable by other communities.

**Tools.** NISAR L2 GCOV, Copernicus DEM GLO-30, geoBoundaries, Esri basemaps, NASA POWER; Python, h5py, FastAPI, Pyodide; React, Vite, TypeScript; Claude Code for development assistance.

## Uso de datos de NASA

NISAR L2 GCOV (L-band) granules from ASF DAAC / NASA Earthdata, the core of all maps and figures; NISAR Data User Guide for product facts; NASA POWER climatology as complementary context (not NISAR).

## Datos de otras agencias

ESA Copernicus DEM GLO-30 (terrain). Also geoBoundaries (boundaries) and Esri basemaps.

## Referencias

- ASF DAAC: https://asf.alaska.edu/
- NISAR Data User Guide: https://nisar-docs.asf.alaska.edu/
- NASA NISAR mission overview: https://science.nasa.gov/mission/nisar/mission-overview/
- Copernicus DEM: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- geoBoundaries: https://www.geoboundaries.org/
- NASA POWER: https://power.larc.nasa.gov/
- El Universo (Daule-Peripa): https://www.eluniverso.com/noticias/economia/hidroelectrica-marcel-laniado-de-wind-mantenimiento-programado-celec-ecuador-nota/
- KCH Comunicación (Mazar): https://kchcomunicacion.com/?p=495127
- Primicias (Mazar): https://www.primicias.ec/economia/celec-mantenimiento-unidad2-hidroelectrica-mazar-julio-2026-cortes-luz-127968/
- El Comercio (Casitagua): https://www.elcomercio.com/actualidad/quito/incendio-forestal-casitagua-moviliza-bomberos-quito-jueves-17-de-septiembre/
- Teleamazonas (Casitagua): https://www.teleamazonas.com/actualidad/noticias/quito/pabel-munoz-confirma-300-hectareas-destruidas-incendios-casitagua-128402/
- Código y app: https://jmnss.github.io/PACHA/ · https://github.com/jmnss/PACHA

## Declaración de uso de IA

This project was developed with the assistance of Claude Code (Anthropic) for code, documentation and drafting. The team reviewed all outputs and is responsible for the content. No AI-generated data is presented as observation: all figures come from NISAR products processed by the team, and the simulator is labeled synthetic.

## Guion de vídeo (30 s, inglés)

| Tiempo | Toma de la app | Locución |
|---|---|---|
| 0-4 s | Inicio, título PACHA | "Clouds hide Ecuador from satellites. Radar does not." |
| 4-12 s | Historias: Mazar, deslizador antes/después | "NISAR's L-band radar shows the Mazar reservoir lost about 20 % of its water in 77 days." |
| 12-19 s | Casitagua: máscara de quemado y RFDI | "It also sees the Casitagua fire scar. We compare it with press reports, as a hypothesis." |
| 19-25 s | Simular: evento y acciones citadas | "Simulate an event and read suggested actions, each with its source." |
| 25-30 s | Idiomas es/en/kichwa, URL | "In Spanish, English and Kichwa. Try PACHA, free and open." |

## Esquema de 7 diapositivas

1. Título: PACHA, equipo, challenge "Dancing with the SARs", URL.
2. Problema: nubes, inundaciones, sequías e incendios; por qué radar.
3. Datos: NISAR L2 GCOV, banda L, HH/HV, ~10 m, dB; procedencia.
4. Resultados: Mazar -19,9 %, Daule-Peripa -2,2 %, Casitagua 19,4 km2 vs 300 ha (hipótesis).
5. La app: Inicio, Explorar, Simular, Aprender (capturas).
6. Técnica y accesibilidad: React + FastAPI + Pyodide en el navegador; tres idiomas; WCAG 2.2 AA, axe.
7. Cierre: fuentes, uso de IA, licencia MIT, próximos pasos.
