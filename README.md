# PACHA

*Formerly «NISAR · Ecuador».*

Español: [README.es.md](README.es.md)

> **WARNING: DEMONSTRATION DATA.** Everything this app shows is **synthetic**, produced by a reproducible generator (`scripts/generar_datos_demo.py`, fixed seed). **Nothing is a real NISAR observation.** The app always shows an orange "DATOS DE DEMOSTRACIÓN" band, and every layer and export carries its origin. The real data provider (`NISAR_PROVEEDOR=real`) is a **skeleton** that fails with a clear message until the official challenge resources are available. NISAR technical details (products, bands, dates) are *pending confirmation against the official documentation*. The one exception is the climate context (NASA POWER climatology), which is real but complementary data: it is not NISAR and does not come from the radar; everything else is synthetic.

## What it is

An open web app that shows how the NISAR radar (NASA-ISRO) can "see" **floods and wetlands** (main story, lowland coast of Ecuador) and **wildfires** (second story, Andes), plus an observatory for the six change types named by the challenge. It was built for the NASA Space Apps Challenge **"Dancing with the SARs"**, whose goal (our own summary, not the official text) is an easy-to-use interactive app that turns radar observations into readable information about surface change. See [docs/challenge.md](docs/challenge.md).

- **Stories** (`/`): a guided read of each case, with a before/after slider, polarizations, a pass timeline and illustrative hypotheses.
- **Observatory** (`/observatorio`): Map, Before/after and Time series views, measurements, and a simulation panel. The map is a geographic chart with Dark, Satellite and Relief base maps from **Esri**, fetched over the internet (no key or account); offline it still works with local provinces and main cities, without the Esri labels and terrain.

- **Radar lab** (`/laboratorio`): "Clouds don't stop it" (optical imagery is lost under cloud while radar keeps seeing) and "Polarization and band" (which polarization highlights each change). Generic scene with illustrative coefficients; S band is only an example, pending confirmation.
- **Impact** (Observatory tab, floods and wildfires): affected hectares, evolution, a plain-language reading and a one-page PNG report, with conditional actions ("if this were a real event…").
- **Tour** (`/recorrido`): the whole story in 90 seconds, with real screens embedded.
- **Fundamentals** (`/fundamentos`): radar physics; anything NISAR-specific stays pending confirmation.

## Language and accessibility

- **Language:** a selector in the navigation rail offers Spanish, English and Kichwa. Switching is instant, with no reload or repeated requests, and the choice is remembered in the browser. Kichwa is a **draft under review by speakers** (0 of 923 keys validated; the app shows a notice). To review it, see [docs/guia-traduccion-kichwa.md](docs/guia-traduccion-kichwa.md) (in Spanish) and [docs/traduccion-kichwa.csv](docs/traduccion-kichwa.csv). The demonstration-data band and origin stamps appear in all three languages.
- **Accessibility:** the target is WCAG 2.2 AA. What has been measured: an automated axe audit (6 screens × 3 languages × 2 widths, no serious or critical violations), a keyboard-only walkthrough and reflow at 320 px with no horizontal scroll. A screen-reader test (NVDA or Orca) with a person has **not** been done yet, so full conformance is not claimed. Details in [INFORME.md](INFORME.md) (in Spanish).

## Event simulator

`/simulador` (formerly the Streamlit app's «God mode») lets you trigger a wildfire, storm, flood, earthquake or eruption on Ecuador's terrain, shows how a NISAR-like radar would see it and how long until its next pass (assumed 12-day cycle, pending confirmation), and shares the scenario by link. Everything is simulated and labelled as demonstration data.

## Published version

The app is published at **https://jmnss.github.io/PACHA/** (GitHub Pages, static site, no server). Everything is
computed in your browser: the Python API runs there with Pyodide. The first visit downloads about 25 MB; precomputed
content (home, stories and scenarios) shows immediately. The Simulator can take up to a minute for storms and floods,
and low-end phones may not be able to load the engine. The demonstration-data notice is unchanged: the data is synthetic.

## Install and run

Requires Python 3.13 and Node 22. In this repo, `source scripts/entorno.sh` sets up Node 22 (nvm), `CHROME_PATH` and the provider.

```bash
python -m pip install -r requirements.txt -r requirements-api.txt
python scripts/generar_datos_demo.py     # optional: the app does not need it
cd frontend && npm install && npm run build && cd ..
python servidor.py                        # API + frontend at http://localhost:8000
```

Check it: `curl http://localhost:8000/api/salud` returns `"hay_sinteticos":true`.

**Development:** run `python servidor.py` and, in another terminal, `cd frontend && npm run dev` (http://localhost:5173).

**Data provider:** `NISAR_PROVEEDOR=demo|real` (default `demo`). `real` is a skeleton.

## Tests

```bash
python -m pytest tests -q                       # data and API
python -m unittest modelo.clima modelo.desastres # scientific core
cd frontend && npm test && npm run lint         # vitest and eslint
cd frontend && npx playwright test              # end to end (needs CHROME_PATH and a built frontend)
```

## Architecture

- `datos/`: data contract (`contrato.py`) and providers: `demo` (synthetic) and `real` (skeleton). Contract: [docs/contrato-datos.md](docs/contrato-datos.md).
- `api/`: stateless FastAPI; it only talks to the contract in `datos/` (except `/api/contexto`, which uses supplementary data from `modelo/estaciones.py`).
- `frontend/`: React 18 + Vite + TypeScript; state lives in the URL and the browser, no accounts.
- `modelo/`: physics and the synthetic generator.
- `frontend/src/motor/`: in the published version the API runs in the browser (Pyodide in a Web Worker).
- Docs: [challenge](docs/challenge.md), [design](docs/diseno.md), [talk script](docs/historia-datos.md).

## Legacy Streamlit app

The original app still works and is not modified: `python app.py` (http://localhost:8501). Its README is in [docs/README-streamlit.md](docs/README-streamlit.md).

## Submission requirements

Official submission requirements: pending confirmation.

## License and credits

MIT ([LICENSE](LICENSE)); provisional, pending confirmation by the team. Data sources, fonts and references: [CREDITOS.md](CREDITOS.md).
