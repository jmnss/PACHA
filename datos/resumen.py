"""Resumen científico de un sitio del equipo (embalse o incendio) y comparación entre embalses.

Todo sale de los derivados (`data/<embalses|incendios>/<sitio>/`): superficies medidas por el equipo en la rejilla
nativa de su máscara (dentro del contorno), estadísticas de retrodispersión en dB por fecha, ΔRFDI dentro y fuera del
área marcada y la ficha del sitio (solo datos con fuente y URL). Las lecturas en palabras son **hipótesis** por
comprobar, nunca conclusiones. Solo numpy y pydantic (corre también en Pyodide).
"""
from __future__ import annotations

from datetime import date

import numpy as np
from pydantic import BaseModel

from datos.claves import texto
from datos.contrato import Origen, TextoClave

# Diferencias de mediana de ΔRFDI (dentro − fuera) por debajo de esto no separan el área marcada del resto.
UMBRAL_DRFDI = 0.05
# Un cambio de la mediana de HV de TODA la escena mayor que esto (dB) entre dos fechas apunta a diferencias de
# procesamiento o de geometría entre las imágenes, no a un cambio del terreno.
UMBRAL_ESCENA_DB = 2.0
# Variación relativa de la superficie de agua por debajo de esto (%) se lee como «estable».
UMBRAL_ESTABLE_PCT = 1.0


class Lectura(TextoClave):
    """Frase en palabras (hipótesis). `texto` es el español; el cliente traduce por `clave_texto`."""
    texto: str


class EstadisticaDb(BaseModel):
    """Retrodispersión (γ⁰, dB) de una polarización en una fecha, sobre los píxeles con dato de la escena."""
    polarizacion: str
    mediana_db: float
    p2_db: float
    p98_db: float
    # Mediana dentro de la clase de la máscara (agua o quemado) y en el resto; None si esa fecha no tiene máscara.
    mediana_clase_db: float | None = None
    mediana_resto_db: float | None = None


class FechaResumen(BaseModel):
    adquisicion_id: str
    fecha: date
    superficie_km2: float | None   # None: esa fecha no tiene máscara (no se inventa)
    retrodispersion: list[EstadisticaDb]


class Variacion(BaseModel):
    antes_id: str
    despues_id: str
    fecha_antes: date
    fecha_despues: date
    dias: int
    antes_km2: float
    despues_km2: float
    absoluta_km2: float
    relativa_pct: float | None


class ResumenIncendio(BaseModel):
    """Área marcada por la máscara del equipo y ΔRFDI (= RFDI antes − RFDI después, definición del equipo)."""
    adquisicion_id: str
    fecha: date
    area_marcada_km2: float
    area_marcada_ha: float
    delta_rfdi_mediana_dentro: float | None
    delta_rfdi_mediana_fuera: float | None
    delta_rfdi_diferencia: float | None   # dentro − fuera


class FuenteFicha(BaseModel):
    nombre: str
    url: str
    cita: str
    consulta: date


class DatoFicha(BaseModel):
    """Un dato del sitio con su fuente publicada. Etiqueta traducible: `api.ficha.<id>.etiqueta`."""
    id: str
    clave_texto: str
    etiqueta: str
    valor: float | str
    unidad: str
    nombre_propio: str | None = None   # p. ej. el nombre de la central; no se traduce
    fuente: FuenteFicha


class ResumenSitio(BaseModel):
    escenario_id: str
    nombre: str
    historia: str
    fechas: list[FechaResumen]
    variacion: Variacion | None = None       # embalses: primera → última fecha con máscara
    incendio: ResumenIncendio | None = None  # incendios
    # Escala común de la capa γ⁰ por polarización: percentiles 2–98 de todos los píxeles con dato del sitio (dB).
    escala_db: dict[str, tuple[float, float]]
    ficha: list[DatoFicha]
    lecturas: list[Lectura]
    origen: Origen


class SitioComparado(BaseModel):
    escenario_id: str
    nombre: str
    variacion: Variacion


class ComparacionEmbalses(BaseModel):
    """Misma métrica (superficie de agua, primera → última fecha) en cada embalse, con el desfase de fechas."""
    sitios: list[SitioComparado]
    dias_entre_antes: int | None = None     # entre las fechas «antes» de los dos primeros sitios
    dias_entre_despues: int | None = None
    lecturas: list[Lectura]
    origen: Origen


# --- utilidades -------------------------------------------------------------------------------------------

def _es(x: float, d: int = 1) -> str:
    """Cifra en español (coma decimal, signo menos tipográfico)."""
    return f"{x:.{d}f}".replace(".", ",").replace("-", "−")


def _fecha_es(d: date) -> str:
    return d.strftime("%d/%m/%Y")


def lectura(clave: str, **valores) -> Lectura:
    """Cada valor es `(número, decimales)`, una fecha o un texto. El español sale formateado; el cliente recibe la
    cifra sin formato y sus decimales (y las fechas en ISO)."""
    es: dict[str, str] = {}
    crudo: dict[str, float | str] = {}
    decimales: dict[str, int] = {}
    for k, v in valores.items():
        if isinstance(v, tuple):
            n, dec = v
            es[k], crudo[k], decimales[k] = _es(n, dec), round(float(n), dec), dec
        elif isinstance(v, date):
            es[k], crudo[k] = _fecha_es(v), v.isoformat()
        else:
            es[k] = crudo[k] = str(v)
    return Lectura(clave_texto=clave, valores_texto=crudo, decimales_texto=decimales, texto=texto(clave, **es))


def mediana(v: np.ndarray) -> float | None:
    v = v[np.isfinite(v)]
    return float(np.median(v)) if v.size else None


def estadistica(pol: str, db: np.ndarray, mascara: np.ndarray | None) -> EstadisticaDb | None:
    validos = db[np.isfinite(db)]
    if not validos.size:
        return None
    p2, p50, p98 = np.percentile(validos, [2, 50, 98])
    clase = resto = None
    if mascara is not None:
        clase, resto = mediana(db[mascara == 1]), mediana(db[mascara == 2])
    return EstadisticaDb(polarizacion=pol, mediana_db=round(float(p50), 2), p2_db=round(float(p2), 2),
                         p98_db=round(float(p98), 2),
                         mediana_clase_db=None if clase is None else round(clase, 2),
                         mediana_resto_db=None if resto is None else round(resto, 2))


def variacion(fechas: list[FechaResumen]) -> Variacion | None:
    con = [f for f in fechas if f.superficie_km2 is not None]
    if len(con) < 2:
        return None
    a, d = con[0], con[-1]
    dif = d.superficie_km2 - a.superficie_km2
    rel = round(dif / a.superficie_km2 * 100, 1) if a.superficie_km2 else None
    return Variacion(antes_id=a.adquisicion_id, despues_id=d.adquisicion_id, fecha_antes=a.fecha,
                     fecha_despues=d.fecha, dias=(d.fecha - a.fecha).days, antes_km2=round(a.superficie_km2, 2),
                     despues_km2=round(d.superficie_km2, 2), absoluta_km2=round(dif, 2), relativa_pct=rel)


def ficha(datos: list[dict]) -> list[DatoFicha]:
    """Solo los datos con fuente y URL; lo que no la tenga no entra."""
    out = []
    for d in datos:
        f = d.get("fuente") or {}
        if not (f.get("url") and f.get("nombre")):
            continue
        clave = f"api.ficha.{d['id']}"
        out.append(DatoFicha(id=d["id"], clave_texto=clave, etiqueta=texto(f"{clave}.etiqueta"), valor=d["valor"],
                             unidad=d.get("unidad", ""), nombre_propio=d.get("nombre_propio"),
                             fuente=FuenteFicha(**f)))
    return out


# --- lecturas ---------------------------------------------------------------------------------------------

def lecturas_embalse(fechas: list[FechaResumen], var: Variacion | None) -> list[Lectura]:
    out = []
    if var is not None and var.relativa_pct is not None:
        sentido = ("estable" if abs(var.relativa_pct) < UMBRAL_ESTABLE_PCT
                   else "baja" if var.relativa_pct < 0 else "sube")
        out.append(lectura(f"api.resumen.lectura.embalse.{sentido}", antes=var.fecha_antes, despues=var.fecha_despues,
                           dias=(var.dias, 0), a=(var.antes_km2, 2), d=(var.despues_km2, 2),
                           rel=(var.relativa_pct, 1)))
    for f in fechas:   # contraste agua / resto en HH, en la primera fecha que lo permita
        hh = next((e for e in f.retrodispersion if e.polarizacion == "HH"), None)
        if hh and hh.mediana_clase_db is not None and hh.mediana_resto_db is not None:
            out.append(lectura("api.resumen.lectura.embalse.contraste", fecha=f.fecha,
                               agua=(hh.mediana_clase_db, 1), resto=(hh.mediana_resto_db, 1)))
            break
    return out


def lectura_escena(fechas: list[FechaResumen]) -> Lectura | None:
    """Si la mediana de HV de toda la escena cambia mucho entre la primera y la última fecha con stack."""
    hv = [(f.fecha, e.mediana_db) for f in fechas for e in f.retrodispersion if e.polarizacion == "HV"]
    if len(hv) < 2:
        return None
    (fa, va), (fd, vd) = hv[0], hv[-1]
    if abs(vd - va) <= UMBRAL_ESCENA_DB:
        return None
    return lectura("api.resumen.lectura.escena_cambia", antes=fa, despues=fd, a=(va, 1), d=(vd, 1), dif=(vd - va, 1))


def lecturas_incendio(inc: ResumenIncendio, ficha_sitio: list[DatoFicha]) -> list[Lectura]:
    out = [lectura("api.resumen.lectura.incendio.area", fecha=inc.fecha, km2=(inc.area_marcada_km2, 2),
                   ha=(inc.area_marcada_ha, 0))]
    if inc.delta_rfdi_diferencia is not None:
        separa = abs(inc.delta_rfdi_diferencia) >= UMBRAL_DRFDI
        out.append(lectura(f"api.resumen.lectura.incendio.rfdi_{'separa' if separa else 'no_separa'}",
                           dentro=(inc.delta_rfdi_mediana_dentro, 2), fuera=(inc.delta_rfdi_mediana_fuera, 2),
                           dif=(inc.delta_rfdi_diferencia, 2)))
    publicada = next((d for d in ficha_sitio if d.id == "area_publicada" and isinstance(d.valor, (int, float))), None)
    if publicada is not None:
        razon = inc.area_marcada_ha / float(publicada.valor) if publicada.valor else None
        if razon is not None:
            out.append(lectura("api.resumen.lectura.incendio.publicada", ha=(inc.area_marcada_ha, 0),
                               publicada=(float(publicada.valor), 0), fuente=publicada.fuente.nombre,
                               razon=(razon, 1)))
    return out


def comparar(resumenes: list[ResumenSitio], origen: Origen) -> ComparacionEmbalses:
    sitios = [SitioComparado(escenario_id=r.escenario_id, nombre=r.nombre, variacion=r.variacion)
              for r in resumenes if r.historia == "embalse" and r.variacion is not None]
    lecturas: list[Lectura] = []
    entre_a = entre_d = None
    if len(sitios) >= 2:
        a, b = sitios[0], sitios[1]
        entre_a = abs((a.variacion.fecha_antes - b.variacion.fecha_antes).days)
        entre_d = abs((a.variacion.fecha_despues - b.variacion.fecha_despues).days)
        if a.variacion.relativa_pct is not None and b.variacion.relativa_pct is not None:
            lecturas.append(lectura("api.resumen.lectura.comparacion", sitio_a=a.nombre,
                                    rel_a=(a.variacion.relativa_pct, 1), dias_a=(a.variacion.dias, 0),
                                    sitio_b=b.nombre, rel_b=(b.variacion.relativa_pct, 1),
                                    dias_b=(b.variacion.dias, 0), entre_a=(entre_a, 0), entre_d=(entre_d, 0)))
    return ComparacionEmbalses(sitios=sitios, dias_entre_antes=entre_a, dias_entre_despues=entre_d,
                               lecturas=lecturas, origen=origen)
