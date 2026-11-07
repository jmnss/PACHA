#!/usr/bin/env bash
# Construye el sitio estático de GitHub Pages en frontend/dist-pages (API en el navegador con Pyodide):
# 1) compila el frontend en modo `servidor` y graba las respuestas de los caminos fijos (precálculo);
# 2) empaqueta la app Python y el motor; 3) compila en modo `navegador` bajo /NISAR-Ecuador/.
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"
# shellcheck source=/dev/null
source scripts/entorno.sh

# --- 1. Precálculo contra el servidor local ---
(cd frontend && VITE_MAPA_REMOTO=0 npm run build)
python servidor.py >/tmp/servidor-precalculo.log 2>&1 &
SERVIDOR=$!
trap 'kill "$SERVIDOR" 2>/dev/null || true' EXIT
for _ in $(seq 30); do
  curl -sf http://127.0.0.1:8000/api/salud >/dev/null && break
  sleep 2
done
curl -sf http://127.0.0.1:8000/api/salud >/dev/null || { echo "El servidor no arrancó" >&2; cat /tmp/servidor-precalculo.log >&2; exit 1; }
cd frontend
node scripts/precalcular.mts --origen http://127.0.0.1:8000 --salida .precalculado
kill "$SERVIDOR" 2>/dev/null || true

# --- 2 y 3. Motor y sitio de Pages ---
npx tsc -b
rm -rf dist-pages .tmp-app
# El hash de la app Python entra en el nombre del SharedWorker (no mezclar motores de despliegues distintos).
APP_HASH="$(python ../scripts/empaquetar_app.py --salida .tmp-app | sed -E 's/.*app-([0-9a-f]+)\.zip$/\1/')"
rm -rf .tmp-app
VITE_APP_HASH="$APP_HASH" VITE_MOTOR=navegador VITE_BASE=/NISAR-Ecuador/ npx vite build --outDir dist-pages
python ../scripts/empaquetar_app.py --salida dist-pages/motor
node scripts/empaquetar_motor.mjs --salida dist-pages/motor
cp -r .precalculado dist-pages/precalculado
cp dist-pages/index.html dist-pages/404.html
echo "Listo: frontend/dist-pages"
