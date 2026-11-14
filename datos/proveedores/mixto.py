"""Proveedor mixto (por defecto): lo real del equipo donde lo hay, sustitutos sintéticos donde aún no, y el demo.

Por cada `sitio.json` bajo `data/embalses/` y `data/incendios/`: si el sitio tiene fechas mostrables (procedencia
completa) lo sirve `ProveedorDerivados` (origen `nisar`); si no, un sustituto sintético (origen `sintetico`). Nunca se
mezclan fechas reales y sintéticas en un mismo escenario (Regla 7 de CLAUDE.md). Después van todos los escenarios demo.
Solo numpy, json y pydantic (corre también en Pyodide).
"""
from __future__ import annotations

import warnings
from datetime import datetime
from pathlib import Path

from datos.contrato import (CapaRaster, CapacidadNoDisponible, Escenario, Medicion, NoEncontrado, ResultadoCambio,
                            SerieTemporal, TipoCambio)
from datos.proveedores.demo import ProveedorDemostracion
from datos.proveedores.derivados import CARPETAS, DIR_DATOS, ProveedorDerivados
from datos.proveedores.sustituto import SustitutoEmbalse, SustitutoIncendio


class ProveedorMixto:
    def __init__(self, raiz: Path = DIR_DATOS, demo: ProveedorDemostracion | None = None) -> None:
        raiz = Path(raiz)
        self._demo = demo if demo is not None else ProveedorDemostracion()
        derivados = ProveedorDerivados(raiz)
        reales = {e.id for e in derivados.escenarios()}
        self._duenos: dict[str, object] = {}   # id de escenario -> proveedor dueño
        self._ids_propios: list[str] = []      # ids reales o sustitutos, en el orden de las carpetas
        for id_, sitio in derivados.sitios().items():
            if id_ in reales:
                dueno = derivados
            else:
                tipo = id_.split("-", 1)[0]
                carpeta = raiz / CARPETAS[tipo] / sitio["sitio"]
                try:
                    dueno = (SustitutoEmbalse(sitio, carpeta) if tipo == "embalse"
                             else SustitutoIncendio(sitio, self._demo))
                except (OSError, ValueError, KeyError) as e:  # sin DEM/curva legibles no hay nada que sustituir
                    warnings.warn(f"sin sustituto para {id_} (carpeta {carpeta}): {e}")
                    continue
            self._duenos[id_] = dueno
            self._ids_propios.append(id_)

    def nombre(self) -> str:
        return "mixto"

    def _dueno(self, id: str):
        return self._duenos.get(id, self._demo)

    def escenarios(self) -> list[Escenario]:
        return [self._duenos[i].escenario(i) for i in self._ids_propios] + self._demo.escenarios()

    def escenario(self, id: str) -> Escenario:
        return self._dueno(id).escenario(id)

    def capa(self, escenario_id: str, adquisicion_id: str, variable: str, polarizacion: str | None) -> CapaRaster:
        return self._dueno(escenario_id).capa(escenario_id, adquisicion_id, variable, polarizacion)

    def cambio(self, escenario_id: str, antes_id: str, despues_id: str, polarizacion: str | None) -> ResultadoCambio:
        return self._dueno(escenario_id).cambio(escenario_id, antes_id, despues_id, polarizacion)

    def medir(self, escenario_id: str, antes_id: str, despues_id: str,
              cuadrante: tuple[int, int, int, int] | None = None,
              punto: tuple[int, int] | None = None) -> Medicion:
        return self._dueno(escenario_id).medir(escenario_id, antes_id, despues_id, cuadrante=cuadrante, punto=punto)

    # --- opcionales: se delegan al dueño del id; si no los tiene, CapacidadNoDisponible ------------------

    def _opcional(self, escenario_id: str, metodo: str):
        f = getattr(self._dueno(escenario_id), metodo, None)
        if f is None:
            raise CapacidadNoDisponible(f"Este escenario no ofrece «{metodo}».")
        return f

    def tipos(self) -> list[TipoCambio]:
        return self._demo.tipos()

    def intervalo_por_defecto(self, escenario_id: str) -> tuple[str, str]:
        return self._opcional(escenario_id, "intervalo_por_defecto")(escenario_id)

    def serie_seleccion(self, escenario_id: str, cuadrante: tuple[int, int, int, int] | None = None,
                        punto: tuple[int, int] | None = None) -> SerieTemporal | None:
        return self._opcional(escenario_id, "serie_seleccion")(escenario_id, cuadrante=cuadrante, punto=punto)

    def serie_superficie(self, escenario_id: str) -> SerieTemporal:
        return self._opcional(escenario_id, "serie_superficie")(escenario_id)

    def simular(self, escenario_id: str, parametros: dict | None) -> Escenario:
        return self._opcional(escenario_id, "simular")(escenario_id, parametros)

    def fotogramas(self, escenario_id: str, parametros: dict | None, inicio: datetime | None,
                   fin: datetime | None, paso_min: int) -> list[CapaRaster]:
        return self._opcional(escenario_id, "fotogramas")(escenario_id, parametros, inicio, fin, paso_min)
