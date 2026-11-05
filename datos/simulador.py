"""Simulador de Eventos: puente entre `modelo/desastres.py` y la API (sin estado, sintético por naturaleza).

Independiente de `NISAR_PROVEEDOR`: todo lo que sale de aquí es una simulación y lleva `Origen` sintético.
"""
from __future__ import annotations

import hashlib
import json
import threading
from collections import OrderedDict
from datetime import date, datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

from datos import simulador_render as render
from datos.contrato import EntradaNoValida, Origen
from datos.geografia import MENSAJE_FUERA_DE_ECUADOR, en_ecuador
from modelo import desastres, estaciones

N_MALLA = 128      # el solver de aguas someras escala ~n³: 128 mantiene el evento en segundos
EXTENSIONES_KM = (20, 30, 40, 60, 80, 120)
MAX_CIUDADES = 8
FUENTE = "Simulador de eventos (modelos físicos publicados sobre relieve SRTM)"


def ORIGEN_SIMULADOR() -> Origen:
    return Origen(tipo="sintetico", fuente=FUENTE, generador="datos/simulador.py", version="1",
                  fecha_generacion=datetime.now(timezone.utc),
                  notas="Simulación; no son observaciones de NISAR. El relieve y la población son datos complementarios.")


# --- Catálogo -------------------------------------------------------------------------------------

def _num(id: str, etiqueta: str, minimo: float, maximo: float, paso: float, defecto: float,
         unidad: str = "", ayuda: str = "", escala: float = 1.0) -> dict:
    """Control numérico en unidades del modelo; la interfaz muestra `valor × escala`."""
    return dict(id=id, etiqueta=etiqueta, tipo="numero", minimo=float(minimo), maximo=float(maximo),
                paso=float(paso), defecto=float(defecto), opciones=None, ayuda=ayuda, unidad=unidad, escala=escala)


def _sel(id: str, etiqueta: str, opciones: list[str], defecto: str, ayuda: str = "") -> dict:
    return dict(id=id, etiqueta=etiqueta, tipo="seleccion", minimo=None, maximo=None, paso=None,
                defecto=defecto, opciones=opciones, ayuda=ayuda, unidad="", escala=1.0)


def _interruptor(id: str, etiqueta: str, defecto: bool, ayuda: str = "") -> dict:
    return dict(id=id, etiqueta=etiqueta, tipo="interruptor", minimo=None, maximo=None, paso=None,
                defecto=defecto, opciones=None, ayuda=ayuda, unidad="", escala=1.0)


_SEMILLA = _num("semilla", "Semilla del azar", 0, 9999, 1, 7, ayuda="La misma semilla repite el mismo evento.")

_CONTROLES = {
    "incendio": [
        _num("viento_ms", "Viento", 0, 20, 0.5, 6, "m/s"),
        _num("viento_deg", "Viento hacia (° desde el norte)", 0, 355, 5, 45, "°"),
        _num("humedad_comb", "Humedad del combustible muerto", 0.03, 0.35, 0.01, 0.15, "%", escala=100.0,
             ayuda="Por defecto se deriva de la humedad del suelo en la fecha elegida."),
        _num("horas", "Duración simulada", 3, 72, 3, 24, "h"),
    ],
    "tormenta": [
        _num("lluvia_mm", "Lluvia total en el centro", 20, 500, 10, 180, "mm",
             "El récord diario en la Costa ecuatoriana ronda los 200–300 mm."),
        _num("duracion_h", "Duración de la lluvia", 1, 48, 1, 6, "h"),
        _num("radio_km", "Radio de la tormenta", 2, 60, 1, 15, "km"),
        _num("cohesion_kpa", "Cohesión del suelo c′", 0, 20, 0.5, 5, "kPa",
             "Incluye el refuerzo de las raíces; menos cohesión = más deslizamientos."),
        _num("friccion_deg", "Ángulo de fricción φ′", 20, 45, 1, 33, "°"),
    ],
    "inundacion": [
        _num("caudal_m3s", "Caudal pico del desborde", 100, 20000, 100, 2000, "m³/s",
             "Clic en un río → desborde; clic en el mar → marejada costera."),
        _num("duracion_h", "Duración de la crecida o marejada", 2, 48, 1, 12, "h"),
        _num("altura_marejada_m", "Sobreelevación del mar", 0.5, 10, 0.5, 2.5, "m"),
    ],
    "terremoto": [
        _num("mw", "Magnitud Mw", 5, 9, 0.1, 7.8),
        _num("profundidad_km", "Profundidad del hipocentro", 2, 70, 1, 20, "km"),
        _sel("mecanismo", "Mecanismo", list(desastres.MECANISMOS), "Inversa (subducción)"),
        _num("rumbo", "Rumbo de la falla", 0, 355, 5, 25, "°", "La fosa de Ecuador corre aproximadamente N25°E."),
        _sel("pais", "Vulnerabilidad de las construcciones (PAGER)", list(desastres.PAGER), "Ecuador"),
        _interruptor("tsunami", "Tsunami si el epicentro está en el mar", True),
    ],
    "erupcion": [
        _num("vei", "Índice de explosividad volcánica (IEV)", 1, 6, 1, 3),
        _num("volumen_lahar_hm3", "Volumen de lahar por cauce", 0, 200, 1, 20, "hm³", "1 hm³ = 1 millón de m³."),
        _num("viento_ms", "Viento en altura", 0, 40, 1, 12, "m/s"),
        _num("viento_deg", "Viento hacia (° desde el norte)", 0, 355, 5, 270, "°"),
        _num("duracion_h", "Duración de la fase explosiva", 1, 48, 1, 6, "h"),
        _num("evacuacion", "Población evacuada a tiempo", 0, 1, 0.05, 0, "%", escala=100.0),
    ],
    "ciudad": [
        dict(id="nombre", etiqueta="Nombre de la ciudad", tipo="texto", minimo=None, maximo=None, paso=None,
             defecto="Nueva Esperanza", opciones=None, ayuda="", unidad="", escala=1.0),
        _num("habitantes", "Habitantes", 1000, 1_000_000, 1000, 50_000),
    ],
}
_CONTROLES = {k: (v + [_SEMILLA] if k in desastres.DESASTRES else v) for k, v in _CONTROLES.items()}


def catalogo() -> dict:
    return {
        "herramientas": [dict(id=k, icono=icono, nombre=nombre, controles=_CONTROLES[k])
                         for k, (icono, nombre) in desastres.HERRAMIENTAS.items()],
        "mundos": [dict(nombre=n, lat=lat, lon=lon, extension_km=int(ext), herramienta=h, descripcion=d)
                   for n, (lat, lon, ext, h, d) in desastres.ESCENARIOS.items()],
        "volcanes": [dict(nombre=n, lat=la, lon=lo) for n, la, lo in desastres.VOLCANES],
        "extensiones_km": list(EXTENSIONES_KM),
    }


# --- Mundos ---------------------------------------------------------------------------------------

class CiudadExtra(BaseModel):
    nombre: str = Field(min_length=1, max_length=40)
    lat: float = Field(ge=-6, le=2)
    lon: float = Field(ge=-93, le=-75)
    habitantes: int = Field(ge=1000, le=1_000_000)


class PeticionMundo(BaseModel):
    lat: float = Field(allow_inf_nan=False)   # el rango lo decide `validar` (mensaje en español)
    lon: float = Field(allow_inf_nan=False)
    extension_km: int = 40
    fecha: date
    usar_dem: bool = True
    ciudades: list[CiudadExtra] = Field(default_factory=list, max_length=MAX_CIUDADES)

    def validar(self) -> None:
        if not en_ecuador(self.lat, self.lon):
            raise EntradaNoValida(MENSAJE_FUERA_DE_ECUADOR)
        if self.extension_km not in EXTENSIONES_KM:
            raise EntradaNoValida("El lado del mundo debe ser uno de: " + ", ".join(map(str, EXTENSIONES_KM)) + " km.")

    def clave(self) -> str:
        return json.dumps(self.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))


class _LRU:
    def __init__(self, capacidad: int) -> None:
        self._c, self._d, self._l = capacidad, OrderedDict(), threading.Lock()

    def obtener(self, k: str) -> Any | None:
        with self._l:
            if k not in self._d:
                return None
            self._d.move_to_end(k)
            return self._d[k]

    def guardar(self, k: str, v: Any) -> None:
        with self._l:
            self._d[k] = v
            self._d.move_to_end(k)
            while len(self._d) > self._c:
                self._d.popitem(last=False)


_MUNDOS = _LRU(6)


def _id(clave: str) -> str:
    return hashlib.sha256(clave.encode()).hexdigest()[:12]


def _marcas(m: desastres.Mundo) -> list[dict]:
    marcas = [dict(x=(c + 0.5) / m.n, y=(f + 0.5) / m.n, texto=nombre, tipo="ciudad") for nombre, f, c, _ in m.ciudades]
    for nombre, la, lo in desastres.VOLCANES:
        celda = m.celda(la, lo)
        if celda:
            marcas.append(dict(x=(celda[1] + 0.5) / m.n, y=(celda[0] + 0.5) / m.n, texto=nombre, tipo="volcan"))
    return marcas


def crear(p: PeticionMundo) -> tuple[desastres.Mundo, dict]:
    """Mundo (en caché) y su descripción serializable (`MundoDto`)."""
    p.validar()
    clave = p.clave()
    hit = _MUNDOS.obtener(clave)
    if hit is None:
        extra = tuple((c.nombre, c.lat, c.lon, c.habitantes) for c in p.ciudades)
        m = desastres.crear_mundo(p.lat, p.lon, float(p.extension_km), n=N_MALLA, fecha=p.fecha,
                                  usar_dem=p.usar_dem, ciudades_extra=extra)
        clim = estaciones.climatologia(p.lat, p.lon)
        temp = estaciones.temporada(p.fecha, clim, m.region) if clim is not None else None
        o, s, e, n_ = m.limites()
        dto = dict(
            id=_id(clave), n=m.n, bbox=[o, s, e, n_], region=m.region, fuente_dem=m.fuente_dem, pixel_m=m.pixel_m,
            habitantes=float(m.poblacion.sum()), humedad_suelo_pct=100 * m.humedad_suelo,
            humedad_combustible_defecto=desastres.humedad_combustible(m.humedad_suelo),
            temporada=temp["temporada"] if temp else None, prec_anual_mm=m.prec_anual_mm,
            relieve_png_b64=render.png_b64(render.relieve_rgba(m)), marcas=_marcas(m), origen=ORIGEN_SIMULADOR())
        hit = (m, dto)
        _MUNDOS.guardar(clave, hit)
    return hit


# --- Eventos --------------------------------------------------------------------------------------

import re  # noqa: E402

import numpy as np  # noqa: E402

from datos.contrato import CapaRaster  # noqa: E402

MAX_CUADROS = 48
ESCALA_CUADRO = 2
CICLO_DIAS_SUPUESTO = 12          # nisar.CICLO_DIAS: pendiente de confirmar con la documentación oficial
Valor = bool | int | float | str


class PeticionEvento(BaseModel):
    mundo: PeticionMundo
    herramienta: str = Field(max_length=20)
    celda: tuple[int, int]
    parametros: dict[str, Valor] = Field(default_factory=dict, max_length=16)


_EVENTOS = _LRU(12)


def _validar_parametros(herramienta: str, parametros: dict[str, Valor]) -> dict[str, Valor]:
    controles = {c["id"]: c for c in _CONTROLES[herramienta]}
    limpios: dict[str, Valor] = {}
    for k, v in parametros.items():
        c = controles.get(k)
        if c is None:
            raise EntradaNoValida(f"El parámetro {k} no existe para esta herramienta.")
        if c["tipo"] == "numero":
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not np.isfinite(v):
                raise EntradaNoValida(f"{k} debe ser un número.")
            if not c["minimo"] <= v <= c["maximo"]:
                raise EntradaNoValida(f"{k} debe estar entre {c['minimo']:g} y {c['maximo']:g}.")
            limpios[k] = int(v) if k in ("semilla", "vei") else float(v)
        elif c["tipo"] == "seleccion":
            if v not in c["opciones"]:
                raise EntradaNoValida(f"{k} debe ser una de: {', '.join(c['opciones'])}.")
            limpios[k] = v
        elif c["tipo"] == "interruptor":
            if not isinstance(v, bool):
                raise EntradaNoValida(f"{k} debe ser verdadero o falso.")
            limpios[k] = v
        else:
            limpios[k] = str(v)[:40]
    return limpios


def _numero(x: Any) -> float | None:
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    return f if np.isfinite(f) else None


def _panel_a_capa(panel: Any, m: desastres.Mundo, id_mundo: str, idx: int) -> CapaRaster:
    pol = re.search(r"\b(HH|HV|VV|VH)\b", panel.titulo)
    cat = panel.paleta == "categorias"
    datos = np.asarray(panel.datos, dtype=np.float32)
    return CapaRaster(
        escenario_id=f"simulador:{id_mundo}", adquisicion_id=None, variable=f"panel_{idx}",
        polarizacion=pol.group(1) if pol else None, unidad=panel.unidad, paleta=panel.paleta,
        vmin=0.0 if cat else float(panel.vmin), vmax=float(len(panel.leyenda)) if cat else float(panel.vmax),
        leyenda=[(e, c) for e, c in panel.leyenda] if cat else None, datos=datos,
        bbox=tuple(m.limites()), origen=ORIGEN_SIMULADOR())


def _duracion_h(herramienta: str, par: dict[str, Valor]) -> float | None:
    clave = {"incendio": "horas", "tormenta": "duracion_h", "inundacion": "duracion_h", "erupcion": "duracion_h"}.get(herramienta)
    if clave is None:
        return None
    por_defecto = next(c["defecto"] for c in _CONTROLES[herramienta] if c["id"] == clave)
    return float(par.get(clave, por_defecto))


def desatar(p: PeticionEvento) -> dict:
    """Ejecuta el desastre y devuelve el `EventoDto` (con los paneles de radar como `CapaRaster`)."""
    if p.herramienta not in desastres.DESASTRES:
        raise EntradaNoValida("La herramienta no existe o no es un evento: elige incendio, tormenta, inundacion, terremoto o erupcion.")
    m, dto_mundo = crear(p.mundo)
    i, j = p.celda
    if not (0 <= i < m.n and 0 <= j < m.n):
        raise EntradaNoValida(f"La celda ({i}, {j}) queda fuera de la malla de {m.n}×{m.n}.")
    par = _validar_parametros(p.herramienta, p.parametros)
    clave = json.dumps([p.mundo.clave(), p.herramienta, i, j, sorted(par.items())], default=str)
    hit = _EVENTOS.obtener(clave)
    if hit is not None:
        return hit
    try:
        ev = desastres.desatar(p.herramienta, m, i, j, **par)
    except ValueError as exc:
        raise EntradaNoValida(str(exc)) from None
    paso = max(1, -(-len(ev.cuadros) // MAX_CUADROS))
    idx = list(range(0, len(ev.cuadros), paso))
    if idx[-1] != len(ev.cuadros) - 1:
        idx.append(len(ev.cuadros) - 1)
    paneles = [_panel_a_capa(pn, m, dto_mundo["id"], k) for k, pn in enumerate(ev.nisar_paneles)]
    comparable = (len(paneles) >= 2 and paneles[0].paleta == paneles[1].paleta != "categorias"
                  and (paneles[0].vmin, paneles[0].vmax) == (paneles[1].vmin, paneles[1].vmax))
    notas = [re.sub(r"\d+ días después del evento \(ciclo de \d+ días\)", "en una pasada posterior (ver «Espera hasta la primera imagen»)", n)
             for n in ev.notas]
    tabla = None
    if ev.tabla is not None and not ev.tabla.empty:
        t = ev.tabla.astype(object).where(ev.tabla.notna(), None)
        tabla = dict(columnas=[str(c) for c in t.columns],
                     filas=[[v if isinstance(v, (str, type(None))) else (_numero(v) if _numero(v) is not None else str(v)) for v in fila]
                            for fila in t.itertuples(index=False)])
    la, lo = m.latlon(*ev.celda)
    dto = dict(
        herramienta=p.herramienta, titulo=ev.titulo, celda=list(ev.celda), lat=la, lon=lo,
        tiempos=[str(ev.tiempos[k]) for k in idx],
        cuadros_png_b64=[render.png_b64(render.componer(ev, ev.cuadros[k], ESCALA_CUADRO)) for k in idx],
        capas=[dict(clave=c.clave, nombre=c.nombre, estilo=c.estilo, unidad=c.unidad, etiquetas=list(c.etiquetas)) for c in ev.capas],
        metricas=[dict(etiqueta=e, valor=str(v), ayuda=a) for e, v, a in ev.metricas],
        tabla=tabla, notas=notas, modelos=list(ev.modelos), paneles=paneles, titulos_paneles=[pn.titulo for pn in ev.nisar_paneles], comparable=comparable,
        polarizacion=paneles[0].polarizacion if comparable else None,
        metricas_radar=[dict(etiqueta=e, valor=str(v), ayuda=a) for e, v, a in ev.nisar_metricas],
        espera_radar=dict(ciclo_dias=CICLO_DIAS_SUPUESTO, minimo_dias=0, maximo_dias=CICLO_DIAS_SUPUESTO,
                          medio_dias=CICLO_DIAS_SUPUESTO / 2, duracion_evento_h=_duracion_h(p.herramienta, par),
                          verificado=False),
        resumen={k: _numero(v) for k, v in ev.resumen.items()}, origen=ORIGEN_SIMULADOR())
    _EVENTOS.guardar(clave, dto)
    return dto


def fundar_ciudad(p: PeticionMundo, i: int, j: int, nombre: str, habitantes: int) -> PeticionMundo:
    """Devuelve la petición de mundo con la ciudad añadida (el mundo se vuelve a poblar con ella)."""
    m, _ = crear(p)
    if not (0 <= i < m.n and 0 <= j < m.n):
        raise EntradaNoValida(f"La celda ({i}, {j}) queda fuera de la malla de {m.n}×{m.n}.")
    if m.mar[i, j]:
        raise EntradaNoValida("No se puede fundar una ciudad en el mar.")
    if len(p.ciudades) >= MAX_CIUDADES:
        raise EntradaNoValida(f"Se admiten como máximo {MAX_CIUDADES} ciudades fundadas.")
    n_, la, lo, h = desastres.ciudad_fundada(m, i, j, habitantes, nombre.strip()[:40] or "Ciudad sin nombre")
    return p.model_copy(update={"ciudades": [*p.ciudades, CiudadExtra(nombre=n_, lat=la, lon=lo, habitantes=h)]})
