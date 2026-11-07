"""`scripts/entorno.sh` no debe abortar un script con `set -e` si nvm existe pero no tiene Node 22 (runner de CI)."""
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def test_entorno_no_aborta_con_nvm_sin_node22(tmp_path):
    (tmp_path / "nvm.sh").write_text("nvm() { return 1; }\n")
    r = subprocess.run(["bash", "-c", f'set -euo pipefail; NVM_DIR={tmp_path} source scripts/entorno.sh; echo ok'],
                       cwd=RAIZ, capture_output=True, text=True)
    assert r.returncode == 0 and r.stdout.strip() == "ok", r.stderr
