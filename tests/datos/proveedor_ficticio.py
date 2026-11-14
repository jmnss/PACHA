"""Proveedor ficticio de pruebas: segunda implementación del contrato, sin simulación.

Rejillas de 2048×2048 float32 generadas bajo demanda (nada precomputado). `origen.tipo = "real"` solo
sirve para comprobar que la interfaz no depende del proveedor; no representa datos reales de NISAR.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np

from datos.contrato import (
    NoEncontrado,
    Adquisicion, CapaRaster, Capacidades, CapacidadNoDisponible, Escenario, Medicion, Metrica, Origen,
    ResultadoCambio,
)

N = 2048
_FECHA = datetime(2026, 1, 1, tzinfo=timezone.utc)
ORIGEN = Origen(tipo="real", fuente="ficticio de pruebas", fecha_generacion=_FECHA)
_BBOX_BASE = {"fic_a": (-80.0, -2.0, -79.0, -1.0), "fic_b": (-78.5, -1.0, -77.5, 0.0)}


class ProveedorFicticio:
    def __init__(self) -> None:
        self._escenarios = {
            id_: Escenario(
                id=id_, nombre=f"Escenario ficticio {id_[-1].upper()}", tipo_cambio="inundaciones",
                historia="inundacion", region="Región ficticia", bbox=bbox, resolucion_m=10.0,
                polarizaciones=["P1", "P2"], variables=["intensidad"],
                adquisiciones=[Adquisicion(id=f"{id_}_t{i}", instante=_FECHA + timedelta(days=12 * i),
                                           direccion_orbital=None, polarizaciones=["P1", "P2"])
                               for i in range(5)],
                capacidades=Capacidades(simulacion=False, modelo_continuo=False, verdad_terreno=False),
                origen=ORIGEN)
            for id_, bbox in _BBOX_BASE.items()}

    def nombre(self) -> str:
        return "ficticio"

    def escenarios(self) -> list[Escenario]:
        return list(self._escenarios.values())

    def escenario(self, id: str) -> Escenario:
        try:
            return self._escenarios[id]
        except KeyError:
            raise NoEncontrado(f"escenario desconocido: {id}") from None

    def _indice(self, esc: Escenario, adquisicion_id: str) -> int:
        for i, a in enumerate(esc.adquisiciones):
            if a.id == adquisicion_id:
                return i
        raise NoEncontrado(f"adquisición desconocida: {adquisicion_id}")

    def _rejilla(self, i: int, pol: str | None) -> np.ndarray:
        # Gradiente determinista barato (sin RNG): una pasada de float32 por capa.
        base = np.linspace(0.0, 1.0, N, dtype=np.float32)
        r = base[:, None] * 0.5 + base[None, :] * 0.5
        return r + np.float32(0.1 * i + (0.05 if pol == "P2" else 0.0))

    def capa(self, escenario_id, adquisicion_id, variable, polarizacion) -> CapaRaster:
        esc = self.escenario(escenario_id)
        i = self._indice(esc, adquisicion_id)
        return CapaRaster(
            escenario_id=esc.id, adquisicion_id=adquisicion_id, variable=variable, polarizacion=polarizacion,
            unidad="u.a.", paleta="gris", vmin=0.0, vmax=2.0, leyenda=None,
            datos=self._rejilla(i, polarizacion), bbox=esc.bbox, origen=ORIGEN)

    def cambio(self, escenario_id, antes_id, despues_id, polarizacion) -> ResultadoCambio:
        esc = self.escenario(escenario_id)
        antes = self.capa(escenario_id, antes_id, "intensidad", polarizacion)
        despues = self.capa(escenario_id, despues_id, "intensidad", polarizacion)
        cambio = CapaRaster(
            escenario_id=esc.id, adquisicion_id=None, variable="cambio", polarizacion=polarizacion,
            unidad="u.a.", paleta="divergente", vmin=-1.0, vmax=1.0, leyenda=None,
            datos=despues.datos - antes.datos, bbox=esc.bbox, origen=ORIGEN)
        return ResultadoCambio(antes=antes, despues=despues, cambio=cambio, clasificacion=None,
                               metricas=[], series=[], notas=[], origen=ORIGEN)

    def medir(self, escenario_id, antes_id, despues_id, cuadrante=None, punto=None) -> Medicion:
        if (cuadrante is None) == (punto is None):
            raise ValueError("Indica exactamente uno de `cuadrante` o `punto`.")
        r = self.cambio(escenario_id, antes_id, despues_id, "P1").cambio.datos
        if cuadrante is not None:
            f0, f1, c0, c1 = cuadrante
            if not (0 <= f0 < f1 <= N and 0 <= c0 < c1 <= N):
                raise ValueError(f"El cuadrante {cuadrante} queda fuera de la imagen.")
            valor = float(np.mean(r[f0:f1, c0:c1]))
        else:
            f, c = punto
            if not (0 <= f < N and 0 <= c < N):
                raise ValueError(f"El punto {punto} queda fuera de la imagen.")
            valor = float(r[f, c])
        return Medicion(cuadrante=cuadrante, punto=punto,
                        metricas=[Metrica(etiqueta="Cambio medio", valor=f"{valor:.3f}", unidad="u.a.",
                                          ayuda="Valor ficticio de pruebas")],
                        tabla=[{"Capa": "cambio", "Valor": valor}], origen=ORIGEN)

    def simular(self, escenario_id, parametros):
        raise CapacidadNoDisponible("El proveedor ficticio no ofrece simulación.")

    def fotogramas(self, escenario_id, parametros, inicio, fin, paso_min):
        raise CapacidadNoDisponible("El proveedor ficticio no ofrece modelo continuo.")
