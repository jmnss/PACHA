#!/usr/bin/env bash
# Construye el sitio estático de GitHub Pages en frontend/dist-pages (API en el navegador con Pyodide).
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"
# shellcheck source=/dev/null
source scripts/entorno.sh
cd frontend
npx tsc -b
rm -rf dist-pages
VITE_MOTOR=navegador VITE_BASE=/NISAR-Ecuador/ npx vite build --outDir dist-pages
python ../scripts/empaquetar_app.py --salida dist-pages/motor
node scripts/empaquetar_motor.mjs --salida dist-pages/motor
cp dist-pages/index.html dist-pages/404.html
echo "Listo: frontend/dist-pages"
