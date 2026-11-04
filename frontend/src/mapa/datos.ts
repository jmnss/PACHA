import type { Feature, FeatureCollection, Geometry } from 'geojson'
import crudo from './ecuador.geojson?raw'

export type Capa = 'provincia' | 'contorno' | 'exterior'
type Props = { capa: Capa; nombre?: string; region?: string }

const coleccion = JSON.parse(crudo) as FeatureCollection<Geometry, Props>

/** Elementos del GeoJSON local (generado por scripts/exportar_ecuador_web.py) de una capa. */
export function elementos(capa: Capa): FeatureCollection<Geometry, Props> {
  return { type: 'FeatureCollection', features: coleccion.features.filter((f: Feature<Geometry, Props>) => f.properties.capa === capa) }
}
