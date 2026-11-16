"""Acciones sugeridas tras un evento del Simulador: motor de reglas puro (sin red, sin estado).

Recibe el fenómeno y los indicadores del resultado simulado (área, población expuesta, víctimas del modelo, MMI…)
y devuelve una lista ordenada de acciones en tres momentos —antes (preparación), durante (respuesta) y después
(recuperación)— con una prioridad que sube con la gravedad simulada.

Cada acción es una recomendación general de una guía pública, con su fuente (nombre, URL, cita corta y fecha de
consulta). Una acción sin fuente no entra. No son instrucciones para un evento real: en una emergencia real se
siguen las indicaciones de las autoridades (ECU 911).
Los textos en español viven en `datos.claves.REGISTRO` (`api.sim.accion.<fenómeno>.<id>[.porque]`).
"""
from __future__ import annotations

from dataclasses import dataclass

from datos.claves import REGISTRO

CONSULTADO = "2026-11-15"
MOMENTOS = ("antes", "durante", "despues")
GRAVEDADES = ("baja", "media", "alta")


@dataclass(frozen=True)
class Fuente:
    nombre: str
    url: str
    cita: str            # frase literal de la fuente, en su idioma
    idioma: str          # idioma de la cita (es | en)
    consultado: str = CONSULTADO

    def dto(self) -> dict:
        return dict(nombre=self.nombre, url=self.url, cita=self.cita, idioma=self.idioma, consultado=self.consultado)


_READY = "Ready.gov (FEMA, Estados Unidos)"
_SGR = "Alertas Ecuador · Secretaría de Gestión de Riesgos"


def _ready(pagina: str, cita: str) -> tuple[str, str, str, str]:
    return (f"{_READY} · {pagina.capitalize().replace('-', ' ')}", f"https://www.ready.gov/{pagina}", cita, "en")


def _sgr(pagina: str, titulo: str, cita: str) -> tuple[str, str, str, str]:
    return (f"{_SGR} · {titulo}", f"https://alertasecuador.gob.ec/{pagina}", cita, "es")


@dataclass(frozen=True)
class Regla:
    id: str
    momento: str               # antes | durante | despues
    fuente: Fuente
    desde: str = "baja"        # gravedad mínima para incluirla
    urgente_desde: str = "alta"  # gravedad desde la que su prioridad es «alta»
    condicion: str | None = None  # indicador que debe ser verdadero o > 0 (p. ej. «tsunami», «lahar», «expuestos»)


def _r(id: str, momento: str, fuente: tuple[str, str, str, str], **kw) -> Regla:
    return Regla(id, momento, Fuente(*fuente), **kw)


REGLAS: dict[str, list[Regla]] = {
    "incendio": [
        _r("franja_limpia", "antes", _ready("wildfires", "Create a fire-resistant zone that is free of leaves, debris or "
                                            "flammable materials for at least 30 feet from your home.")),
        _r("sin_fogatas", "antes", _sgr("epoca_seca", "Época seca",
                                        "No hacer fogatas en zonas forestales, especialmente durante épocas secas.")),
        _r("avisar_911", "durante", _sgr("epoca_seca", "Época seca",
                                         "Informar inmediatamente a las autoridades a través del 911."), urgente_desde="baja"),
        _r("alejarse", "durante", _sgr("epoca_seca", "Época seca", "Alejarse inmediatamente del fuego y del humo."),
           urgente_desde="media"),
        _r("evacuar", "durante", _ready("wildfires", "Evacuate immediately if authorities tell you to do so."),
           desde="media", condicion="expuestos"),
        _r("mascarilla", "durante", _ready("wildfires", "Use an N95 mask to protect yourself from smoke inhalation.")),
        _r("volver", "despues", _ready("wildfires", "Do not return home until authorities say it is safe to do so."),
           desde="media"),
        _r("brasas", "despues", _ready("wildfires", "Avoid hot ash, charred trees, smoldering debris and live embers.")),
    ],
    "tormenta": [
        _r("drenaje", "antes", _sgr("lluvia", "Época lluviosa",
                                    "Asegúrate de que exista un sistema de drenaje adecuado, despejado y limpio.")),
        _r("fisuras", "antes", _sgr("lluvia", "Época lluviosa",
                                    "Revisa constantemente si existen fisuras o saturación del suelo con agua lluvia."),
           urgente_desde="media"),
        _r("despierto", "durante", _ready("landslides-debris-flow",
                                          "Stay alert and awake during a storm that could cause a landslide.")),
        _r("no_cruzar", "durante", _ready("landslides-debris-flow", "Never cross a road with water or mud flowing."),
           urgente_desde="media"),
        _r("salir", "durante", _ready("landslides-debris-flow", "Leave if you have been told to evacuate or you feel "
                                      "it is unsafe to remain in your home."), desde="media",
           condicion="expuestos"),
        _r("lejos_deslave", "despues", _ready("landslides-debris-flow", "Stay away from the slide area.")),
        _r("replantar", "despues", _ready("landslides-debris-flow", "Replant damaged ground as soon as possible.")),
    ],
    "inundacion": [
        _r("provisiones", "antes", _ready("floods", "Gather supplies, including non-perishable foods, cleaning supplies "
                                          "and water for several days")),
        _r("alcantarillas", "antes", _sgr("lluvia", "Época lluviosa", "Limpia las alcantarillas y cunetas para "
                                          "facilitar la circulación del agua de lluvia.")),
        _r("no_cruzar", "durante", _ready("floods", "Turn Around. Don’t Drown!"), urgente_desde="baja"),
        _r("subir", "durante", _ready("floods", "Move to higher ground or a higher floor."), urgente_desde="media",
           condicion="expuestos"),
        _r("volver", "despues", _ready("floods", "Return home only when authorities say it is safe."), desde="media"),
        _r("agua_segura", "despues", ("CDC (Centros para el Control de Enfermedades, EE. UU.) · Floods",
                                      "https://www.cdc.gov/floods/safety/index.html",
                                      "Listen for information from your local officials on how to safely use water to "
                                      "drink, cook, or clean.", "en"), urgente_desde="media"),
        _r("no_vadear", "despues", _ready("floods", "Avoid wading in floodwater, which can be contaminated and contain "
                                          "dangerous debris.")),
    ],
    "terremoto": [
        _r("asegurar_muebles", "antes", _ready("earthquakes", "Secure heavy items in your home like bookcases, "
                                               "refrigerators, water heaters, televisions."), urgente_desde="media"),
        _r("practicar", "antes", _ready("earthquakes", "Practice how to protect yourself during earthquakes, with "
                                        "family and coworkers.")),
        _r("reserva", "antes", _ready("earthquakes", "Make a supply kit that includes enough food and water for "
                                      "several days.")),
        _r("agacharse", "durante", _ready("earthquakes", "Drop where you are onto hands and knees."),
           urgente_desde="baja"),
        _r("tsunami", "durante", _ready("earthquakes", "If you are in an area that may experience tsunamis, go inland "
                                        "or to higher ground immediately after the shaking stops."),
           urgente_desde="baja", condicion="tsunami"),
        _r("replicas", "despues", _ready("earthquakes", "Expect aftershocks to follow the main shock of an earthquake.")),
        _r("no_entrar", "despues", _ready("earthquakes", "Do not enter damaged buildings."), desde="media",
           condicion="expuestos"),
        _r("heridos", "despues", _ready("earthquakes", "Check yourself to see if you are hurt and help others if you "
                                        "have training."), urgente_desde="media"),
    ],
    "erupcion": [
        _r("plan_ceniza", "antes", _ready("volcanoes", "Have a shelter-in-place plan if your biggest risk is from ash.")),
        _r("fuentes_oficiales", "antes", _sgr("volcanes", "Volcanes",
                                              "Infórmese únicamente por fuentes oficiales sobre los cambios de alerta.")),
        _r("evacuar", "durante", _ready("volcanoes", "Follow evacuation orders from local authorities. Evacuate early."),
           desde="media", condicion="expuestos"),
        _r("lahar_alto", "durante", ("USGS · Volcano Hazards Program (lahares)",
                                     "https://www.usgs.gov/programs/VHP/lahars-move-rapidly-down-valleys-rivers-concrete",
                                     "If you are on the floor of a valley that leads from a volcano and become aware of "
                                     "an oncoming lahar, seek high ground.", "en"),
           urgente_desde="baja", condicion="lahar"),
        _r("ojos_vias", "durante", _sgr("volcanes", "Volcanes", "Protéjase los ojos y las vías respiratorias para "
                                        "prevenir afectaciones a la salud."), urgente_desde="media"),
        _r("no_conducir", "durante", _sgr("volcanes", "Volcanes",
                                          "Evite conducir para no levantar la ceniza asentada en el suelo.")),
        _r("techo", "despues", _ready("volcanoes", "Do not get on your roof to remove ash unless you have guidance "
                                      "or training.")),
        _r("limpieza", "despues", _ready("volcanoes", "Wear protective clothing and a mask when cleaning up.")),
    ],
}


def gravedad(herramienta: str, ind: dict) -> str:
    """Gravedad simulada (baja | media | alta) a partir de los indicadores del resultado.
    Umbrales ilustrativos y redondos para ordenar las acciones; no son criterios oficiales de alerta."""
    n = lambda k: float(ind.get(k) or 0.0)  # noqa: E731
    expuestos, victimas, area = n("expuestos"), n("victimas"), n("area_km2")
    if herramienta == "terremoto":
        mmi = n("mmi_max")
        # Mercalli modificada (USGS): VI daños leves; VIII daño considerable en lo común.
        if mmi >= 8 or victimas >= 10 or ind.get("tsunami"):
            return "alta"
        return "media" if mmi >= 6 else "baja"
    if herramienta == "erupcion":
        vei = n("vei")
        if vei >= 4 or expuestos >= 10_000 or victimas >= 1:
            return "alta"
        return "media" if vei >= 3 or expuestos > 0 else "baja"
    if herramienta == "incendio":
        if expuestos >= 1_000 or area >= 10:
            return "alta"
        return "media" if expuestos > 0 or area >= 1 else "baja"
    # tormenta e inundación
    if victimas >= 1 or expuestos >= 5_000:
        return "alta"
    return "media" if expuestos >= 100 else "baja"


def _personas(x: float) -> str:
    return f"{round(x):,}".replace(",", " ")


def _valores(ind: dict) -> dict:
    """Cifras del escenario que las frases de «porqué» pueden citar."""
    v: dict = {"personas": round(float(ind.get("expuestos") or 0.0))}
    if ind.get("mmi_max") is not None:
        v["mmi"] = round(float(ind["mmi_max"]), 1)
    return v


def _rellenar(plantilla: str, valores: dict) -> str:
    for k, x in valores.items():
        texto = _personas(x) if k == "personas" else f"{x:.1f}".replace(".", ",") if isinstance(x, float) else str(x)
        plantilla = plantilla.replace(f"{{{k}}}", texto)
    return plantilla


def sugerir(herramienta: str, indicadores: dict) -> dict:
    """`{"gravedad", "acciones": [...]}` con las acciones ordenadas por momento y, dentro, por prioridad."""
    if herramienta not in REGLAS:
        return dict(gravedad="baja", acciones=[])
    g = gravedad(herramienta, indicadores)
    nivel = GRAVEDADES.index
    valores = _valores(indicadores)
    acciones: list[dict] = []
    claves_orden: list[tuple] = []
    for orden, r in enumerate(REGLAS[herramienta]):
        if nivel(g) < nivel(r.desde) or (r.condicion and not indicadores.get(r.condicion)):
            continue
        if not r.fuente.url.startswith("https://"):
            continue                                   # sin fuente verificada no entra
        base = f"api.sim.accion.{herramienta}.{r.id}"
        usados = {k: v for k, v in valores.items() if f"{{{k}}}" in REGISTRO[f"{base}.porque"]}
        acciones.append(dict(
            id=r.id, momento=r.momento, prioridad="alta" if nivel(g) >= nivel(r.urgente_desde) else "normal",
            texto=REGISTRO[base], clave_texto=base, valores_texto={},
            porque=_rellenar(REGISTRO[f"{base}.porque"], usados),
            porque_texto=dict(clave_texto=f"{base}.porque", valores_texto=usados,
                              decimales_texto={k: (0 if k == "personas" else 1) for k in usados}),
            fuente=r.fuente.dto()))
        claves_orden.append((MOMENTOS.index(r.momento), acciones[-1]["prioridad"] != "alta", orden))
    ordenadas = [a for _, a in sorted(zip(claves_orden, acciones), key=lambda par: par[0])]
    return dict(gravedad=g, acciones=ordenadas)
