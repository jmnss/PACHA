"""Proveedor de los derivados del equipo (embalses e incendio): lee `data/<embalses|incendios>/<sitio>/`.

Formato escrito por `preparacion/salida.py`: `sitio.json`, un `.npz` por fecha (`mascara` con códigos del contrato
0 sin dato / 1 clase / 2 resto, salvo en una fecha de incendio sin máscara; si hay stack `HH` y `HV` cuantizados; y
si hay ΔRFDI `delta_rfdi` cuantizado en [-1, 1]), `contorno.geojson`. Acepta las versiones 1 y 2 de `sitio.json`. Regla de honestidad del proyecto:
una fecha sin procedencia completa NO se expone (ni en el escenario, ni en las capas, ni en la serie), y cada capa
lleva el origen con la procedencia de su propia fecha. Decisión del usuario (2026-11-15): lo del equipo se sirve como
NISAR con lo que se sabe (producto, fecha, polarizaciones); granulo, colección, frecuencia, madurez y hora se omiten
si faltan, nunca se inventan. Solo numpy, json y pydantic (corre también en Pyodide).
"""
from __future__ import annotations

import json
import warnings
from datetime import date, datetime, time, timezone
from pathlib import Path

import numpy as np

from datos.proveedores._embalse_comun import (TITULO_SERIE as _TITULO_SERIE, capa_clasificacion,
                                              clasificar, dentro_contorno, medir_mascaras, metricas_cambio,
                                              num as _num, validar_par)
from datos import resumen as _resumen
from datos.contrato import (Adquisicion, CapaRaster, Capacidades, CapacidadNoDisponible, Escenario, EntradaNoValida,
                            Medicion, Metrica, NoEncontrado, Origen, Procedencia, ResultadoCambio, SerieTemporal,
                            faltantes_procedencia)

DIR_DATOS = Path(__file__).resolve().parents[2] / "data"  # carpeta data/ en la raíz del proyecto
CARPETAS = {"embalse": "embalses", "incendio": "incendios"}
FUENTE = "equipo PACHA"
def _procedencia(d: dict | None, dia: str | None = None) -> Procedencia | None:
    """Procedencia del `sitio.json` (claves de `procedencia.json`) → modelo; None si no se puede leer. `dia` es la
    fecha de la fila (AAAA-MM-DD): se usa como fecha de adquisición sin hora cuando no hay instante UTC."""
    if not isinstance(d, dict):
        return None
    try:
        fecha = d.get("fecha_adquisicion_utc")
        adq = datetime.fromisoformat(fecha.replace("Z", "+00:00")) if fecha else None
        if adq is not None and adq.tzinfo is None:
            adq = None
        metodo = d.get("metodo")
        return Procedencia(producto=d.get("producto"), coleccion=d.get("coleccion"), granulos=d.get("granulos") or [],
                           fecha_adquisicion=adq, fecha=None if adq is not None or not dia else date.fromisoformat(dia),
                           polarizaciones=d.get("polarizaciones") or [],
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
        # Sin hora conocida, el instante es un ancla (12:00 UTC del día) solo para ordenar; la interfaz muestra la fecha.
        self.hora_conocida = proc.fecha_adquisicion is not None
        self.dia = proc.fecha_adquisicion.date() if self.hora_conocida else proc.fecha
        self.instante = proc.fecha_adquisicion or datetime.combine(proc.fecha, time(12), timezone.utc)
        self.stack = fila.get("stack") or None
        self.tiene_mascara = fila.get("mascara", True)  # v1 siempre traía máscara
        self.delta_rfdi = fila.get("delta_rfdi") or None
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
            proc = _procedencia(fila.get("procedencia"), fila.get("fecha"))
            # La bandera del archivo se calculó con las reglas de entonces: manda el contrato.
            if proc is not None and not faltantes_procedencia("nisar", proc):
                self.fechas.append(_Fecha(fila, proc, prep))
        self.fechas.sort(key=lambda f: f.instante)
        self.clase = s["leyenda"][0][0]
        self.tipo = s["tipo"]
        self.forma = tuple(s["forma"])
        self.bbox = tuple(s["bbox"])
        self.km2_pixel = abs(s["transform"][0] * s["transform"][4]) / 1e6
        self._npz: dict[str, dict[str, np.ndarray]] = {}
        self._dentro: np.ndarray | None = None
        self._escala: dict[str, tuple[float, float]] = {}
        ruta_ficha = carpeta / "ficha.json"
        self.ficha = (json.loads(ruta_ficha.read_text(encoding="utf-8")).get("datos", [])
                      if ruta_ficha.exists() else [])

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

    def db(self, f: _Fecha, pol: str) -> np.ndarray:
        """γ⁰ en dB de una fecha (NaN sin dato), descuantizado del stack."""
        vmin, vmax = f.stack[pol]
        q = self.arrays(f)[pol]
        return np.where(q == 0, np.nan, vmin + (q.astype(np.float64) - 1) / 254 * (vmax - vmin)).astype(np.float32)

    def escala(self, pol: str) -> tuple[float, float]:
        """Escala común de γ⁰ para el sitio: percentiles 2–98 de todos los píxeles con dato de todas sus fechas."""
        if pol not in self._escala:
            v = np.concatenate([self.db(f, pol).ravel() for f in self.fechas if f.stack and pol in f.stack])
            v = v[np.isfinite(v)]
            p2, p98 = np.percentile(v, [2, 98]) if v.size else (-25.0, 0.0)
            self._escala[pol] = (round(float(p2), 2), round(float(max(p98, p2 + 0.01)), 2))
        return self._escala[pol]

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
                except (OSError, ValueError, KeyError) as e:  # un sitio ilegible no tumba a los demás
                    warnings.warn(f"sitio omitido (no se pudo leer {ruta}): {e}")
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
        hay_mascara = any(f.tiene_mascara for f in s.fechas)
        hay_delta = any(f.delta_rfdi for f in s.fechas)
        return Escenario(
            id=id, nombre=j["nombre"], tipo_cambio=CARPETAS[s.tipo], historia=s.tipo, sitio=j["sitio"],
            region=j["region"], bbox=s.bbox, resolucion_m=j["resolucion_m"],
            polarizaciones=["HH", "HV"] if hay_stack else [],
            variables=(["mascara"] if hay_mascara else []) + (["gamma0"] if hay_stack else [])
            + (["delta_rfdi"] if hay_delta else []),
            adquisiciones=[Adquisicion(id=f.id, instante=f.instante, fecha=f.dia, hora_conocida=f.hora_conocida,
                                       polarizaciones=["HH", "HV"] if f.stack else [])
                           for f in s.fechas],
            capacidades=self.capacidades, origen=s.fechas[-1].origen)

    def intervalo_por_defecto(self, escenario_id: str) -> tuple[str, str]:
        s = self._sitio(escenario_id)
        return s.fechas[0].id, s.fechas[-1].id

    # --- capas ------------------------------------------------------------------------------------

    def _no_disponible(self, f: _Fecha, variable: str) -> EntradaNoValida:
        disponibles = ", ".join((["mascara"] if f.tiene_mascara else []) + (["gamma0"] if f.stack else [])
                                + (["delta_rfdi"] if f.delta_rfdi else []))
        return EntradaNoValida.con("api.error.variable_desconocida", variable=variable, disponibles=disponibles)

    def _mascara(self, s: _Sitio, f: _Fecha) -> CapaRaster:
        if not f.tiene_mascara:
            raise self._no_disponible(f, "mascara")
        return CapaRaster(
            escenario_id=s.id_escenario, adquisicion_id=f.id, variable="mascara", polarizacion=None, unidad="",
            paleta="categorias", vmin=0, vmax=len(s.json["leyenda"]), leyenda=[tuple(x) for x in s.json["leyenda"]],
            datos=s.arrays(f)["mascara"], bbox=s.bbox, origen=f.origen)

    def _gamma0(self, s: _Sitio, f: _Fecha, pol: str) -> CapaRaster:
        if not f.stack or pol not in f.stack:
            raise EntradaNoValida.con("api.error.polarizacion_no_disponible", polarizacion=pol,
                                      disponibles=", ".join(f.stack or []) or "ninguna")
        vmin, vmax = s.escala(pol)   # escala de color: percentiles 2–98 reales del sitio (los datos no se recortan)
        db = s.db(f, pol)
        return CapaRaster(
            escenario_id=s.id_escenario, adquisicion_id=f.id, variable="gamma0", polarizacion=pol, unidad="dB",
            paleta="gris", vmin=float(vmin), vmax=float(vmax), leyenda=None, datos=db, bbox=s.bbox, origen=f.origen)

    def _delta_rfdi(self, s: _Sitio, f: _Fecha) -> CapaRaster:
        if not f.delta_rfdi:
            raise self._no_disponible(f, "delta_rfdi")
        vmin, vmax = f.delta_rfdi
        q = s.arrays(f)["delta_rfdi"]
        datos = np.where(q == 0, np.nan, vmin + (q.astype(np.float64) - 1) / 254 * (vmax - vmin)).astype(np.float32)
        return CapaRaster(
            escenario_id=s.id_escenario, adquisicion_id=f.id, variable="delta_rfdi", polarizacion=None, unidad="",
            paleta="divergente", vmin=float(vmin), vmax=float(vmax), leyenda=None, datos=datos, bbox=s.bbox,
            origen=f.origen)

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
        if variable == "delta_rfdi":
            return self._delta_rfdi(s, f)
        raise self._no_disponible(f, variable)

    def _superficie(self, s: _Sitio, f: _Fecha) -> float | None:
        v = f.fila["superficie_km2"][s.clase]
        return None if v is None else float(v)

    def serie_superficie(self, escenario_id: str) -> SerieTemporal:
        """Superficie por fecha; las fechas sin máscara (superficie null) se omiten, no se les inventa un valor."""
        s = self._sitio(escenario_id)
        titulo = _TITULO_SERIE[s.tipo]
        return SerieTemporal(titulo=titulo, unidad="km²", origen=s.fechas[-1].origen,
                             puntos=[(f.instante, self._superficie(s, f), titulo) for f in s.fechas
                                     if self._superficie(s, f) is not None])

    # --- cambio -----------------------------------------------------------------------------------

    def _par(self, s: _Sitio, antes_id: str, despues_id: str) -> tuple[_Fecha, _Fecha]:
        a, d = s.fecha(antes_id), s.fecha(despues_id)  # una fecha sin procedencia no existe: 404, nunca se inventa
        validar_par(a.id, d.id, a.instante, d.instante)
        return a, d

    def _mascaras_par(self, s: _Sitio, a: _Fecha, d: _Fecha) -> tuple[np.ndarray, np.ndarray]:
        """Máscaras (antes, después) para clasificar. Caso de incendio con «antes» sin máscara: la máscara del equipo
        es el quemado entre ambas fechas: «antes» sale como «no quemado» (2) donde «después» tiene dato, así que el
        quemado de «después» es cambio «nuevo»; sin dato en «después» sigue sin dato (0)."""
        md = s.arrays(d)["mascara"]
        if a.tiene_mascara:
            return s.arrays(a)["mascara"], md
        return np.where(md == 0, 0, 2).astype(np.uint8), md

    def cambio(self, escenario_id: str, antes_id: str, despues_id: str, polarizacion: str | None) -> ResultadoCambio:
        """Cambio entre dos fechas. Si «antes» no tiene máscara (incendio), la superficie «antes» de las métricas
        es 0,0 km² (nada quemado hasta esa fecha), por la definición del equipo de la máscara."""
        s = self._sitio(escenario_id)
        a, d = self._par(s, antes_id, despues_id)
        pol = polarizacion
        if a.stack and d.stack:
            pol = pol or "HH"
            capa_a, capa_d = self._gamma0(s, a, pol), self._gamma0(s, d, pol)
        else:
            capa_a, capa_d = self._mascara(s, a), self._mascara(s, d)
        ma, md = self._mascaras_par(s, a, d)
        cod = clasificar(ma, md, s.dentro())
        clasif = capa_clasificacion(s.id_escenario, d.id, s.tipo, cod, s.bbox, d.origen)
        metricas = metricas_cambio(s.tipo, self._superficie(s, a) or 0.0, self._superficie(s, d), a.fila["fecha"], d.fila["fecha"])
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

        ma, md = self._mascaras_par(s, a, d)
        return medir_mascaras([n for n, _ in s.json["leyenda"]], s.km2_pixel, ma, md, d.fila["fecha"], d.origen, gamma, cuadrante, punto)

    # --- resumen científico y comparación ---------------------------------------------------------

    def _delta(self, s: _Sitio, f: _Fecha) -> np.ndarray:
        return self._delta_rfdi(s, f).datos

    def resumen(self, escenario_id: str) -> _resumen.ResumenSitio:
        """Superficies, retrodispersión por fecha, ΔRFDI dentro/fuera del área marcada, ficha y lecturas."""
        s = self._sitio(escenario_id)
        fechas = []
        for f in s.fechas:
            m = s.arrays(f)["mascara"] if f.tiene_mascara else None
            stats = [e for pol in ("HH", "HV") if f.stack and pol in f.stack
                     for e in [_resumen.estadistica(pol, s.db(f, pol), m)] if e is not None]
            fechas.append(_resumen.FechaResumen(adquisicion_id=f.id, fecha=f.dia, superficie_km2=self._superficie(s, f),
                                                retrodispersion=stats))
        ficha = _resumen.ficha(s.ficha)
        var = inc = None
        lecturas: list[_resumen.Lectura] = []
        if s.tipo == "embalse":
            var = _resumen.variacion(fechas)
            lecturas = _resumen.lecturas_embalse(fechas, var)
        else:
            con = [f for f in s.fechas if f.tiene_mascara and self._superficie(s, f) is not None]
            if con:
                f = con[-1]
                m = s.arrays(f)["mascara"]
                dentro = fuera = dif = None
                if f.delta_rfdi:
                    d = self._delta(s, f)
                    dentro, fuera = _resumen.mediana(d[m == 1]), _resumen.mediana(d[m == 2])
                    if dentro is not None and fuera is not None:
                        dif = round(dentro - fuera, 3)
                km2 = self._superficie(s, f)
                inc = _resumen.ResumenIncendio(
                    adquisicion_id=f.id, fecha=f.dia, area_marcada_km2=round(km2, 2), area_marcada_ha=round(km2 * 100),
                    delta_rfdi_mediana_dentro=None if dentro is None else round(dentro, 3),
                    delta_rfdi_mediana_fuera=None if fuera is None else round(fuera, 3), delta_rfdi_diferencia=dif)
                lecturas = _resumen.lecturas_incendio(inc, ficha)
        escena = _resumen.lectura_escena(fechas)
        if escena is not None:
            lecturas.append(escena)
        escala = {pol: s.escala(pol) for pol in ("HH", "HV") if any(f.stack and pol in f.stack for f in s.fechas)}
        return _resumen.ResumenSitio(escenario_id=escenario_id, nombre=s.json["nombre"], historia=s.tipo, fechas=fechas,
                                     variacion=var, incendio=inc, escala_db=escala, ficha=ficha, lecturas=lecturas,
                                     origen=s.fechas[-1].origen)

    def comparacion_embalses(self) -> _resumen.ComparacionEmbalses:
        """Mazar frente a Daule-Peripa (o los embalses que haya), con la misma métrica y el desfase de fechas."""
        ids = [i for i, s in self._escenarios.items() if s.tipo == "embalse"]
        if not ids:
            raise NoEncontrado.con("api.error.escenario_desconocido", id="embalses")
        orden = {"embalse-mazar": 0, "embalse-daule-peripa": 1}
        ids.sort(key=lambda i: (orden.get(i, 9), i))
        resumenes = [self.resumen(i) for i in ids]
        return _resumen.comparar(resumenes, resumenes[0].origen)

    # --- lo que este proveedor no ofrece ----------------------------------------------------------

    def simular(self, escenario_id: str, parametros: dict | None) -> Escenario:
        raise CapacidadNoDisponible("Los derivados del equipo no se pueden simular.")

    def fotogramas(self, escenario_id: str, parametros: dict | None, inicio: datetime | None, fin: datetime | None,
                   paso_min: int) -> list[CapaRaster]:
        raise CapacidadNoDisponible("Los derivados del equipo no tienen modelo continuo.")
