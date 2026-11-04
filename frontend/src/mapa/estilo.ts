import type { StyleSpecification, LayerSpecification, SourceSpecification } from 'maplibre-gl'
import { COLORES_MAPA as C } from './colores'
import { elementos } from './datos'

export type MapaBaseId = 'oscuro' | 'satelite' | 'relieve'
export const MAPA_BASE_INICIAL: MapaBaseId = 'oscuro'

interface FuenteRaster {
  /** Plantilla XYZ de ArcGIS: `{z}/{y}/{x}` (verificada con una tesela de Quito, ver docs/diseno.md §8). */
  url: string
  maxzoom: number
}

interface DefinicionBase {
  id: MapaBaseId
  nombre: string
  base: FuenteRaster
  /** Capa de etiquetas de referencia que se dibuja ENCIMA de los datos. */
  /** null: la propia tesela de la base ya trae sus etiquetas (World_Topo_Map), no hay capa aparte. */
  etiquetas: 'oscuro' | 'lugares' | null
  /** Texto de atribución que exige el servicio (copyrightText del MapServer). */
  atribucion: string
}

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
const ATRIB_ESRI = 'Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community'

/** Mapas base remotos (servicios públicos de Esri, sin clave ni cuenta; requieren internet). */
export const MAPAS_BASE: readonly DefinicionBase[] = [
  { id: 'oscuro', nombre: 'Oscuro', etiquetas: 'oscuro', atribucion: ATRIB_ESRI,
    base: { url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, maxzoom: 16 } },
  { id: 'satelite', nombre: 'Satélite', etiquetas: 'lugares',
    atribucion: 'Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community · Labels: ' + ATRIB_ESRI,
    base: { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, maxzoom: 19 } },
  { id: 'relieve', nombre: 'Relieve', etiquetas: null,
    atribucion: 'Esri, TomTom, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors, and the GIS User Community',
    base: { url: `${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`, maxzoom: 17 } },
]

const ETIQUETAS: Record<'oscuro' | 'lugares', FuenteRaster> = {
  oscuro: { url: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, maxzoom: 16 },
  lugares: { url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, maxzoom: 16 },
}

/** Capa de datos: se inserta justo antes de esta (base → datos → etiquetas). En local, antes de la máscara. */
export const ANCLA_DATOS_REMOTA = 'etiquetas-oscuro'
export const ANCLA_DATOS_LOCAL = 'exterior'
export const prefijoRaster = ['base-', 'etiquetas-'] as const
export const esCapaRaster = (id: string) => prefijoRaster.some((p) => id.startsWith(p))

export const definicionDeBase = (id: MapaBaseId) => MAPAS_BASE.find((b) => b.id === id) ?? MAPAS_BASE[0]

/** Ids de las capas raster que deben verse con el mapa base elegido. */
export function capasVisibles(id: MapaBaseId): string[] {
  const d = definicionDeBase(id)
  return d.etiquetas ? [`base-${d.id}`, `etiquetas-${d.etiquetas}`] : [`base-${d.id}`]
}

/** Máscara de «fuera de Ecuador» sin bordes: el mundo con el contorno local como huecos (el polígono del GeoJSON solo cubre una caja). */
function mascaraMundial(): GeoJSON.Feature<GeoJSON.Polygon> {
  const huecos: number[][][] = []
  for (const f of elementos('contorno').features) {
    const polis = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : []
    for (const p of polis) huecos.push(p[0])
  }
  const mundo = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [mundo, ...huecos] } }
}

const raster = (f: FuenteRaster): SourceSpecification => ({ type: 'raster', tiles: [f.url], tileSize: 256, maxzoom: f.maxzoom })

/**
 * Estilo propio. Primero local: fondo, provincias, contorno y máscara salen del GeoJSON del repositorio
 * (sin glyphs ni sprites: ninguna capa lleva texto), así que dibuja sin internet. Con `remoto`, añade
 * teselas raster de Esri bajo la capa de datos y sus etiquetas encima; si fallan, el mapa sigue igual.
 * Orden de capas: base → (datos, las inserta CapaLienzo) → etiquetas → máscara de fuera de Ecuador → frontera.
 */
export function construirEstilo({ remoto, base = MAPA_BASE_INICIAL }: { remoto: boolean; base?: MapaBaseId }): StyleSpecification {
  const fuentes: Record<string, SourceSpecification> = {
    provincias: { type: 'geojson', data: elementos('provincia') },
    contorno: { type: 'geojson', data: elementos('contorno') },
    exterior: { type: 'geojson', data: elementos('exterior') },
  }
  const capas: LayerSpecification[] = [
    { id: 'fondo', type: 'background', paint: { 'background-color': C.agua } },
    { id: 'tierra', type: 'fill', source: 'contorno', paint: { 'fill-color': C.tierra } },
    { id: 'provincias', type: 'fill', source: 'provincias', paint: { 'fill-color': C.provincia } },
    { id: 'provincias-linea', type: 'line', source: 'provincias', paint: { 'line-color': C.tierra, 'line-width': 1 } },
  ]
  if (remoto) {
    fuentes.exterior = { type: 'geojson', data: mascaraMundial() }
    const visibles = capasVisibles(base)
    const vis = (id: string) => ({ visibility: visibles.includes(id) ? 'visible' : 'none' }) as const
    for (const d of MAPAS_BASE) {
      fuentes[`base-${d.id}`] = raster(d.base)
      capas.push({ id: `base-${d.id}`, type: 'raster', source: `base-${d.id}`, layout: vis(`base-${d.id}`),
        paint: { 'raster-fade-duration': 0 } })
    }
    for (const k of ['oscuro', 'lugares'] as const) {
      fuentes[`etiquetas-${k}`] = raster(ETIQUETAS[k])
      capas.push({ id: `etiquetas-${k}`, type: 'raster', source: `etiquetas-${k}`, layout: vis(`etiquetas-${k}`),
        paint: { 'raster-fade-duration': 0 } })
    }
  }
  capas.push(
    { id: 'exterior', type: 'fill', source: 'exterior', paint: { 'fill-color': C.exterior, 'fill-opacity': C.opacidadExterior } },
  )
  if (remoto) {
    capas.push({ id: 'limites-provincias', type: 'line', source: 'provincias',
      paint: { 'line-color': C.limites, 'line-opacity': C.opacidadLimites, 'line-width': 1 } })
  }
  capas.push(
    { id: 'frontera', type: 'line', source: 'contorno',
      paint: { 'line-color': C.frontera, 'line-opacity': C.opacidadFrontera, 'line-width': 1 } },
  )
  return { version: 8, sources: fuentes, layers: capas }
}

/** ¿Se piden los mapas base remotos? Solo con conexión y sin `VITE_MAPA_REMOTO=0`. */
export function mapaRemotoActivo(): boolean {
  if (import.meta.env.VITE_MAPA_REMOTO === '0') return false
  return typeof navigator === 'undefined' || navigator.onLine !== false
}
