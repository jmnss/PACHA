# NISAR · Ecuador

Español: [README.es.md](README.es.md)

> **WARNING: DEMONSTRATION DATA.** Everything this app shows is **synthetic**, produced by a reproducible generator (`scripts/generar_datos_demo.py`, fixed seed). **Nothing is a real NISAR observation.** The app always shows an orange "DATOS DE DEMOSTRACIÓN" band, and every layer and export carries its origin. The real data provider (`NISAR_PROVEEDOR=real`) is a **skeleton** that fails with a clear message until the official challenge resources are available. NISAR technical details (products, bands, dates) are *pending confirmation against the official documentation*. The one exception is the climate context (NASA POWER climatology), which is real but complementary data: it is not NISAR and does not come from the radar; everything else is synthetic.

## What it is

An open web app that shows how the NISAR radar (NASA-ISRO) can "see" **floods and wetlands** (main story, lowland coast of Ecuador) and **wildfires** (second story, Andes), plus an observatory for the six change types named by the challenge. It was built for the NASA Space Apps Challenge **"Dancing with the SARs"**, whose goal (our own summary, not the official text) is an easy-to-use interactive app that turns radar observations into readable information about surface change. See [docs/challenge.md](docs/challenge.md).

- **Stories** (`/`): a guided read of each case, with a before/after slider, polarizations, a pass timeline and illustrative hypotheses.
- **Observatory** (`/observatorio`): Map, Before/after and Time series views, measurements, and a simulation panel.

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
- Docs: [challenge](docs/challenge.md), [design](docs/diseno.md), [talk script](docs/historia-datos.md).

## Legacy Streamlit app

The original app still works and is not modified: `python app.py` (http://localhost:8501). Its README is in [docs/README-streamlit.md](docs/README-streamlit.md).

## Submission requirements

Official submission requirements: pending confirmation.

## License and credits

MIT ([LICENSE](LICENSE)); provisional, pending confirmation by the team. Data sources, fonts and references: [CREDITOS.md](CREDITOS.md).
