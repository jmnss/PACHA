# PACHA

**NASA Space Apps Challenge 2026 · "Dancing with the SARs"**

PACHA is an open web app that turns NISAR L-band radar observations into readable maps and numbers about surface change in Ecuador: reservoirs that shrink, and a forest fire that burns.

**Live app:** https://jmnss.github.io/PACHA/ · Español: [README.es.md](README.es.md)

## What it shows

Real NISAR L2 GCOV data (L-band, HH/HV polarizations, about 10 m pixels, shown in dB), processed by our team from granules published by ASF DAAC, over three sites:

| Site | Result (team measurement) |
|---|---|
| Mazar reservoir | Water area 7.08 -> 5.67 km2 (-19.9 % in 77 days) |
| Daule-Peripa reservoir | 116.0 -> 113.4 km2 (-2.2 %) |
| Casitagua fire (17 Sep 2026) | Team burn mask: 19.4 km2, versus 300 ha published by the press; change in RFDI (radar forest degradation index) |

The Casitagua comparison and any reading of these changes are presented as **hypotheses to be checked**, not conclusions. Every layer carries its provenance (product, granule, date, polarization, frequency, maturity level). Press facts in the site sheets (`data/*/*/ficha.json`) cite their source, URL and quote.

## Four destinations

- **Home**: what PACHA is and where to start.
- **Explore**: *Stories* (guided reads of each case, before/after) and the *Observatory* (free exploration of layers and passes).
- **Simulate**: an event simulator (fully synthetic, labeled as such) with suggested actions, each with its source cited.
- **Learn**: *Fundamentals* (how radar sees), *Laboratory*, *Tour*, and *How we do it* (method).

Three languages: Spanish, English and Kichwa (Kichwa is a draft awaiting review).

Accessibility: target is WCAG 2.2 AA; automated axe checks run in CI.

## Architecture

- Frontend: React 18 + Vite + TypeScript.
- Backend: FastAPI, stateless, reading only a data contract (`datos/`). On GitHub Pages there is no server: the same API runs **in the browser with Pyodide** in a Web Worker.
- Offline preparation (`scripts/preparar_datos_reales.py`) downloads and reduces NISAR granules into small derivatives under `data/`; raw HDF5 files are never versioned.

## Run locally

```bash
source scripts/entorno.sh
python -m pip install -r requirements.txt -r requirements-api.txt
cd frontend && npm install && npm run build && cd ..
python servidor.py          # http://localhost:8000
```

Development: `python servidor.py` plus `cd frontend && npm run dev` (http://localhost:5173). Tests: `python -m pytest tests -q`, `cd frontend && npm test`.

## Data sources

- NISAR L2 GCOV (L-band), ASF DAAC / NASA Earthdata: https://asf.alaska.edu/ · NISAR Data User Guide: https://nisar-docs.asf.alaska.edu/
- Copernicus DEM GLO-30 (ESA)
- geoBoundaries (administrative boundaries)
- Esri basemaps
- NASA POWER climatology (complementary context, not NISAR)
- Press sources cited in each `ficha.json` (El Universo, KCH Comunicacion / CELEC EP, Primicias, El Comercio, Teleamazonas)

NISAR facts used here are limited to those recorded with their source in [docs/nisar-verificado.md](docs/nisar-verificado.md).

## Use of AI

Developed with the assistance of Claude Code (Anthropic). The team reviewed and is responsible for the results.

## License and team

MIT, see [LICENSE](LICENSE). Credits: [CREDITOS.md](CREDITOS.md). Team: **Equipo PACHA**.
