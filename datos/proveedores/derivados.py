"""Proveedor de los derivados del equipo (embalses e incendio): lee `data/<embalses|incendios>/<sitio>/`.

Formato escrito por `preparacion/salida.py`: `sitio.json`, un `.npz` por fecha (`mascara` con códigos del contrato
0 sin dato / 1 clase / 2 resto, y si hay stack `HH` y `HV` cuantizados), `contorno.geojson`. Regla 7 de CLAUDE.md:
una fecha sin procedencia completa NO se expone (ni en el escenario, ni en las capas, ni en la serie), y cada capa
lleva el origen con la procedencia de su propia fecha. Solo numpy, json y pydantic (corre también en Pyodide).
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import numpy as np

from datos.proveedores._embalse_comun import (TITULO_SERIE as _TITULO_SERIE, capa_clasificacion,
                                              clasificar, dentro_contorno, medir_mascaras, metricas_cambio,
                                              num as _num, validar_par)
from datos.contrato import (Adquisicion, CapaRaster, Capacidades, CapacidadNoDisponible, Escenario, EntradaNoValida,
                            Medicion, Metrica, NoEncontrado, Origen, Procedencia, ResultadoCambio, SerieTemporal,
                            faltantes_procedencia)

DIR_DATOS = Path(__file__).resolve().parents[2] / "data"  # carpeta data/ en la raíz del proyecto
CARPETAS = {"embalse": "embalses", "incendio": "incendios"}
FUENTE = "equipo PACHA"
def _procedencia(d: dict | None) -> Procedencia | None:
    """Procedencia del `sitio.json` (claves de `procedencia.json`) → modelo; None si no se puede leer."""
    if not isinstance(d, dict):
        return None
    try:
        fecha = d.get("fecha_adquisicion_utc")
        adq = datetime.fromisoformat(fecha.replace("Z", "+00:00")) if fecha else None
        if adq is not None and adq.tzinfo is None:
            adq = None
        metodo = d.get("metodo")
        return Procedencia(producto=d.get("producto"), coleccion=d.get("coleccion"), granulos=d.get("granulos") or [],
                           fecha_adquisicion=adq, polarizaciones=d.get("polarizaciones") or [],
                           frecuencia=d.get("frecuencia"), madurez=d.get("madurez"), unidades=d.get("unidades_stack"),
                           metodo=metodo if isinstance(metodo, dict) else None, autor=d.get("autor"),
                           fecha_proceso=d.get("fecha_proceso"))
    except (AttributeError, ValueError):
        return None


class _Fecha:
    """Una fecha mostrable de un sitio: su fila del `sitio.json`, su procedencia y su origen."""

    def __init__(self, fila: dict, proc: Procedencia, fecha_prep: datetime) -> None:
        self.fila, self.procedencia = fila, proc
        self.id = fila["fecha"].replace("-", "")
        self.instante = proc.fecha_adquisicion
        self.stack = fila.get("stack") or None
        self.origen = Origen(tipo="real", clase="nisar", fuente=FUENTE, producto=proc.producto,
                             fecha_generacion=fecha_prep, procedencia=proc)


class _Sitio:
    def __init__(self, carpeta: Path) -> None:
        self.carpeta = carpeta
        self.json = json.loads((carpeta / "sitio.json").read_text(encoding="utf-8"))
        s = self.json
        prep = datetime.fromisoformat(s["fecha_preparacion"].replace("Z", "+00:00"))
        self.fechas: list[_Fecha] = []
        for fila in s["fechas"]:
            proc = _procedencia(fila.get("procedencia"))
            # No basta la bandera del archivo: se vuelve a comprobar la procedencia con las reglas del contrato.
            if fila.get("procedencia_completa") and proc is not None and not faltantes_procedencia("nisar", proc):
                self.fechas.append(_Fecha(fila, proc, prep))
        self.fechas.sort(key=lambda f: f.instante)
        self.clase = s["leyenda"][0][0]
        self.tipo = s["tipo"]
        self.forma = tuple(s["forma"])
        self.bbox = tuple(s["bbox"])
        self.km2_pixel = abs(s["transform"][0] * s["transform"][4]) / 1e6
        self._npz: dict[str, dict[str, np.ndarray]] = {}
        self._dentro: np.ndarray | None = None

    @property
    def id_escenario(self) -> str:
        return f"{self.tipo}-{self.json['sitio']}"

    def fecha(self, id: str) -> _Fecha:
        for f in self.fechas:
            if f.id == id:
                return f
        raise NoEncontrado.con("api.error.adquisicion_desconocida", id=id)

    def arrays(self, f: _Fecha) -> dict[str, np.ndarray]:
        if f.id not in self._npz:
            with np.load(self.carpeta / f.fila["archivo"]) as z:
                self._npz[f.id] = {k: z[k] for k in z.files}
        return self._npz[f.id]

    def dentro(self) -> np.ndarray:
        """Máscara bool del contorno sobre la rejilla (todo True si el sitio no trae contorno)."""
        if self._dentro is None:
            self._dentro = dentro_contorno(self.carpeta, self.json)
        return self._dentro


class ProveedorDerivados:
    capacidades = Capacidades(simulacion=False, modelo_continuo=False, verdad_terreno=False)

    def __init__(self, raiz: Path = DIR_DATOS) -> None:
        self._raiz = Path(raiz)
        self._sitios: dict[str, _Sitio] = {}  # por id de escenario: un embalse y un incendio pueden llamarse igual
        for carpeta in CARPETAS.values():
            for ruta in sorted((self._raiz / carpeta).glob("*/sitio.json")):
                try:
                    s = _Sitio(ruta.parent)
                except (OSError, ValueError, KeyError):  # un sitio ilegible no tumba a los demás
                    continue
                self._sitios[s.id_escenario] = s
        self._escenarios = {k: s for k, s in self._sitios.items() if s.fechas}

    # --- consulta ---------------------------------------------------------------------------------

    def nombre(self) -> str:
        return "derivados"

    def sitios(self) -> dict[str, dict]:
        """Todos los `sitio.json` leídos (por id de escenario), mostrables o no."""
        return {k: s.json for k, s in self._sitios.items()}

    def _sitio(self, escenario_id: str) -> _Sitio:
        try:
            return self._escenarios[escenario_id]
        except KeyError:
            raise NoEncontrado.con("api.error.escenario_desconocido", id=escenario_id) from None

    def escenarios(self) -> list[Escenario]:
        return [self.escenario(i) for i in self._escenarios]

    def escenario(self, id: str) -> Escenario:
        s = self._sitio(id)
        j = s.json
        hay_stack = any(f.stack for f in s.fechas)
        return Escenario(
            id=id, nombre=j["nombre"], tipo_cambio=CARPETAS[s.tipo], historia=s.tipo, sitio=j["sitio"],
            region=j["region"], bbox=s.bbox, resolucion_m=j["resolucion_m"],
            polarizaciones=["HH", "HV"] if hay_stack else [],
            variables=["mascara"] + (["gamma0"] if hay_stack else []),
            adquisiciones=[Adquisicion(id=f.id, instante=f.instante, polarizaciones=["HH", "HV"] if f.stack else [])
                           for f in s.fechas],
            capacidades=self.capacidades, origen=s.fechas[-1].origen)

    def intervalo_por_defecto(self, escenario_id: str) -> tuple[str, str]:
        s = self._sitio(escenario_id)
        return s.fechas[0].id, s.fechas[-1].id

    # --- capas ------------------------------------------------------------------------------------

    def _mascara(self, s: _Sitio, f: _Fecha) -> CapaRaster:
        return CapaRaster(
            escenario_id=s.id_escenario, adquisicion_id=f.id, variable="mascara", polarizacion=None, unidad="",
            paleta="categorias", vmin=0, vmax=len(s.json["leyenda"]), leyenda=[tuple(x) for x in s.json["leyenda"]],
            datos=s.arrays(f)["mascara"], bbox=s.bbox, origen=f.origen)

    def _gamma0(self, s: _Sitio, f: _Fecha, pol: str) -> CapaRaster:
        if not f.stack or pol not in f.stack:
            raise EntradaNoValida.con("api.error.polarizacion_no_disponible", polarizacion=pol,
                                      disponibles=", ".join(f.stack or []) or "ninguna")
        vmin, vmax = f.stack[pol]
        q = s.arrays(f)[pol]
        db = np.where(q == 0, np.nan, vmin + (q.astype(np.float64) - 1) / 254 * (vmax - vmin)).astype(np.float32)
        return CapaRaster(
            escenario_id=s.id_escenario, adquisicion_id=f.id, variable="gamma0", polarizacion=pol, unidad="dB",
            paleta="gris", vmin=float(vmin), vmax=float(vmax), leyenda=None, datos=db, bbox=s.bbox, origen=f.origen)

    def capa(self, escenario_id: str, adquisicion_id: str, variable: str, polarizacion: str | None) -> CapaRaster:
        s = self._sitio(escenario_id)
        f = s.fecha(adquisicion_id)
        if variable == "mascara":
            return self._mascara(s, f)
        if variable == "gamma0":
            if polarizacion is None:
                raise EntradaNoValida.con("api.error.polarizacion_no_disponible", polarizacion="(ninguna)",
                                          disponibles=", ".join(f.stack or []) or "ninguna")
            return self._gamma0(s, f, polarizacion)
        disponibles = ", ".join(["mascara"] + (["gamma0"] if f.stack else []))
        raise EntradaNoValida.con("api.error.variable_desconocida", variable=variable, disponibles=disponibles)

    def _superficie(self, s: _Sitio, f: _Fecha) -> float:
        return float(f.fila["superficie_km2"][s.clase])

    def serie_superficie(self, escenario_id: str) -> SerieTemporal:
        s = self._sitio(escenario_id)
        titulo = _TITULO_SERIE[s.tipo]
        return SerieTemporal(titulo=titulo, unidad="km²", origen=s.fechas[-1].origen,
                             puntos=[(f.instante, self._superficie(s, f), titulo) for f in s.fechas])

    # --- cambio -----------------------------------------------------------------------------------

    def _par(self, s: _Sitio, antes_id: str, despues_id: str) -> tuple[_Fecha, _Fecha]:
        a, d = s.fecha(antes_id), s.fecha(despues_id)  # una fecha sin procedencia no existe: 404, nunca se inventa
        validar_par(a.id, d.id, a.instante, d.instante)
        return a, d

    def cambio(self, escenario_id: str, antes_id: str, despues_id: str, polarizacion: str | None) -> ResultadoCambio:
        s = self._sitio(escenario_id)
        a, d = self._par(s, antes_id, despues_id)
        pol = polarizacion
        if a.stack and d.stack:
            pol = pol or "HH"
            capa_a, capa_d = self._gamma0(s, a, pol), self._gamma0(s, d, pol)
        else:
            capa_a, capa_d = self._mascara(s, a), self._mascara(s, d)
        cod = clasificar(s.arrays(a)["mascara"], s.arrays(d)["mascara"], s.dentro())
        clasif = capa_clasificacion(s.id_escenario, d.id, s.tipo, cod, s.bbox, d.origen)
        metricas = metricas_cambio(s.tipo, self._superficie(s, a), self._superficie(s, d), a.fila["fecha"], d.fila["fecha"])
        return ResultadoCambio(antes=capa_a, despues=capa_d, cambio=clasif, clasificacion=clasif, metricas=metricas,
                               series=[self.serie_superficie(escenario_id)], notas=[], origen=d.origen)

    # --- medición ---------------------------------------------------------------------------------

    def medir(self, escenario_id: str, antes_id: str, despues_id: str,
              cuadrante: tuple[int, int, int, int] | None = None,
              punto: tuple[int, int] | None = None) -> Medicion:
        if (cuadrante is None) == (punto is None):
            raise EntradaNoValida.con("api.error.medir_uno_de_dos")
        s = self._sitio(escenario_id)
        a, d = self._par(s, antes_id, despues_id)
        fechas = {"Antes": a, "Después": d}

        def gamma(capa: str, pol: str, f: int, c: int) -> float | None:
            fecha = fechas[capa]
            return float(self._gamma0(s, fecha, pol).datos[f, c]) if fecha.stack else None

        return medir_mascaras([n for n, _ in s.json["leyenda"]], s.km2_pixel, s.arrays(a)["mascara"],
                               s.arrays(d)["mascara"], d.fila["fecha"], d.origen, gamma, cuadrante, punto)

    # --- lo que este proveedor no ofrece ----------------------------------------------------------

    def simular(self, escenario_id: str, parametros: dict | None) -> Escenario:
        raise CapacidadNoDisponible("Los derivados del equipo no se pueden simular.")

    def fotogramas(self, escenario_id: str, parametros: dict | None, inicio: datetime | None, fin: datetime | None,
                   paso_min: int) -> list[CapaRaster]:
        raise CapacidadNoDisponible("Los derivados del equipo no tienen modelo continuo.")
