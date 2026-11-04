"""
Tema visual cyberpunk de la aplicación: paleta neón, rampas de color, hoja de estilos y estilo de gráficos.

Hay dos familias de color:
- Neones de interfaz (NEON_*): solo decoran (títulos, bordes, brillos); nunca codifican datos.
- Colores de datos (SERIES, PALETAS, COLORES_TEMPORADA): validados para el fondo oscuro con el
  verificador de paletas (banda de luminosidad, croma, separación para daltonismo y contraste).
"""

import altair as alt  # estilo común de los gráficos

# Superficies y tinta
FONDO = "#07060f"  # negro violáceo del fondo general
SUPERFICIE = "#110e22"  # tarjetas, paneles y fondo de gráficos
SUPERFICIE_2 = "#1a1533"  # superficies elevadas (barra lateral, expansores)
TINTA, TINTA_2, TENUE = "#e6f7ff", "#a9b8d6", "#6f7a99"  # texto principal, secundario y atenuado
REJILLA, EJE = "#1f1a3a", "#2e2754"  # rejilla y ejes de los gráficos

# Neones de interfaz (decoración)
NEON_CIAN = "#00f0ff"
NEON_MAGENTA = "#ff2bd6"
NEON_AMARILLO = "#fcee0a"
NEON_VIOLETA = "#9d4bff"

# Colores de datos: cian, magenta y ámbar (orden fijo; validados sobre FONDO y SUPERFICIE)
SERIES = ["#009dcc", "#e0369b", "#a39100"]
NEUTRO = "#6f6d7a"  # gris de croma bajo: punto medio de escalas divergentes y categoría «sin cambio»

PALETAS = {  # rampas de los paneles de radar (anclas que se interpolan linealmente)
    "gris": ["#05040c", "#e6f7ff"],  # intensidad σ⁰: del negro al blanco frío
    "secuencial": ["#061826", "#082a3f", "#0a3d59", "#0b5173", "#0c668e", "#0b7caa", "#0892c4",
                   "#13a9db", "#3fc0ea", "#74d4f2", "#a6e6f8", "#d3f5fd"],  # magnitudes: cian, oscuro → brillante
    "secuencial_naranja": ["#1b0612", "#36091f", "#540c30", "#731043", "#941456", "#b5186a", "#d4227f",
                           "#ec3c97", "#f66fb2", "#fba3cd", "#fdd2e6"],  # daño (incendios): rampa magenta
    "divergente": [NEON_MAGENTA, "#2b2935", "#00d4ff"],  # negativo magenta, cero gris neutro, positivo cian
    "ciclico": [NEON_CIAN, "#4a7dff", NEON_VIOLETA, NEON_MAGENTA, "#ff6a3d", NEON_AMARILLO, "#7dff6a", NEON_CIAN],
}  # la cíclica cierra en el mismo color para la fase (−π…π)

# Temporadas como escala divergente: lluviosa (cian) ↔ transición (gris neutro) ↔ seca (magenta)
COLORES_TEMPORADA = {"Lluviosa": SERIES[0], "Transición": NEUTRO, "Seca": SERIES[1]}

FUENTE_TITULOS = "Orbitron"  # geométrica futurista (títulos, cifras grandes)
FUENTE_TEXTO = "Rajdhani"  # texto corrido
FUENTE_MONO = "Share Tech Mono"  # etiquetas, ejes y relojes
_GOOGLE_FONTS = ("https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900"
                 "&family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap")


def css() -> str:
    """Hoja de estilos de la interfaz: fondo con rejilla y líneas de barrido, neones y tarjetas recortadas."""
    return f"""
    <style>
        @import url('{_GOOGLE_FONTS}');

        /* Fondo: halos neón, rejilla tenue y líneas de barrido (scanlines) */
        .stApp {{
            background:
                radial-gradient(ellipse at 12% -8%, rgba(255,43,214,0.16), transparent 45%),
                radial-gradient(ellipse at 96% 0%, rgba(0,240,255,0.13), transparent 42%),
                linear-gradient(rgba(0,240,255,0.035) 1px, transparent 1px) 0 0 / 44px 44px,
                linear-gradient(90deg, rgba(0,240,255,0.035) 1px, transparent 1px) 0 0 / 44px 44px,
                {FONDO};
        }}
        .stApp::after {{
            content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 999;
            background: repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 3px);
        }}
        .block-container {{ padding-top: 1.4rem; padding-bottom: 2.4rem; }}

        /* Barra lateral */
        [data-testid="stSidebar"] {{
            background: linear-gradient(180deg, {SUPERFICIE_2} 0%, {FONDO} 100%);
            border-right: 1px solid rgba(0,240,255,0.28);
            box-shadow: 0 0 28px rgba(0,240,255,0.08);
        }}
        [data-testid="stSidebar"] h1 {{ font-size: 1.35rem; }}

        /* Títulos */
        h1, h2, h3 {{ font-family: '{FUENTE_TITULOS}', sans-serif !important; letter-spacing: 0.03em; }}
        h1 {{
            text-transform: uppercase; font-weight: 900 !important;
            background: linear-gradient(90deg, {NEON_CIAN} 0%, {NEON_VIOLETA} 55%, {NEON_MAGENTA} 100%);
            -webkit-background-clip: text; background-clip: text; color: transparent !important;
            filter: drop-shadow(0 0 10px rgba(0,240,255,0.35));
        }}
        h2, h3 {{ color: {NEON_CIAN} !important; text-shadow: 0 0 10px rgba(0,240,255,0.45); }}
        .kicker {{
            font-family: '{FUENTE_MONO}', monospace; color: {NEON_AMARILLO}; font-size: 0.8rem;
            letter-spacing: 0.22em; text-transform: uppercase; text-shadow: 0 0 8px rgba(252,238,10,0.55);
            margin-bottom: -0.4rem;
        }}
        .kicker::after {{ content: "▌"; margin-left: 0.3rem; animation: parpadeo 1.1s steps(1) infinite; }}
        @keyframes parpadeo {{ 50% {{ opacity: 0; }} }}

        /* Tarjetas KPI con esquinas recortadas */
        .kpi-card {{
            position: relative; height: 100%; padding: 0.85rem 1rem;
            background: linear-gradient(135deg, rgba(0,240,255,0.07), rgba(255,43,214,0.05)), {SUPERFICIE};
            border: 1px solid rgba(0,240,255,0.38);
            box-shadow: inset 0 0 0 1px rgba(255,43,214,0.06), 0 0 16px rgba(0,240,255,0.10);
            clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
        }}
        .kpi-card::before {{
            content: ""; position: absolute; top: 0; left: 0; width: 38%; height: 2px;
            background: linear-gradient(90deg, {NEON_MAGENTA}, transparent);
        }}
        .kpi-label {{
            color: {NEON_MAGENTA}; font-family: '{FUENTE_MONO}', monospace; font-size: 0.72rem;
            text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 0.35rem;
        }}
        .kpi-value {{
            color: {TINTA}; font-family: '{FUENTE_TITULOS}', sans-serif; font-size: 1.35rem; font-weight: 700;
            line-height: 1.2; text-shadow: 0 0 9px rgba(0,240,255,0.55);
        }}
        .kpi-help {{ color: {TINTA_2}; font-size: 0.8rem; margin-top: 0.3rem; }}

        /* Chips de contexto */
        .chips {{ display: flex; flex-wrap: wrap; gap: 0.45rem; margin: 0.4rem 0 1rem; }}
        .chip {{
            border: 1px solid rgba(255,43,214,0.45); padding: 0.12rem 0.65rem;
            font-family: '{FUENTE_MONO}', monospace; font-size: 0.78rem; color: {TINTA_2};
            background: rgba(255,43,214,0.06); clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
        }}
        .chip b {{ color: {NEON_CIAN}; font-weight: 400; }}

        /* Etiquetas, leyendas y barras de color */
        .section-label {{
            font-family: '{FUENTE_MONO}', monospace; font-size: 0.8rem; letter-spacing: 0.16em;
            text-transform: uppercase; color: {NEON_CIAN}; margin: 0.8rem 0 0.6rem;
            text-shadow: 0 0 6px rgba(0,240,255,0.4);
        }}
        .section-label::before {{ content: "// "; color: {NEON_MAGENTA}; }}
        .panel-titulo {{ font-family: '{FUENTE_MONO}', monospace; color: {TINTA_2}; font-size: 0.85rem;
                         margin: 0.2rem 0 0.35rem; }}
        .leyenda {{ display: flex; flex-wrap: wrap; gap: 0.35rem 0.9rem; margin-top: 0.4rem; }}
        .leyenda span {{ display: inline-flex; align-items: center; gap: 0.4rem; color: {TINTA_2}; font-size: 0.85rem; }}
        .leyenda i {{ width: 12px; height: 12px; display: inline-block; box-shadow: 0 0 6px rgba(255,255,255,0.25); }}
        .sin-mayus {{ text-transform: none; }}
        .barra {{ margin-top: 0.45rem; max-width: 100%; }}
        .barra-grad {{ height: 10px; box-shadow: 0 0 10px rgba(0,240,255,0.2); }}
        .barra-etq {{
            display: flex; justify-content: space-between; color: {TINTA_2}; font-family: '{FUENTE_MONO}', monospace;
            font-size: 0.75rem; font-variant-numeric: tabular-nums; margin-top: 0.2rem;
        }}
        .barra-unidad {{ color: {TENUE}; font-size: 0.75rem; text-align: center; }}

        /* Reloj del reproductor */
        .reloj {{
            color: {NEON_AMARILLO}; font-family: '{FUENTE_MONO}', monospace; font-size: 1.6rem;
            margin: 0.2rem 0 0.1rem; text-shadow: 0 0 10px rgba(252,238,10,0.6);
        }}
        .reloj small {{ color: {TINTA_2}; font-size: 0.85rem; margin-left: 0.7rem; text-shadow: none; }}
        .nota-nisar {{ color: {TINTA_2}; font-size: 0.88rem; margin: 0.3rem 0 0.6rem; }}

        /* Pestañas */
        [data-baseweb="tab"] p {{
            font-family: '{FUENTE_TITULOS}', sans-serif; font-size: 0.74rem !important;
            text-transform: uppercase; letter-spacing: 0.06em;
        }}
        [data-baseweb="tab"][aria-selected="true"] p {{ color: {NEON_CIAN}; text-shadow: 0 0 8px {NEON_CIAN}; }}
        [data-baseweb="tab-highlight"] {{ background: {NEON_CIAN} !important; box-shadow: 0 0 10px {NEON_CIAN}; }}

        /* Botones */
        .stButton > button, .stDownloadButton > button {{
            border-radius: 0; border: 1px solid rgba(0,240,255,0.55); background: rgba(0,240,255,0.05);
            font-family: '{FUENTE_TITULOS}', sans-serif; font-size: 0.72rem; letter-spacing: 0.06em;
            text-transform: uppercase; transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }}
        .stButton > button:hover, .stDownloadButton > button:hover {{
            border-color: {NEON_CIAN}; box-shadow: 0 0 12px rgba(0,240,255,0.55); color: {NEON_CIAN};
        }}
        .stButton > button[kind="primary"] {{
            border: none; color: {FONDO}; font-weight: 700;
            background: linear-gradient(90deg, {NEON_MAGENTA}, {NEON_VIOLETA});
            box-shadow: 0 0 14px rgba(255,43,214,0.55);
        }}
        .stButton > button[kind="primary"]:hover {{ color: {FONDO}; box-shadow: 0 0 22px rgba(255,43,214,0.85); }}

        /* Mapas, componentes y expansores con borde neón */
        iframe {{ border: 1px solid rgba(0,240,255,0.32) !important; box-shadow: 0 0 18px rgba(0,240,255,0.12); }}
        [data-testid="stExpander"] details {{ border-color: rgba(157,75,255,0.45) !important; border-radius: 0; }}
        [data-testid="stMetricValue"], code {{ font-family: '{FUENTE_MONO}', monospace !important; }}

        /* Barras de desplazamiento */
        ::-webkit-scrollbar {{ width: 9px; height: 9px; }}
        ::-webkit-scrollbar-track {{ background: {FONDO}; }}
        ::-webkit-scrollbar-thumb {{ background: linear-gradient({NEON_CIAN}, {NEON_MAGENTA}); }}

        @media (prefers-reduced-motion: reduce) {{
            .kicker::after {{ animation: none; }}
            .stButton > button {{ transition: none; }}
        }}
    </style>
    """


def estilo_grafico(grafico: alt.Chart) -> alt.Chart:
    """Estilo común de los gráficos Altair: fondo transparente, tipografía mono y rejilla violeta tenue."""
    return (
        grafico.configure(background="transparent", font=FUENTE_MONO)
        .configure_view(strokeWidth=0)
        .configure_axis(labelColor=TINTA_2, titleColor=TINTA_2, gridColor=REJILLA, domainColor=EJE,
                        tickColor=EJE, labelFontSize=11, titleFontSize=11, titleFontWeight="normal")
        .configure_legend(labelColor=TINTA, titleColor=TINTA_2, labelFontSize=12, symbolStrokeWidth=2)
    )
