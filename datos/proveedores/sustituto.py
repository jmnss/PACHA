"""Sustitutos sintéticos con la forma del sitio: un embalse simulado sobre su relieve real y un incendio simulado
en sus coordenadas. TODO lo que sale de aquí es sintético (Regla 7 de CLAUDE.md): `origen.tipo == "sintetico"`,
fechas ilustrativas, sin procedencia de granulo. Solo numpy, json y pydantic (corre también en Pyodide)."""
from __future__ import annotations

import dataclasses
import json
import zlib
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from datos.contrato import (Adquisicion, CapaRaster, Capacidades, CapacidadNoDisponible, Escenario, EntradaNoValida,
                            Medicion, NoEncontrado, Origen, ResultadoCambio, SerieTemporal)
from datos.proveedores._embalse_comun import (TITULO_SERIE, capa_clasificacion, clasificar, dentro_contorno,
                                              medir_mascaras, metricas_cambio, validar_par)
from datos.proveedores.demo import ProveedorDemostracion

SIN_DATO_DEM = -32768
GENERADOR = "datos/proveedores/sustituto.py"
NOTAS = "Sustituto de demostración sobre el relieve real; no son observaciones."
# Ventana de cobertura NISAR sobre Ecuador (fechas ilustrativas, no son adquisiciones reales).
ADQUISICIONES = {"sim-alta": datetime(2026, 6, 17, tzinfo=timezone.utc),
                 "sim-baja": datetime(2026, 11, 5, tzinfo=timezone.utc)}
GAMMA0_DB = {"agua": {"HH": -18.0, "HV": -26.0}, "tierra": {"HH": -7.0, "HV": -14.0}}
RANGO_DB = {"HH": (-25.0, 0.0), "HV": (-30.0, -5.0)}
EFECTO_PENDIENTE_DB = 3.0  # iluminación desde el oeste: ±3 dB
LOOKS = 4
_SIN_CAPACIDADES = Capacidades(simulacion=False, modelo_continuo=False, verdad_terreno=False)


def _vecinos4(m: np.ndarray) -> np.ndarray:
    """Unión de la máscara con sus 4 vecinos (dilatación en cruz)."""
    d = m.copy()
    d[1:] |= m[:-1]
    d[:-1] |= m[1:]
    d[:, 1:] |= m[:, :-1]
    d[:, :-1] |= m[:, 1:]
    return d


def _conectada(permitido: np.ndarray, semilla: np.ndarray) -> np.ndarray:
    """Partes de `permitido` conectadas (4 vecinos) a `semilla`; sin scipy, que Pyodide no trae en la app."""
    region = permitido & semilla
    while True:
        nueva = _vecinos4(region) & permitido
        if nueva.sum() == region.sum():
            return region
        region = nueva


def _profundidad_orilla(m: np.ndarray) -> np.ndarray:
    """Cuántas erosiones en cruz sobrevive cada celda de `m` (0 fuera): distancia a la orilla en píxeles."""
    prof = np.zeros(m.shape, np.int32)
    actual = m.copy()
    while actual.any():
        prof += actual
        e = actual.copy()
        e[1:] &= actual[:-1]
        e[:-1] &= actual[1:]
        e[:, 1:] &= actual[:, :-1]
        e[:, :-1] &= actual[:, 1:]
        e[0] = e[-1] = False
        e[:, 0] = e[:, -1] = False  # el borde de la rejilla cuenta como orilla
        actual = e
    return prof


class SustitutoEmbalse:
    """Cumple `ProveedorDatos` para `embalse-<sitio>` con dos adquisiciones sintéticas sobre el DEM del sitio."""

    capacidades = _SIN_CAPACIDADES

    def __init__(self, sitio_json: dict, carpeta: Path) -> None:
        carpeta = Path(carpeta)
        if not sitio_json.get("dem") or not sitio_json.get("curva"):
            raise ValueError("El sitio no trae DEM ni curva: no se puede construir el sustituto.")
        self._j = sitio_json
        self.id = f"embalse-{sitio_json['sitio']}"
        self.forma = tuple(sitio_json["forma"])
        self.bbox = tuple(sitio_json["bbox"])
        self.km2_pixel = abs(sitio_json["transform"][0] * sitio_json["transform"][4]) / 1e6
        self.semilla = zlib.crc32(sitio_json["sitio"].encode("utf-8"))  # estable entre ejecuciones y plataformas
        with np.load(carpeta / sitio_json["dem"]) as z:
            crudo = z["dem"]
            self._agua_dem = np.unpackbits(z["agua_dem"], count=crudo.size).reshape(crudo.shape).astype(bool)
        self._valido = crudo != SIN_DATO_DEM
        self._dem = np.where(self._valido, crudo, np.nan).astype(np.float32)
        self._curva = json.loads((carpeta / sitio_json["curva"]).read_text(encoding="utf-8"))
        self._dentro = dentro_contorno(carpeta, sitio_json)
        fecha = datetime.fromisoformat(sitio_json["fecha_preparacion"].replace("Z", "+00:00"))
        self.origen = Origen(tipo="sintetico", clase="sintetico", fuente="demo", generador=GENERADOR,
                             semilla=self.semilla, fecha_generacion=fecha, notas=NOTAS)
        # sim-alta: cota del agua en el DEM + 2 m. sim-baja: el 70 % de la superficie que el DEM da en esa cota, por
        # retroceso desde la orilla (el DEM es plano sobre el agua; no hay batimetría, así que no hay «nivel» que
        # buscar en la curva). El retroceso parte de `agua_dem`, que sim-alta siempre contiene: baja ⊆ alta.
        cota = float(self._curva["cota_dem_m"])
        alta = self._agua(cota + 2.0)
        en_cota = float((self._agua(cota) == 1).sum()) * self.km2_pixel
        self._mascaras = {"sim-alta": alta, "sim-baja": self._codigos(self._retroceso(0.7 * en_cota))}
        self._gamma: dict[tuple[str, str], np.ndarray] = {}

    # --- construcción -----------------------------------------------------------------------------

    def _retroceso(self, km2: float) -> np.ndarray:
        """Bajo la cota del agua el DEM es plano (no hay batimetría): el agua se retira de la orilla hacia el centro
        del espejo del DEM hasta quedar con `km2` de superficie (ilustrativo)."""
        base = self._agua_dem & self._valido & self._dentro
        # profundidad + un desempate pseudoaleatorio fijo por sitio, para que la orilla no quede en bandas
        clave = _profundidad_orilla(base) + np.random.default_rng(self.semilla).random(self.forma) * 0.5
        n = min(int(round(km2 / self.km2_pixel)), int(base.sum()))
        agua = np.zeros(self.forma, bool)
        if n > 0:
            plano = np.argsort(-clave.ravel(), kind="stable")[:n]  # las celdas más alejadas de la orilla
            agua.ravel()[plano] = True
        return agua & base

    def _codigos(self, agua: np.ndarray) -> np.ndarray:
        """Códigos 1 agua / 2 resto / 0 sin dato (sin dato del DEM o fuera del contorno)."""
        m = np.where(agua, 1, 2).astype(np.uint8)
        m[~self._valido | ~self._dentro] = 0
        return m

    def _agua(self, nivel: float) -> np.ndarray:
        """Máscara de agua a un nivel por encima de la cota del DEM: celdas con cota <= nivel conectadas al agua del
        DEM, más el propio `agua_dem` (el ruido del DEM no debe dejar celdas del espejo en seco)."""
        bajo = self._valido & (np.nan_to_num(self._dem, nan=np.inf) <= nivel)
        return self._codigos(_conectada(bajo, self._agua_dem) | (self._agua_dem & self._valido))

    def _gamma0(self, adq: str, pol: str) -> np.ndarray:
        clave = (adq, pol)
        if clave not in self._gamma:
            m = self._mascaras[adq]
            rel = np.where(self._valido, self._dem, np.nanmedian(self._dem))
            pend = np.gradient(rel, axis=1) / float(self._j["resolucion_m"])  # >0: sube hacia el este
            efecto = -EFECTO_PENDIENTE_DB * np.tanh(pend / 0.3)  # ladera que mira al oeste = más brillo
            db = np.where(m == 1, GAMMA0_DB["agua"][pol], GAMMA0_DB["tierra"][pol] + efecto)
            rng = np.random.default_rng([self.semilla, list(ADQUISICIONES).index(adq), 0 if pol == "HH" else 1])
            moteado = rng.gamma(LOOKS, 1.0 / LOOKS, self.forma)  # media 1, L = 4
            db = db + 10.0 * np.log10(moteado)
            self._gamma[clave] = np.where(m == 0, np.nan, db).astype(np.float32)
        return self._gamma[clave]

    # --- consulta ---------------------------------------------------------------------------------

    def nombre(self) -> str:
        return "sustituto"

    def _comprobar(self, escenario_id: str) -> None:
        if escenario_id != self.id:
            raise NoEncontrado.con("api.error.escenario_desconocido", id=escenario_id)

    @staticmethod
    def _adq(id: str) -> datetime:
        if id not in ADQUISICIONES:
            raise NoEncontrado.con("api.error.adquisicion_desconocida", id=id)
        return ADQUISICIONES[id]

    def escenarios(self) -> list[Escenario]:
        return [self.escenario(self.id)]

    def escenario(self, id: str) -> Escenario:
        self._comprobar(id)
        j = self._j
        return Escenario(
            id=self.id, nombre=j["nombre"], tipo_cambio="embalses", historia="embalse", sitio=j["sitio"],
            region=j["region"], bbox=self.bbox, resolucion_m=j["resolucion_m"], polarizaciones=["HH", "HV"],
            variables=["mascara", "gamma0"],
            adquisiciones=[Adquisicion(id=k, instante=t, polarizaciones=["HH", "HV"]) for k, t in ADQUISICIONES.items()],
            capacidades=self.capacidades, origen=self.origen)

    def intervalo_por_defecto(self, escenario_id: str) -> tuple[str, str]:
        self._comprobar(escenario_id)
        return "sim-alta", "sim-baja"

    def capa(self, escenario_id: str, adquisicion_id: str, variable: str, polarizacion: str | None) -> CapaRaster:
        self._comprobar(escenario_id)
        self._adq(adquisicion_id)
        leyenda = [tuple(x) for x in self._j["leyenda"]]
        if variable == "mascara":
            return CapaRaster(escenario_id=self.id, adquisicion_id=adquisicion_id, variable="mascara", polarizacion=None,
                              unidad="", paleta="categorias", vmin=0, vmax=len(leyenda), leyenda=leyenda,
                              datos=self._mascaras[adquisicion_id], bbox=self.bbox, origen=self.origen)
        if variable == "gamma0":
            if polarizacion not in RANGO_DB:
                raise EntradaNoValida.con("api.error.polarizacion_no_disponible", polarizacion=polarizacion or "(ninguna)",
                                          disponibles="HH, HV")
            vmin, vmax = RANGO_DB[polarizacion]
            return CapaRaster(escenario_id=self.id, adquisicion_id=adquisicion_id, variable="gamma0",
                              polarizacion=polarizacion, unidad="dB", paleta="gris", vmin=vmin, vmax=vmax, leyenda=None,
                              datos=self._gamma0(adquisicion_id, polarizacion), bbox=self.bbox, origen=self.origen)
        raise EntradaNoValida.con("api.error.variable_desconocida", variable=variable, disponibles="mascara, gamma0")

    def _superficie(self, adq: str) -> float:
        return float((self._mascaras[adq] == 1).sum()) * self.km2_pixel

    def serie_superficie(self, escenario_id: str) -> SerieTemporal:
        self._comprobar(escenario_id)
        titulo = TITULO_SERIE["embalse"]
        return SerieTemporal(titulo=titulo, unidad="km²", origen=self.origen,
                             puntos=[(t, self._superficie(k), titulo) for k, t in ADQUISICIONES.items()])

    def _par(self, escenario_id: str, antes_id: str, despues_id: str) -> None:
        self._comprobar(escenario_id)
        validar_par(antes_id, despues_id, self._adq(antes_id), self._adq(despues_id))

    def cambio(self, escenario_id: str, antes_id: str, despues_id: str, polarizacion: str | None) -> ResultadoCambio:
        self._par(escenario_id, antes_id, despues_id)
        pol = polarizacion or "HH"
        cod = clasificar(self._mascaras[antes_id], self._mascaras[despues_id], self._dentro)
        clasif = capa_clasificacion(self.id, despues_id, "embalse", cod, self.bbox, self.origen)
        metricas = metricas_cambio("embalse", self._superficie(antes_id), self._superficie(despues_id),
                                   ADQUISICIONES[antes_id].date().isoformat(),
                                   ADQUISICIONES[despues_id].date().isoformat())
        return ResultadoCambio(antes=self.capa(self.id, antes_id, "gamma0", pol),
                               despues=self.capa(self.id, despues_id, "gamma0", pol), cambio=clasif,
                               clasificacion=clasif, metricas=metricas, series=[self.serie_superficie(self.id)],
                               notas=[], origen=self.origen)

    def medir(self, escenario_id: str, antes_id: str, despues_id: str,
              cuadrante: tuple[int, int, int, int] | None = None, punto: tuple[int, int] | None = None) -> Medicion:
        if (cuadrante is None) == (punto is None):
            raise EntradaNoValida.con("api.error.medir_uno_de_dos")
        self._par(escenario_id, antes_id, despues_id)
        fechas = {"Antes": antes_id, "Después": despues_id}
        return medir_mascaras([n for n, _ in self._j["leyenda"]], self.km2_pixel, self._mascaras[antes_id],
                              self._mascaras[despues_id], ADQUISICIONES[despues_id].date().isoformat(), self.origen,
                              lambda capa, pol, f, c: float(self._gamma0(fechas[capa], pol)[f, c]), cuadrante, punto)

    def simular(self, escenario_id: str, parametros: dict | None) -> Escenario:
        raise CapacidadNoDisponible("El sustituto sintético no se puede simular.")

    def fotogramas(self, escenario_id: str, parametros: dict | None, inicio: datetime | None, fin: datetime | None,
                   paso_min: int) -> list[CapaRaster]:
        raise CapacidadNoDisponible("El sustituto sintético no tiene modelo continuo.")


class SustitutoIncendio:
    """Envuelve el escenario demo `ec_loja` simulado en el centro del sitio, con el id estable `incendio-<sitio>`."""

    capacidades = _SIN_CAPACIDADES
    BASE = "ec_loja"

    def __init__(self, sitio_json: dict, demo: ProveedorDemostracion) -> None:
        self._j, self._demo = sitio_json, demo
        self.id = f"incendio-{sitio_json['sitio']}"
        o, s, e, n = sitio_json["bbox"]
        self._parametros = {"lat": (s + n) / 2, "lon": (o + e) / 2}
        self._id_demo: str | None = None

    def _simulado(self) -> str:
        if self._id_demo is None:
            self._id_demo = self._demo.simular(self.BASE, dict(self._parametros)).id
        return self._id_demo

    def _con_demo(self, escenario_id: str, f):
        """Llama a `f(id_demo)`; si el id derivado caducó en la caché del demo, vuelve a simular y reintenta."""
        if escenario_id != self.id:
            raise NoEncontrado.con("api.error.escenario_desconocido", id=escenario_id)
        try:
            return f(self._simulado())
        except NoEncontrado:
            self._id_demo = None
            return f(self._simulado())

    def _capa(self, c: CapaRaster) -> CapaRaster:
        return dataclasses.replace(c, escenario_id=self.id)

    def nombre(self) -> str:
        return "sustituto"

    def escenarios(self) -> list[Escenario]:
        return [self.escenario(self.id)]

    def escenario(self, id: str) -> Escenario:
        e = self._con_demo(id, self._demo.escenario)
        return e.model_copy(update={"id": self.id, "nombre": self._j["nombre"], "historia": "incendio",
                                    "sitio": self._j["sitio"], "capacidades": self.capacidades})

    def intervalo_por_defecto(self, escenario_id: str) -> tuple[str, str]:
        e = self.escenario(escenario_id)
        return e.adquisiciones[0].id, e.adquisiciones[-1].id

    def capa(self, escenario_id: str, adquisicion_id: str, variable: str, polarizacion: str | None) -> CapaRaster:
        return self._capa(self._con_demo(escenario_id, lambda i: self._demo.capa(i, adquisicion_id, variable, polarizacion)))

    def cambio(self, escenario_id: str, antes_id: str, despues_id: str, polarizacion: str | None) -> ResultadoCambio:
        r = self._con_demo(escenario_id, lambda i: self._demo.cambio(i, antes_id, despues_id, polarizacion))
        return dataclasses.replace(
            r, antes=self._capa(r.antes), despues=self._capa(r.despues), cambio=self._capa(r.cambio),
            clasificacion=self._capa(r.clasificacion) if r.clasificacion is not None else None,
            capas_extra=[self._capa(c) for c in r.capas_extra] if r.capas_extra else r.capas_extra)

    def medir(self, escenario_id: str, antes_id: str, despues_id: str,
              cuadrante: tuple[int, int, int, int] | None = None, punto: tuple[int, int] | None = None) -> Medicion:
        return self._con_demo(escenario_id, lambda i: self._demo.medir(i, antes_id, despues_id, cuadrante, punto))

    def simular(self, escenario_id: str, parametros: dict | None) -> Escenario:
        raise CapacidadNoDisponible("El sustituto sintético no se puede simular.")

    def fotogramas(self, escenario_id: str, parametros: dict | None, inicio: datetime | None, fin: datetime | None,
                   paso_min: int) -> list[CapaRaster]:
        raise CapacidadNoDisponible("El sustituto sintético no tiene modelo continuo.")
