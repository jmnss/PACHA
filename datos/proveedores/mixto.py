"""Proveedor por defecto (`mixto`): solo los datos reales del equipo (decisión del usuario, 2026-11-15).

Sirve los sitios de `data/embalses/` y `data/incendios/` que tienen fechas mostrables, como NISAR con lo que se sabe
(ver `ProveedorDerivados`). Ya no añade sustitutos sintéticos ni los escenarios de demostración: esos siguen
disponibles con `NISAR_PROVEEDOR=demo`. El Simulador y el Laboratorio no dependen de este proveedor.
Solo numpy, json y pydantic (corre también en Pyodide).
"""
from __future__ import annotations

from pathlib import Path

from datos.proveedores.derivados import DIR_DATOS, ProveedorDerivados


class ProveedorMixto(ProveedorDerivados):
    def __init__(self, raiz: Path = DIR_DATOS) -> None:
        super().__init__(raiz)

    def nombre(self) -> str:
        return "mixto"
