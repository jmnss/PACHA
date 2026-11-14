import { decodificarRejilla, type Rejilla } from '../api/rejilla'
import { colorear, type ColorCategoria, type NombreRampa } from '../diseno/rampas'

/** Píxeles RGBA de la rejilla (función pura): el código 0 queda transparente. */
export function pixelesDeRejilla(rejilla: Rejilla, rampa: NombreRampa, categorias?: readonly ColorCategoria[]): ImageData {
  return colorear(decodificarRejilla(rejilla), rampa, categorias, rejilla.columnas)
}

/** Esquinas para una fuente `image` de MapLibre: NO, NE, SE, SO. La fila 0 de la rejilla es el norte. */
export function esquinas(bbox: readonly [number, number, number, number]): [[number, number], [number, number], [number, number], [number, number]] {
  const [o, s, e, n] = bbox
  return [[o, n], [e, n], [e, s], [o, s]]
}
