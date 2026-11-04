import { decodificarRejilla, type Rejilla } from '../api/rejilla'
import { colorear, type ColorCategoria, type NombreRampa } from '../diseno/rampas'

export interface ParPintado {
  antes: ImageData
  despues: ImageData
  vmin: number
  vmax: number
  /** Frase para el usuario cuando los rangos de las dos rejillas no coincidían; `null` si coincidían. */
  aviso: string | null
}

const IGUALES = 1e-9

/** Pasa los códigos 1..255 de un rango (vmin0, vmax0) a otro, conservando el valor físico. 0 sigue siendo 0. */
export function reescalar(datos: Uint8Array, vmin0: number, vmax0: number, vmin: number, vmax: number): Uint8Array {
  const salida = new Uint8Array(datos.length)
  const ancho0 = vmax0 - vmin0
  const ancho = vmax - vmin
  for (let i = 0; i < datos.length; i++) {
    const c = datos[i]
    if (c === 0) continue
    const valor = vmin0 + ((c - 1) / 254) * ancho0
    const t = ancho > 0 ? (valor - vmin) / ancho : 0
    salida[i] = Math.min(255, Math.max(1, Math.round(1 + t * 254)))
  }
  return salida
}

/**
 * Colorea las dos rejillas con la MISMA rampa y el MISMO rango (función pura, sin DOM).
 * Se toma el vmin/vmax de `antes`; si `despues` no coincide, se usa el mínimo y el máximo globales y se
 * reescalan ambas para que un mismo valor tenga el mismo color en las dos mitades. Las capas categóricas
 * (con `categorias`) llevan códigos directos y no se reescalan.
 */
export function pintarPar(
  antes: Rejilla,
  despues: Rejilla,
  rampa: NombreRampa,
  categorias?: readonly ColorCategoria[],
): ParPintado {
  const a = decodificarRejilla(antes)
  const d = decodificarRejilla(despues)
  const coinciden = Math.abs(antes.vmin - despues.vmin) < IGUALES && Math.abs(antes.vmax - despues.vmax) < IGUALES
  if (categorias || coinciden) {
    return {
      antes: colorear(a, rampa, categorias, antes.columnas),
      despues: colorear(d, rampa, categorias, despues.columnas),
      vmin: antes.vmin,
      vmax: antes.vmax,
      aviso: null,
    }
  }
  const vmin = Math.min(antes.vmin, despues.vmin)
  const vmax = Math.max(antes.vmax, despues.vmax)
  return {
    antes: colorear(reescalar(a, antes.vmin, antes.vmax, vmin, vmax), rampa, undefined, antes.columnas),
    despues: colorear(reescalar(d, despues.vmin, despues.vmax, vmin, vmax), rampa, undefined, despues.columnas),
    vmin,
    vmax,
    aviso: 'Las dos imágenes venían con rangos distintos; se muestran con el rango común para que los colores sean comparables.',
  }
}

/** Punto normalizado (x, y en 0–1, y = 0 al norte) a partir de un clic y el rectángulo del escenario. */
export function normalizar(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): [number, number] {
  const f = (v: number, o: number, t: number) => (t > 0 ? Math.min(1, Math.max(0, (v - o) / t)) : 0)
  return [f(clientX, rect.left, rect.width), f(clientY, rect.top, rect.height)]
}

/** Esquinas ordenadas [x0, y0, x1, y1] con x0 ≤ x1 y y0 ≤ y1, sin importar hacia dónde se arrastró. */
export function ordenarCuadrante(a: readonly [number, number], b: readonly [number, number]): [number, number, number, number] {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]
}

/** Umbral (fracción del ancho/alto) a partir del cual un gesto deja de ser clic y pasa a ser cuadrante. */
export const UMBRAL_ARRASTRE = 0.012
