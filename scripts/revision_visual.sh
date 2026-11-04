#!/usr/bin/env bash
# Revisión visual de una pantalla: lint estático + inspección en Chrome a 1440, 768 y 390 px.
# Uso: bash scripts/revision_visual.sh <ruta> <nombre>
#   ruta   ruta de la app, p. ej. / o /observatorio
#   nombre carpeta de salida: docs/capturas-nuevas/<nombre>/ (capturas *-fold.jpg y report.json)
# Sale con código distinto de 0 si lint o inspección reportan algún FAIL.
set -u
RUTA="${1:?uso: bash scripts/revision_visual.sh <ruta> <nombre>}"
NOMBRE="${2:?uso: bash scripts/revision_visual.sh <ruta> <nombre>}"
case "$RUTA" in /*) ;; *) RUTA="/$RUTA" ;; esac
case "$NOMBRE" in *[!A-Za-z0-9_-]*|"") echo "Nombre no válido (solo letras, números, - y _)." >&2; exit 2 ;; esac

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ" || exit 2
# shellcheck disable=SC1091
source scripts/entorno.sh

SKILL=.claude/skills/design-taste-frontend/scripts
SALIDA="docs/capturas-nuevas/$NOMBRE"
BASE=http://localhost:8000
PID=""
apagar() { [ -n "$PID" ] && kill "$PID" 2>/dev/null && wait "$PID" 2>/dev/null; }
trap apagar EXIT

echo "== Compilando el frontend =="
(cd frontend && npm run build) || { echo "RESULT: la compilación falló." >&2; exit 1; }

if curl -sf "$BASE/api/salud" >/dev/null; then
  echo "== Servidor ya en marcha; se reutiliza (no se apagará) =="
else
  echo "== Levantando python servidor.py =="
  python servidor.py >/tmp/revision_visual_servidor.log 2>&1 &
  PID=$!
  for _ in $(seq 1 60); do
    curl -sf "$BASE/api/salud" >/dev/null && break
    kill -0 "$PID" 2>/dev/null || { echo "El servidor terminó antes de responder:" >&2; cat /tmp/revision_visual_servidor.log >&2; PID=""; exit 1; }
    sleep 1
  done
  curl -sf "$BASE/api/salud" >/dev/null || { echo "El servidor no respondió en 60 s." >&2; exit 1; }
fi

echo "== Guard: colores solo en tokens.css y rampas.ts =="
if grep -rnE '#[0-9a-fA-F]{3,8}\b|\brgba?\(' frontend/src --include='*.css' --include='*.ts' --include='*.tsx' \
    | grep -vE 'frontend/src/diseno/(tokens\.css|rampas\.ts|tokens\.test\.ts)|frontend/src/api/tipos\.ts|\.test\.tsx?:'; then
  echo "RESULT: hay colores fuera de tokens.css/rampas.ts (arriba)." >&2; exit 1
fi

echo "== Lint (--app frontend/src) =="
node "$SKILL/lint.mjs" --app frontend/src
LINT=$?

echo "== Inspección a 1440, 768 y 390 px: $BASE$RUTA =="
# palette-terracotta: --demo-ink (#f0a868) lo fija docs/diseno.md §4 para la banda de demostración, y el
# inspector lo confunde con un acento terracota. Como el permiso vale para toda la pantalla, el guard de
# arriba (grep) garantiza que ningún color suelto se cuele: los hex solo viven en tokens.css y rampas.ts.
node "$SKILL/inspect.mjs" "$BASE$RUTA" --app --widths 1440,768,390 --allow palette-terracotta --out "$SALIDA"
INSP=$?

# Comprueba que se capturaron los tres anchos.
FALTAN=0
for a in 1440 768 390; do
  grep -q "\"width\": $a" "$SALIDA/report.json" 2>/dev/null || { echo "Falta la captura a ${a}px." >&2; FALTAN=1; }
done

[ "$LINT" -ne 0 ] || [ "$INSP" -ne 0 ] || [ "$FALTAN" -ne 0 ] && exit 1
exit 0
