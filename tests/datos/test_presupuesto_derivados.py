"""Los derivados reales versionados caben en el presupuesto y cada sitio.json es válido."""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CARPETAS = [RAIZ / "data" / "embalses", RAIZ / "data" / "incendios"]
PRESUPUESTO = 10 * 1024 ** 2


def _sitios():
    return sorted(p for c in CARPETAS if c.exists() for p in c.glob("*/sitio.json"))


def test_derivados_dentro_del_presupuesto():
    assert any(c.exists() for c in CARPETAS), "faltan data/embalses y data/incendios"
    total = sum(p.stat().st_size for c in CARPETAS if c.exists() for p in c.rglob("*") if p.is_file())
    assert total <= PRESUPUESTO, f"{total} bytes > {PRESUPUESTO}"


def test_sitio_json_valido():
    sitios = _sitios()
    assert len(sitios) == 3, [str(s) for s in sitios]
    for sj in sitios:
        datos = json.loads(sj.read_text(encoding="utf-8"))
        assert datos["version"] in (1, 2)
        raiz = sj.parent
        for clave in ("dem", "curva", "contorno"):
            ref = datos.get(clave)
            if ref:
                nombre = ref if isinstance(ref, str) else ref.get("archivo")
                assert nombre and (raiz / nombre).is_file(), (sj, clave, ref)
        for f in datos["fechas"]:
            for capa in [f.get("archivo")] + [v.get("archivo") for v in f.get("capas", [])
                                              if isinstance(v, dict)]:
                if capa:
                    assert (raiz / capa).is_file(), (sj, capa)
