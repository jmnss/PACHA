"""
NISAR · Rastreador de cambios en la superficie terrestre de Ecuador.

Aplicación Streamlit que usa radar de apertura sintética en banda L de la misión NISAR
(NASA–ISRO) para rastrear y visualizar pérdida de humedales, incendios, terremotos,
movimiento de glaciares, actividad agrícola y subsidencia en Ecuador (continente y Galápagos).

- Mapa: un clic dentro de Ecuador coloca el modelo en ese lugar; los parámetros se ajustan en
  tiempo real y un reproductor muestra la evolución minuto a minuto.
- Antes / después: clic sobre una imagen de radar elige un punto; arrastrar dibuja el cuadrante
  que se mide.
- Estación y temporada: región natural, estación astronómica y temporada climática (lluviosa,
  de transición o seca) del lugar; el modelo usa ese ciclo estacional (modelo/estaciones.py).
- Modo Dios: juego en el que el usuario desata desastres naturales sobre el relieve real con modelos
  publicados y ve sus efectos y lo que vería NISAR (modelo/desastres.py, interfaz/modo_dios.py).

Estructura: modelo/ (física, simulación, estaciones y partición), interfaz/ (tema cyberpunk,
vista de la partición y componentes HTML), data/, resultados/, scripts/ y docs/ (ver README.md).

Ejecutar con:  streamlit run app.py   (o simplemente: python app.py)
"""

import sys  # acceso al intérprete y a los argumentos de la línea de órdenes

import streamlit as st  # framework de la interfaz web
from streamlit import runtime  # permite saber si el script ya corre dentro de «streamlit run»

if __name__ == "__main__" and not runtime.exists():  # se ejecutó como «python app.py»
    # «python app.py» no abre la interfaz; se relanza con «streamlit run» usando este mismo Python.
    import socket  # comprobación de puertos libres

    from streamlit.web import cli  # interfaz de línea de órdenes de Streamlit

    def _puerto_libre(inicial: int = 8501, intentos: int = 20) -> int | None:
        """Primer puerto TCP desde «inicial» que se puede reservar (None si todos están ocupados)."""
        for puerto in range(inicial, inicial + intentos):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as prueba:
                try:
                    prueba.bind(("0.0.0.0", puerto))  # misma dirección que .streamlit/config.toml
                    return puerto  # nadie lo usa: se libera al cerrar el socket de prueba
                except OSError:
                    continue  # ocupado (p. ej. otra copia de la app abierta): se prueba el siguiente
        return None

    argumentos = sys.argv[1:]  # opciones extra que el usuario pase, p. ej. --server.port=9000
    if not any(a.startswith("--server.port") for a in argumentos):  # el usuario no fijó un puerto
        puerto = _puerto_libre()
        if puerto is None:
            sys.exit("Los puertos 8501–8520 están ocupados. Cierra otras copias de la app e inténtalo de nuevo.")
        if puerto != 8501:
            print(f"El puerto 8501 está ocupado (¿otra copia de la app abierta?); se usa el {puerto}: "
                  f"http://localhost:{puerto}")  # aviso visible en la terminal
        argumentos = [f"--server.port={puerto}", *argumentos]
    sys.argv = ["streamlit", "run", __file__, *argumentos]  # construye la orden «streamlit run app.py»
    sys.exit(cli.main())  # arranca el servidor y termina este proceso al cerrarlo

import base64  # codifica imágenes PNG como URL de datos
import html  # escapa texto antes de insertarlo en HTML
import io  # búfer en memoria para generar PNG
import json  # lectura de áreas GeoJSON subidas por el usuario
import re  # expresiones regulares (letras griegas en etiquetas)
from datetime import date, datetime, time as hora_del_dia, timedelta  # fechas, instantes y duraciones
from pathlib import Path  # rutas de archivos independientes del sistema operativo

try:  # las dependencias externas se importan juntas para dar un mensaje claro si falta alguna
    import altair as alt  # gráficos declarativos (Vega-Lite)
    import folium  # mapas Leaflet
    import numpy as np  # cálculo numérico con matrices
    import pandas as pd  # tablas de datos
    import streamlit.components.v1 as components  # componente propio para seleccionar sobre imágenes
    from PIL import Image  # conversión de matrices RGBA a PNG
    from shapely import wkt as shapely_wkt  # serialización WKT para la búsqueda en ASF
    from shapely.geometry import Point, Polygon, shape  # geometrías del área de estudio
    from shapely.geometry.polygon import orient  # orientación antihoraria de polígonos
    from shapely.ops import unary_union  # unión de huellas de productos
    from streamlit_folium import st_folium  # integra el mapa folium y devuelve los clics

    from interfaz import tema  # tema visual cyberpunk: paleta neón, CSS y estilo de gráficos
    from interfaz.modo_dios import mostrar_modo_dios  # pestaña de juego: desastres naturales con modelos publicados
    from interfaz.particion_vista import mostrar_particion  # pestaña de validación espacial
    from modelo import estaciones  # región natural, estación astronómica, temporada climática y balance hídrico
    from modelo import nisar  # física, simulación y detección de cambios NISAR
except ModuleNotFoundError as error_importacion:  # falta un paquete en el entorno de Python
    st.error(
        f"Falta el paquete «{error_importacion.name}» en el Python que ejecuta la app ({sys.executable}). "
        "Instala las dependencias con:"
    )  # explica qué falta y en qué intérprete
    st.code(f'"{sys.executable}" -m pip install -r requirements.txt', language="powershell")  # orden para instalar
    st.stop()  # detiene la app sin mostrar un error técnico


st.set_page_config(
    page_title="NISAR · Cambios de superficie en Ecuador",  # título de la pestaña del navegador
    page_icon="🛰️",  # icono de la pestaña
    layout="wide",  # usa todo el ancho de la ventana
    initial_sidebar_state="expanded",  # barra lateral abierta al inicio
)

# Tokens del tema cyberpunk (definidos una sola vez en interfaz/tema.py)
SUPERFICIE, PLANO = tema.SUPERFICIE, tema.FONDO  # fondo de tarjetas y fondo general
TINTA, TINTA_2, TENUE = tema.TINTA, tema.TINTA_2, tema.TENUE  # texto principal, secundario y atenuado
NEON_CIAN, NEON_MAGENTA, NEON_AMARILLO = tema.NEON_CIAN, tema.NEON_MAGENTA, tema.NEON_AMARILLO  # neones decorativos
SERIES = tema.SERIES  # colores de datos en orden fijo: cian, magenta, ámbar
PALETAS = tema.PALETAS  # rampas de los paneles de radar (gris, secuencial, divergente, cíclica)
COLORES_TEMPORADA = tema.COLORES_TEMPORADA  # lluviosa (cian) ↔ transición (gris) ↔ seca (magenta)
FUENTE_SIM = "Simulación física NISAR"  # opción de datos simulados
FUENTE_REAL = "Productos NISAR reales (HDF5)"  # opción de archivos descargados
FUENTE_ASF = "ASF DAAC (NASA) · en desarrollo"  # conexión directa (pendiente)
FUENTE_ISRO = "ISRO Bhoonidhi · en desarrollo"  # conexión directa (pendiente)
LUGAR_MAPA = "__punto_mapa__"  # identificador del lugar colocado con un clic en el mapa
PAIS = "Ecuador"  # la app trabaja solo dentro de este país

# Pestañas de la sección de fundamentos científicos
FUNDAMENTOS_TABS = ["2.1. Fondo", "2.2. Fundamentos físicos SAR", "2.3. La misión NISAR"]


def renderizar_fundamentos_cientificos() -> None:
    """Contenido educativo: teledetección, física de la señal SAR y misión NISAR."""
    st.markdown("## Fundamentos científicos")  # título de la sección
    st.markdown(
        "Contenido educativo sobre los fundamentos de la teledetección, la física de la señal SAR y los "
        "detalles de la misión NISAR, organizado en pestañas para una exploración guiada."
    )  # introducción
    tab_fondo, tab_sar, tab_mision = st.tabs(FUNDAMENTOS_TABS)  # tres subpestañas

    with tab_fondo:  # 2.1: teledetección pasiva y activa
        st.markdown("### 2.1. Fondo: fundamentos de la teledetección terrestre")
        st.markdown(
            """
La teledetección terrestre permite obtener información de la superficie del planeta mediante sensores
instalados en satélites o plataformas aéreas. Estos sistemas complementan las observaciones de campo y
permiten analizar regiones extensas, identificar patrones espaciales y estudiar cambios ambientales a lo
largo del tiempo.

**Teledetección pasiva:** registra energía procedente de fuentes naturales, como la radiación solar
reflejada por la superficie terrestre. La interacción entre la radiación electromagnética y los materiales
genera respuestas espectrales que permiten estudiar propiedades de la vegetación, el agua, los suelos y
las rocas.

**Teledetección activa:** utiliza instrumentos que emiten su propia señal electromagnética y registran la
respuesta de los objetos observados. El radar de apertura sintética (SAR) pertenece a esta categoría y
opera mediante microondas.

El SAR transmite señales que interactúan con la superficie terrestre. El instrumento registra la señal de
retorno y procesa sus características para generar información sobre las propiedades físicas y
geométricas del terreno. La apertura sintética permite obtener una resolución espacial elevada mediante
el procesamiento coherente de las señales adquiridas durante el movimiento del sensor.

**Ventaja fundamental:** el radar adquiere imágenes de día y de noche y es relativamente independiente de
la cobertura nubosa. Sin embargo, la lluvia intensa, la geometría de observación, el ruido de la señal y
las condiciones atmosféricas pueden afectar determinadas mediciones o aplicaciones.
"""
        )  # texto principal de 2.1
        st.caption(
            "Nota: la respuesta SAR depende de la combinación de las propiedades físicas del terreno, la "
            "longitud de onda, la polarización, la geometría y el procesamiento; las relaciones descritas "
            "aquí no son reglas universales."
        )  # advertencia de alcance

    with tab_sar:  # 2.2: física de la señal
        st.markdown("### 2.2. Fundamentos físicos de la señal SAR")
        st.markdown(
            """
**Retrodispersión (σ⁰).** Es la fracción de energía que la superficie devuelve hacia el radar por unidad
de área. Se expresa en decibelios y depende de la rugosidad, la humedad (constante dieléctrica) y la
estructura del terreno respecto de la longitud de onda.

**Mecanismos de dispersión**
- *Especular:* el agua en calma refleja el pulso lejos del radar y aparece oscura.
- *Superficial:* suelos y rocas devuelven más energía cuanto más rugosos son a la escala de λ.
- *Volumétrica:* el dosel dispersa la señal en muchas direcciones; domina en los canales cruzados (HV).
- *Doble rebote:* troncos o edificios sobre agua o suelo liso forman un diedro que eleva HH.

**Longitud de onda y penetración.** La banda L (λ ≈ 24 cm) atraviesa el dosel e interactúa con troncos
y ramas gruesas; la banda S (λ ≈ 9,4 cm) responde más a hojas y ramas finas.

**Fase e interferometría.** Dos adquisiciones desde la misma órbita permiten medir el cambio de
distancia en la línea de vista (LOS) a partir de la diferencia de fase:
"""
        )  # conceptos de retrodispersión y fase
        st.latex(r"\Delta\phi = -\frac{4\pi}{\lambda}\,d_{LOS},\qquad "
                 r"\text{una franja } (2\pi) = \lambda/2")  # relación fase–desplazamiento
        st.markdown(
            "**Speckle y coherencia.** La suma coherente de muchos dispersores produce un moteado (speckle) "
            "que se reduce promediando *looks*; la coherencia γ mide la estabilidad de la fase entre fechas "
            "y fija el ruido de la medición interferométrica:"
        )
        st.latex(r"\sigma_\phi = \frac{\sqrt{1-\gamma^2}}{\gamma\sqrt{2L}}")  # cota de Cramér-Rao de la fase
        st.caption("Los modelos físicos de cada tipo de cambio están en la pestaña «📐 Física».")

    with tab_mision:  # 2.3: la misión
        st.markdown("### 2.3. La misión NISAR")
        st.markdown(
            "NISAR (NASA–ISRO Synthetic Aperture Radar) es el primer satélite con dos radares SAR, en "
            "banda L y banda S, diseñado para observar casi toda la superficie terrestre y helada cada "
            f"{nisar.CICLO_DIAS} días con pasos ascendentes y descendentes."
        )
        st.dataframe(pd.DataFrame({"Característica": list(nisar.MISION), "Valor": list(nisar.MISION.values())}),
                     hide_index=True)  # ficha técnica de la misión
        st.markdown(
            """
**Productos de nivel 2 usados en esta app**
- **GCOV:** retrodispersión geocodificada (σ⁰/γ⁰) en HH, HV y otras polarizaciones.
- **GUNW:** interferograma desenrollado y geocodificado; da el desplazamiento en la línea de vista.
- **GOFF:** desplazamientos por correlación de imágenes (*offset tracking*), útil en glaciares.
- **GSLC:** imagen compleja geocodificada, base para procesamientos propios.
"""
        )  # productos L2


MODO_MODELO = "🎞️ Modelo en el tiempo"  # capa del mapa: estado continuo del modelo físico
MODO_CAMBIO = "🛰️ Cambio detectado (antes → después)"  # capa del mapa: resultado de la detección
PASOS = {  # cuánto avanza el reproductor en cada cuadro
    "1 minuto": timedelta(minutes=1),
    "10 minutos": timedelta(minutes=10),
    "1 hora": timedelta(hours=1),
    "6 horas": timedelta(hours=6),
    "1 día": timedelta(days=1),
    "12 días (ciclo NISAR)": timedelta(days=12),
}
VELOCIDADES = {"Lenta": 1.0, "Normal": 0.5, "Rápida": 0.25}  # segundos por cuadro
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]  # abreviaturas

# Fenómenos del detector de cambios → modelos de la app (claves de nisar.TIPOS) y productos NISAR útiles.
FENOMENOS = {
    "Humedales e inundaciones": (
        ["humedales"], ("GCOV",),
        "Variación espacial y temporal de zonas inundadas y humedales: comparación de imágenes "
        "antes/durante/después y mapas de cambio de retrodispersión."),
    "Deforestación y estructura forestal": (
        [], ("GCOV",),
        "Comparación de observaciones temporales de zonas forestales: diferencias de retrodispersión y "
        "análisis espacial de áreas modificadas."),
    "Agricultura y humedad del suelo": (
        ["agricultura"], ("GCOV",),
        "Variaciones temporales en superficies agrícolas. La intensidad SAR no se convierte directamente en "
        "porcentaje de humedad sin un modelo validado."),
    "Deformación del terreno": (
        ["terremotos", "subsidencia"], ("GUNW",),
        "Productos interferométricos: se distingue el desplazamiento en la línea de vista del radar del "
        "desplazamiento vertical o tridimensional cuando es posible."),
    "Incendios, glaciares y cambios costeros": (
        ["incendios", "glaciares"], ("GCOV", "GOFF"),
        "Áreas afectadas por incendios forestales, variaciones en superficies de hielo y cambios costeros."),
}

# Cómo entra la temporada climática en cada modelo físico (se muestra en la pestaña de estación)
EFECTO_ESTACIONAL = {
    "humedales": "El nivel del agua sigue el almacenamiento de un embalse lineal alimentado por el excedente "
                 "del balance hídrico: el humedal se llena en la época lluviosa y se vacía en la seca.",
    "incendios": "La humedad del suelo cambia su constante dieléctrica y el σ⁰ del suelo bajo el dosel "
                 "(≈ 0,25 dB por punto de humedad volumétrica).",
    "terremotos": "La pantalla atmosférica del interferograma escala con el agua precipitable (retardo húmedo).",
    "subsidencia": "La componente estacional del desplazamiento sigue la humedad del suelo y la atmósfera "
                   "escala con el agua precipitable.",
    "glaciares": "Sin forzamiento estacional: en los glaciares ecuatoriales la estacionalidad del flujo es débil "
                 "e incierta, así que se conserva el modelo de Glen con fase fija.",
    "agricultura": "El calendario de siembra y cosecha está fijo al año civil (épocas de invierno y verano) y "
                   "la humedad estacional del suelo modifica el σ⁰ de cada parcela.",
}

st.markdown(tema.css(), unsafe_allow_html=True)  # hoja de estilos cyberpunk: neones, rejilla, tarjetas recortadas

_selector_imagen = components.declare_component(
    "selector_imagen", path=str(Path(__file__).resolve().parent / "interfaz" / "componentes" / "selector_imagen")
)  # componente HTML propio: clic = punto, arrastre = cuadrante


# ---------------------------------------------------------------------------
# Utilidades de visualización
# ---------------------------------------------------------------------------

def _rgb(hex_color: str) -> tuple[int, int, int]:
    return tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5))  # «#rrggbb» → (r, g, b)


def colorear(panel: nisar.Panel, para_mapa: bool = False) -> np.ndarray:
    """Convierte un panel en una imagen RGBA según su paleta."""
    d = np.asarray(panel.datos)  # matriz de valores del panel
    rgba = np.zeros(d.shape + (4,), np.uint8)  # imagen transparente del mismo tamaño
    if panel.paleta == "categorias":  # clases discretas (inundado, quemado…)
        for codigo, (_, color) in enumerate(panel.leyenda, start=1):
            rgba[d == codigo] = (*_rgb(color), 220 if para_mapa else 255)  # color de cada clase
        return rgba
    anclas = np.array([_rgb(h) for h in PALETAS[panel.paleta]], float)  # colores de la rampa
    t = (d.astype(float) - panel.vmin) / (panel.vmax - panel.vmin)  # valor normalizado 0–1
    validos = np.isfinite(t)  # los NaN (océano, sin datos) quedan transparentes
    t = np.where(validos, t, 0.0)
    t = np.mod(t, 1.0) if panel.paleta == "ciclico" else np.clip(t, 0.0, 1.0)  # la fase da la vuelta
    pos = t * (len(anclas) - 1)  # posición dentro de la rampa
    i = np.clip(np.floor(pos).astype(int), 0, len(anclas) - 2)  # ancla inferior
    frac = (pos - i)[..., None]  # fracción entre dos anclas
    rgba[..., :3] = np.round(anclas[i] * (1 - frac) + anclas[i + 1] * frac).astype(np.uint8)  # interpolación lineal
    alfa = np.where(validos, 255.0, 0.0)  # opacidad completa donde hay datos
    if para_mapa:
        # En el mapa solo se muestra lo que cambia: los valores cercanos a cero (ruido) quedan
        # transparentes y la opacidad crece con la magnitud.
        if panel.paleta == "divergente":
            alfa = np.where(validos, np.clip((np.abs(2 * t - 1) - 0.1) / 0.25, 0, 1) * 230, 0)
        elif panel.paleta.startswith("secuencial"):
            alfa = np.where(validos, np.clip((t - 0.03) / 0.12, 0, 1) * 230, 0)
    rgba[..., 3] = alfa.astype(np.uint8)  # canal alfa
    return rgba


def ampliar(rgba: np.ndarray, lado: int = 480) -> np.ndarray:
    k = max(1, lado // max(rgba.shape[:2]))  # factor entero de ampliación
    return np.repeat(np.repeat(rgba, k, axis=0), k, axis=1)  # píxeles nítidos (sin suavizado)


def png_bytes(rgba: np.ndarray) -> bytes:
    buf = io.BytesIO()  # archivo en memoria
    Image.fromarray(rgba, "RGBA").save(buf, format="PNG")  # codifica la imagen
    return buf.getvalue()


def png_url(rgba: np.ndarray) -> str:
    return "data:image/png;base64," + base64.b64encode(png_bytes(rgba)).decode()  # imagen incrustada en HTML


estilo = tema.estilo_grafico  # estilo común de los gráficos Altair (tipografía mono, rejilla violeta tenue)


def _etiqueta_valor(v: float, rango: float) -> str:
    if rango >= 20:  # menos decimales cuanto mayor es el rango
        decimales = 0
    elif rango >= 2:
        decimales = 1
    else:
        decimales = 2
    return f"{v:.{decimales}f}".replace("-", "−").replace(".", ",")  # signo menos tipográfico y coma decimal


def barra_color(panel: nisar.Panel) -> str:
    """Escala de color continua como degradado HTML con cinco marcas."""
    if panel.paleta == "ciclico":
        etiquetas = ["−π", "−π/2", "0", "π/2", "π"]  # fase envuelta
    else:
        rango = abs(panel.vmax - panel.vmin)
        etiquetas = [_etiqueta_valor(v, rango) for v in np.linspace(panel.vmin, panel.vmax, 5)]
    degradado = ", ".join(PALETAS[panel.paleta])  # colores del degradado CSS
    marcas = "".join(f"<span>{e}</span>" for e in etiquetas)
    return (f"<div class='barra'><div class='barra-grad' style='background: linear-gradient(to right, {degradado})'>"
            f"</div><div class='barra-etq'>{marcas}</div>"
            f"<div class='barra-unidad'>{html.escape(panel.unidad)}</div></div>")


def leyenda_html(leyenda: list) -> str:
    items = "".join(f"<span><i style='background:{c}'></i>{html.escape(e)}</span>" for e, c in leyenda)  # muestra + texto
    return f"<div class='leyenda'>{items}</div>"


def escala_panel(panel: nisar.Panel) -> None:
    if panel.paleta == "categorias":
        st.markdown(leyenda_html(panel.leyenda), unsafe_allow_html=True)  # leyenda de clases
    else:
        st.markdown(barra_color(panel), unsafe_allow_html=True)  # barra de color continua


_GRIEGAS = re.compile(r"([α-ω])")  # letras griegas minúsculas


def texto_etiqueta(texto: str) -> str:
    """Escapa HTML y evita que la conversión a mayúsculas cambie el símbolo (σ⁰ → Σ⁰, γ → Γ)."""
    return _GRIEGAS.sub(r"<span class='sin-mayus'>\1</span>", html.escape(texto))


def seccion(texto: str) -> None:
    st.markdown(f"<div class='section-label'>{texto_etiqueta(texto)}</div>", unsafe_allow_html=True)  # subtítulo


def tarjetas(metricas: list) -> None:
    """Fila de tarjetas KPI: [(etiqueta, valor, ayuda), ...]."""
    columnas = st.columns(len(metricas))  # una columna por métrica
    for columna, (etiqueta, valor, ayuda) in zip(columnas, metricas):
        ayuda_html = f"<div class='kpi-help'>{html.escape(ayuda)}</div>" if ayuda else ""
        columna.markdown(
            f"<div class='kpi-card'><div class='kpi-label'>{texto_etiqueta(etiqueta)}</div>"
            f"<div class='kpi-value'>{html.escape(valor)}</div>{ayuda_html}</div>",
            unsafe_allow_html=True,
        )


def grafico_serie(serie: nisar.Serie, marcas: dict) -> alt.Chart:
    """Línea temporal con tooltip de cruz y reglas para el evento y las fechas comparadas."""
    df = serie.datos.dropna(subset=["valor"]).copy()  # descarta fechas sin valor
    nombres = list(pd.unique(df["serie"]))  # orden de aparición = orden de color
    claves = {n: f"s{k}" for k, n in enumerate(nombres)}  # nombres seguros para el pivote del tooltip
    df["clave"] = df["serie"].map(claves)
    df["trazo"] = np.where(df["serie"].str.contains("modelo|Verdad", case=False), "modelo", "observado")  # modelo = discontinuo
    color = alt.Color(
        "serie:N",
        scale=alt.Scale(domain=nombres, range=SERIES[:len(nombres)]),
        legend=alt.Legend(orient="top", title=None, direction="horizontal") if len(nombres) > 1 else None,
    )  # leyenda solo con dos o más series
    x = alt.X("fecha:T", title=None, axis=alt.Axis(format="%b %Y", labelAngle=0, tickCount=8))
    base = alt.Chart(df).encode(x=x, y=alt.Y("valor:Q", title=serie.unidad, scale=alt.Scale(zero=False)), color=color)
    lineas = base.mark_line(strokeWidth=2, interpolate="monotone").encode(
        strokeDash=alt.StrokeDash("trazo:N", scale=alt.Scale(domain=["observado", "modelo"], range=[[1, 0], [5, 3]]),
                                  legend=None))  # trazo continuo u discontinuo
    seleccion = alt.selection_point(nearest=True, on="pointerover", fields=["fecha"], empty=False, clear="pointerout")
    puntos = base.mark_circle(size=70, stroke=SUPERFICIE, strokeWidth=2).encode(
        opacity=alt.condition(seleccion, alt.value(1), alt.value(0)))  # puntos visibles solo bajo el cursor
    tooltip = [alt.Tooltip("fecha:T", title="Fecha", format="%d %b %Y")] + [
        alt.Tooltip(f"{claves[n]}:Q", title=n, format=".2f") for n in nombres]
    regla = (
        alt.Chart(df).transform_pivot("clave", value="valor", groupby=["fecha"])
        .mark_rule(color=TENUE, strokeWidth=1)
        .encode(x="fecha:T", opacity=alt.condition(seleccion, alt.value(0.8), alt.value(0)), tooltip=tooltip)
        .add_params(seleccion)
    )  # regla vertical con todos los valores de esa fecha
    capas = [lineas, puntos, regla]
    if marcas:  # evento y fechas comparadas
        df_m = pd.DataFrame({"fecha": list(marcas.values()), "etiqueta": list(marcas.keys()),
                             "fila_px": [8 + 14 * k for k in range(len(marcas))]})
        capas.append(alt.Chart(df_m).mark_rule(color=TENUE, strokeWidth=1, opacity=0.6).encode(x="fecha:T"))
        capas.append(alt.Chart(df_m).mark_text(align="left", dx=4, color=TENUE, fontSize=11)
                     .encode(x="fecha:T", y=alt.Y("fila_px:Q", scale=None, axis=None), text="etiqueta:N"))
    return estilo(alt.layer(*capas).properties(height=300))


def grafico_flujo(flechas: pd.DataFrame, vmax: float, extension_km: float) -> alt.Chart:
    # Marcas sobre fondo oscuro: se omiten los pasos más oscuros de la rampa para que se lean.
    paradas = PALETAS["secuencial"][3:]
    escala = alt.Scale(domain=list(np.linspace(0, vmax, len(paradas))), range=paradas)
    dominio = [-extension_km / 2, extension_km / 2]  # escena centrada en el lugar
    grafico = alt.Chart(flechas).mark_point(shape="wedge", filled=True, size=260, strokeWidth=0).encode(
        x=alt.X("x_km:Q", title="Este (km)", scale=alt.Scale(domain=dominio, nice=False)),
        y=alt.Y("y_km:Q", title="Norte (km)", scale=alt.Scale(domain=dominio, nice=False)),
        angle=alt.Angle("angulo:Q", scale=alt.Scale(domain=[0, 360], range=[0, 360])),  # dirección del flujo
        color=alt.Color("velocidad:Q", scale=escala, title="m/día"),  # rapidez del hielo
        tooltip=[alt.Tooltip("velocidad:Q", title="Velocidad (m/día)", format=".2f"),
                 alt.Tooltip("angulo:Q", title="Dirección (° desde el norte)", format=".0f")],
    ).properties(width=520, height=520)
    return estilo(grafico)


def grafico_climatologia(tabla: pd.DataFrame, mes: int) -> alt.Chart:
    """Precipitación mensual por temporada (barras), ET₀ (línea) y umbral de mes seco, en un solo eje."""
    orden = list(tabla["mes"])  # meses en orden de calendario
    x = alt.X("mes:N", sort=orden, title=None, axis=alt.Axis(labelAngle=0))
    tooltip = [alt.Tooltip("mes:N", title="Mes"),
               alt.Tooltip("precipitacion_mm:Q", title="Precipitación (mm)", format=".0f"),
               alt.Tooltip("et0_mm:Q", title="ET₀ (mm)", format=".0f"),
               alt.Tooltip("temperatura_c:Q", title="Temperatura (°C)", format=".1f"),
               alt.Tooltip("temporada:N", title="Temporada")]
    barras = alt.Chart(tabla).mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4).encode(
        x=x,
        y=alt.Y("precipitacion_mm:Q", title="mm/mes"),
        color=alt.Color("temporada:N", scale=alt.Scale(domain=list(COLORES_TEMPORADA),
                                                       range=list(COLORES_TEMPORADA.values())),
                        legend=alt.Legend(orient="top", title=None)),  # color = temporada del mes
        stroke=alt.condition(alt.datum.mes_num == mes, alt.value(NEON_AMARILLO), alt.value(SUPERFICIE)),  # aro neón en el mes consultado
        strokeWidth=alt.condition(alt.datum.mes_num == mes, alt.value(2), alt.value(1)),
        tooltip=tooltip,
    )
    linea_et0 = alt.Chart(tabla).mark_line(color=TINTA_2, strokeWidth=2, strokeDash=[5, 3]).encode(x=x, y="et0_mm:Q")
    puntos_et0 = alt.Chart(tabla).mark_circle(size=64, color=TINTA_2, stroke=SUPERFICIE, strokeWidth=2).encode(
        x=x, y="et0_mm:Q", tooltip=tooltip)  # objetivo de hover sobre la línea
    etiqueta_et0 = alt.Chart(tabla.tail(1)).mark_text(align="left", dx=8, color=TINTA_2, fontSize=11).encode(
        x=x, y="et0_mm:Q", text=alt.value("ET₀"))  # rótulo directo de la línea
    umbral = alt.Chart(pd.DataFrame({"y": [estaciones.UMBRAL_MES_SECO_MM]})).mark_rule(
        color=TENUE, strokeDash=[2, 3]).encode(y="y:Q")  # 60 mm: mes seco (Köppen)
    mes_mas_seco = orden[int(tabla["precipitacion_mm"].to_numpy().argmin())]  # rótulo sobre la barra más baja
    etiqueta_umbral = alt.Chart(pd.DataFrame({"y": [estaciones.UMBRAL_MES_SECO_MM], "mes": [mes_mas_seco]})).mark_text(
        align="center", dy=-7, color=TENUE, fontSize=10).encode(x=alt.X("mes:N", sort=orden), y="y:Q",
                                                               text=alt.value("60 mm · mes seco"))
    return estilo(alt.layer(barras, umbral, etiqueta_umbral, linea_et0, puntos_et0, etiqueta_et0)
                  .properties(height=280))


def coordenadas(lat: float, lon: float) -> str:
    return (f"{abs(lat):.4f}° {'N' if lat >= 0 else 'S'}, {abs(lon):.4f}° {'E' if lon >= 0 else 'O'}"
            .replace(".", ","))  # p. ej. «0,7000° S, 80,2000° O»


def instante_texto(t: datetime) -> str:
    return f"{t.day} {MESES[t.month - 1]} {t.year} · {t:%H:%M}"  # p. ej. «1 may 2026 · 14:00»


def lapso(delta: timedelta) -> str:
    return nisar.duracion_texto(delta.total_seconds() / 86400.0).lstrip("+−")  # duración sin signo


def horas_texto(horas: float) -> str:
    h, m = divmod(int(round(horas * 60)), 60)  # horas fraccionarias → h y min
    return f"{h} h {m:02d} min"


# ---------------------------------------------------------------------------
# Mapa: el puntero coloca el lugar del modelo (solo dentro de Ecuador)
# ---------------------------------------------------------------------------

def mapa_base(sitios: pd.DataFrame, sitio: dict, limites, huellas: pd.DataFrame | None) -> folium.Map:
    """Mapa nocturno limitado a Ecuador: contorno neón, provincias, catálogo y huellas NISAR (sin la capa animada)."""
    o_ec, s_ec, e_ec, n_ec = estaciones.LIMITES_ECUADOR  # caja del país con Galápagos
    m = folium.Map(location=[float(sitio["lat"]), float(sitio["lon"])], zoom_start=7, tiles=None, control_scale=True,
                   min_zoom=5, max_bounds=True, min_lat=s_ec - 2, max_lat=n_ec + 2, min_lon=o_ec - 2,
                   max_lon=e_ec + 2)  # no se puede salir de los alrededores de Ecuador
    # Mapa oscuro por defecto (estética cyberpunk); el satélite queda en el selector de capas.
    # Esri Dark Gray no pide clave de API (las teselas oscuras de CARTO ahora la exigen y muestran avisos).
    folium.TileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        name="Mapa nocturno", attr="Esri, HERE, Garmin, © OpenStreetMap contributors", max_zoom=16,
    ).add_to(m)
    folium.TileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        name="Satélite", attr="Esri, Maxar, Earthstar Geographics", max_zoom=19, show=False,
    ).add_to(m)
    folium.GeoJson(
        estaciones.mascara_exterior_geojson(), name="Fuera de Ecuador", control=False,
        style_function=lambda _: {"fillColor": PLANO, "fillOpacity": 0.78, "color": PLANO, "weight": 0},
    ).add_to(m)  # oscurece todo lo que no es Ecuador
    contorno = estaciones.contorno_geojson()  # frontera del país
    folium.GeoJson(contorno, name="Brillo de la frontera", control=False,
                   style_function=lambda _: {"fillOpacity": 0, "color": NEON_MAGENTA, "weight": 7, "opacity": 0.22},
                   ).add_to(m)  # halo ancho y translúcido: simula el brillo neón
    folium.GeoJson(contorno, name="Frontera", control=False,
                   style_function=lambda _: {"fillOpacity": 0, "color": NEON_MAGENTA, "weight": 1.6, "opacity": 0.95},
                   ).add_to(m)  # línea fina y brillante encima del halo
    folium.GeoJson(
        estaciones.provincias_geojson(), name="Provincias y regiones",
        style_function=lambda _: {"fillColor": NEON_CIAN, "fillOpacity": 0.02, "color": NEON_CIAN, "weight": 0.7,
                                  "opacity": 0.45},
        tooltip=folium.GeoJsonTooltip(fields=["provincia", "region"], aliases=["Provincia", "Región"]),
    ).add_to(m)  # límites provinciales con su región natural (el relleno casi transparente activa el tooltip)
    if huellas is not None and not huellas.empty:  # huellas de productos NISAR reales (pestaña Catálogo)
        for _, h in huellas.dropna(subset=["huella"]).iterrows():
            folium.Polygon(
                locations=[(lat, lon) for lon, lat in h["huella"][0]],
                color=tema.NEON_VIOLETA, weight=1, opacity=0.7, fill=True, fill_color=tema.NEON_VIOLETA,
                fill_opacity=0.05,
                tooltip=f"{h['producto']} · {h['fecha']:%d/%m/%Y} · {h['direccion']} · track {h['track']}",
            ).add_to(m)
    for _, f in sitios.iterrows():  # lugares del catálogo
        folium.CircleMarker(
            location=[float(f["lat"]), float(f["lon"])], radius=5, color=PLANO, weight=2, fill=True,
            fill_color=NEON_MAGENTA, fill_opacity=1,
            tooltip=f"{f['sitio']} · {nisar.TIPOS[f['tipo_cambio']].nombre}",
        ).add_to(m)
    folium.CircleMarker(
        location=[float(sitio["lat"]), float(sitio["lon"])], radius=14, color=NEON_CIAN, weight=1, opacity=0.5,
        fill=False,
    ).add_to(m)  # anillo exterior del lugar activo
    folium.CircleMarker(
        location=[float(sitio["lat"]), float(sitio["lon"])], radius=7, color=PLANO, weight=2, fill=True,
        fill_color=NEON_CIAN, fill_opacity=1, tooltip=f"Lugar del modelo: {sitio['sitio']}",
    ).add_to(m)  # lugar activo resaltado
    if limites:
        o, s, e, n = limites
        m.fit_bounds([[s, o], [n, e]], padding=(20, 20))  # encuadra la escena simulada
    folium.LayerControl(position="topright", collapsed=True).add_to(m)  # selector de capas
    return m


def capa_animada(panel: nisar.Panel | None, limites) -> folium.FeatureGroup:
    """Capa que cambia en cada cuadro; se actualiza sin recargar el mapa base."""
    grupo = folium.FeatureGroup(name="Capa del modelo")
    if panel is not None and limites:
        o, s, e, n = limites
        folium.raster_layers.ImageOverlay(
            image=png_url(colorear(panel, para_mapa=True)), bounds=[[s, o], [n, e]],
            opacity=0.95, pixelated=True,
        ).add_to(grupo)  # imagen georreferenciada del estado del modelo
    return grupo


def sitio_en_mapa(tipo: str, lat: float, lon: float, sitios: pd.DataFrame) -> dict:
    """Lugar colocado con el puntero: usa los parámetros genéricos del tipo de cambio."""
    referencia = sitios[sitios["tipo_cambio"] == tipo].iloc[0]  # sitio de Ecuador del mismo tipo
    region = estaciones.region_natural(lat, lon) or {"provincia": "Ecuador", "region": ""}
    return {
        "id": f"mapa_{lat:.4f}_{lon:.4f}",  # identificador único por coordenadas
        "tipo_cambio": tipo,
        "sitio": f"Punto en {region['provincia']}",
        "pais": coordenadas(lat, lon),
        "lat": lat,
        "lon": lon,
        "fecha_evento": referencia["fecha_evento"],  # misma fecha de referencia que el sitio del catálogo
        "descripcion": f"Lugar colocado con el puntero ({region['region']}). El modelo usa parámetros genéricos "
                       "de este tipo de cambio y la climatología del punto; ajústalos junto al mapa.",
    }


# ---------------------------------------------------------------------------
# Antes / después: el puntero elige un punto y el arrastre dibuja el cuadrante
# ---------------------------------------------------------------------------

def panel_seleccionable(panel: nisar.Panel, seleccion: dict, key: str):
    st.markdown(f"<div class='panel-titulo'>{html.escape(panel.titulo)}</div>", unsafe_allow_html=True)
    valor = _selector_imagen(
        src=png_url(colorear(panel)),  # imagen del panel
        cuadrante=list(seleccion["cuadrante"]) if seleccion["cuadrante"] else None,  # selección actual
        punto=list(seleccion["punto"]) if seleccion["punto"] else None,
        key=key,
        default=None,
    )  # devuelve el último clic o arrastre en coordenadas normalizadas
    escala_panel(panel)
    return valor


def registrar_seleccion(seleccion: dict, valor) -> bool:
    """Un clic (sin arrastre) fija el punto; un arrastre fija el cuadrante. Devuelve True si cambió."""
    if not valor or float(valor.get("t", 0)) <= seleccion["ult_t"]:  # evento ya procesado
        return False
    seleccion["ult_t"] = float(valor["t"])  # marca de tiempo del evento
    x0, y0, x1, y1 = (float(valor[k]) for k in ("x0", "y0", "x1", "y1"))
    if abs(x1 - x0) < 0.012 and abs(y1 - y0) < 0.012:  # desplazamiento mínimo: es un clic
        seleccion["punto"] = (x1, y1)
    else:
        seleccion["cuadrante"] = (min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
    return True


# ---------------------------------------------------------------------------
# Datos (con caché)
# ---------------------------------------------------------------------------

@st.cache_data(show_spinner=False)
def cargar_sitios() -> pd.DataFrame:
    sitios = nisar.cargar_sitios()  # catálogo completo
    return sitios[sitios["pais"] == PAIS].reset_index(drop=True)  # solo los lugares de Ecuador


@st.cache_data(max_entries=12, show_spinner="Simulando adquisiciones NISAR de 12 días…")
def escena_cacheada(sitio: dict, semilla: int, looks: float, orbita: str, ajustes: dict,
                    estacional: bool) -> nisar.Escena:
    return nisar.simular(sitio, semilla=semilla, looks=looks, orbita=orbita, ajustes=ajustes,
                         estacional=estacional)  # pila de adquisiciones simuladas


@st.cache_data(max_entries=32, show_spinner="Detectando cambios…")
def analisis_simulado(sitio: dict, semilla: int, looks: float, orbita: str, ajustes: dict, estacional: bool,
                      i0: int, i1: int) -> nisar.Analisis:
    return nisar.analizar(escena_cacheada(sitio, semilla, looks, orbita, ajustes, estacional), i0, i1)


@st.cache_data(max_entries=8, show_spinner="Leyendo productos GCOV…")
def analisis_gcov(ruta_a: str, ruta_b: str, pol: str, paso: int, firma: tuple) -> nisar.Analisis:
    return nisar.analizar_par_gcov(ruta_a, ruta_b, pol, paso)  # «firma» invalida la caché si cambian los archivos


@st.cache_data(max_entries=8, show_spinner="Leyendo producto GUNW…")
def analisis_gunw(ruta: str, paso: int, invertir: bool, firma: tuple) -> nisar.Analisis:
    return nisar.analizar_gunw(ruta, paso, invertir)


@st.cache_data(ttl=3600, show_spinner="Consultando el catálogo de ASF…")
def buscar_asf(lat: float, lon: float, producto: str, inicio: date, fin: date, maximo: int,
               area_wkt: str | None = None) -> pd.DataFrame:
    return nisar.buscar_nisar_asf(lat, lon, producto, inicio, fin, maximo, area_wkt=area_wkt)  # ASF SearchAPI


@st.cache_data(ttl=86400, show_spinner="Buscando el lugar…")
def geocodificar(consulta: str) -> dict | None:
    """Primer resultado de OpenStreetMap Nominatim dentro de Ecuador: nombre y contorno GeoJSON."""
    import requests  # solo se necesita al buscar

    respuesta = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": consulta, "format": "json", "limit": 1, "countrycodes": "ec",  # solo resultados en Ecuador
                "polygon_geojson": 1, "polygon_threshold": 0.01},  # contorno simplificado
        headers={"User-Agent": "nisar-rastreador-cambios/1.0 (Streamlit)"},  # requisito de uso de Nominatim
        timeout=20,
    )
    respuesta.raise_for_status()
    resultados = respuesta.json()
    if not resultados:
        return None
    r = resultados[0]
    contorno = r.get("geojson") or {}
    if contorno.get("type") not in ("Polygon", "MultiPolygon"):  # punto o línea: se usa la caja envolvente
        s, n, o, e = (float(v) for v in r["boundingbox"])
        contorno = {"type": "Polygon", "coordinates": [[[o, s], [e, s], [e, n], [o, n], [o, s]]]}
    return {"nombre": r["display_name"], "geojson": contorno}


def geometria_geojson(datos: dict):
    """Geometría shapely de un GeoJSON (FeatureCollection, Feature o geometría suelta)."""
    if datos.get("type") == "FeatureCollection":
        return unary_union([shape(f["geometry"]) for f in datos.get("features", []) if f.get("geometry")])
    if datos.get("type") == "Feature":
        return shape(datos["geometry"])
    return shape(datos)


def wkt_busqueda(geometria) -> str | None:
    """Área simplificada para ASF (envolvente convexa en sentido antihorario); None si no tiene superficie."""
    if geometria.area == 0:
        return None  # un punto se consulta como POINT
    return shapely_wkt.dumps(orient(geometria.convex_hull.simplify(0.01), 1.0), rounding_precision=4)


def cobertura_area(productos: pd.DataFrame, geometria) -> tuple[pd.DataFrame, float | None]:
    """Productos cuya huella toca el área y fracción del área cubierta por al menos uno de ellos."""
    if productos.empty:
        return productos, 0.0 if geometria.area > 0 else None
    huellas_validas = [Polygon(h[0]).buffer(0) if h else None for h in productos["huella"]]  # repara huellas
    tocan = [h is not None and h.intersects(geometria) for h in huellas_validas]
    productos = productos[tocan].reset_index(drop=True)  # descarta las que solo tocan la envolvente
    if geometria.area == 0:
        return productos, None
    union = unary_union([h for h, t in zip(huellas_validas, tocan) if t])
    return productos, float(union.intersection(geometria).area / geometria.area)  # cobertura aproximada (en grados²)


# ---------------------------------------------------------------------------
# Barra lateral: tipo de cambio, lugar y fuente de datos
# ---------------------------------------------------------------------------

try:
    sitios = cargar_sitios()  # catálogo de lugares de Ecuador
except Exception as exc:
    st.error(f"No se pudo leer el catálogo de sitios ({nisar.RUTA_SITIOS}): {exc}")
    st.stop()

st.sidebar.title("🛰️ NISAR · Ecuador")
st.sidebar.caption("Radar de apertura sintética en banda L · NASA–ISRO")

tipos_presentes = [t for t in nisar.TIPOS if t in set(sitios["tipo_cambio"])]  # tipos con algún lugar
tipo = st.sidebar.selectbox("Tipo de cambio", tipos_presentes, format_func=lambda t: nisar.TIPOS[t].nombre)
tipo_info = nisar.TIPOS[tipo]  # nombre, producto y método del tipo elegido
sitios_tipo = sitios[sitios["tipo_cambio"] == tipo]  # lugares de ese tipo

lugar = st.session_state.setdefault("lugar", {"elegido": None, "punto": None, "version": 0})  # estado del lugar
opciones_lugar = sitios_tipo["id"].tolist() + ([LUGAR_MAPA] if lugar["punto"] else [])  # catálogo + punto del mapa
elegido = lugar["elegido"] if lugar["elegido"] in opciones_lugar else opciones_lugar[0]


def _nombre_lugar(i: str) -> str:
    if i == LUGAR_MAPA:
        return f"📍 Punto del mapa ({coordenadas(*lugar['punto'])})"
    return sitios_tipo.loc[sitios_tipo["id"] == i, "sitio"].iloc[0]  # nombre del sitio del catálogo


id_sitio = st.sidebar.selectbox(
    "Lugar", opciones_lugar, index=opciones_lugar.index(elegido), format_func=_nombre_lugar,
    key=f"lugar_{tipo}_{lugar['version']}",  # la clave cambia al hacer clic en el mapa para forzar la selección
    help="También puedes hacer clic en cualquier punto de Ecuador en el mapa para colocar ahí el modelo.",
)
lugar["elegido"] = id_sitio
if id_sitio == LUGAR_MAPA:
    sitio_base = sitio_en_mapa(tipo, *lugar["punto"], sitios)  # lugar elegido con el puntero
else:
    sitio_base = sitios_tipo[sitios_tipo["id"] == id_sitio].iloc[0].to_dict()  # lugar del catálogo
st.sidebar.caption(sitio_base["descripcion"])
clave_lugar = f"{tipo}|{sitio_base['id']}"  # identifica el lugar en claves de estado y caché

fuente = st.sidebar.radio(
    "Fuente de datos", [FUENTE_SIM, FUENTE_REAL, FUENTE_ASF, FUENTE_ISRO],
    help="Simulación física, productos HDF5 guardados en data/nisar/ o conexión directa a los archivos de la "
         "misión (en desarrollo).",
)


def clave_parametro(nombre: str) -> str:
    return f"param|{clave_lugar}|{nombre}"  # clave de session_state de cada parámetro del modelo


def valor_modelo(control: nisar.Control, valor):
    """Convierte el valor mostrado en el control al valor que usa el modelo."""
    if control.hora:
        return valor.hour + valor.minute / 60.0  # hora del día → horas fraccionarias
    if control.opciones:
        return float(valor)
    return float(valor) / control.escala  # p. ej. porcentaje → fracción


parametros_defecto = nisar.parametros_sitio(sitio_base)  # parámetros físicos del lugar
ajustes = {}  # parámetros cambiados por el usuario
for control in nisar.CONTROLES[tipo]:
    if clave_parametro(control.clave) in st.session_state:
        ajustes[control.clave] = valor_modelo(control, st.session_state[clave_parametro(control.clave)])
sitio = dict(sitio_base)
if clave_parametro("fecha_evento") in st.session_state:  # fecha del evento ajustada en el panel
    sitio["fecha_evento"] = pd.Timestamp(st.session_state[clave_parametro("fecha_evento")])

analisis = None  # resultado de la detección de cambios
escena = None  # pila simulada (solo en modo simulación)
error_analisis = None  # mensaje si no hay análisis
marcas = {}  # fechas destacadas en las series temporales
estacional = False  # forzamiento climático activo

if fuente == FUENTE_SIM:
    estacional = st.sidebar.toggle(
        "Estacionalidad climática (NASA POWER)", value=True,
        help="Activa el ciclo estacional del lugar: humedad del suelo, pulso de inundación, vapor de agua y "
             "calendario agrícola según la climatología 2001–2025. Desactívalo para comparar con la fase fija.",
    )
    with st.sidebar.expander("Parámetros del radar", expanded=False):
        semilla = int(st.number_input("Semilla aleatoria", min_value=0, max_value=10_000, value=7, step=1))  # reproducibilidad
        looks = float(st.slider("Número equivalente de looks (ENL)", 4, 50, 12,
                                help="Más looks = menos speckle y peor resolución espacial."))
        orbita = st.radio("Paso orbital", ["Ascendente", "Descendente"], horizontal=True,
                          help="Cambia la línea de vista (LOS) en los productos interferométricos.")
    escena = escena_cacheada(sitio, semilla, looks, orbita, ajustes, estacional)  # simula la pila
    i0_def, i1_def = nisar.intervalo_por_defecto(escena)  # fechas antes/después sugeridas
    i0, i1 = st.sidebar.select_slider(
        "Fechas comparadas (antes → después)",
        options=list(range(len(escena.fechas))),
        value=(i0_def, i1_def),
        format_func=lambda k: escena.fechas[k].strftime("%d %b %Y"),
        key=f"intervalo_{clave_lugar}_{semilla}",
    )
    if i0 == i1:
        error_analisis = "Elige dos fechas distintas para comparar."
    else:
        try:
            analisis = analisis_simulado(sitio, semilla, looks, orbita, ajustes, estacional, i0, i1)  # detección
        except ValueError as exc:
            error_analisis = str(exc)
    marcas = {"Evento / referencia": pd.Timestamp(escena.instante_evento()),
              "Antes": pd.Timestamp(escena.fechas[i0]), "Después": pd.Timestamp(escena.fechas[i1])}
    st.sidebar.caption(
        f"{len(escena.fechas)} adquisiciones cada {nisar.CICLO_DIAS} días · "
        f"{escena.extension_km:.0f} × {escena.extension_km:.0f} km · píxel {escena.pixel_m:.0f} m"
    )
elif fuente == FUENTE_REAL:
    locales = nisar.listar_productos_locales()  # archivos .h5 en data/nisar/
    st.sidebar.caption(f"Carpeta: `data/nisar/` · {len(locales)} archivo(s) .h5")
    if tipo_info.producto == "GCOV":  # retrodispersión: se compara un par de fechas
        gcov = [p for p in locales if "_GCOV_" in p.name]
        if len(gcov) >= 2:
            ruta_a = st.sidebar.selectbox("GCOV antes", gcov, format_func=lambda p: p.name[:60])
            ruta_b = st.sidebar.selectbox("GCOV después", gcov, index=len(gcov) - 1, format_func=lambda p: p.name[:60])
            pol = st.sidebar.radio("Polarización", ["HVHV", "HHHH"], horizontal=True)
            paso = int(st.sidebar.slider("Submuestreo (píxeles)", 2, 32, 8))
            if ruta_a == ruta_b:
                error_analisis = "Elige dos productos GCOV distintos."
            else:
                try:
                    firma = (ruta_a.stat().st_mtime, ruta_b.stat().st_mtime)  # fecha de modificación de los archivos
                    analisis = analisis_gcov(str(ruta_a), str(ruta_b), pol, paso, firma)
                except Exception as exc:
                    error_analisis = f"No se pudo analizar el par GCOV: {exc}"
        else:
            error_analisis = "Se necesitan al menos dos productos GCOV del mismo track/frame en data/nisar/."
    elif tipo_info.producto == "GUNW":  # interferograma: un solo producto
        gunw = [p for p in locales if "_GUNW_" in p.name]
        if gunw:
            ruta = st.sidebar.selectbox("Producto GUNW", gunw, format_func=lambda p: p.name[:60])
            paso = int(st.sidebar.slider("Submuestreo (píxeles)", 1, 16, 2))
            invertir = st.sidebar.checkbox("Invertir signo de la LOS")
            try:
                analisis = analisis_gunw(str(ruta), paso, invertir, (ruta.stat().st_mtime,))
            except Exception as exc:
                error_analisis = f"No se pudo analizar el GUNW: {exc}"
        else:
            error_analisis = "No hay productos GUNW en data/nisar/."
    else:
        error_analisis = ("La lectura local de productos GOFF aún no está disponible; usa la simulación "
                          "o explora los productos reales en la pestaña «🛰️ Catálogo».")
elif fuente == FUENTE_ASF:
    st.sidebar.info("La descarga y el análisis directo desde ASF DAAC aún no están integrados: requieren "
                    "autenticación con una cuenta de NASA Earthdata.")
    st.sidebar.markdown("[Documentación de productos NISAR en ASF](https://nisar-docs.asf.alaska.edu)")
    error_analisis = ("La conexión directa a ASF DAAC aún no está disponible. Busca productos en la pestaña "
                      "«Catálogo NISAR», guárdalos en data/nisar/ y elige «Productos NISAR reales (HDF5)».")
else:
    st.sidebar.info("La integración con ISRO Bhoonidhi está en desarrollo y requiere autenticación en Bhoonidhi.")
    error_analisis = ("La conexión a ISRO Bhoonidhi aún no está disponible. Usa la simulación o "
                      "productos locales.")

# Estación y temporada de hoy en el lugar del modelo (se muestra en la cabecera)
hoy = date.today()
estacion_hoy = estaciones.resumen(float(sitio["lat"]), float(sitio["lon"]), hoy)  # None fuera de Ecuador

# ---------------------------------------------------------------------------
# Cabecera
# ---------------------------------------------------------------------------

st.markdown("<div class='kicker'>NISAR // Banda L // Ecuador · simulación física</div>",
            unsafe_allow_html=True)  # rótulo de terminal sobre el título
st.title("Rastreador de cambios en la superficie de Ecuador")
st.caption(
    "Datos de radar NISAR (NASA–ISRO) en banda L para detectar, medir y comunicar cómo cambia el territorio "
    "ecuatoriano: humedales, incendios, terremotos, glaciares, agricultura y subsidencia."
)
chips = [
    ("Cambio", tipo_info.nombre),
    ("Lugar", sitio["sitio"]),
    ("Producto", f"NISAR L2 {tipo_info.producto}"),
    ("Observable", tipo_info.observable),
    ("Fuente", {FUENTE_SIM: "simulación física", FUENTE_REAL: "archivos reales"}.get(fuente, "sin conexión")),
]
if estacion_hoy is not None:  # región y temporada actuales del lugar
    chips += [("Región", f"{estacion_hoy['region']} · {estacion_hoy['provincia']}"),
              ("Hoy", f"{estacion_hoy['astronomia']['estacion']} · temporada "
                      f"{estacion_hoy['temporada']['temporada'].lower()}")]
st.markdown(
    "<div class='chips'>" + "".join(f"<span class='chip'>{html.escape(k)}: <b>{html.escape(v)}</b></span>"
                                     for k, v in chips) + "</div>",
    unsafe_allow_html=True,
)  # fila de etiquetas de contexto

if analisis is not None:
    tarjetas(analisis.metricas)  # métricas principales de la detección
elif error_analisis:
    st.info(error_analisis)

st.markdown("<div style='height: 0.8rem'></div>", unsafe_allow_html=True)  # separación vertical

(tab_mapa, tab_dios, tab_comp, tab_serie, tab_estacion, tab_catalogo, tab_explorador, tab_fisica, tab_validacion,
 tab_fundamentos) = st.tabs(
    ["🗺️ Mapa", "🌋 Modo Dios", "🔍 Antes / después", "📈 Serie temporal", "🌦️ Estación y temporada",
     "🛰️ Catálogo", "🧭 Explorador", "📐 Física", "🧪 Validación", "📚 Fundamentos"]
)

huellas = st.session_state.get("asf", {}).get(clave_lugar)  # resultados de la última búsqueda en ASF
extension = escena.extension_km if escena is not None else 60.0  # lado de la escena (km)
limites_mapa = analisis.limites if analisis is not None else (escena.limites() if escena is not None else None)
clave_escena = f"{clave_lugar}|{fuente}|{sitio['fecha_evento']}"  # reinicia el reproductor si cambia


# ---------------------------------------------------------------------------
# Pestaña Mapa: lugar con el puntero, parámetros en tiempo real y reproductor
# ---------------------------------------------------------------------------

def panel_parametros() -> None:
    """Controles de los parámetros físicos del modelo; cada cambio vuelve a simular."""
    seccion("Parámetros del modelo")
    st.date_input("Fecha del evento / referencia", value=pd.Timestamp(sitio_base["fecha_evento"]).date(),
                  key=clave_parametro("fecha_evento"))
    for control in nisar.CONTROLES[tipo]:  # controles definidos para el tipo de cambio
        clave = clave_parametro(control.clave)
        defecto = parametros_defecto[control.clave]
        if control.opciones:  # selección discreta (p. ej. mecanismo de la falla)
            valores = [v for v, _ in control.opciones]
            nombres = dict(control.opciones)
            indice = valores.index(min(valores, key=lambda v: abs(v - defecto)))  # opción más cercana al defecto
            st.selectbox(control.etiqueta, valores, index=indice, format_func=nombres.get, key=clave)
        elif control.hora:  # hora del día
            minutos = int(round(defecto * 60)) % 1440
            st.time_input(control.etiqueta, value=hora_del_dia(minutos // 60, minutos % 60),
                          step=timedelta(minutes=1), key=clave)
        else:  # deslizador continuo
            st.slider(control.etiqueta, min_value=float(control.minimo), max_value=float(control.maximo),
                      value=float(np.clip(defecto * control.escala, control.minimo, control.maximo)),
                      step=float(control.paso), help=control.ayuda or None, key=clave)
    if st.button("Restablecer parámetros", width="stretch"):
        for nombre in ["fecha_evento"] + [c.clave for c in nisar.CONTROLES[tipo]]:
            st.session_state.pop(clave_parametro(nombre), None)  # borra los ajustes del usuario
        st.rerun()
    st.caption("Cada cambio vuelve a ejecutar el modelo físico y la simulación de NISAR al instante.")


def _intervalo_reproduccion():
    """Segundos entre cuadros mientras el reproductor está activo; None lo detiene."""
    estado = st.session_state.get("repro", {})
    if estado.get("reproduciendo") and estado.get("clave") == clave_escena:
        return VELOCIDADES[st.session_state.get("repro_velocidad", "Normal")]
    return None


@st.fragment(run_every=_intervalo_reproduccion())  # solo este fragmento se vuelve a ejecutar en cada cuadro
def vista_mapa() -> None:
    modo = MODO_CAMBIO
    if escena is not None:
        modo = st.radio("Capa del mapa", [MODO_MODELO, MODO_CAMBIO], horizontal=True, key="modo_mapa",
                        label_visibility="collapsed")
    panel_mapa = analisis.capa_mapa if analisis is not None else None  # capa de cambio detectado
    metricas_instante = None
    instante = None

    if escena is not None and modo == MODO_MODELO:
        inicio_dt = datetime.combine(escena.fechas[0], datetime.min.time())  # primera adquisición
        fin_dt = datetime.combine(escena.fechas[-1], datetime.min.time())  # última adquisición
        estado = st.session_state.setdefault("repro", {})
        if estado.get("clave") != clave_escena:
            # Arranca una hora antes del evento: con ▶ el cambio aparece en los primeros cuadros.
            estado.update(clave=clave_escena, t=max(inicio_dt, escena.instante_evento() - timedelta(hours=1)),
                          reproduciendo=False, deslizador=None)
        # El usuario movió el deslizador de tiempo
        if estado.get("deslizador") is not None and st.session_state.get("repro_instante") not in (
                None, estado["deslizador"]):
            estado["t"] = st.session_state["repro_instante"]
        paso = PASOS[st.session_state.get("repro_paso", "1 hora")]
        if estado["reproduciendo"]:
            estado["t"] = min(estado["t"] + paso, fin_dt)  # avanza un cuadro
            if estado["t"] >= fin_dt:
                estado["reproduciendo"] = False  # se detiene al final
                st.rerun(scope="app")

        botones = st.columns([0.8, 0.8, 1.4, 0.8, 0.8, 1.3, 2.0, 1.4], vertical_alignment="center")
        if botones[0].button("⏮", help="Ir al inicio", key="repro_inicio"):
            estado["t"] = inicio_dt
        if botones[1].button("⏪", help="Retroceder un paso", key="repro_atras"):
            estado["t"] = max(estado["t"] - paso, inicio_dt)
        etiqueta_play = "⏸ Pausa" if estado["reproduciendo"] else "▶ Play"
        if botones[2].button(etiqueta_play, key="repro_play", type="primary", width="stretch"):
            estado["reproduciendo"] = not estado["reproduciendo"]
            if estado["reproduciendo"] and estado["t"] >= fin_dt:
                estado["t"] = inicio_dt  # reinicia si ya estaba al final
            st.rerun(scope="app")  # activa o detiene el temporizador del reproductor
        if botones[3].button("⏩", help="Adelantar un paso", key="repro_adelante"):
            estado["t"] = min(estado["t"] + paso, fin_dt)
        if botones[4].button("⏭", help="Ir al final", key="repro_final"):
            estado["t"] = fin_dt
        if botones[5].button("🎯 Evento", help="Una hora antes del evento", key="repro_evento"):
            estado["t"] = max(inicio_dt, escena.instante_evento() - timedelta(hours=1))
        botones[6].selectbox("Paso", list(PASOS), index=2, key="repro_paso", label_visibility="collapsed",
                             help="Cuánto avanza el tiempo en cada cuadro o con ⏪ ⏩")
        botones[7].selectbox("Velocidad", list(VELOCIDADES), index=1, key="repro_velocidad",
                             label_visibility="collapsed")
        if estado["reproduciendo"] and estado.get("velocidad") != st.session_state["repro_velocidad"]:
            estado["velocidad"] = st.session_state["repro_velocidad"]
            st.rerun(scope="app")  # el nuevo intervalo requiere volver a crear el fragmento

        instante = estado["t"]
        st.session_state["repro_instante"] = instante  # sincroniza el deslizador con el reproductor
        estado["deslizador"] = instante
        st.slider("Instante del modelo", min_value=inicio_dt, max_value=fin_dt, step=timedelta(minutes=1),
                  format="DD/MM/YYYY HH:mm", key="repro_instante", label_visibility="collapsed")
        panel_mapa, metricas_instante = nisar.estado_modelo(escena, instante)  # estado físico en ese minuto

    m = mapa_base(sitios, sitio, limites_mapa, huellas)
    salida = st_folium(
        m,
        key=f"mapa_{clave_lugar}",
        height=480,
        use_container_width=True,
        returned_objects=["last_clicked"],  # solo interesa el último clic
        feature_group_to_add=capa_animada(panel_mapa, limites_mapa),  # capa que cambia sin recargar el mapa
    )
    clic = (salida or {}).get("last_clicked")
    if clic and clic != st.session_state.get("ultimo_clic_mapa"):  # clic nuevo
        st.session_state["ultimo_clic_mapa"] = clic
        lat_clic, lon_clic = float(clic["lat"]), float(clic["lng"])
        if estaciones.en_ecuador(lat_clic, lon_clic):  # solo se aceptan puntos dentro del país
            lugar.update(punto=(lat_clic, lon_clic), elegido=LUGAR_MAPA, version=lugar["version"] + 1)
            st.rerun(scope="app")
        st.warning(f"El punto {coordenadas(lat_clic, lon_clic)} está fuera de Ecuador; haz clic dentro del "
                   "país (continente o Galápagos).")

    if panel_mapa is not None:
        st.markdown(f"<div class='panel-titulo'>{html.escape(panel_mapa.titulo)}</div>", unsafe_allow_html=True)
        escala_panel(panel_mapa)
    if instante is not None:
        previa, siguiente = nisar.adquisiciones_alrededor(escena, instante)  # pasos del satélite cercanos
        texto_previa = f"última {previa:%d/%m/%Y} (hace {lapso(instante - previa)})" if previa else "aún ninguna"
        texto_siguiente = f"próxima {siguiente:%d/%m/%Y} (en {lapso(siguiente - instante)})" if siguiente else ""
        texto_temporada = ""
        forz = escena.info.get("forzamiento")
        clim = estaciones.climatologia(float(sitio["lat"]), float(sitio["lon"]))
        if clim is not None:  # temporada climática en el instante reproducido
            temp = estaciones.temporada(instante.date(), clim, estacion_hoy["region"] if estacion_hoy else None)
            texto_temporada = f" · 🌦️ Temporada {temp['temporada'].lower()}, {temp['nombre_local']}"
            if forz is not None:
                texto_temporada += f", suelo al {100 * forz.humedad_en(escena.dias_desde_evento(instante)):.0f} % del agua útil"
        st.markdown(
            f"<div class='reloj'>{instante_texto(instante)}<small>{html.escape(tipo_info.nombre)} · "
            f"{html.escape(sitio['sitio'])}</small></div>"
            f"<div class='nota-nisar'>🛰️ Adquisiciones NISAR: {texto_previa}"
            f"{' · ' + texto_siguiente if texto_siguiente else ''}. El modelo físico es continuo; "
            f"el radar lo observa cada {nisar.CICLO_DIAS} días.{html.escape(texto_temporada)}</div>",
            unsafe_allow_html=True,
        )  # reloj del modelo con las adquisiciones y la temporada
        tarjetas(metricas_instante)


with tab_mapa:
    st.markdown(
        "👆 **Haz clic en cualquier lugar de Ecuador** para colocar ahí el modelo · ajusta sus **parámetros** "
        "a la izquierda · usa ▶ **Play**, ⏪ **retroceder** y ⏩ **adelantar** para recorrer el tiempo en "
        "minutos, horas o días."
    )
    if escena is not None:
        col_parametros, col_mapa = st.columns([1, 2.7], gap="medium")  # parámetros a la izquierda, mapa a la derecha
        with col_parametros:
            panel_parametros()
        with col_mapa:
            vista_mapa()
    else:
        vista_mapa()

# ---------------------------------------------------------------------------
# Pestaña Antes / después: medición con punto y cuadrante sobre las imágenes
# ---------------------------------------------------------------------------

with tab_comp:
    if analisis is None:
        st.info(error_analisis or "Sin análisis disponible.")
    else:
        st.markdown(
            "👆 **Clic** sobre cualquier imagen para elegir un punto · **arrastra** para dibujar el cuadrante "
            "que quieres medir. La selección aparece en todas las imágenes y se mide debajo."
        )
        seleccion = st.session_state.setdefault("medicion", {}).setdefault(
            clave_lugar + "|" + fuente, {"cuadrante": None, "punto": None, "ult_t": 0.0})  # selección por lugar y fuente
        paneles = analisis.paneles
        por_fila = 3 if len(paneles) == 3 else 2
        cambio = False
        for inicio_fila in range(0, len(paneles), por_fila):
            columnas = st.columns(por_fila)
            for indice, (columna, panel) in enumerate(zip(columnas, paneles[inicio_fila:inicio_fila + por_fila])):
                with columna:
                    valor = panel_seleccionable(panel, seleccion, key=f"sel|{clave_lugar}|{fuente}|{inicio_fila + indice}")
                    cambio = registrar_seleccion(seleccion, valor) or cambio
        if cambio:
            st.rerun()  # redibuja todas las imágenes con la nueva selección

        forma = np.asarray(analisis.capa_mapa.datos).shape
        cuadrante_px = nisar.cuadrante_a_pixeles(forma, seleccion["cuadrante"]) if seleccion["cuadrante"] else None
        punto_px = nisar.punto_a_pixel(forma, seleccion["punto"]) if seleccion["punto"] else None

        seccion("Medición del cuadrante")
        if cuadrante_px is None:
            st.caption("Arrastra sobre cualquier imagen para dibujar el cuadrante y medir el área y el cambio.")
        else:
            metricas_cuadrante, tabla_cuadrante = nisar.medir_cuadrante(analisis, cuadrante_px)
            tarjetas(metricas_cuadrante[:5])
            with st.expander("Detalle por capa dentro del cuadrante"):
                st.dataframe(tabla_cuadrante, hide_index=True)
                st.download_button("Descargar medición (CSV)", tabla_cuadrante.to_csv(index=False).encode("utf-8"),
                                   file_name=f"medicion_{tipo}_{sitio['id']}.csv", mime="text/csv")

        if punto_px is not None or cuadrante_px is not None:
            col_punto, col_serie = st.columns([1, 2])
            with col_punto:
                seccion("Punto seleccionado")
                if punto_px is None:
                    st.caption("Haz clic sobre una imagen para consultar un punto.")
                else:
                    if analisis.limites:
                        st.caption(coordenadas(*nisar.coordenadas_punto(analisis.limites, seleccion["punto"])))
                    st.dataframe(nisar.valores_en_punto(analisis, punto_px), hide_index=True)
            with col_serie:
                serie_sel = nisar.serie_seleccion(escena, cuadrante_px, punto_px) if escena is not None else None
                if serie_sel is not None:
                    seccion(serie_sel.titulo)
                    st.altair_chart(grafico_serie(serie_sel, marcas), width="stretch", theme=None)
            if st.button("Borrar selección"):
                seleccion.update({"cuadrante": None, "punto": None})
                st.rerun()

        if analisis.flechas is not None and not analisis.flechas.empty:  # glaciares: campo de velocidades
            seccion("Campo de flujo en la fecha final")
            st.altair_chart(grafico_flujo(analisis.flechas, float(analisis.capa_mapa.vmax), extension),
                            width="content", theme=None)
        for nota in analisis.notas:
            st.caption(nota)
        st.download_button(
            "Descargar mapa de cambio (PNG)",
            data=png_bytes(ampliar(colorear(analisis.capa_mapa))),
            file_name=f"nisar_{tipo}_{sitio['id']}.png",
            mime="image/png",
        )
        if analisis.tabla is not None:
            with st.expander("Resultados por parcela"):
                st.dataframe(analisis.tabla, hide_index=True)

with tab_serie:
    if analisis is None or not analisis.series:
        st.info("Las series temporales se generan con la pila de adquisiciones simuladas; "
                "con archivos reales se analiza un par de fechas.")
    else:
        for serie in analisis.series:
            seccion(serie.titulo)
            st.altair_chart(grafico_serie(serie, marcas), width="stretch", theme=None)
            with st.expander("Ver tabla"):
                tabla = serie.datos.pivot_table(index="fecha", columns="serie", values="valor").round(3)  # una columna por serie
                st.dataframe(tabla)
                st.download_button("Descargar CSV", tabla.to_csv().encode("utf-8"),
                                   file_name=f"serie_{tipo}_{sitio['id']}.csv", mime="text/csv",
                                   key=f"csv_{serie.titulo}")
        st.caption(f"Cada punto es una adquisición NISAR; el ciclo de repetición es de {nisar.CICLO_DIAS} días.")

# ---------------------------------------------------------------------------
# Pestaña Estación y temporada: astronomía, climatología y estado hídrico del modelo
# ---------------------------------------------------------------------------

with tab_estacion:
    st.markdown(
        "En Ecuador el año no se divide en cuatro estaciones térmicas: lo que cambia es la **lluvia**, con "
        "calendarios distintos en la Costa, la Sierra, la Amazonía y Galápagos. Aquí se calcula para el lugar "
        "del modelo la **estación astronómica** (posición del Sol) y la **temporada climática** (lluviosa, de "
        "transición o seca) de cualquier fecha, y cómo ese ciclo modifica la señal de radar simulada."
    )
    fecha_consulta = st.date_input("Fecha de consulta", value=hoy, key="estacion_fecha", format="DD/MM/YYYY")
    info_est = estaciones.resumen(float(sitio["lat"]), float(sitio["lon"]), fecha_consulta)
    if info_est is None:
        st.warning("No hay climatología ni región natural para este punto (fuera de Ecuador).")
    else:
        astro, temp, clim = info_est["astronomia"], info_est["temporada"], info_est["climatologia"]
        tarjetas([
            ("Región natural", info_est["region"], f"Provincia de {info_est['provincia']}"),
            ("Estación astronómica", astro["estacion"].capitalize(),
             f"Hemisferio {astro['hemisferio']} · δ = {astro['declinacion_deg']:+.1f}°".replace(".", ",")),
            ("Temporada climática", temp["temporada"], f"En el habla local: {temp['nombre_local']}"),
            ("Lluvia típica del mes", f"{temp['prec_mes_mm']:.0f} mm",
             f"Media mensual {temp['prec_media_mm']:.0f} mm · ET₀ {temp['et0_mes_mm']:.0f} mm"),
            ("Humedad del suelo", f"{100 * info_est['humedad_suelo']:.0f} %", "Del agua útil (balance hídrico)"),
        ])  # estado de la fecha consultada
        st.markdown("<div style='height: 0.6rem'></div>", unsafe_allow_html=True)
        cenit = " y ".join(f"{f:%d/%m}" for f in astro["pasos_cenitales"]) or "—"
        tarjetas([
            ("Sol al mediodía", f"{astro['elevacion_mediodia_deg']:.1f}°".replace(".", ","), "Elevación sobre el horizonte"),
            ("Duración del día", horas_texto(astro["duracion_dia_h"]), "Casi constante cerca del ecuador"),
            ("Sol en el cenit", cenit, "Días en que la declinación iguala la latitud"),
            ("Próximo hito", astro["proximo_hito"].capitalize(), f"≈ {astro['fecha_proximo_hito']:%d/%m/%Y} (±1 día)"),
        ])  # posición del Sol
        seccion("Climatología mensual NASA POWER (2001–2025) en el lugar")
        tabla_clima = estaciones.tabla_mensual(clim)
        st.altair_chart(grafico_climatologia(tabla_clima, fecha_consulta.month), width="stretch", theme=None)
        st.caption(
            f"Régimen {temp['regimen']}. Meses lluviosos: {', '.join(temp['meses_lluviosos']) or '—'}. "
            f"Meses secos (< 60 mm): {', '.join(temp['meses_secos']) or 'ninguno'}. Interpolación {clim.metodo} "
            f"en la malla MERRA-2 de 0,5° × 0,625° (elevación media de la celda: {clim.elev_malla_m:.0f} m). "
            "El aro amarillo marca el mes consultado."
        )
        with st.expander("Ver tabla mensual"):
            st.dataframe(tabla_clima.drop(columns=["mes_num"]), hide_index=True,
                         column_config={"mes": "Mes", "precipitacion_mm": "Precipitación (mm)", "et0_mm": "ET₀ (mm)",
                                        "temperatura_c": "Temperatura (°C)", "temporada": "Temporada"})

        seccion(f"Cómo entra la temporada en el modelo de {tipo_info.nombre.lower()}")
        st.markdown(EFECTO_ESTACIONAL[tipo])
        forz = escena.info.get("forzamiento") if escena is not None else None  # forzamiento usado en la simulación
        if forz is not None:
            serie_forz = nisar.Serie("Estado hídrico del modelo", "%",
                                     estaciones.serie_forzamiento(forz, escena.fechas[0], escena.fechas[-1]))
            seccion("Estado hídrico que usa el modelo en la ventana simulada")
            st.altair_chart(grafico_serie(serie_forz, marcas), width="stretch", theme=None)
            st.caption("Humedad del suelo (% del agua útil): cubeta de Thornthwaite–Mather con 150 mm de agua útil "
                       "y ET₀ de Hargreaves–Samani. Agua en el humedal (% de su máximo anual): embalse lineal "
                       "(τ = 30 días) alimentado por el excedente del suelo.")
        elif fuente == FUENTE_SIM:
            st.info("La estacionalidad climática está desactivada en la barra lateral: el modelo usa la fase fija "
                    "de cada sitio.")
        with st.expander("Método, ecuaciones y limitaciones"):
            st.markdown("**Estación astronómica.** Declinación solar de Spencer (1971) y radiación extraterrestre "
                        "de FAO-56 (Allen et al., 1998):")
            st.latex(r"R_a = \frac{24\cdot 60}{\pi} G_{sc}\, d_r\left[\omega_s \sin\varphi\sin\delta + "
                     r"\cos\varphi\cos\delta\sin\omega_s\right],\qquad \omega_s = \arccos(-\tan\varphi\tan\delta)")
            st.markdown("**Evapotranspiración de referencia** (Hargreaves y Samani, 1985):")
            st.latex(r"ET_0 = 0{,}0023\,(\bar T + 17{,}8)\,\sqrt{\Delta T}\;0{,}408\,R_a")
            st.markdown("**Balance hídrico diario del suelo** (Thornthwaite y Mather, 1955) y humedal como "
                        "embalse lineal:")
            st.latex(r"W_{t+1} = \min\!\left(W_{\max},\ \max\!\left(0,\ W_t + P_t - ET_0\,\frac{W_t}{W_{\max}}\right)"
                     r"\right),\qquad \frac{dS}{dt} = Q - \frac{S}{\tau}")
            st.markdown("**Efecto en el radar.** La humedad volumétrica cambia la constante dieléctrica del suelo:")
            st.latex(r"\Delta\sigma^0_{suelo}\,[\mathrm{dB}] = \kappa\cdot 100\,\Delta\theta,\qquad "
                     r"\kappa = 0{,}25\ \mathrm{dB}/\%,\quad \Delta\theta = 0{,}15\,(s - \bar s)")
            st.markdown(
                "**Temporada.** Un mes es *seco* si llueve menos de 60 mm (criterio tropical de Köppen–Geiger), "
                "*lluvioso* si supera la media mensual y de *transición* en otro caso.\n\n"
                "**Limitaciones.** La malla de 0,5° no resuelve los valles interandinos ni los gradientes de las "
                "estribaciones; es una climatología (no el año real) y no incluye El Niño/La Niña; Hargreaves "
                "tiende a sobrestimar ET₀ en la Costa húmeda. La región natural es la de la provincia (división "
                "administrativa): por ejemplo, el Antisana pertenece a Napo (Amazonía) aunque es alta montaña."
            )
            st.caption("Datos: NASA POWER (MERRA-2/CERES), API v2.10, climatología 2001–2025; límites provinciales "
                       "geoBoundaries (CC0). Se regeneran con «python scripts/preparar_datos_ecuador.py».")

with tab_catalogo:
    st.markdown(
        "Busca productos **reales** de NISAR que cubren este lugar en el archivo de ASF DAAC. "
        "La búsqueda es pública; para descargar los HDF5 necesitas una cuenta gratuita de NASA Earthdata."
    )
    c1, c2, c3, c4 = st.columns([1, 1, 1, 1])
    producto = c1.selectbox("Producto", nisar.PRODUCTOS_ASF, index=nisar.PRODUCTOS_ASF.index(tipo_info.producto))
    inicio = c2.date_input("Desde", value=hoy - timedelta(days=120), max_value=hoy)  # últimos 4 meses por defecto
    fin = c3.date_input("Hasta", value=hoy, max_value=hoy)
    maximo = int(c4.number_input("Máx. resultados", min_value=10, max_value=500, value=100, step=10))
    if st.button("Buscar productos NISAR en ASF", type="primary"):
        try:
            resultado = buscar_asf(float(sitio["lat"]), float(sitio["lon"]), producto, inicio, fin, maximo)
            st.session_state.setdefault("asf", {})[clave_lugar] = resultado  # se guarda por lugar
            st.rerun()  # el mapa dibuja las huellas
        except Exception as exc:
            st.error(f"La consulta a ASF falló: {exc}")
    if huellas is not None:
        if huellas.empty:
            st.info("No hay productos para este lugar y periodo. Prueba otro producto o amplía las fechas.")
        else:
            claves = huellas.drop_duplicates(["track", "direccion"])  # combinaciones de órbita distintas
            revisitas = []
            for _, g in huellas.groupby(["track", "direccion"]):
                dias = g["fecha"].dt.normalize().drop_duplicates().sort_values().diff().dt.days.dropna()
                revisitas.extend(dias.tolist())  # días entre pasos del mismo track
            tarjetas([
                ("Productos encontrados", str(len(huellas)), f"{huellas['producto'].iloc[0]} · ASF DAAC"),
                ("Primera / última", f"{huellas['fecha'].min():%d/%m/%y} – {huellas['fecha'].max():%d/%m/%y}", ""),
                ("Tracks distintos", str(len(claves)), "Combinaciones track + dirección"),
                ("Revisita mediana", f"{np.median(revisitas):.0f} días" if revisitas else "—",
                 "Mismo track; NISAR repite cada 12 días"),
            ])
            seccion("Adquisiciones en el tiempo")
            linea_tiempo = alt.Chart(huellas).mark_point(filled=True, size=80, stroke=SUPERFICIE, strokeWidth=2).encode(
                x=alt.X("fecha:T", title=None, axis=alt.Axis(format="%d %b %Y", labelAngle=0, tickCount=6)),
                y=alt.Y("direccion:N", title=None),
                color=alt.Color("direccion:N", scale=alt.Scale(domain=["Ascendente", "Descendente"], range=SERIES[:2]),
                                legend=alt.Legend(orient="top", title=None)),
                tooltip=[alt.Tooltip("fecha:T", title="Fecha", format="%d %b %Y %H:%M"),
                         alt.Tooltip("track:N", title="Track"), alt.Tooltip("frame:N", title="Frame"),
                         alt.Tooltip("madurez:N", title="Madurez"), alt.Tooltip("escena:N", title="Escena")],
            ).properties(height=130)  # un punto por adquisición
            st.altair_chart(estilo(linea_tiempo), width="stretch", theme=None)
            columnas_tabla = ["miniatura", "fecha", "fecha_secundaria", "direccion", "track", "frame",
                              "polarizaciones", "madurez", "tamano_gb", "url"]
            st.dataframe(
                huellas[columnas_tabla],
                hide_index=True,
                column_config={
                    "miniatura": st.column_config.ImageColumn("Vista previa"),
                    "fecha": st.column_config.DatetimeColumn("Fecha", format="DD/MM/YYYY HH:mm"),
                    "fecha_secundaria": st.column_config.DatetimeColumn("Fecha secundaria", format="DD/MM/YYYY"),
                    "direccion": "Dirección",
                    "polarizaciones": "Polarizaciones",
                    "madurez": "Madurez",
                    "tamano_gb": st.column_config.NumberColumn("Tamaño (GB)", format="%.2f"),
                    "url": st.column_config.LinkColumn("Descarga", display_text="HDF5 ↗"),
                },
            )
    st.markdown(
        """
        **Analizar archivos reales en esta app**

        1. Descarga dos productos GCOV del mismo *track* y *frame* (o un GUNW) con tu cuenta de Earthdata.
        2. Guárdalos en la carpeta `data/nisar/` del proyecto (conserva el nombre original `NISAR_L2_…h5`).
        3. En la barra lateral elige **«Productos NISAR reales (HDF5)»**: la app usa los mismos algoritmos
           de detección que en la simulación.
        """
    )

with tab_explorador:
    # Detector de cambios: del fenómeno a los modelos y productos compatibles
    st.markdown("### Detector de cambios")
    st.markdown("Elige el fenómeno que quieres investigar: la app indica qué modelos y productos NISAR son "
                "compatibles con él.")
    col_fenomeno, col_info = st.columns(2)
    fenomeno = col_fenomeno.selectbox("Tipo de cambio a investigar", list(FENOMENOS), key="explorador_fenomeno")
    modelos_fenomeno, productos_fenomeno, descripcion_fenomeno = FENOMENOS[fenomeno]
    col_info.info(descripcion_fenomeno)
    if tipo in modelos_fenomeno:  # el modelo activo ya responde a este fenómeno
        st.success(f"El modelo activo («{tipo_info.nombre}») corresponde a este fenómeno: sus resultados están en "
                   "las pestañas «Mapa», «Antes / después» y «Serie temporal».")
    elif modelos_fenomeno:
        nombres_modelos = ", ".join(f"«{nisar.TIPOS[m].nombre}»" for m in modelos_fenomeno)
        st.markdown(f"Modelos disponibles: {nombres_modelos}. Elígelos en **Tipo de cambio** en la barra lateral.")
    else:
        st.warning("Aún no hay un modelo de detección para este fenómeno en la app; puedes consultar abajo los "
                   "productos NISAR que cubren tu área de estudio.")

    # Explorador geográfico: área de estudio dentro de Ecuador y observaciones reales en ASF
    st.markdown("### Explorador geográfico")
    st.markdown(
        f"Define un área de estudio en Ecuador y consulta en ASF DAAC las observaciones NISAR reales "
        f"({' y '.join(productos_fenomeno)}) que la cubren en el intervalo elegido."
    )
    area_nombre, area_geom = None, None  # nombre y geometría shapely del área
    with st.expander("Configuración del área de estudio", expanded=True):
        modo_area = st.radio("Área de estudio", ["Lugar del modelo", "Buscar un lugar", "Archivo GeoJSON"],
                             horizontal=True, key="explorador_modo_area")
        if modo_area == "Lugar del modelo":
            area_nombre = sitio["sitio"]
            area_geom = Point(float(sitio["lon"]), float(sitio["lat"]))  # consulta puntual
        elif modo_area == "Buscar un lugar":
            consulta = st.text_input("Buscar lugar", value="Ecuador", key="explorador_consulta",
                                     help="Ciudad, provincia, cuenca, bosque… dentro de Ecuador (OpenStreetMap).")
            if consulta.strip():
                try:
                    encontrado = geocodificar(consulta.strip())
                except Exception as exc:
                    st.error(f"La búsqueda del lugar falló: {exc}")
                else:
                    if encontrado is None:
                        st.warning("No se encontró ese lugar en Ecuador; prueba con otro nombre.")
                    else:
                        area_nombre, area_geom = encontrado["nombre"], shape(encontrado["geojson"])
        else:
            archivo_area = st.file_uploader("Cargar área GeoJSON", type=["geojson", "json"], key="explorador_geojson")
            if archivo_area is not None:
                try:
                    area_nombre, area_geom = archivo_area.name, geometria_geojson(json.load(archivo_area))
                except Exception as exc:
                    st.error(f"El GeoJSON no es válido: {exc}")
        if area_geom is not None and area_geom.area > 0:  # recorta el área al territorio ecuatoriano
            area_geom = area_geom.intersection(estaciones.contorno_ecuador())
            if area_geom.is_empty:
                st.error("El área no toca el territorio de Ecuador.")
                area_geom = None
        elif area_geom is not None and not estaciones.en_ecuador(area_geom.y, area_geom.x):
            st.error("El punto está fuera de Ecuador.")
            area_geom = None
        if area_geom is not None and not area_geom.is_empty:
            centro = area_geom.centroid
            st.caption(f"Área: {area_nombre} · centro {coordenadas(centro.y, centro.x)}")

        col_desde, col_hasta = st.columns(2)
        fecha_inicial = col_desde.date_input("Fecha inicial", value=hoy - timedelta(days=120),
                                             max_value=hoy, key="explorador_desde")
        fecha_final = col_hasta.date_input("Fecha final", value=hoy, max_value=hoy, key="explorador_hasta")
        consultar = st.button("Consultar observaciones disponibles", type="primary", key="explorador_consultar",
                              disabled=area_geom is None or area_geom.is_empty)

    clave_explorador = (area_nombre, area_geom.wkt if area_geom is not None else None, fecha_inicial,
                        fecha_final, productos_fenomeno)  # los resultados guardados valen solo para esta consulta
    if consultar:
        if fecha_final < fecha_inicial:
            st.error("La fecha final es anterior a la inicial.")
        else:
            centro = area_geom.centroid
            try:
                encontrados = pd.concat(
                    [buscar_asf(float(centro.y), float(centro.x), p, fecha_inicial, fecha_final, 500,
                                area_wkt=wkt_busqueda(area_geom)) for p in productos_fenomeno],
                    ignore_index=True,
                )  # una consulta por producto compatible
                st.session_state["explorador"] = {"clave": clave_explorador, "datos": encontrados}
            except Exception as exc:
                st.error(f"La consulta a ASF falló: {exc}")

    consulta_guardada = st.session_state.get("explorador")
    if consulta_guardada and consulta_guardada["clave"] == clave_explorador:
        productos_area, cobertura = cobertura_area(consulta_guardada["datos"], area_geom)
        if productos_area.empty:
            st.info("ASF no tiene productos NISAR de este tipo para el área y el intervalo elegidos. "
                    "Prueba con fechas más recientes o un intervalo más amplio.")
        else:
            por_producto = productos_area["producto"].value_counts()
            tarjetas([
                ("Productos encontrados", str(len(productos_area)),
                 " · ".join(f"{p}: {n}" for p, n in por_producto.items())),
                ("Fechas de adquisición", str(productos_area["fecha"].dt.normalize().nunique()),
                 f"{productos_area['fecha'].min():%d/%m/%y} – {productos_area['fecha'].max():%d/%m/%y}"),
                ("Tracks distintos", str(len(productos_area.drop_duplicates(["track", "direccion"]))),
                 "Combinaciones track + dirección"),
                ("Cobertura del área", f"{cobertura:.0%}".replace(".", ",") if cobertura is not None else "—",
                 "Unión de huellas ∩ área (aprox.)" if cobertura is not None else "Consulta en un punto"),
            ])
            if any(len(consulta_guardada["datos"][consulta_guardada["datos"]["producto"] == p]) >= 500
                   for p in productos_fenomeno):
                st.caption("Se alcanzó el máximo de 500 resultados por producto: acorta el intervalo para ver todos.")
            st.dataframe(
                productos_area[["fecha", "producto", "direccion", "track", "frame", "polarizaciones", "madurez",
                                "url"]],
                hide_index=True,
                column_config={
                    "fecha": st.column_config.DatetimeColumn("Fecha", format="DD/MM/YYYY HH:mm"),
                    "producto": "Producto",
                    "direccion": "Dirección",
                    "polarizaciones": "Polarizaciones",
                    "madurez": "Madurez",
                    "url": st.column_config.LinkColumn("Descarga", display_text="HDF5 ↗"),
                },
            )
        st.caption("ASF DAAC distribuye los productos NISAR en banda L; los de banda S se distribuyen a través "
                   "de ISRO.")

    # Polarización, bandas y frecuencias (referencia)
    st.markdown("### Polarización, bandas y frecuencias")
    st.markdown("Referencia de las bandas y polarizaciones presentes en los productos NISAR.")
    col_pol, col_banda = st.columns(2)
    polarizacion = col_pol.selectbox(
        "Polarización", ["HH", "HV", "VH", "VV"], key="explorador_polarizacion",
        help="Canales polarimétricos disponibles en los productos NISAR. HH y VV son copolarizadas; HV y VH, "
             "cruzadas.",
    )
    banda = col_banda.selectbox(
        "Banda de frecuencia", ["Banda L (≈ 24 cm)", "Banda S (≈ 9,4 cm)"], key="explorador_banda",
        help="Las dos bandas de NISAR interactúan con la superficie de forma distinta por su longitud de onda.",
    )
    st.markdown(
        "**Banda L (≈ 24 cm):** penetra mejor la vegetación densa y es sensible a la humedad del suelo y a las "
        "deformaciones a gran escala. Ideal para humedales, bosques y deformación del terreno.\n\n"
        "**Banda S (≈ 9,4 cm):** mayor sensibilidad a estructuras vegetales finas (ramas, hojas), al agua y al "
        "suelo desnudo. Ideal para deforestación, agricultura, hielo marino y cambios costeros.\n\n"
        "**Canales copolarizados (HH/VV):** responden sobre todo a superficies y a dispersores con simetría "
        "vertical u horizontal.\n\n"
        "**Canales cruzados (HV/VH):** más sensibles a la estructura de la vegetación y a superficies rugosas."
    )
    if banda.startswith("Banda L"):
        frecuencia_ghz, lambda_cm = nisar.FRECUENCIA_L_HZ / 1e9, nisar.LAMBDA_L_M * 100  # λ = c / f
    else:
        frecuencia_ghz, lambda_cm = nisar.FRECUENCIA_S_HZ / 1e9, nisar.LAMBDA_S_M * 100
    valores_banda = f"{frecuencia_ghz:.3f} GHz · λ = {lambda_cm:.1f} cm".replace(".", ",")
    st.caption(
        f"{banda.split(' (')[0]}: {valores_banda} · polarización {polarizacion}. Selección de referencia: los "
        "análisis de esta app usan la banda L (HH y HV en GCOV, fase en GUNW)."
    )

with tab_fisica:
    seccion("La misión")
    st.dataframe(pd.DataFrame({"Característica": list(nisar.MISION), "Valor": list(nisar.MISION.values())}),
                 hide_index=True)
    st.markdown(
        "**¿Por qué banda L?** Con una longitud de onda de ~24 cm, la señal atraviesa el dosel y las nubes, "
        "funciona de día y de noche, y mantiene la coherencia interferométrica sobre vegetación durante "
        "semanas. Eso permite medir deformaciones milimétricas y ver el agua bajo los bosques."
    )
    seccion(f"{tipo_info.nombre}: modelo y detección")
    st.markdown(tipo_info.metodo)
    if tipo == "humedales":
        st.latex(r"\sigma^0_{dB} = 10\log_{10}\sigma^0 \qquad \text{inundado} \iff "
                 r"\sigma^0_{HH} < -16 \;\lor\; (\sigma^0_{HH} > -5{,}5 \,\land\, \sigma^0_{HH}-\sigma^0_{HV} > 6)")
        st.markdown("El agua abierta es un espejo: refleja el pulso lejos del radar. Bajo un bosque inundado, "
                    "el pulso rebota agua → tronco → radar (doble rebote) y HH se dispara. El viento puede "
                    "rugosear el agua y subir su retrodispersión unos dB: por eso se usa un umbral conservador.")
    elif tipo == "incendios":
        st.latex(r"\sigma^0 = A\cos\theta\,(1-\tau^2) + \sigma^0_{\text{suelo}}\,\tau^2,\qquad "
                 r"\tau^2 = e^{-2bB/\cos\theta}")
        st.latex(r"LR = 10\log_{10}\frac{\langle\sigma^0_{HV}\rangle_{\text{después}}}"
                 r"{\langle\sigma^0_{HV}\rangle_{\text{antes}}}"
                 r"\qquad \text{quemado} \iff LR < -2{,}5\ \mathrm{dB}")
        st.latex(r"\mathrm{CO_2} \approx \Delta B \cdot 0{,}47 \cdot \tfrac{44}{12}")
        st.markdown("El modelo de nube de agua (Attema y Ulaby, 1978) relaciona la biomasa B con la "
                    "retrodispersión; invertido, convierte la caída de HV en biomasa perdida y emisiones. "
                    "El frente nace en el punto de ignición y crece como una elipse empujada por el viento, "
                    "g(t) = 1 − e^(−t/2 días).")
    elif tipo in ("terremotos", "subsidencia"):
        st.latex(r"\Delta\phi = -\frac{4\pi}{\lambda}\,d_{LOS} + \phi_{atm} + \phi_{ruido},\qquad "
                 r"d_{LOS} = \mathbf{u}\cdot\hat{\mathbf{e}}_{LOS},\qquad \lambda_L = 23{,}85\ \mathrm{cm}")
        st.latex(r"\sigma_\phi = \frac{\sqrt{1-\gamma^2}}{\gamma\sqrt{2L}}")
        if tipo == "terremotos":
            st.latex(r"M_w = \tfrac{2}{3}\left(\log_{10} M_0 - 9{,}1\right),\qquad M_0 = \mu\,L\,W\,s")
            st.markdown("La deformación cosísmica se calcula con la solución analítica de Okada (1985) para una "
                        "falla rectangular en un semiespacio elástico, validada contra el límite de dislocación "
                        "antiplana u = (s/π)·arctan(D/x). El desplazamiento aparece en el minuto del sismo y "
                        "sigue creciendo un 8 % por deslizamiento postsísmico. Cada franja del interferograma "
                        "equivale a λ/2 = 11,9 cm de movimiento en la línea de vista.")
        else:
            st.latex(r"d(t) = a + v\,t + A\sin 2\pi t + B\cos 2\pi t,\qquad v_{\text{vert}} = v_{LOS}/\cos\theta")
            st.markdown("Se ajusta por mínimos cuadrados la pila completa de interferogramas de 12 días; la "
                        "atmósfera, aleatoria entre fechas, se promedia y deja un error de ~1–2 cm/año.")
    elif tipo == "glaciares":
        st.latex(r"\mathbf{v} = \frac{\Delta\mathbf{r}}{\Delta t},\qquad "
                 r"u(y) = u_b + (u_c-u_b)\left(1-\left|\tfrac{y}{W}\right|^{n+1}\right),\ n = 3")
        st.markdown("El seguimiento de desplazamientos correlaciona parches de imagen entre dos fechas "
                    "(producto GOFF). La ley de flujo de Glen (n = 3) da el perfil transversal; el frente se "
                    "localiza donde la velocidad cae por debajo del umbral de hielo en la línea de flujo central.")
    elif tipo == "agricultura":
        st.latex(r"\sigma^0_{HV}(t) = A\cos\theta\,(1-\tau^2(t)) + \sigma^0_{\text{suelo}}(t)\,\tau^2(t),\qquad "
                 r"B(t) = \frac{B_{max}}{1+e^{-(t-t_{1/2})/k}}")
        st.markdown("Cada parcela sigue su calendario de siembra y cosecha. La cosecha se detecta como la mayor "
                    "caída de HV (> 3 dB) que lleva la parcela al nivel de suelo desnudo; si cae por debajo de "
                    "−32 dB se interpreta como inundación para trasplantar arroz.")
    st.markdown(f"**Estacionalidad.** {EFECTO_ESTACIONAL[tipo]} Detalles en la pestaña «🌦️ Estación y temporada».")
    seccion("Referencias")
    st.markdown(
        "- NISAR Science Users' Handbook, NASA-JPL / ISRO.\n"
        "- ASF DAAC, documentación de productos NISAR: nisar-docs.asf.alaska.edu\n"
        "- Okada, Y. (1985). Surface deformation due to shear and tensile faults in a half-space. *BSSA* 75(4).\n"
        "- Attema, E. y Ulaby, F. (1978). Vegetation modeled as a water cloud. *Radio Science* 13(2).\n"
        "- Hanssen, R. (2001). *Radar Interferometry: Data Interpretation and Error Analysis*. Kluwer.\n"
        "- Glen, J. W. (1955). The creep of polycrystalline ice. *Proc. R. Soc. A* 228.\n"
        "- Allen, R. G. et al. (1998). *Crop evapotranspiration* (FAO Irrigation and Drainage Paper 56).\n"
        "- Hargreaves, G. H. y Samani, Z. A. (1985). Reference crop evapotranspiration from temperature. "
        "*Appl. Eng. Agric.* 1(2).\n"
        "- NASA POWER Project: power.larc.nasa.gov (climatología 2001–2025)."
    )
    st.caption("El desarrollo matemático completo está en docs/modelo_nisar_ecuador.pdf.")
    if fuente == FUENTE_SIM:
        st.caption("Modo simulación: las escenas reproducen la física y los errores de los productos NISAR "
                   "(speckle, atmósfera, decorrelación) sobre lugares reales; no son observaciones reales. "
                   "Usa el catálogo y la carga de HDF5 para trabajar con datos de la misión.")

with tab_dios:
    mostrar_modo_dios(sitio)  # simulador de desastres (fragmento: sus clics no recargan el resto de la app)

with tab_validacion:
    mostrar_particion()  # partición espacial reproducible (clima.py)

with tab_fundamentos:
    renderizar_fundamentos_cientificos()
