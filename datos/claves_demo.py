"""Plantillas del texto que escribe `modelo/` (notas, tablas, series), reconocidas en `datos/`.

El modelo escribe esas frases en español con las cifras ya formateadas. Aquí se registran como plantillas con
`{x}` en cada cifra (coma decimal), `{fecha…}` (dd/mm/aaaa) o `{…_punto}` (punto decimal): `datos.claves.buscar_texto`
las reconoce y la API envía clave y valores en campos paralelos (`TextoClave`). Lo que no encaja queda en español.

No se importa `modelo/` (pesado y con ciclos): los nombres que vienen de allí (coberturas, cultivos…) se copian y
`tests/datos/test_claves_demo.py` comprueba que siguen coincidiendo.
"""
from __future__ import annotations

from datos.claves import slug

PLANTILLAS: dict[str, str] = {}

# La espera hasta la próxima pasada la reescribe `datos/simulador.py`; las plantillas copian el texto ya reescrito.
_PASADA = "en una pasada posterior (ver «Espera hasta la primera imagen»)"

# --- notas del simulador (`api.sim.nota.<herramienta>.<tema>`) ----------------------------------------------------
PLANTILLAS.update({
    "api.sim.nota.incendio.paso": "Cada paso del autómata equivale a {min} min: el fuego avanza como máximo una celda ({m} m) por paso (supuesto de 0.25 m/s ≈ 0,9 km/h).",
    "api.sim.nota.incendio.residentes": "Residentes dentro del perímetro: {n}. No hay una función de mortalidad publicada para incendios forestales en Ecuador: se informa la exposición.",
    "api.sim.nota.incendio.residentes_menos_de_uno": "Residentes dentro del perímetro: < 1. No hay una función de mortalidad publicada para incendios forestales en Ecuador: se informa la exposición.",
    "api.sim.nota.incendio.cobertura": "El páramo y el bosque seco arden con facilidad; el bosque húmedo apenas propaga si el combustible supera su humedad de extinción.",
    "api.sim.nota.incendio.radar": f"NISAR: la próxima pasada llega {_PASADA}; quemado ⟺ LR < −2,5 dB en HV.",
    "api.sim.nota.tormenta.lluvia_humedo": "Lluvia de {mm} mm en {h} h con radio de {km} km. Humedad antecedente del suelo: {pct} % del agua útil (CN húmedo (AMC III)).",
    "api.sim.nota.tormenta.lluvia_normal": "Lluvia de {mm} mm en {h} h con radio de {km} km. Humedad antecedente del suelo: {pct} % del agua útil (CN normal (AMC II)).",
    "api.sim.nota.tormenta.lluvia_seco": "Lluvia de {mm} mm en {h} h con radio de {km} km. Humedad antecedente del suelo: {pct} % del agua útil (CN seco (AMC I)).",
    "api.sim.nota.tormenta.drenaje": "La red de drenaje es la del DEM a la resolución del mundo: los cauces estrechos se ensanchan a una celda.",
    "api.sim.nota.tormenta.deslizamientos": "Los deslizamientos se muestran desde el final de la lluvia; no se estima su mortalidad.",
    "api.sim.nota.inundacion.marejada": "Nivel del mar elevado hasta {m} m durante {h} h (pulso senoidal).",
    "api.sim.nota.inundacion.hidrograma": "Hidrograma triangular con pico de {q} m³/s a las {h} h; volumen total {v} hm³.",
    "api.sim.nota.inundacion.mortalidad": "Mortalidad de la «zona restante» de Jonkman (sin rotura de diques ni subida rápida): es una cota inferior en crecidas súbitas.",
    "api.sim.nota.agua.radar": "NISAR (GCOV): cambio de HH entre fechas (< −5 dB agua abierta, > +3 dB doble rebote) y clasificación de inundación de la app. "
                               f"Se compara la extensión máxima simulada; en la pasada real el agua puede haber bajado ({_PASADA}).",
    "api.sim.nota.terremoto.tsunami": "Tsunami: el levantamiento del fondo marino (hasta {m} m) se propaga con aguas someras; la batimetría se limita a 1 500 m para acelerar el cálculo. La mortalidad de Jonkman (zona restante) subestima la de un tsunami.",
    "api.sim.nota.terremoto.hipocentro_inversa_subduccion": "Hipocentro a {prof} km; mecanismo inversa (subducción) (rake {rake}°), rumbo {rumbo}°, buzamiento {buz}°. Levantamiento máximo {sube} cm, hundimiento {baja} cm.",
    "api.sim.nota.terremoto.hipocentro_rumbo_dextral": "Hipocentro a {prof} km; mecanismo rumbo dextral (rake {rake}°), rumbo {rumbo}°, buzamiento {buz}°. Levantamiento máximo {sube} cm, hundimiento {baja} cm.",
    "api.sim.nota.terremoto.hipocentro_rumbo_sinistral": "Hipocentro a {prof} km; mecanismo rumbo sinistral (rake {rake}°), rumbo {rumbo}°, buzamiento {buz}°. Levantamiento máximo {sube} cm, hundimiento {baja} cm.",
    "api.sim.nota.terremoto.hipocentro_normal": "Hipocentro a {prof} km; mecanismo normal (rake {rake}°), rumbo {rumbo}°, buzamiento {buz}°. Levantamiento máximo {sube} cm, hundimiento {baja} cm.",
    "api.sim.nota.terremoto.ipe": "La IPE de Allen et al. (2012) es de corteza activa; en sismos de subducción grandes puede infravalorar la intensidad lejana. No incluye amplificación por suelos blandos.",
    "api.sim.nota.terremoto.pager": "Los parámetros PAGER de Ecuador se calibraron con sismos de 1973–2007 (antes de Pedernales 2016): prueba Perú o Colombia para ver la sensibilidad a la vulnerabilidad.",
    "api.sim.nota.terremoto.radar": "NISAR (GUNW): interferograma de 12 días que abarca el sismo; la atmósfera añade ~1 cm de ruido turbulento. El mar no tiene coherencia.",
    "api.sim.nota.erupcion.tefra": "Cráter a {zv} m. Volumen de tefra {v} hm³ en {h} h; queda dentro del mundo el {pct} % de la masa.",
    "api.sim.nota.erupcion.supuestos": "Las velocidades del lahar (8 m/s) y del flujo piroclástico (40 m/s), la altura de colapso y las letalidades son supuestos del juego; las áreas sí provienen de los modelos publicados.",
    "api.sim.nota.erupcion.alerta": "Ecuador cuenta con sistemas de alerta temprana de lahares (p. ej. Cotopaxi): sube la evacuación para ver su efecto.",
    "api.sim.nota.erupcion.radar": f"NISAR: la banda L ve a través de la nube de ceniza; los depósitos de lahar y flujo piroclástico destruyen la coherencia interferométrica ({_PASADA}).",
})

# --- celdas de las tablas del simulador (`api.sim.celda.<slug>`) ---------------------------------------------------
COBERTURAS_ES = ("Agua", "Glaciar y nieve", "Páramo", "Bosque andino", "Bosque tropical húmedo",
                 "Bosque seco y matorral", "Cultivos y pastos", "Zona urbana")
PERCEPCIONES_ES = ("Ligera", "Moderada", "Fuerte", "Muy fuerte", "Severa", "Violenta", "Extrema")
PELIGROS_ES = ("Flujo piroclástico", "Lahar", "Ceniza ≥ 1 cm", "Techos colapsados (viviendas)")
for _t in (*COBERTURAS_ES, *PERCEPCIONES_ES, *PELIGROS_ES):
    PLANTILLAS[f"api.sim.celda.{slug(_t)}"] = _t
PLANTILLAS.update({
    "api.sim.celda.modelo_cono": "Cono de energía H/L = {hl_punto}, Hc = {hc} m",
    "api.sim.celda.modelo_laharz": "LAHARZ, V = {v_punto} hm³ por cauce",
    "api.sim.celda.modelo_ceniza": "Advección–difusión (3 clases)",
    "api.sim.celda.modelo_techos": "Carga húmeda vs. techos débiles (Spence et al., 2005)",
})

# --- Observatorio ----------------------------------------------------------------------------------------------
# Nota 1 de Pedernales: el vector de la línea de vista depende de la latitud y de la incidencia. Las cifras llevan
# signo (`{x:+.2f}`): el sufijo `_signo_punto` pide al cliente que lo escriba.
PLANTILLAS.update({
    "api.plantilla.nota.pedernales_los": "Vector LOS (este, norte, arriba) = ({le_signo_punto}, {ln_signo_punto}, {lu_signo_punto}). NISAR mira a la izquierda: el movimiento norte-sur casi no se proyecta en la línea de vista, por eso las fallas de rumbo N-S se complementan con desplazamientos de píxel (GOFF).",
})

# Títulos y columnas de la tabla de resultados por parcela.
PLANTILLAS.update({
    "api.obs.titulo_tabla.resultados_por_parcela": "Resultados por parcela",
    "api.obs.titulo_tabla.resultados": "Resultados",
})
COLUMNAS_PARCELA_ES = ("Parcela", "Rotación", "Δσ⁰ HV (dB)", "Cambio detectado", "Cosecha estimada", "Cosecha real",
                       "Cultivo cosechado")
for _t in COLUMNAS_PARCELA_ES:
    PLANTILLAS[f"api.obs.columna.{slug(_t)}"] = _t

# Valores de celda: rotaciones y cultivos de `modelo/nisar.py` (ROTACIONES_*), valores sin dato y números con unidad.
ROTACIONES_ES = ("Trigo → Arroz", "Trigo → Maíz", "Frutales", "Soja", "Maíz", "Trigo → Soja de segunda",
                 "Arroz → Arroz", "Banano")
CULTIVOS_ES = ("Trigo", "Arroz", "Maíz", "Frutales", "Soja", "Banano")
for _t in (*ROTACIONES_ES, *CULTIVOS_ES, "Sin cambio detectado", "Sin dato (enmascarado)"):
    PLANTILLAS[f"api.obs.valor.{slug(_t)}"] = _t
PLANTILLAS.update({
    "api.obs.valor.numero_db": "{v} dB",
    "api.obs.valor.numero_cm": "{v} cm",
    "api.obs.valor.numero_cm_ano": "{v} cm/año",
    "api.obs.valor.numero_m_dia": "{v} m/día",
    "api.obs.valor.numero_rad": "{v} rad",
    "api.obs.valor.numero_gamma": "{v} γ",
    "api.obs.valor.numero_km2": "{v} km²",
})

# Capas medidas (títulos de los paneles del análisis) y medidas por categoría.
CAPAS_ES = ("Cambio de inundación", "Cambio de velocidad", "Cambio del frente", "Cambio por parcela",
            "Coherencia interferométrica", "Desplazamiento LOS acumulado", "Desplazamiento LOS desenrollado",
            "Error frente a la verdad sintética", "Interferograma envuelto (1 ciclo = 11,9 cm)",
            "Razón logarítmica HV (después/antes)", "Velocidad vertical", "Área quemada detectada")
for _t in CAPAS_ES:
    PLANTILLAS[f"api.obs.capa.{slug(_t)}"] = _t
PLANTILLAS.update({
    "api.obs.capa.velocidad_fecha": "Velocidad · {fecha}",
    "api.obs.capa.sigma0_hh_fecha": "σ⁰ HH · {fecha}",
    "api.obs.capa.sigma0_hv_fecha": "σ⁰ HV · {fecha}",
})
MEDIDAS_ES = ("Media", "Mínimo", "Máximo", "Cosecha / labranza", "Crecimiento del cultivo", "Hielo nuevo (avance)",
              "Hielo perdido (retroceso del frente)", "Inundación (trasplante de arroz)", "Inundación persistente",
              "Nueva inundación", "Pérdida de inundación", "Severidad alta (< −4,5 dB)",
              "Severidad moderada (−2,5 a −4,5 dB)", "Sin cambio")
for _t in MEDIDAS_ES:
    PLANTILLAS[f"api.obs.medida.{slug(_t)}"] = _t

# Métricas de un cuadrante sobre la capa del mapa (`Media · <capa>`).
for _m in ("Media", "Mínimo", "Máximo"):
    PLANTILLAS[f"api.obs.metrica.{slug(_m)}_desplazamiento_los_desenrollado.etiqueta"] = f"{_m} · Desplazamiento LOS desenrollado"
    PLANTILLAS[f"api.obs.metrica.{slug(_m)}_velocidad_fecha.etiqueta"] = f"{_m} · Velocidad · {{fecha}}"

# Nombres de las líneas de las series (`SerieTemporal.nombres_texto`).
NOMBRES_SERIE_ES = ("Detectada por el modelo (simulación)", "Verdad del modelo", "Bosque no quemado (control)",
                    "Zona quemada", "Cerca de la falla (modelo de Okada)", "Cerca de la falla (observado)",
                    "Zona estable (referencia)", "Detectado con GOFF", "Máximo hundimiento",
                    "Punto seleccionado (3×3 px)", "Media del cuadrante")
for _t in NOMBRES_SERIE_ES:
    PLANTILLAS[f"api.obs.serie_nombre.{slug(_t)}"] = _t
PLANTILLAS["api.obs.serie_nombre.frente_inicial"] = "A {km} km del frente inicial"
