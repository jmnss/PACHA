"""Registro de claves de texto de la API.

Cada texto en español que la API produce por sí misma lleva una clave estable (`api.<área>.<…>`) y una
plantilla con `{nombre}` para las cifras. El frontend traduce por clave; el español de aquí es la fuente de verdad
y es el texto que sigue viajando en el campo `mensaje`/`etiqueta`/… de cada respuesta.

Las claves derivadas por id (tipos, controles, escenarios…) no se escriben aquí: `scripts/exportar_claves_api.py`
las genera recorriendo el catálogo y las vuelca a `api/claves.json`.
"""
from __future__ import annotations

import functools
import re
import unicodedata
from datetime import date

from datos.geografia import MENSAJE_FUERA_DE_ECUADOR

REGISTRO: dict[str, str] = {
    # --- errores (prefijo api.error.) ---------------------------------------------------------
    "api.error.entrada_no_valida": "Entrada no válida. {detalle}",
    "api.error.inesperado": "Ocurrió un error inesperado en el servidor. Inténtalo de nuevo.",
    "api.error.parametro_desconocido": "Parámetro desconocido: {parametro}",
    # No encontrado: el texto lleva ya el prefijo que antepone la API.
    "api.error.escenario_desconocido": "No existe el recurso pedido: Escenario de demostración desconocido: {id}",
    "api.error.sitio_no_catalogo": "No existe el recurso pedido: El sitio {id} no está en el catálogo",
    "api.error.escenario_simulado_caducado": "No existe el recurso pedido: Escenario simulado desconocido o caducado: {id}",
    "api.error.adquisicion_desconocida": "No existe el recurso pedido: Adquisición desconocida: {id}",
    "api.error.fuera_de_ecuador": MENSAJE_FUERA_DE_ECUADOR,
    "api.error.lado_mundo": "El lado del mundo debe ser uno de: {opciones} km.",
    "api.error.sim_parametro_no_existe": "El parámetro {parametro} no existe para esta herramienta.",
    "api.error.sim_numero": "{parametro} debe ser un número.",
    "api.error.sim_rango": "{parametro} debe estar entre {minimo} y {maximo}.",
    "api.error.sim_opcion": "{parametro} debe ser una de: {opciones}.",
    "api.error.sim_interruptor": "{parametro} debe ser verdadero o falso.",
    "api.error.herramienta_no_evento": "La herramienta no existe o no es un evento: elige incendio, tormenta, inundacion, terremoto o erupcion.",
    "api.error.celda_fuera_malla": "La celda ({i}, {j}) queda fuera de la malla de {n}×{n}.",
    "api.error.ciudad_en_mar": "No se puede fundar una ciudad en el mar.",
    "api.error.ciudades_maximo": "Se admiten como máximo {maximo} ciudades fundadas.",
    "api.error.lab_no_valida": "{nombre} no válida: elige una de {opciones}.",
    "api.error.nubes_rango": "La cobertura de nubes va de {min} a {max} %.",
    "api.error.bbox_oeste_este": "bbox inválido: oeste ({oeste}) debe ser menor que este ({este})",
    "api.error.bbox_sur_norte": "bbox inválido: sur ({sur}) debe ser menor que norte ({norte})",
    "api.error.paleta_desconocida": "Paleta desconocida en el modelo: {nombre}",
    "api.error.numero_finito": "«{nombre}» debe ser un número finito.",
    "api.error.parametro_desconocido_tipo": "Parámetro desconocido para este tipo de cambio: {parametro}",
    "api.error.semilla_rango": "semilla debe ser un entero entre 0 y 2147483647.",
    "api.error.looks_rango": "looks debe estar entre 1 y 100.",
    "api.error.orbita_opcion": "orbita debe ser una de: {opciones}.",
    "api.error.estacional_booleano": "estacional debe ser verdadero o falso.",
    "api.error.punto_faltan_coordenadas": "Para colocar un punto en el mapa hacen falta lat y lon.",
    "api.error.latlon_rango": "lat debe estar entre -90 y 90, y lon entre -180 y 180.",
    "api.error.control_opcion": "«{nombre}» debe ser uno de: {opciones}.",
    "api.error.control_hora": "«{nombre}» debe estar entre 0 y 24 horas (sin incluir 24).",
    "api.error.control_rango": "«{nombre}» debe estar entre {minimo} y {maximo}.",
    "api.error.simulado_sin_parametros": "Un escenario simulado ya lleva sus parámetros; no se pueden dar otros.",
    "api.error.variable_desconocida": "variable desconocida: {variable}; disponibles: {disponibles}",
    "api.error.polarizacion_no_disponible": "polarización no disponible: {polarizacion}; disponibles: {disponibles}",
    "api.error.variable_sin_polarizacion": "La variable {variable} no tiene polarización.",
    "api.error.fecha_despues_antes": "La fecha 'después' debe ser posterior a la fecha 'antes'.",
    "api.error.medir_uno_de_dos": "Indica exactamente uno de `cuadrante` o `punto`.",
    "api.error.cuadrante_fuera": "El cuadrante {cuadrante} queda fuera de la imagen ({ny}×{nx} píxeles).",
    "api.error.punto_fuera": "El punto {punto} queda fuera de la imagen ({ny}×{nx} píxeles).",
    "api.error.fecha_sin_zona": "{nombre} debe llevar zona horaria.",
    "api.error.paso_invalido": "El paso debe ser un número entero de minutos mayor que 0.",
    "api.error.fechas_fuera_rango": "Las fechas quedan fuera del rango admitido.",
    "api.error.fin_anterior_inicio": "El fin debe ser igual o posterior al inicio.",
    "api.error.fotogramas_maximo": "Se pedirían {n} fotogramas; el máximo es {maximo}. Amplía el paso o acorta el intervalo.",
    "api.error.fotogramas_por_vez": "Pide como máximo {maximo} fotogramas por vez; esta petición pedía {n}. Amplía el paso o acorta el intervalo.",
    "api.error.impacto_sin_categorias": "Este escenario no tiene un cambio por categorías para resumir.",
    "api.error.impacto_categorias_inesperadas": "La clasificación del escenario no trae las categorías esperadas para resumir el impacto.",
    "api.error.impacto_no_disponible": "El resumen de impacto está disponible para inundaciones e incendios.",
    "api.error.pasada_despues_antes": "La pasada «después» debe ser posterior a la pasada «antes».",
    "api.error.fechas_distintas": "Elige dos fechas distintas.",
    "api.error.cuadrante_sin_area": "El cuadrante no tiene área.",
    "api.error.fecha_evento_formato": "La fecha del evento debe ser un texto con el formato AAAA-MM-DD, por ejemplo 2026-06-01.",
    "api.error.fecha_evento_rango": "La fecha del evento debe estar entre 2024-01-01 y 2030-12-31.",
    "api.error.serie_sel_formato": "«{nombre}» debe ser una lista de {n} números separados por comas.",
    "api.error.serie_sel_rango": "Indica un punto, un cuadrante o los dos, con valores entre 0 y 1.",
}

# --- laboratorio del radar (prefijo api.lab.) ------------------------------------------------------
REGISTRO.update({
    "api.lab.metrica.cambio_visto_por_el_radar.etiqueta": "Cambio visto por el radar",
    "api.lab.metrica.cambio_visto_por_el_radar.ayuda": "Parte de los píxeles que realmente cambiaron y que el radar marca como cambio. Las nubes no lo afectan.",
    "api.lab.metrica.cambio_visto_por_el_optico.etiqueta": "Cambio visto por el óptico",
    "api.lab.metrica.cambio_visto_por_el_optico.ayuda": "Lo mismo para una imagen óptica. Las nubes la tapan y, bajo el dosel, no ve el agua.",
    "api.lab.metrica.falsas_alarmas_del_radar.etiqueta": "Falsas alarmas del radar",
    "api.lab.metrica.falsas_alarmas_del_radar.ayuda": "Píxeles sin cambio que el radar marca como cambio por el moteado (speckle). El radar no es perfecto.",
    "api.lab.metrica.tapado_por_nubes.etiqueta": "Tapado por nubes",
    "api.lab.metrica.tapado_por_nubes.ayuda": "Fracción de la escena que las nubes ocultan en la imagen óptica.",
    # Leyendas de las capas de categorías (cambio radar/óptico y superficies) y nombres de superficie.
    "api.lab.leyenda.sin_cambio": "Sin cambio",
    "api.lab.leyenda.cambio_detectado": "Cambio detectado",
    "api.lab.leyenda.cambio_sin_detectar": "Cambio sin detectar",
    "api.lab.leyenda.tapado_por_nube": "Tapado por nube",
    "api.lab.leyenda.falsa_alarma": "Falsa alarma",
    "api.lab.leyenda.bosque": "Bosque",
    "api.lab.leyenda.agua": "Agua",
    "api.lab.leyenda.bosque_inundado": "Bosque inundado",
    "api.lab.leyenda.cultivo": "Cultivo",
    "api.lab.leyenda.quemado": "Quemado",
    # Cambios cuya mejor polarización se resalta.
    "api.lab.cambio.inundacion_a_cielo_abierto": "Inundación a cielo abierto",
    "api.lab.cambio.inundacion_bajo_dosel": "Inundación bajo dosel",
    "api.lab.cambio.quema_del_bosque": "Quema del bosque",
    "api.lab.aviso_banda": "Banda S: ejemplo ilustrativo de otra frecuencia; pendiente de confirmar con la documentación oficial qué bandas entrega NISAR.",
})

# --- medición (prefijo api.medicion.) --------------------------------------------------------------
REGISTRO.update({
    "api.medicion.posicion.etiqueta": "Posición",
    "api.medicion.posicion.ayuda": "Centro del píxel (fila {fila}, columna {columna})",
})

# --- resumen de impacto (prefijo api.impacto.) -----------------------------------------------------
REGISTRO.update({
    "api.impacto.titulo.inundacion": "Superficie inundada",
    "api.impacto.titulo.incendio": "Superficie quemada",
    "api.impacto.cifra.inundacion.superficie_inundada_al_final.etiqueta": "Superficie inundada al final",
    "api.impacto.cifra.inundacion.superficie_inundada_al_final.ayuda": "Hectáreas con agua en la pasada «después» (nueva inundación más la que ya estaba).",
    "api.impacto.cifra.inundacion.inundacion_nueva.etiqueta": "Inundación nueva",
    "api.impacto.cifra.inundacion.inundacion_nueva.ayuda": "Hectáreas que no tenían agua en la pasada «antes» y sí en la «después».",
    "api.impacto.cifra.inundacion.parte_de_la_escena.etiqueta": "Parte de la escena",
    "api.impacto.cifra.inundacion.parte_de_la_escena.ayuda": "Fracción del área analizada que está inundada al final.",
    "api.impacto.cifra.incendio.superficie_quemada_detectada.etiqueta": "Superficie quemada detectada",
    "api.impacto.cifra.incendio.superficie_quemada_detectada.ayuda": "Hectáreas donde la señal cruzada (HV) cayó lo bastante para marcar daño.",
    "api.impacto.cifra.incendio.severidad_alta.etiqueta": "Severidad alta",
    "api.impacto.cifra.incendio.severidad_alta.ayuda": "Hectáreas con la mayor caída de señal: la mayor pérdida de estructura del bosque.",
    "api.impacto.cifra.incendio.parte_de_la_escena.etiqueta": "Parte de la escena",
    "api.impacto.cifra.incendio.parte_de_la_escena.ayuda": "Fracción del área analizada que aparece quemada.",
    "api.impacto.lectura.inundacion": "En este escenario de demostración, el radar marca unas {ha} ha con agua al final del intervalo, el {pct} % del área analizada.",
    "api.impacto.lectura.incendio": "En este escenario de demostración, el radar marca unas {ha} ha quemadas, el {pct} % del área analizada.",
    "api.impacto.lectura.pico": "El máximo de la serie llega el {fecha} con unas {ha} ha.",
    "api.impacto.accion.inundacion.1": "Contrastar los bordes de la mancha con el aviso de la autoridad local antes de decidir cierres de vías.",
    "api.impacto.accion.inundacion.1_hipotetica": "Si esto fuera un evento real, contrastar los bordes de la mancha con el aviso de la autoridad local antes de decidir cierres de vías.",
    "api.impacto.accion.inundacion.2": "Priorizar la verificación en campo donde la superficie inundada crece más entre pasadas.",
    "api.impacto.accion.inundacion.3": "Repetir el análisis con la siguiente pasada para saber si el agua se retira o se extiende.",
    "api.impacto.accion.incendio.1": "Contrastar la cicatriz con los reportes de bomberos y con focos de calor ópticos antes de actuar.",
    "api.impacto.accion.incendio.1_hipotetica": "Si esto fuera un evento real, contrastar la cicatriz con los reportes de bomberos y con focos de calor ópticos antes de actuar.",
    "api.impacto.accion.incendio.2": "Priorizar la revisión de las zonas de severidad alta, donde la pérdida de estructura es mayor.",
    "api.impacto.accion.incendio.3": "Repetir el análisis tras las lluvias para vigilar la erosión de laderas sin cobertura.",
    "api.impacto.nota.celdas": "Superficies medidas sobre la malla de análisis (celdas de unos {metros} m).",
    "api.impacto.nota.orientativas": "Las acciones son orientativas y condicionales; no sustituyen a la autoridad competente.",
})

# --- simulador de eventos (prefijo api.sim.): lo que solo aparece al desatar un evento -------------
REGISTRO.update({
    "api.sim.titulo.incendio": "Incendio forestal",
    "api.sim.titulo.tormenta": "Tormenta extrema",
    "api.sim.titulo.inundacion": "Desborde de río",
    "api.sim.titulo.inundacion_marejada": "Marejada costera",
    "api.sim.titulo.terremoto": "Terremoto Mw {mw}",
    "api.sim.titulo.erupcion": "Erupción IEV {vei}",
    "api.sim.titulo.erupcion_volcan": "Erupción IEV {vei} del {volcan}",
    "api.sim.metrica.area_quemada.etiqueta": "Área quemada",
    "api.sim.metrica.biomasa_consumida.etiqueta": "Biomasa consumida",
    "api.sim.metrica.co2_emitido.etiqueta": "CO₂ emitido",
    "api.sim.metrica.personas_a_evacuar.etiqueta": "Personas a evacuar",
    "api.sim.metrica.humedad_del_combustible.etiqueta": "Humedad del combustible",
    "api.sim.metrica.area_inundada.etiqueta": "Área inundada",
    "api.sim.metrica.poblacion_expuesta.etiqueta": "Población expuesta",
    "api.sim.metrica.victimas_estimadas.etiqueta": "Víctimas estimadas",
    "api.sim.metrica.viviendas_destruidas_equiv.etiqueta": "Viviendas destruidas (equiv.)",
    "api.sim.metrica.perdidas_en_viviendas.etiqueta": "Pérdidas en viviendas",
    "api.sim.metrica.deslizamientos.etiqueta": "Deslizamientos",
    "api.sim.metrica.magnitud.etiqueta": "Magnitud",
    "api.sim.metrica.intensidad_maxima.etiqueta": "Intensidad máxima",
    "api.sim.metrica.poblacion_con_mmi_vi.etiqueta": "Población con MMI ≥ VI",
    "api.sim.metrica.tsunami_en_tierra.etiqueta": "Tsunami en tierra",
    "api.sim.metrica.columna_eruptiva.etiqueta": "Columna eruptiva",
    "api.sim.metrica.flujos_piroclasticos.etiqueta": "Flujos piroclásticos",
    "api.sim.metrica.lahares.etiqueta": "Lahares",
    "api.sim.metrica.ceniza_1_cm.etiqueta": "Ceniza ≥ 1 cm",
    "api.sim.metrica.victimas_sin_alerta.etiqueta": "Víctimas sin alerta",
    "api.sim.metrica.franjas_en_el_interferograma.etiqueta": "Franjas en el interferograma",
    "api.sim.metrica.desplazamiento_los_maximo.etiqueta": "Desplazamiento LOS máximo",
    "api.sim.metrica.deslizamientos_perdida_de_coherencia.etiqueta": "Deslizamientos (pérdida de coherencia)",
    # Regla 7: lo detecta el modelo de simulación, no NISAR (`sin_nisar` reescribe la etiqueta del modelo).
    "api.sim.metrica.area_quemada_deteccion_del_modelo_simulacion.etiqueta": "Área quemada · detección del modelo (simulación)",
    "api.sim.metrica.area_inundada_deteccion_del_modelo_simulacion.etiqueta": "Área inundada · detección del modelo (simulación)",
    "api.sim.metrica.flujos_y_ceniza_10_cm_deteccion_del_modelo_simulacion.etiqueta": "Flujos y ceniza > 10 cm · detección del modelo (simulación)",
    "api.sim.metrica.acierto_iou.etiqueta": "Acierto (IoU)",
    "api.sim.metrica.precision_exhaustividad.etiqueta": "Precisión · exhaustividad",
    "api.sim.capa.estado_del_fuego": "Estado del fuego",
    "api.sim.capa.calado": "Calado",
    "api.sim.capa.deslizamientos": "Deslizamientos",
    "api.sim.capa.intensidad_mmi": "Intensidad (MMI)",
    "api.sim.capa.frentes_de_onda": "Frentes de onda",
    "api.sim.capa.tsunami_calado_en_tierra_elevacion_del_mar": "Tsunami: calado en tierra / elevación del mar",
    "api.sim.capa.espesor_de_ceniza": "Espesor de ceniza",
    "api.sim.capa.calado_del_lahar": "Calado del lahar",
    "api.sim.capa.corriente_piroclastica": "Corriente piroclástica",
    # Títulos de los paneles del gemelo del radar (`modelo/desastres.py`): el frontend los traduce por
    # `api.sim.panel.<slug>` solo si el español coincide.
    "api.sim.panel.0_hv_antes_db": "σ⁰ HV antes (dB)",
    "api.sim.panel.0_hv_despues_db": "σ⁰ HV después (dB)",
    "api.sim.panel.razon_logaritmica_hv_despues_antes": "Razón logarítmica HV después/antes",
    "api.sim.panel.0_hh_antes_db": "σ⁰ HH antes (dB)",
    "api.sim.panel.0_hh_en_el_pico_de_la_crecida_db": "σ⁰ HH en el pico de la crecida (dB)",
    "api.sim.panel.deteccion_de_inundacion": "Detección de inundación",
    "api.sim.panel.interferograma_envuelto_fase_los": "Interferograma envuelto (fase LOS)",
    "api.sim.panel.desplazamiento_en_la_linea_de_vista": "Desplazamiento en la línea de vista",
    "api.sim.panel.coherencia_interferometrica": "Coherencia interferométrica",
    "api.sim.panel.coherencia_antes_de_la_erupcion": "Coherencia antes de la erupción",
    "api.sim.panel.coherencia_con_la_erupcion": "Coherencia con la erupción",
    "api.sim.panel.perdida_de_coherencia_antes_despues": "Pérdida de coherencia (antes − después)",
    # Encabezados de las tablas del evento (`api.sim.columna.<slug>`); las celdas siguen en español (spec §9.5).
    "api.sim.columna.cobertura": "Cobertura",
    "api.sim.columna.area_quemada_km2": "Área quemada (km²)",
    "api.sim.columna.intensidad": "Intensidad",
    "api.sim.columna.percepcion": "Percepción",
    "api.sim.columna.poblacion": "Población",
    "api.sim.columna.peligro": "Peligro",
    "api.sim.columna.area_km2": "Área (km²)",
    "api.sim.columna.modelo": "Modelo",
})

# --- observatorio (prefijo api.obs.): métricas del cambio y de la medición, órbita y unidades -------
# Las métricas las escribe `modelo/nisar.py`; `datos/proveedores/demo.py` les da clave por el slug de la
# etiqueta solo si etiqueta y ayuda coinciden con estas plantillas (`clave_metrica`).
REGISTRO.update({
    "api.obs.metrica.area_inundada_inicial.etiqueta": "Área inundada inicial",
    "api.obs.metrica.area_inundada_inicial.ayuda": "Agua abierta + vegetación inundada",
    "api.obs.metrica.area_inundada_final.etiqueta": "Área inundada final",
    "api.obs.metrica.cambio_neto.etiqueta": "Cambio neto",
    "api.obs.metrica.cambio_neto.ayuda": "Negativo = pérdida de humedal",
    "api.obs.metrica.acierto_del_detector_verdad_sintetica.etiqueta": "Acierto del detector (verdad sintética)",
    "api.obs.metrica.acierto_del_detector_verdad_sintetica.ayuda": "Clasificación píxel a píxel en la fecha final",
    "api.obs.metrica.area_quemada_detectada.etiqueta": "Área quemada detectada",
    "api.obs.metrica.area_quemada_simulada_verdad_sintetica.etiqueta": "Área quemada simulada (verdad sintética)",
    "api.obs.metrica.area_quemada_simulada_verdad_sintetica.ayuda": "Verdad del modelo en el intervalo",
    "api.obs.metrica.f1_del_detector_verdad_sintetica.etiqueta": "F1 del detector (verdad sintética)",
    "api.obs.metrica.f1_del_detector_verdad_sintetica.ayuda": "Coincidencia entre detección y verdad",
    "api.obs.metrica.biomasa_perdida.etiqueta": "Biomasa perdida",
    "api.obs.metrica.biomasa_perdida.ayuda": "Inversión del modelo de nube de agua",
    "api.obs.metrica.co2_emitido_estimado.etiqueta": "CO₂ emitido (estimado)",
    "api.obs.metrica.co2_emitido_estimado.ayuda": "47 % de carbono en la biomasa × 44/12",
    "api.obs.metrica.magnitud_del_escenario.etiqueta": "Magnitud del escenario",
    "api.obs.metrica.magnitud_del_escenario.ayuda": "Okada: M0 = μ·L·W·deslizamiento",
    "api.obs.metrica.max_hacia_el_satelite.etiqueta": "Máx. hacia el satélite",
    "api.obs.metrica.max_hacia_el_satelite.ayuda": "LOS positivo",
    "api.obs.metrica.max_alejandose.etiqueta": "Máx. alejándose",
    "api.obs.metrica.max_alejandose.ayuda": "LOS negativo",
    "api.obs.metrica.franjas_interferometricas.etiqueta": "Franjas interferométricas",
    "api.obs.metrica.franjas_interferometricas.ayuda": "Una franja = λ/2 = 11,9 cm",
    "api.obs.metrica.area_deformada_5_cm.etiqueta": "Área deformada > 5 cm",
    "api.obs.metrica.velocidad_maxima_inicial.etiqueta": "Velocidad máxima inicial",
    "api.obs.metrica.velocidad_maxima_final.etiqueta": "Velocidad máxima final",
    "api.obs.metrica.retroceso_del_frente.etiqueta": "Retroceso del frente",
    "api.obs.metrica.retroceso_del_frente.ayuda": "Sobre la línea de flujo central",
    "api.obs.metrica.hielo_perdido.etiqueta": "Hielo perdido",
    "api.obs.metrica.parcelas_analizadas.etiqueta": "Parcelas analizadas",
    "api.obs.metrica.cosechas_detectadas.etiqueta": "Cosechas detectadas",
    "api.obs.metrica.cosechas_detectadas.ayuda": "Caída de HV > 3 dB hasta nivel de suelo",
    "api.obs.metrica.acierto_de_deteccion_verdad_sintetica.etiqueta": "Acierto de detección (verdad sintética)",
    "api.obs.metrica.acierto_de_deteccion_verdad_sintetica.ayuda": "Cosechada / no cosechada vs. verdad",
    "api.obs.metrica.error_medio_de_fecha.etiqueta": "Error medio de fecha",
    "api.obs.metrica.error_medio_de_fecha.ayuda": "Limitado por la revisita de 12 días",
    "api.obs.metrica.hundimiento_maximo.etiqueta": "Hundimiento máximo",
    "api.obs.metrica.hundimiento_maximo.ayuda": "Percentil 1 de la velocidad vertical",
    "api.obs.metrica.area_con_5_cm_ano.etiqueta": "Área con > 5 cm/año",
    "api.obs.metrica.area_con_5_cm_ano.ayuda": "Umbral de daño a infraestructura",
    "api.obs.metrica.adquisiciones_usadas.etiqueta": "Adquisiciones usadas",
    "api.obs.metrica.adquisiciones_usadas.ayuda": "Pila de interferogramas de 12 días",
    "api.obs.metrica.rmse_frente_a_la_verdad_sintetica.etiqueta": "RMSE frente a la verdad sintética",
    "api.obs.metrica.rmse_frente_a_la_verdad_sintetica.ayuda": "Atmósfera y decorrelación residuales",
    # Medición de un cuadrante.
    "api.obs.metrica.area_del_cuadrante.etiqueta": "Área del cuadrante",
    "api.obs.metrica.area_del_cuadrante.ayuda": "{filas} × {columnas} píxeles de {metros} m",
    "api.obs.metrica.nueva_inundacion.etiqueta": "Nueva inundación",
    "api.obs.metrica.nueva_inundacion.ayuda": "{pct} % del cuadrante",
    "api.obs.metrica.perdida_de_inundacion.etiqueta": "Pérdida de inundación",
    "api.obs.metrica.perdida_de_inundacion.ayuda": "{pct} % del cuadrante",
    "api.obs.metrica.inundacion_persistente.etiqueta": "Inundación persistente",
    "api.obs.metrica.inundacion_persistente.ayuda": "{pct} % del cuadrante",
    "api.obs.metrica.severidad_moderada_2_5_a_4_5_db.etiqueta": "Severidad moderada (−2,5 a −4,5 dB)",
    "api.obs.metrica.severidad_moderada_2_5_a_4_5_db.ayuda": "{pct} % del cuadrante",
    "api.obs.metrica.severidad_alta_4_5_db.etiqueta": "Severidad alta (< −4,5 dB)",
    "api.obs.metrica.severidad_alta_4_5_db.ayuda": "{pct} % del cuadrante",
    "api.obs.metrica.sin_cambio.etiqueta": "Sin cambio",
    "api.obs.metrica.sin_cambio.ayuda": "{pct} % del cuadrante",
    "api.obs.metrica.crecimiento_del_cultivo.etiqueta": "Crecimiento del cultivo",
    "api.obs.metrica.crecimiento_del_cultivo.ayuda": "{pct} % del cuadrante",
    "api.obs.metrica.cosecha_labranza.etiqueta": "Cosecha / labranza",
    "api.obs.metrica.cosecha_labranza.ayuda": "{pct} % del cuadrante",
    "api.obs.metrica.inundacion_trasplante_de_arroz.etiqueta": "Inundación (trasplante de arroz)",
    "api.obs.metrica.inundacion_trasplante_de_arroz.ayuda": "{pct} % del cuadrante",
    "api.obs.metrica.media_velocidad_vertical.etiqueta": "Media · Velocidad vertical",
    "api.obs.metrica.minimo_velocidad_vertical.etiqueta": "Mínimo · Velocidad vertical",
    "api.obs.metrica.maximo_velocidad_vertical.etiqueta": "Máximo · Velocidad vertical",
    # Dirección orbital de las adquisiciones de demostración (`Adquisicion.direccion_orbital`).
    "api.obs.orbita.ascendente": "Ascendente",
    "api.obs.orbita.descendente": "Descendente",
    # Unidades con palabras (`api.unidad.<slug>`); las siglas y símbolos no se traducen.
    "api.unidad.dias": "días",
    "api.unidad.m_dia": "m/día",
    "api.unidad.cm_ano": "cm/año",
})


_MILES = "[ \u2009\u00a0]"   # espacio, fino o duro: lo que escribe `_fmt` (no `\s`, que difiere entre Python y JS)
_NUM_PLANTILLA = rf"[−+-]?\d+(?:{_MILES}\d{{3}})*(?:,\d+)?"


def _a_numero(t: str) -> float:
    return float(re.sub(_MILES, "", t).replace("−", "-").replace(",", "."))


_FECHA_PLANTILLA = r"\d{2}/\d{2}/\d{4}"
_PUNTO_PLANTILLA = r"[−+-]?\d+(?:\.\d+)?"


def _patron_marcador(nombre: str) -> str:
    """Expresión de un marcador `{nombre}`: `fecha…` es dd/mm/aaaa; `…_punto` un número con punto; si no, con coma."""
    if nombre.startswith("fecha"):
        return _FECHA_PLANTILLA
    if nombre.endswith("_punto"):
        return _PUNTO_PLANTILLA
    return _NUM_PLANTILLA


@functools.lru_cache(maxsize=None)
def _compilar(plantilla: str) -> re.Pattern[str]:
    """Patrón de una plantilla (ASCII: `\\d` solo casa 0-9). Un marcador repetido casa el mismo texto que la primera vez."""
    vistos: set[str] = set()
    trozos = []
    for k, x in enumerate(re.split(r"\{(\w+)\}", plantilla)):
        if k % 2 == 0:
            trozos.append(re.escape(x))
        elif x in vistos:
            trozos.append(f"(?P={x})")
        else:
            vistos.add(x)
            trozos.append(f"(?P<{x}>{_patron_marcador(x)})")
    return re.compile("".join(trozos), re.ASCII)


def reconocer_con_decimales(plantilla: str, texto_es: str) -> tuple[dict[str, float | str], dict[str, int]] | None:
    """Valores y decimales de `texto_es` si encaja con `plantilla`; si no, None.

    Cada `{x}` es un número con coma decimal; `{fecha…}` es dd/mm/aaaa (valor: fecha ISO; una fecha que no existe,
    como 31/02/2024, no encaja); `{…_punto}` es un número con punto decimal y signo opcional. Un marcador repetido
    debe repetir el mismo texto. Los decimales son los que escribió el modelo en cada cifra."""
    m = _compilar(plantilla).fullmatch(texto_es)
    if not m:
        return None
    valores: dict[str, float | str] = {}
    decimales: dict[str, int] = {}
    for k, v in m.groupdict().items():
        if k.startswith("fecha"):
            d, mes, a = v.split("/")
            try:
                date.fromisoformat(f"{a}-{mes}-{d}")
            except ValueError:
                return None
            valores[k] = f"{a}-{mes}-{d}"
        elif k.endswith("_punto"):
            valores[k] = float(v.replace("−", "-"))
            decimales[k] = len(v.split(".")[1]) if "." in v else 0
        else:
            valores[k] = _a_numero(v)
            decimales[k] = len(v.split(",")[1]) if "," in v else 0
    return valores, decimales


def reconocer(plantilla: str, texto_es: str) -> dict[str, float | str] | None:
    """Valores de `texto_es` si encaja con `plantilla` (ver `reconocer_con_decimales`); si no, None."""
    r = reconocer_con_decimales(plantilla, texto_es)
    return r[0] if r else None


def buscar_texto(prefijo: str | tuple[str, ...], texto_es: str):
    """`TextoClave` del texto del modelo si coincide con alguna clave de `REGISTRO` que empiece por `prefijo` (o por
    cualquiera de varios prefijos):
    primero por coincidencia literal y luego por plantilla (si varias encajan, la de más texto literal).
    Si nada encaja devuelve None: el texto queda en español, nunca se inventa una clave."""
    from datos.contrato import TextoClave
    candidatas = {k: v for k, v in REGISTRO.items() if k.startswith(prefijo)}
    for k, v in candidatas.items():
        if v == texto_es:
            return TextoClave(clave_texto=k)
    mejor: tuple[int, str, dict, dict] | None = None
    for k, v in candidatas.items():
        r = reconocer_con_decimales(v, texto_es)
        if r is None:
            continue
        literal = len(re.sub(r"\{\w+\}", "", v))
        if mejor is None or literal > mejor[0]:
            mejor = (literal, k, r[0], r[1])
    if mejor is None:
        return None
    return TextoClave(clave_texto=mejor[1], valores_texto=mejor[2], decimales_texto=mejor[3])


_FECHA_EN_TEXTO = re.compile(r"\d{2}/\d{2}/\d{4}")


def clave_metrica(prefijo: str, etiqueta: str, ayuda: str) -> tuple[str | None, dict[str, float | str]]:
    """Clave base de una métrica escrita por el modelo: `<prefijo>.<slug(etiqueta)>` si la etiqueta coincide con
    la registrada y la ayuda encaja con la suya (o no hay ayuda). Una fecha dd/mm/aaaa en la etiqueta se busca como
    `{fecha}` y viaja en ISO. Si algo no cuadra, sin clave: el cliente la muestra en español con lang="es" en lugar
    de traducir algo distinto."""
    base = f"{prefijo}.{slug(_FECHA_EN_TEXTO.sub('{fecha}', etiqueta))}"
    plantilla_e = REGISTRO.get(f"{base}.etiqueta")
    if plantilla_e is None:
        return None, {}
    de_etiqueta = reconocer(plantilla_e, etiqueta)
    if de_etiqueta is None:
        return None, {}
    plantilla = REGISTRO.get(f"{base}.ayuda")
    if not ayuda:
        return (base, de_etiqueta) if plantilla is None else (None, {})
    valores = reconocer(plantilla, ayuda) if plantilla is not None else None
    return (base, {**de_etiqueta, **valores}) if valores is not None else (None, {})


def numero_de(texto_valor: str) -> float | None:
    """Primer número de un valor ya formateado («Mw 7,0», «1 113 viviendas», «−79,4»), o None."""
    m = re.search(_NUM_PLANTILLA, str(texto_valor))
    return _a_numero(m.group(0)) if m else None


_DETECTADO_NISAR = re.compile(r"\s+detectad[oa]s?\s+(?:con|por)\s+NISAR", re.IGNORECASE)


def sin_nisar_simulador(etiqueta: str) -> str:
    """Regla 7: una cifra del simulador no la detecta NISAR, sino el modelo. Forma neutra en género."""
    return _DETECTADO_NISAR.sub(" · detección del modelo (simulación)", str(etiqueta))


def texto(clave: str, **valores) -> str:
    """Formatea la plantilla de `clave` con `valores`. `KeyError` si la clave no está registrada."""
    return REGISTRO[clave].format(**valores)


def slug(t: str) -> str:
    """Minúsculas, sin tildes, todo lo no alfanumérico pasa a `_`, sin `_` repetidos ni en los extremos."""
    sin_tildes = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
    salida: list[str] = []
    for c in sin_tildes.lower():
        salida.append(c if c.isascii() and c.isalnum() else "_")
    return "_".join(p for p in "".join(salida).split("_") if p)


# Plantillas del bloque de texto del modelo (notas y celdas del simulador, tablas y series del Observatorio…).
# Al final del archivo para evitar ciclos de importación.
from datos.claves_demo import PLANTILLAS  # noqa: E402

REGISTRO.update(PLANTILLAS)
