"""Registro de claves de texto de la API.

Cada texto en español que la API produce por sí misma lleva una clave estable (`api.<área>.<…>`) y una
plantilla con `{nombre}` para las cifras. El frontend traduce por clave; el español de aquí es la fuente de verdad
y es el texto que sigue viajando en el campo `mensaje`/`etiqueta`/… de cada respuesta.

Las claves derivadas por id (tipos, controles, escenarios…) no se escriben aquí: `scripts/exportar_claves_api.py`
las genera recorriendo el catálogo y las vuelca a `api/claves.json`.
"""
from __future__ import annotations

import unicodedata

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
}


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
