"""Laboratorio del radar: escena sintética genérica para comparar radar y óptico, polarizaciones y bandas.

Todo es **ilustrativo y sintético** (semilla fija): los coeficientes de retrodispersión son órdenes de magnitud
típicos de la literatura de radar, no mediciones, y no describen ningún producto de NISAR. La banda S se usa
solo como ejemplo de otra frecuencia (pendiente de confirmar con la documentación oficial qué entrega NISAR).
"""
from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

from datos.claves import REGISTRO, slug
from datos.contrato import CapaRaster, EntradaNoValida, Metrica, Origen

N = 64
BBOX = (-80.10, -2.10, -79.90, -1.90)  # solo georreferencia de la rejilla; la escena no es un lugar real
SEMILLA = 11
FECHA = datetime(2026, 11, 1, tzinfo=timezone.utc)
POLS = ("HH", "HV", "VV")
BANDAS = ("L", "S")

# Superficies (código = posición + 1 en SUPERFICIES)
SUPERFICIES = ("Bosque", "Agua", "Bosque inundado", "Cultivo", "Quemado")
BOSQUE, AGUA, BOSQUE_INUNDADO, CULTIVO, QUEMADO = 1, 2, 3, 4, 5

# σ⁰ ilustrativo en dB por (banda, superficie) → (HH, HV, VV)
SIGMA0 = {
    "L": {BOSQUE: (-8, -14, -10), AGUA: (-22, -26, -18), BOSQUE_INUNDADO: (-2, -13, -9),
          CULTIVO: (-12, -19, -11), QUEMADO: (-13, -23, -12)},
    "S": {BOSQUE: (-9, -12, -9), AGUA: (-20, -25, -16), BOSQUE_INUNDADO: (-6, -12, -8),
          CULTIVO: (-10, -15, -9), QUEMADO: (-10, -15, -9)},
}
# Reflectancia óptica ilustrativa (el dosel tapa el agua: «Bosque inundado» se ve casi como bosque)
OPTICO = {BOSQUE: 0.25, AGUA: 0.08, BOSQUE_INUNDADO: 0.22, CULTIVO: 0.32, QUEMADO: 0.12}
UMBRAL_RADAR_DB = 4.0
UMBRAL_OPTICO = 0.08
LEYENDA_CAMBIO = [("Sin cambio", "#4a5568"), ("Cambio detectado", "#e5b93c"),
                  ("Cambio sin detectar", "#d9534f"), ("Tapado por nube", "#c8ccd4"),
                  ("Falsa alarma", "#c96b8c")]
LEYENDA_SUPERFICIES = list(zip(SUPERFICIES, ("#2f7d4f", "#2a6fb0", "#7fb8a0", "#b9a45a", "#6b4a3a")))


def origen(nota: str) -> Origen:
    return Origen(tipo="sintetico", fuente="Laboratorio del radar (escena genérica)", generador="datos/laboratorio.py",
                  version="1", semilla=SEMILLA, fecha_generacion=FECHA, notas=nota)


def _campo_suave(rng: np.random.Generator, radio: float) -> np.ndarray:
    """Ruido de baja frecuencia en [0, 1] (filtro FFT), para nubes y formas."""
    r = rng.standard_normal((N, N))
    f = np.fft.fft2(r)
    ky, kx = np.meshgrid(np.fft.fftfreq(N), np.fft.fftfreq(N), indexing="ij")
    f *= np.exp(-(kx ** 2 + ky ** 2) * (radio ** 2))
    c = np.real(np.fft.ifft2(f))
    return (c - c.min()) / (c.max() - c.min())


def escena(despues: bool) -> np.ndarray:
    """Mapa de superficies N×N. Después de la inundación: una llanura abierta pasa a agua y un bosque queda inundado."""
    s = np.full((N, N), CULTIVO, dtype=np.int8)
    s[:, :20] = BOSQUE                       # bosque a la izquierda
    s[44:60, 24:44] = QUEMADO                # cicatriz fija, para comparar superficies
    if despues:
        s[8:30, 28:60] = AGUA                # llanura abierta inundada
        s[8:30, 4:16] = BOSQUE_INUNDADO      # bajo dosel
    s[34:38, :] = np.where(s[34:38, :] == BOSQUE, BOSQUE, AGUA)   # un río fijo (agua antes y después)
    return s


def _speckle(rng: np.random.Generator, forma: tuple[int, int], looks: int = 6) -> np.ndarray:
    """Moteado multiplicativo (gamma, `looks` miradas) en dB."""
    return 10 * np.log10(rng.gamma(looks, 1.0 / looks, forma))


def _sigma0(sup: np.ndarray, banda: str, pol: str, rng: np.random.Generator) -> np.ndarray:
    tabla = SIGMA0[banda]
    i = POLS.index(pol)
    base = np.zeros(sup.shape, np.float32)
    for cod, vals in tabla.items():
        base[sup == cod] = vals[i]
    return (base + _speckle(rng, sup.shape)).astype(np.float32)


def _capa(variable: str, pol: str | None, unidad: str, paleta: str, vmin: float, vmax: float,
          leyenda, datos: np.ndarray, nota: str, instante: datetime | None = None) -> CapaRaster:
    return CapaRaster("laboratorio", None, variable, pol, unidad, paleta, vmin, vmax, leyenda, datos, BBOX, origen(nota), instante)


def _metrica(etiqueta: str, valor: str, ayuda: str) -> Metrica:
    """Métrica en % con su clave (`api.lab.metrica.<slug>`) y la cifra sin formato para traducirla."""
    clave = f"api.lab.metrica.{slug(etiqueta)}"
    assert f"{clave}.etiqueta" in REGISTRO, clave
    return Metrica(etiqueta=etiqueta, valor=valor, unidad="%", ayuda=ayuda, clave_texto=clave,
                   valores_texto={"valor": float(valor.replace(",", "."))})


def _validar(valor: str, validos: tuple[str, ...], nombre: str) -> str:
    if valor not in validos:
        raise EntradaNoValida.con("api.error.lab_no_valida", nombre=nombre, opciones=", ".join(validos))
    return valor


def mascara_nubes(cobertura: float, semilla: int) -> np.ndarray:
    """Nubes con cobertura exacta (fracción de píxeles tapados)."""
    if cobertura <= 0:
        return np.zeros((N, N), bool)
    campo = _campo_suave(np.random.default_rng(1000 + semilla), 10.0)
    n = int(round(cobertura * N * N))
    orden = np.argsort(campo.ravel())[::-1]
    m = np.zeros(N * N, bool)
    m[orden[:n]] = True
    return m.reshape(N, N)


def nubes(cobertura_pct: float, semilla: int = 1) -> dict:
    """Radar y óptico sobre la misma inundación, con `cobertura_pct` % de nubes sobre la imagen óptica posterior."""
    if not 0 <= cobertura_pct <= 100:
        raise EntradaNoValida.con("api.error.nubes_rango", min=0, max=100)
    antes, despues = escena(False), escena(True)
    real = antes != despues
    rng = np.random.default_rng(SEMILLA)
    ra, rd = (_sigma0(s, "L", "HH", rng) for s in (antes, despues))
    oa = np.clip(np.vectorize(OPTICO.get)(antes) + rng.normal(0, 0.015, antes.shape), 0, 1).astype(np.float32)
    od_limpio = np.clip(np.vectorize(OPTICO.get)(despues) + rng.normal(0, 0.015, despues.shape), 0, 1).astype(np.float32)
    nube = mascara_nubes(cobertura_pct / 100, semilla)
    od = np.where(nube, 0.92, od_limpio).astype(np.float32)

    det_radar = np.abs(rd - ra) > UMBRAL_RADAR_DB
    det_opt = (np.abs(od_limpio - oa) > UMBRAL_OPTICO) & ~nube

    def cambio(det: np.ndarray, con_nube: bool) -> np.ndarray:
        c = np.ones((N, N), np.float32)                     # 1 sin cambio
        c[real & det] = 2                                   # 2 detectado
        c[real & ~det] = 3                                  # 3 sin detectar
        c[~real & det] = 5                                  # 5 falsa alarma (moteado o ruido)
        if con_nube:
            c[nube] = 4                                     # 4 tapado por nube
        return c

    nota = "Escena genérica ilustrativa; no es un lugar real ni una observación de NISAR."
    capas = {
        "optico": _capa("reflectancia", None, "reflectancia", "gris", 0.0, 1.0, None, od, nota),
        "radar": _capa("sigma0", "HH", "dB", "gris", -30.0, 0.0, None, rd, nota + " Banda L, HH."),
        "cambio_optico": _capa("clasificacion_optico", None, "", "categorias", 0, 5, LEYENDA_CAMBIO, cambio(det_opt, True), nota),
        "cambio_radar": _capa("clasificacion_radar", "HH", "", "categorias", 0, 5, LEYENDA_CAMBIO, cambio(det_radar, False), nota),
    }
    total = int(real.sum())
    pct = lambda x: 100.0 * x / total  # noqa: E731
    p_opt, p_rad = pct(int((real & det_opt).sum())), pct(int((real & det_radar).sum()))
    falsas = 100.0 * int((~real & det_radar).sum()) / int((~real).sum())
    tapado = 100.0 * float(nube.mean())
    metricas = [
        _metrica("Cambio visto por el radar", f"{p_rad:.0f}", "Parte de los píxeles que realmente cambiaron y que el radar marca como cambio. Las nubes no lo afectan."),
        _metrica("Cambio visto por el óptico", f"{p_opt:.0f}", "Lo mismo para una imagen óptica. Las nubes la tapan y, bajo el dosel, no ve el agua."),
        _metrica("Falsas alarmas del radar", f"{falsas:.1f}".replace(".", ","), "Píxeles sin cambio que el radar marca como cambio por el moteado (speckle). El radar no es perfecto."),
        _metrica("Tapado por nubes", f"{tapado:.0f}", "Fracción de la escena que las nubes ocultan en la imagen óptica."),
    ]
    return {"capas": capas, "metricas": metricas, "porcentaje_radar": p_rad, "porcentaje_optico": p_opt,
            "cobertura_real": float(nube.mean()), "origen": origen(nota)}


def respuesta(banda: str, pol: str) -> dict:
    """Escena en σ⁰ para `banda`/`pol`, la respuesta de cada superficie en las tres polarizaciones y qué polarización
    resalta cada cambio (la de mayor contraste en dB entre las dos superficies)."""
    _validar(banda, BANDAS, "Banda")
    _validar(pol, POLS, "Polarización")
    rng = np.random.default_rng(SEMILLA)
    capa = _capa("sigma0", pol, "dB", "gris", -30.0, 0.0, None, _sigma0(escena(True), banda, pol, rng),
                 f"Escena genérica ilustrativa, banda {banda}, {pol}.")
    mapa = _capa("superficies", None, "", "categorias", 0, len(SUPERFICIES), LEYENDA_SUPERFICIES,
                 escena(True).astype(np.float32), "Superficies de la escena ilustrativa.")
    tabla = SIGMA0[banda]
    respuestas = [{"superficie": SUPERFICIES[c - 1], "pol": p, "db": float(tabla[c][i])}
                  for c in range(1, len(SUPERFICIES) + 1) for i, p in enumerate(POLS)]
    pares = [("Inundación a cielo abierto", CULTIVO, AGUA), ("Inundación bajo dosel", BOSQUE, BOSQUE_INUNDADO),
             ("Quema del bosque", BOSQUE, QUEMADO)]
    cambios = []
    for nombre, a, b in pares:
        contr = [abs(tabla[b][i] - tabla[a][i]) for i in range(3)]
        k = int(np.argmax(contr))
        cambios.append({"cambio": nombre, "mejor_pol": POLS[k], "contraste_db": float(contr[k]),
                        "contrastes": {p: float(c) for p, c in zip(POLS, contr)}})
    return {"banda": banda, "pol": pol, "capa": capa, "superficies": mapa, "respuestas": respuestas,
            "cambios": cambios, "origen": origen("Coeficientes ilustrativos; no son mediciones."),
            "aviso_banda": ("Banda S: ejemplo ilustrativo de otra frecuencia; pendiente de confirmar con la documentación oficial "
                            "qué bandas entrega NISAR." if banda == "S" else None)}
