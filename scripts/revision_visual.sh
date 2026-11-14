#!/usr/bin/env bash
# Revisión visual de una pantalla: lint estático + inspección en Chrome a 1440, 768 y 390 px.
# Uso: bash scripts/revision_visual.sh <ruta> <nombre> [idioma]
#   ruta   ruta de la app, p. ej. / o /observatorio
#   nombre carpeta de salida: docs/capturas-nuevas/<nombre>/ (capturas *-fold.jpg y report.json)
#   idioma opcional es|en|qu: añade ?idioma=<idioma> a la URL y la salida va a docs/capturas-nuevas/<nombre>-<idioma>/
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

IDIOMA="${3:-}"
case "$IDIOMA" in ""|es|en|qu) ;; *) echo "Idioma no válido (es, en o qu)." >&2; exit 2 ;; esac

SKILL=.claude/skills/design-taste-frontend/scripts
SALIDA="docs/capturas-nuevas/$NOMBRE"
URL_RUTA="$RUTA"
if [ -n "$IDIOMA" ]; then
  SALIDA="docs/capturas-nuevas/$NOMBRE-$IDIOMA"
  case "$RUTA" in *\?*) URL_RUTA="$RUTA&idioma=$IDIOMA" ;; *) URL_RUTA="$RUTA?idioma=$IDIOMA" ;; esac
fi
BASE=http://localhost:8000
PID=""
apagar() { [ -n "$PID" ] && kill "$PID" 2>/dev/null && wait "$PID" 2>/dev/null; }
trap apagar EXIT

echo "== Compilando el frontend =="
# VITE_MAPA_REMOTO=0: el mapa no pide nada a OpenFreeMap en la revisión (solo capas locales).
# Compila a frontend/dist-revision (no toca frontend/dist, que es la compilación normal) y el servidor la usa vía NISAR_DIST.
(cd frontend && VITE_MAPA_REMOTO=0 npm run build -- --outDir dist-revision --emptyOutDir) || { echo "RESULT: la compilación falló." >&2; exit 1; }

if curl -sf "$BASE/api/salud" >/dev/null; then
  echo "== Servidor ya en marcha; se reutiliza (no se apagará; sirve SU carpeta compilada, no dist-revision) =="
else
  echo "== Levantando python servidor.py =="
  NISAR_DIST="$RAIZ/frontend/dist-revision" python servidor.py >/tmp/revision_visual_servidor.log 2>&1 &
  PID=$!
  for _ in $(seq 1 60); do
    curl -sf "$BASE/api/salud" >/dev/null && break
    kill -0 "$PID" 2>/dev/null || { echo "El servidor terminó antes de responder:" >&2; cat /tmp/revision_visual_servidor.log >&2; PID=""; exit 1; }
    sleep 1
  done
  curl -sf "$BASE/api/salud" >/dev/null || { echo "El servidor no respondió en 60 s." >&2; exit 1; }
fi

echo "== Guard: colores solo en tokens.css, rampas.ts y mapa/colores.ts =="
if grep -rnE '#[0-9a-fA-F]{3,8}\b|\brgba?\(' frontend/src --include='*.css' --include='*.ts' --include='*.tsx' \
    | grep -vE 'frontend/src/diseno/(tokens\.css|rampas\.ts|tokens\.test\.ts)|frontend/src/mapa/colores\.ts|frontend/src/api/tipos\.ts|\.test\.tsx?:'; then
  echo "RESULT: hay colores fuera de tokens.css/rampas.ts (arriba)." >&2; exit 1
fi

echo "== Lint (--app frontend/src) =="
node "$SKILL/lint.mjs" --app frontend/src
LINT=$?

echo "== Inspección a 1440, 768 y 390 px: $BASE$URL_RUTA =="
# palette-terracotta: --demo-ink (#f0a868) lo fija docs/diseno.md §4 para la banda de demostración, y el
# inspector lo confunde con un acento terracota. Como el permiso vale para toda la pantalla, el guard de
# arriba (grep) garantiza que ningún color suelto se cuele: los hex solo viven en tokens.css y rampas.ts.
node "$SKILL/inspect.mjs" "$BASE$URL_RUTA" --app --widths 1440,768,390 --allow palette-terracotta --out "$SALIDA"
INSP=$?

# Comprueba que se capturaron los tres anchos.
FALTAN=0
for a in 1440 768 390; do
  grep -q "\"width\": $a" "$SALIDA/report.json" 2>/dev/null || { echo "Falta la captura a ${a}px." >&2; FALTAN=1; }
done

[ "$LINT" -ne 0 ] || [ "$INSP" -ne 0 ] || [ "$FALTAN" -ne 0 ] && exit 1
exit 0
