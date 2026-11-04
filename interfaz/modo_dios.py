"""
Pestaña «Modo Dios»: simulación interactiva de desastres naturales sobre el relieve real de Ecuador.

El jugador elige un mundo (escenario, lugar del modelo o coordenadas), una herramienta (incendio,
tormenta, desborde/marejada, terremoto, erupción o fundar ciudad) y hace clic en el tablero. Los
modelos publicados de modelo/desastres.py calculan la propagación y los efectos, la animación se
reproduce en el navegador (componente componentes/mundo_dios) y se muestra lo que vería NISAR.
"""

from __future__ import annotations

import base64
import html
import io
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components
from PIL import Image

from interfaz import tema
from modelo import desastres, estaciones, nisar

N_MALLA = 160                                    # celdas por lado del mundo
LUGAR_MODELO = "📍 Lugar del modelo actual"
PERSONALIZADO = "🧭 Coordenadas personalizadas"
EXTENSIONES_KM = [20, 30, 40, 60, 80, 120]

_tablero = components.declare_component(
    "mundo_dios", path=str(Path(__file__).resolve().parent / "componentes" / "mundo_dios"))

# Colores del relieve por cobertura (tonos naturales apagados para que destaquen las capas de desastre)
COLOR_COBERTURA = {
    desastres.AGUA: "#0d3b66", desastres.GLACIAR: "#e8f1fb", desastres.PARAMO: "#9c9a5e",
    desastres.BOSQUE_ANDINO: "#3d7a46", desastres.BOSQUE_HUMEDO: "#24603a", desastres.BOSQUE_SECO: "#9a8448",
    desastres.CULTIVO: "#a8ad66", desastres.URBANO: "#cbbbe6",
}

# Estilos de las capas animadas: categorías (código 1..N) o rampas con opacidad creciente.
ESTILOS = {
    "fuego": {"categorias": ["#ffb000", "#5e0f2b"], "alfa": [245, 215]},
    "onda": {"categorias": [tema.NEON_CIAN, tema.NEON_MAGENTA], "alfa": [255, 255]},
    "deslizamiento": {"categorias": ["#d2832f"], "alfa": [235]},
    "pdc": {"categorias": ["#ff4d1a"], "alfa": [225]},
    "agua": {"rampa": ["#8be3ff", "#2a9dff", "#1745d1", "#0b1f7a"], "alfa": (0.45, 0.92)},
    "lahar": {"rampa": ["#e0b07a", "#9a6331", "#4a2a10"], "alfa": (0.75, 0.95)},
    "ceniza": {"rampa": ["#d9d9d9", "#8c8c8c", "#3a3a3a"], "alfa": (0.25, 0.85)},
}
# Escala MMI de ShakeMap (USGS), del I al X
COLORES_MMI = ["#ffffff", "#bfccff", "#a0e6ff", "#80ffff", "#7aff93", "#ffff00", "#ffc800", "#ff9100",
               "#ff0000", "#c80000"]


# ---------------------------------------------------------------------------
# Imágenes
# ---------------------------------------------------------------------------

def _rgb(hex_color: str) -> np.ndarray:
    return np.array([int(hex_color[i:i + 2], 16) for i in (1, 3, 5)], float)


def _png_bytes(rgba: np.ndarray) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _png_url(rgba: np.ndarray) -> str:
    return "data:image/png;base64," + base64.b64encode(_png_bytes(rgba)).decode()


def _rampa(t: np.ndarray, colores: list) -> np.ndarray:
    anclas = np.array([_rgb(c) for c in colores])
    pos = np.clip(t, 0, 1) * (len(anclas) - 1)
    i = np.clip(np.floor(pos).astype(int), 0, len(anclas) - 2)
    f = (pos - i)[..., None]
    return anclas[i] * (1 - f) + anclas[i + 1] * f


def relieve_rgba(mundo: desastres.Mundo, escala: int = 4) -> np.ndarray:
    """Sombreado del relieve (luz del noroeste a 45°) teñido por la cobertura; el mar se oscurece con la profundidad."""
    z = np.where(mundo.mar, 0.0, mundo.z)
    gy, gx = np.gradient(z, mundo.pixel_m)
    exageracion = 2.0
    nx, ny = -gx * exageracion, gy * exageracion          # gy crece hacia el sur: ∂z/∂norte = −gy
    norma = np.sqrt(nx ** 2 + ny ** 2 + 1)
    luz = np.array([-0.5, 0.5, 0.7071])
    sombra = np.clip((nx * luz[0] + ny * luz[1] + luz[2]) / norma, 0, 1)
    color = np.zeros(z.shape + (3,))
    for codigo, hex_color in COLOR_COBERTURA.items():
        color[mundo.cobertura == codigo] = _rgb(hex_color)
    rgb = color * (0.35 + 0.8 * sombra)[..., None]
    if mundo.mar.any():
        prof = np.clip(-mundo.z / 2000.0, 0, 1)
        rgb[mundo.mar] = _rampa(prof[mundo.mar], ["#12497a", "#0a2547", "#050f24"])
    rgba = np.dstack([np.clip(rgb, 0, 255), np.full(z.shape, 255.0)]).astype(np.uint8)
    lado = mundo.n * escala
    return np.asarray(Image.fromarray(rgba, "RGBA").resize((lado, lado), Image.BILINEAR))


def _colorear_capa(capa: desastres.Capa, datos: np.ndarray) -> np.ndarray:
    d = np.asarray(datos, float)
    rgba = np.zeros(d.shape + (4,))
    if capa.estilo == "mmi":
        nivel = np.clip(np.floor(d + 0.5).astype(int), 1, 10)
        for k, c in enumerate(COLORES_MMI, start=1):
            sel = (nivel == k) & (d >= capa.umbral)
            rgba[sel] = (*_rgb(c), 70 + 9 * k)            # translúcida: deja ver el relieve
        return rgba
    estilo = ESTILOS[capa.estilo]
    if "categorias" in estilo:
        for k, (c, a) in enumerate(zip(estilo["categorias"], estilo["alfa"]), start=1):
            rgba[d == k] = (*_rgb(c), a)
        return rgba
    t = (d - capa.vmin) / max(capa.vmax - capa.vmin, 1e-9)
    visible = np.isfinite(d) & (d > capa.umbral)
    a0, a1 = estilo["alfa"]
    rgba[..., :3] = _rampa(np.nan_to_num(t), estilo["rampa"])
    rgba[..., 3] = np.where(visible, (a0 + (a1 - a0) * np.clip(np.nan_to_num(t), 0, 1)) * 255, 0)
    return rgba


def componer(evento: desastres.Evento, cuadro: dict) -> np.ndarray:
    """Superpone las capas del cuadro (en el orden de evento.capas) con composición «alfa sobre»."""
    salida = None
    for capa in evento.capas:
        if capa.clave not in cuadro:
            continue
        src = _colorear_capa(capa, cuadro[capa.clave])
        if salida is None:
            salida = np.zeros_like(src)
        a = src[..., 3:4] / 255.0
        b = salida[..., 3:4] / 255.0
        alfa = a + b * (1 - a)
        salida[..., :3] = np.where(alfa > 0, (src[..., :3] * a + salida[..., :3] * b * (1 - a)) / np.maximum(alfa, 1e-9), 0)
        salida[..., 3:4] = alfa * 255
    return np.zeros((1, 1, 4)) if salida is None else salida


def _colorear_panel(panel: nisar.Panel) -> np.ndarray:
    """Panel NISAR (gris, secuencial, divergente, cíclico o categorías) a RGBA, como en la app principal."""
    d = np.asarray(panel.datos, float)
    rgba = np.zeros(d.shape + (4,))
    if panel.paleta == "categorias":
        for k, (_, c) in enumerate(panel.leyenda, start=1):
            rgba[d == k] = (*_rgb(c), 255)
        rgba[d == 0] = (*_rgb(tema.SUPERFICIE), 255)
        return rgba
    t = (d - panel.vmin) / (panel.vmax - panel.vmin)
    validos = np.isfinite(t)
    t = np.where(validos, t, 0.0)
    t = np.mod(t, 1.0) if panel.paleta == "ciclico" else np.clip(t, 0, 1)
    rgba[..., :3] = _rampa(t, tema.PALETAS[panel.paleta])
    rgba[..., 3] = np.where(validos, 255, 0)
    return rgba


def _ampliar(rgba: np.ndarray, lado: int = 480) -> np.ndarray:
    k = max(1, lado // max(rgba.shape[:2]))
    return np.repeat(np.repeat(rgba, k, axis=0), k, axis=1).astype(np.uint8)


# ---------------------------------------------------------------------------
# Cálculo con caché
# ---------------------------------------------------------------------------

@st.cache_data(max_entries=6, show_spinner="Génesis: descargando el relieve SRTM y poblando el mundo…")
def _mundo(lat: float, lon: float, ext: float, fecha: date, usar_dem: bool, ciudades: tuple) -> desastres.Mundo:
    return desastres.crear_mundo(lat, lon, ext, n=N_MALLA, fecha=fecha, usar_dem=usar_dem, ciudades_extra=ciudades)


@st.cache_data(max_entries=6, show_spinner=False)
def _base_url(args: tuple) -> str:
    return _png_url(relieve_rgba(_mundo(*args)))


@st.cache_data(max_entries=12, show_spinner=False)
def _evento(args: tuple, tipo: str, i: int, j: int, parametros: tuple) -> tuple[desastres.Evento, list]:
    evento = desastres.desatar(tipo, _mundo(*args), i, j, **dict(parametros))
    return evento, [_png_url(componer(evento, c)) for c in evento.cuadros]


# ---------------------------------------------------------------------------
# Piezas de la interfaz
# ---------------------------------------------------------------------------

def _tarjetas(metricas: list, n_columnas: int | None = None) -> None:
    columnas = st.columns(n_columnas or len(metricas))
    for col, (etiqueta, valor, ayuda) in zip(columnas, metricas):
        ayuda_html = f"<div class='kpi-help'>{html.escape(ayuda)}</div>" if ayuda else ""
        col.markdown(f"<div class='kpi-card'><div class='kpi-label'>{html.escape(etiqueta)}</div>"
                     f"<div class='kpi-value'>{html.escape(valor)}</div>{ayuda_html}</div>", unsafe_allow_html=True)


def _chips(pares: list) -> None:
    st.markdown("<div class='chips'>" + "".join(
        f"<span class='chip'>{html.escape(k)}: <b>{html.escape(v)}</b></span>" for k, v in pares) + "</div>",
        unsafe_allow_html=True)


def _seccion(texto: str) -> None:
    st.markdown(f"<div class='section-label'>{html.escape(texto)}</div>", unsafe_allow_html=True)


def _leyenda_evento(evento: desastres.Evento) -> str:
    items = []
    for capa in evento.capas:
        if capa.estilo == "mmi":
            items += [f"<span><i style='background:{COLORES_MMI[k - 1]}'></i>{r}</span>"
                      for k, r in [(4, "IV"), (5, "V"), (6, "VI"), (7, "VII"), (8, "VIII"), (9, "IX"), (10, "X")]]
            continue
        estilo = ESTILOS[capa.estilo]
        if "categorias" in estilo:
            items += [f"<span><i style='background:{c}'></i>{html.escape(e)}</span>"
                      for c, e in zip(estilo["categorias"], capa.etiquetas)]
        else:
            grad = ", ".join(estilo["rampa"])
            items.append(f"<span><i style='width:46px;background:linear-gradient(90deg,{grad})'></i>"
                         f"{html.escape(capa.nombre)} ({capa.vmin:g}–{capa.vmax:g} {html.escape(capa.unidad)})</span>")
    return f"<div class='leyenda'>{''.join(items)}</div>"


def _leyenda_cobertura(mundo: desastres.Mundo) -> str:
    presentes = [c for c in COLOR_COBERTURA if (mundo.cobertura == c).any()]
    return "<div class='leyenda'>" + "".join(
        f"<span><i style='background:{COLOR_COBERTURA[c]}'></i>{html.escape(desastres.COBERTURAS[c]['nombre'])}</span>"
        for c in presentes) + "</div>"


def _parametros(herramienta: str, mundo: desastres.Mundo) -> dict:
    """Controles de la herramienta elegida; devuelve los argumentos del modelo."""
    k = f"dios_{herramienta}_"
    if herramienta == "incendio":
        hum_def = int(round(100 * desastres.humedad_combustible(mundo.humedad_suelo)))
        return {
            "viento_ms": st.slider("Viento (m/s)", 0.0, 20.0, 6.0, 0.5, key=k + "v"),
            "viento_deg": float(st.slider("Viento hacia (° desde el norte)", 0, 355, 45, 5, key=k + "d")),
            "humedad_comb": st.slider("Humedad del combustible muerto (%)", 3, 35, hum_def, 1, key=k + "h",
                                      help="Por defecto se deriva de la humedad del suelo en la fecha elegida.") / 100,
            "horas": float(st.slider("Duración simulada (h)", 3, 72, 24, 3, key=k + "t")),
        }
    if herramienta == "tormenta":
        return {
            "lluvia_mm": float(st.slider("Lluvia total en el centro (mm)", 20, 500, 180, 10, key=k + "p",
                                         help="El récord diario en la Costa ecuatoriana ronda los 200–300 mm.")),
            "duracion_h": float(st.slider("Duración de la lluvia (h)", 1, 48, 6, 1, key=k + "d")),
            "radio_km": float(st.slider("Radio de la tormenta (km)", 2, 60, 15, 1, key=k + "r")),
            "cohesion_kpa": float(st.slider("Cohesión del suelo c′ (kPa)", 0.0, 20.0, 5.0, 0.5, key=k + "c",
                                            help="Incluye el refuerzo de las raíces; menos cohesión = más deslizamientos.")),
            "friccion_deg": float(st.slider("Ángulo de fricción φ′ (°)", 20, 45, 33, 1, key=k + "f")),
        }
    if herramienta == "inundacion":
        st.caption("Clic en un **río** → desborde · clic en el **mar** → marejada costera.")
        return {
            "caudal_m3s": float(st.slider("Caudal pico del desborde (m³/s)", 100, 20_000, 2_000, 100, key=k + "q",
                                          help="El Guayas supera los 5 000 m³/s en crecidas extraordinarias.")),
            "duracion_h": float(st.slider("Duración de la crecida / marejada (h)", 2, 48, 12, 1, key=k + "d")),
            "altura_marejada_m": float(st.slider("Sobreelevación del mar (m)", 0.5, 10.0, 2.5, 0.5, key=k + "a")),
        }
    if herramienta == "terremoto":
        mecanismos = list(desastres.MECANISMOS)
        return {
            "mw": float(st.slider("Magnitud Mw", 5.0, 9.0, 7.8, 0.1, key=k + "m")),
            "profundidad_km": float(st.slider("Profundidad del hipocentro (km)", 2, 70, 20, 1, key=k + "z")),
            "mecanismo": st.selectbox("Mecanismo", mecanismos, key=k + "mec"),
            "rumbo": float(st.slider("Rumbo de la falla (°)", 0, 355, 25, 5, key=k + "r",
                                     help="La fosa de Ecuador corre aproximadamente N25°E.")),
            "pais": st.selectbox("Vulnerabilidad de las construcciones (PAGER)", list(desastres.PAGER), key=k + "p",
                                 help="Parámetros θ y β de mortalidad calibrados por país (Jaiswal y Wald, 2010)."),
            "tsunami": st.toggle("Tsunami si el epicentro está en el mar", value=True, key=k + "ts"),
        }
    if herramienta == "erupcion":
        st.caption("Haz clic **sobre el volcán**: el cráter se ajusta a la cima más alta a < 2,5 km.")
        return {
            "vei": int(st.slider("Índice de explosividad volcánica (IEV)", 1, 6, 3, 1, key=k + "vei",
                                 help="Tungurahua 2006 ≈ IEV 3; Cotopaxi 1877 ≈ IEV 4; Pinatubo 1991 = IEV 6.")),
            "volumen_lahar_hm3": float(st.slider("Volumen de lahar por cauce (hm³)", 0, 200, 20, 1, key=k + "l",
                                                 help="1 hm³ = 1 millón de m³. Cotopaxi 1877: decenas a ~100 hm³.")),
            "viento_ms": float(st.slider("Viento en altura (m/s)", 0, 40, 12, 1, key=k + "v")),
            "viento_deg": float(st.slider("Viento hacia (° desde el norte)", 0, 355, 270, 5, key=k + "d",
                                          help="Sobre los Andes ecuatorianos predominan los vientos del este (hacia el oeste).")),
            "duracion_h": float(st.slider("Duración de la fase explosiva (h)", 1, 48, 6, 1, key=k + "t")),
            "evacuacion": st.slider("Población evacuada a tiempo (%)", 0, 100, 0, 5, key=k + "e") / 100,
        }
    st.caption("Haz clic en el tablero para fundar una ciudad; el mundo se vuelve a poblar con ella.")
    return {
        "nombre": st.text_input("Nombre de la ciudad", "Nueva Esperanza", max_chars=40, key=k + "n"),
        "habitantes": int(st.slider("Habitantes", 1_000, 1_000_000, 50_000, 1_000, key=k + "h")),
    }


def _explicacion() -> None:
    with st.expander("📖 Cómo se juega y qué modelos se usan", expanded=False):
        st.markdown(
            "1. **Elige un mundo** (escenario, el lugar del modelo o coordenadas) y pulsa *Crear el mundo*: se "
            "descarga el relieve SRTM y se generan la cobertura, la población y la red de drenaje.\n"
            "2. **Elige una herramienta** y ajusta sus parámetros a la izquierda.\n"
            "3. **Haz clic en el tablero**: el desastre se desata ahí, la animación se reproduce y debajo aparecen "
            "sus efectos y lo que vería NISAR en su siguiente pasada.\n\n"
            "Los efectos en cascada se calculan solos: un terremoto en el mar puede generar un tsunami y los "
            "sismos y tormentas desencadenan deslizamientos.")
        st.markdown("**Incendio** · autómata celular de Alexandridis et al. (2008) con amortiguamiento por humedad "
                    "de Rothermel (1972):")
        st.latex(r"p_{burn} = p_0(1+p_{veg})(1+p_{den})\,e^{c_1V}e^{Vc_2(\cos\theta-1)}\,e^{a\theta_s}\,"
                 r"\frac{\eta_M}{\eta_{M,ref}},\quad \eta_M = 1-2{,}59r+5{,}11r^2-3{,}52r^3")
        st.markdown("**Inundación** · formulación inercial local (Bates et al., 2010) y número de curva SCS:")
        st.latex(r"q^{t+\Delta t} = \frac{q^t - g h_f \Delta t\,\partial_x(h+z)}{1 + g\Delta t\, n^2|q^t|/h_f^{7/3}},"
                 r"\qquad Q = \frac{(P-0{,}2S)^2}{P+0{,}8S}")
        st.markdown("**Terremoto** · Wells y Coppersmith (1994), Okada (1985), intensidad de Allen et al. (2012) y "
                    "mortalidad PAGER (Jaiswal y Wald, 2010):")
        st.latex(r"\mathrm{MMI} = 3{,}950 + 0{,}913M - 1{,}107\ln\sqrt{R_{rup}^2 + (1+0{,}813e^{M-5})^2},\qquad "
                 r"\nu(S) = \Phi\!\left[\tfrac{1}{\beta}\ln\tfrac{S}{\theta}\right]")
        st.markdown("**Deslizamientos** · talud infinito pseudoestático con humedad de SHALSTAB:")
        st.latex(r"FS = \frac{c' + z(\gamma\cos^2\beta - m\gamma_w\cos^2\beta - k\gamma\sin\beta\cos\beta)\tan\phi'}"
                 r"{z\gamma(\sin\beta\cos\beta + k\cos^2\beta)},\qquad m = \min\!\left(1, \frac{q\,a}{b\,T\sin\beta}\right)")
        st.markdown("**Volcán** · LAHARZ (Iverson et al., 1998), cono de energía (Malin y Sheridan, 1982) y columna "
                    "de Mastin et al. (2009):")
        st.latex(r"A = 0{,}05\,V^{2/3},\quad B = 200\,V^{2/3},\qquad H_{col} = 2{,}00\,\dot V^{0{,}241}")
        st.markdown("**Efectos de las inundaciones** · mortalidad de Jonkman et al. (2008) y daño JRC para Sudamérica "
                    "(Huizinga et al., 2017):")
        st.latex(r"F_D(h) = \Phi\!\left(\frac{\ln h - 7{,}60}{2{,}75}\right)")
        st.caption("Las víctimas solo se estiman donde existe una función de mortalidad publicada (inundación, "
                   "terremoto); en incendios y deslizamientos se informa la población expuesta y en volcanes la "
                   "letalidad es un supuesto declarado. Población urbana aproximada (orden de magnitud del censo "
                   "2022) y rural sintética: es un juego educativo, no un mapa oficial de riesgo.")


def _bitacora(estado: dict) -> None:
    filas = estado["bitacora"]
    _seccion("Bitácora del dios")
    if not filas:
        st.caption("Aún no has desatado ningún desastre.")
        return
    df = pd.DataFrame(filas)
    victimas = pd.to_numeric(df["Víctimas"], errors="coerce").fillna(0).sum()
    perdidas = pd.to_numeric(df["Pérdidas (M USD)"], errors="coerce").fillna(0).sum()
    _tarjetas([
        ("Desastres desatados", str(len(df)), ""),
        ("Área afectada", f"{desastres._fmt(df['Área (km²)'].sum(), 1)} km²", "Suma de todos los eventos"),
        ("Población expuesta", desastres._personas(df["Expuestos"].sum()), ""),
        ("Víctimas estimadas", desastres._personas(victimas), "Solo modelos con mortalidad publicada"),
        ("Pérdidas en viviendas", f"{desastres._fmt(perdidas, 1)} M USD", "Inundaciones y tsunamis"),
    ])
    st.dataframe(df, hide_index=True, width="stretch",
                 column_config={"Área (km²)": st.column_config.NumberColumn(format="%.2f"),
                                "Expuestos": st.column_config.NumberColumn(format="%d"),
                                "Víctimas": st.column_config.NumberColumn(format="%d"),
                                "Pérdidas (M USD)": st.column_config.NumberColumn(format="%.1f")})
    c1, c2 = st.columns([1, 1])
    c1.download_button("Descargar bitácora (CSV)", df.to_csv(index=False).encode("utf-8"),
                       file_name="bitacora_modo_dios.csv", mime="text/csv", width="stretch")
    if c2.button("🧹 Borrar bitácora", width="stretch", key="dios_borrar"):
        estado["bitacora"].clear()
        st.rerun(scope="fragment")


# ---------------------------------------------------------------------------
# Pestaña
# ---------------------------------------------------------------------------

@st.fragment
def mostrar_modo_dios(sitio: dict) -> None:
    """Pestaña completa del modo Dios. «sitio» es el lugar activo del modelo NISAR (lat, lon, sitio)."""
    estado = st.session_state.setdefault("dios", {"bitacora": [], "ciudades": {}, "evento": None, "ult_t": 0.0,
                                                  "mundo_activo": None})
    st.markdown(
        "Juega a ser **Dios** sobre el relieve real de Ecuador: provoca incendios, tormentas, crecidas, terremotos "
        "y erupciones y mira cómo se propagan según **modelos físicos publicados**, qué efectos tienen sobre la "
        "población y si el radar **NISAR** los detectaría en su siguiente pasada.")
    _explicacion()

    # --- Elección del mundo ---------------------------------------------------------------
    opciones = [LUGAR_MODELO, *desastres.ESCENARIOS, PERSONALIZADO]
    c1, c2, c3, c4 = st.columns([2.2, 1, 1.1, 1])
    elegido = c1.selectbox("Mundo", opciones, index=1, key="dios_escenario")
    if elegido == LUGAR_MODELO:
        lat, lon, ext_def = float(sitio["lat"]), float(sitio["lon"]), 40.0
        herramienta_sug, descripcion = None, f"Lugar activo del modelo NISAR: {sitio['sitio']}."
    elif elegido == PERSONALIZADO:
        ca, cb = st.columns(2)
        lat = float(ca.number_input("Latitud", -5.0, 1.7, -0.68, 0.01, format="%.4f", key="dios_lat"))
        lon = float(cb.number_input("Longitud", -92.0, -75.2, -78.44, 0.01, format="%.4f", key="dios_lon"))
        ext_def, herramienta_sug, descripcion = 40.0, None, "Coordenadas elegidas a mano."
        if not estaciones.en_ecuador(lat, lon):
            st.warning("El punto está fuera de Ecuador (continente o Galápagos): elige otro.")
            return
    else:
        lat, lon, ext_def, herramienta_sug, descripcion = desastres.ESCENARIOS[elegido]
    ext = float(c2.selectbox("Lado del mundo (km)", EXTENSIONES_KM, index=EXTENSIONES_KM.index(int(ext_def))
                             if int(ext_def) in EXTENSIONES_KM else 2, key=f"dios_ext_{elegido}"))
    fecha = c3.date_input("Fecha (temporada)", value=date.today(), format="DD/MM/YYYY", key="dios_fecha",
                          help="Fija la humedad del suelo y del combustible con la climatología NASA POWER.")
    usar_dem = c4.toggle("Relieve real (SRTM)", value=True, key="dios_dem",
                         help="Sin conexión se usa un terreno fractal sintético.")
    st.caption(descripcion)

    clave_lugar = f"{lat:.4f}|{lon:.4f}|{ext:g}"
    ciudades = tuple(estado["ciudades"].get(clave_lugar, []))
    args = (round(lat, 4), round(lon, 4), ext, fecha, usar_dem, ciudades)
    clave_mundo = (round(lat, 4), round(lon, 4), ext, fecha, usar_dem)
    if estado["mundo_activo"] != clave_mundo:
        st.info("Pulsa el botón para crear este mundo (la primera vez se descarga el relieve, unos segundos).")
        if st.button("⚡ Crear el mundo", type="primary", key="dios_crear"):
            estado["mundo_activo"] = clave_mundo
            st.rerun(scope="fragment")
        return
    try:
        mundo = _mundo(*args)
    except Exception as exc:
        st.error(f"No se pudo crear el mundo: {exc}")
        return

    temp = None
    clim = estaciones.climatologia(lat, lon)
    if clim is not None:
        temp = estaciones.temporada(fecha, clim, mundo.region)
    _chips([("Región", mundo.region), ("Relieve", mundo.fuente_dem),
            ("Celda", f"{desastres._fmt(mundo.pixel_m)} m"),
            ("Habitantes", desastres._personas(float(mundo.poblacion.sum()))),
            ("Suelo", f"{desastres._fmt(100 * mundo.humedad_suelo)} % del agua útil"),
            ("Temporada", temp["temporada"].lower() if temp else "—"),
            ("Lluvia anual", f"{desastres._fmt(mundo.prec_anual_mm)} mm")])

    # --- Herramientas y tablero -----------------------------------------------------------
    claves = list(desastres.HERRAMIENTAS)
    if estado.get("escenario_previo") != elegido:          # al cambiar de escenario se sugiere su herramienta
        estado["escenario_previo"] = elegido
        if herramienta_sug:
            st.session_state["dios_herramienta"] = herramienta_sug
    herramienta = st.radio("Herramienta", claves, horizontal=True, key="dios_herramienta",
                           format_func=lambda h: " ".join(desastres.HERRAMIENTAS[h]))
    col_param, col_tablero = st.columns([1, 2.3], gap="medium")
    with col_param:
        _seccion(f"Parámetros · {desastres.HERRAMIENTAS[herramienta][1]}")
        parametros = _parametros(herramienta, mundo)
        if herramienta in desastres.DESASTRES:
            with st.expander("Azar"):
                parametros["semilla"] = int(st.number_input("Semilla", 0, 9999, 7, key="dios_semilla"))
        if ciudades and st.button("♻️ Quitar las ciudades fundadas", width="stretch", key="dios_quitar"):
            estado["ciudades"].pop(clave_lugar, None)
            st.rerun(scope="fragment")

    ref = estado["evento"]
    evento, urls = (None, [])
    if ref is not None and ref[0] == args:
        evento, urls = _evento(*ref)
    marcas = [{"x": (c + 0.5) / mundo.n, "y": (f + 0.5) / mundo.n, "texto": nombre}
              for nombre, f, c, _ in mundo.ciudades]
    for nombre, la, lo in desastres.VOLCANES:
        celda = mundo.celda(la, lo)
        if celda:
            marcas.append({"x": (celda[1] + 0.5) / mundo.n, "y": (celda[0] + 0.5) / mundo.n, "texto": "▲ " + nombre})
    if evento is not None:
        marcas.append({"x": (evento.celda[1] + 0.5) / mundo.n, "y": (evento.celda[0] + 0.5) / mundo.n,
                       "texto": desastres.HERRAMIENTAS.get(evento.tipo, ("⚡",))[0], "evento": True})
    with col_tablero:
        valor = _tablero(base=_base_url(args), cuadros=urls, tiempos=evento.tiempos if evento else [],
                         marcas=marcas, herramienta=desastres.HERRAMIENTAS[herramienta][0],
                         limites=list(mundo.limites()), clave_evento=str(hash((ref, len(urls)))) if evento else "",
                         autoplay=True, periodo_ms=170, key="dios_tablero", default=None)
        st.markdown(_leyenda_evento(evento) if evento else _leyenda_cobertura(mundo), unsafe_allow_html=True)

    # --- Clic del jugador -----------------------------------------------------------------
    if valor and float(valor.get("t", 0)) > estado["ult_t"]:
        estado["ult_t"] = float(valor["t"])
        i = min(int(float(valor["y"]) * mundo.n), mundo.n - 1)
        j = min(int(float(valor["x"]) * mundo.n), mundo.n - 1)
        if herramienta == "ciudad":
            if mundo.mar[i, j]:
                st.warning("No se puede fundar una ciudad en el mar.")
            else:
                estado["ciudades"].setdefault(clave_lugar, []).append(
                    desastres.ciudad_fundada(mundo, i, j, parametros["habitantes"],
                                             parametros["nombre"].strip() or "Ciudad sin nombre"))
                st.rerun(scope="fragment")
        else:
            nueva = (args, herramienta, i, j, tuple(sorted(parametros.items())))
            with st.spinner(f"{desastres.HERRAMIENTAS[herramienta][0]} Simulando {desastres.HERRAMIENTAS[herramienta][1].lower()}…"):
                try:
                    ev, _ = _evento(*nueva)
                except ValueError as exc:
                    st.warning(str(exc))
                    ev = None
            if ev is not None:
                estado["evento"] = nueva
                la, lo = mundo.latlon(*ev.celda)
                iou = next((v for e, v, _ in ev.nisar_metricas if e.startswith("Acierto")), "—")
                r = ev.resumen
                estado["bitacora"].append({
                    "Desastre": f"{desastres.HERRAMIENTAS[herramienta][0]} {ev.titulo}",
                    "Lugar": f"{abs(la):.3f}° {'N' if la >= 0 else 'S'}, {abs(lo):.3f}° O · {mundo.region}",
                    "Fecha": fecha.strftime("%d/%m/%Y"),
                    "Área (km²)": round(float(r.get("area_km2") or 0), 2),
                    "Expuestos": int(round(float(r.get("expuestos") or 0))),
                    "Víctimas": None if r.get("victimas") is None else int(round(r["victimas"])),
                    "Pérdidas (M USD)": None if r.get("perdidas_usd") is None else round(r["perdidas_usd"] / 1e6, 1),
                    "NISAR (IoU)": iou,
                })
                st.rerun(scope="fragment")

    # --- Resultados del último desastre -----------------------------------------------------
    if evento is not None:
        st.markdown(f"### {desastres.HERRAMIENTAS[evento.tipo][0]} {html.escape(evento.titulo)}")
        _tarjetas(evento.metricas[:5])
        if len(evento.metricas) > 5:
            st.markdown("<div style='height:0.5rem'></div>", unsafe_allow_html=True)
            _tarjetas(evento.metricas[5:], n_columnas=5)
        if evento.tabla is not None and not evento.tabla.empty:
            with st.expander("Detalle de los efectos", expanded=evento.tipo in ("terremoto", "erupcion")):
                st.dataframe(evento.tabla, hide_index=True, width="stretch")
        _seccion("Lo que vería NISAR en su siguiente pasada (banda L)")
        columnas = st.columns(len(evento.nisar_paneles))
        for col, panel in zip(columnas, evento.nisar_paneles):
            with col:
                st.markdown(f"<div class='panel-titulo'>{html.escape(panel.titulo)}</div>", unsafe_allow_html=True)
                st.image(_ampliar(_colorear_panel(panel), 420), width="stretch")
                if panel.paleta == "categorias":
                    st.markdown("<div class='leyenda'>" + "".join(
                        f"<span><i style='background:{c}'></i>{html.escape(e)}</span>" for e, c in panel.leyenda)
                        + "</div>", unsafe_allow_html=True)
                else:
                    grad = ", ".join(tema.PALETAS[panel.paleta])
                    st.markdown(f"<div class='barra'><div class='barra-grad' style='background: linear-gradient(to right, "
                                f"{grad})'></div><div class='barra-etq'><span>{panel.vmin:.3g}</span>"
                                f"<span>{panel.vmax:.3g}</span></div><div class='barra-unidad'>"
                                f"{html.escape(panel.unidad)}</div></div>", unsafe_allow_html=True)
        _tarjetas(evento.nisar_metricas)
        for nota in evento.notas:
            st.caption(nota)
        with st.expander("Referencias de los modelos usados"):
            st.markdown("\n".join(f"- {r}" for r in evento.modelos))
        base = relieve_rgba(_mundo(*args), escala=4).astype(float)
        capa = _ampliar(componer(evento, evento.cuadros[-1]), base.shape[0]).astype(float)
        a = capa[..., 3:4] / 255.0
        final = np.dstack([base[..., :3] * (1 - a) + capa[..., :3] * a, np.full(base.shape[:2], 255.0)])
        st.download_button("Descargar el estado final (PNG)", data=_png_bytes(final),
                           file_name=f"modo_dios_{evento.tipo}.png", mime="image/png", key="dios_png")

    _bitacora(estado)
