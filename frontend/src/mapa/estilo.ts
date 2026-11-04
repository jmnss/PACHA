import type { StyleSpecification, LayerSpecification, SourceSpecification } from 'maplibre-gl'
import { COLORES_MAPA as C } from './colores'
import { elementos } from './datos'

/** Fuente remota opcional (mapa vectorial público de OpenFreeMap, sin clave ni cuenta). */
export const FUENTE_REMOTA = 'openfreemap'
const URL_REMOTA = 'https://tiles.openfreemap.org/planet'

/**
 * Estilo propio. Primero local: fondo, provincias, contorno y máscara salen del GeoJSON del repositorio
 * (sin glyphs ni sprites: ninguna capa lleva texto), así que dibuja sin internet. Con `remoto`, añade
 * calles y agua de OpenFreeMap encima de las provincias; si falla, el mapa sigue igual.
 */
export function construirEstilo({ remoto }: { remoto: boolean }): StyleSpecification {
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
    fuentes[FUENTE_REMOTA] = { type: 'vector', url: URL_REMOTA }
    capas.push(
      { id: 'remoto-agua', type: 'fill', source: FUENTE_REMOTA, 'source-layer': 'water', paint: { 'fill-color': C.aguaRemota } },
      { id: 'remoto-calles', type: 'line', source: FUENTE_REMOTA, 'source-layer': 'transportation', minzoom: 8,
        paint: { 'line-color': C.calles, 'line-width': 1 } },
    )
  }
  capas.push(
    { id: 'exterior', type: 'fill', source: 'exterior', paint: { 'fill-color': C.exterior, 'fill-opacity': C.opacidadExterior } },
    { id: 'frontera', type: 'line', source: 'contorno',
      paint: { 'line-color': C.frontera, 'line-opacity': C.opacidadFrontera, 'line-width': 1 } },
  )
  return { version: 8, sources: fuentes, layers: capas }
}

/** ¿Se carga la capa remota? Solo con conexión y sin `VITE_MAPA_REMOTO=0`. */
export function mapaRemotoActivo(): boolean {
  if (import.meta.env.VITE_MAPA_REMOTO === '0') return false
  return typeof navigator === 'undefined' || navigator.onLine !== false
}
