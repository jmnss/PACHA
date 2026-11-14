#!/usr/bin/env bash
# Entorno reproducible: Node 22 (nvm), Chrome de Playwright y proveedor de datos.
# Uso: source scripts/entorno.sh
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh" || true
  nvm use 22.23.4 >/dev/null 2>&1 || nvm use 22 >/dev/null 2>&1 || true
fi
CHROME_LOCAL=/home/jnavas/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome
[ -f "$CHROME_LOCAL" ] && export CHROME_PATH="$CHROME_LOCAL"
export NISAR_PROVEEDOR="${NISAR_PROVEEDOR:-mixto}"
