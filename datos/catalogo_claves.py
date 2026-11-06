"""Claves de texto derivadas por id: se obtienen recorriendo el catálogo del proveedor de demostración.

`generar()` devuelve todas las claves de la API (las de `datos.claves.REGISTRO` más las derivadas) como una lista
ordenada de `{"clave", "es"}`; `scripts/exportar_claves_api.py` la vuelca a `api/claves.json`.
"""
from __future__ import annotations

from datos.claves import REGISTRO, slug
from modelo import estaciones, nisar

# Valores posibles de los textos del contexto climático (`/api/contexto`): vienen de `modelo/estaciones.py`.
ESTACIONES = ("invierno boreal", "primavera boreal", "verano boreal", "otoño boreal",
              "verano austral", "otoño austral", "invierno austral", "primavera austral")
HITOS = ("equinoccio de marzo", "solsticio de junio", "equinoccio de septiembre", "solsticio de diciembre")
TEMPORADAS = ("Seca", "Lluviosa", "Transición")
NOMBRES_LOCALES = (*estaciones.NOMBRE_LOCAL.values(), "época cálida", "época fría de garúa")
REGIMENES = ("sin estacionalidad marcada", "bimodal (dos épocas de lluvia)", "unimodal (una época de lluvia)")


def _tipos(salida: dict[str, str], prov) -> None:
    for t in prov.tipos():
        salida[f"api.tipo.{t.id}.nombre"] = t.nombre
        if t.descripcion:
            salida[f"api.tipo.{t.id}.descripcion"] = t.descripcion
        for c in t.controles:
            base = f"api.control.{t.id}.{c.id}"
            salida[f"{base}.etiqueta"] = c.etiqueta
            if c.ayuda:
                salida[f"{base}.ayuda"] = c.ayuda
            if c.unidad:
                salida[f"{base}.unidad"] = c.unidad
            for o in c.opciones or []:
                salida[f"api.opcion.{t.id}.{c.id}.{slug(o.etiqueta)}"] = o.etiqueta


def _escenarios(salida: dict[str, str], prov) -> None:
    sitios = nisar.cargar_sitios().set_index("id")
    for e in prov.escenarios():
        fila = sitios.loc[e.id]
        salida[f"api.escenario.{e.id}.sitio"] = str(fila["sitio"])
        salida[f"api.escenario.{e.id}.descripcion"] = str(fila["descripcion"])
        # Categorías de las capas (leyenda): código = posición + 1, como en `CapaRaster.leyenda`.
        antes, despues = prov.intervalo_por_defecto(e.id)
        r = prov.cambio(e.id, antes, despues, None)
        # Notas del modelo heredado (spec §3, tipo 4): clave por id de escenario y posición. El cliente solo
        # traduce si el español coincide (con otros parámetros la nota cambia y se queda en español).
        for k, nota in enumerate(r.notas, start=1):
            salida[f"api.nota.{e.id}.{k}"] = str(nota)
        for capa in filter(None, (r.antes, r.despues, r.cambio, r.clasificacion, *r.capas_extra)):
            for k, (etiqueta, _color) in enumerate(capa.leyenda or [], start=1):
                salida[f"api.categoria.{capa.variable}.{k}"] = etiqueta


def _simulador(salida: dict[str, str]) -> None:
    """Catálogo del simulador: herramientas, controles, opciones y mundos predefinidos."""
    from datos import simulador
    c = simulador.catalogo()
    for h in c["herramientas"]:
        salida[f"api.sim.herramienta.{h['id']}.nombre"] = h["nombre"]
        for k in h["controles"]:
            base = f"api.sim.control.{h['id']}.{k['id']}"
            salida[f"{base}.etiqueta"] = k["etiqueta"]
            if k["ayuda"]:
                salida[f"{base}.ayuda"] = k["ayuda"]
            for o in k["opciones"] or []:
                salida[f"api.sim.opcion.{h['id']}.{k['id']}.{slug(o)}"] = o
    for m in c["mundos"]:
        base = f"api.sim.mundo.{slug(m['nombre'])}"
        salida[f"{base}.nombre"] = m["nombre"]
        salida[f"{base}.descripcion"] = m["descripcion"]


def _contexto(salida: dict[str, str]) -> None:
    for campo, valores in (("estacion", ESTACIONES), ("proximo_hito", HITOS), ("temporada", TEMPORADAS),
                           ("nombre_local", NOMBRES_LOCALES), ("regimen", REGIMENES)):
        for v in valores:
            salida[f"api.contexto.{campo}.{slug(v)}"] = v


def generar() -> list[dict[str, str]]:
    from datos.proveedores.demo import ProveedorDemostracion
    prov = ProveedorDemostracion()
    salida: dict[str, str] = dict(REGISTRO)
    _tipos(salida, prov)
    _escenarios(salida, prov)
    _contexto(salida)
    _simulador(salida)
    return [{"clave": k, "es": salida[k]} for k in sorted(salida)]
