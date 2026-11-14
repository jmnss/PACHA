"""Control de espacio en disco antes de descargar (el disco del equipo tiene poco margen)."""
import shutil
from pathlib import Path


def comprobar_espacio(ruta: Path, minimo_gb: float = 2.0) -> None:
    """Aborta con un mensaje en español si quedan menos de `minimo_gb` GB libres en `ruta`."""
    libre_gb = shutil.disk_usage(ruta).free / 1e9
    if libre_gb < minimo_gb:
        raise SystemExit(f"Poco espacio en disco: quedan {libre_gb:.1f} GB libres y se piden al menos {minimo_gb:.1f} GB. "
                         "Libera espacio antes de descargar.")
