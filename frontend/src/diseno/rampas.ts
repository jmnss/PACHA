import { formatoNumero } from '../idioma/formato'
import type { CodigoIdioma } from '../idioma/idiomas'

/**
 * Rampas de color de los datos (docs/diseno.md §4). Los valores hex de las rampas viven SOLO aquí y en
 * tokens.css. Se usan tal cual, por paradas interpoladas linealmente; no se inventan otras.
 */

export type NombreRampa = 'gris' | 'agua' | 'fuego' | 'divergente' | 'ciclico' | 'mmi' | 'lahar' | 'ceniza'

export const RAMPAS: Record<NombreRampa, string[]> = {
  gris: ['#0d0d0f', '#3a3a3e', '#6e6e73', '#a6a6ab', '#e6e6e8'],
  agua: ['#0f2236', '#173f63', '#2a6496', '#4f8fc4', '#8fc0e6', '#d2ebf8'],
  fuego: ['#2a0f07', '#5e1d0c', '#9a3412', '#d4622a', '#efa04a', '#f8d98a'],
  divergente: ['#8fc0e6', '#2a6496', '#1c1c1f', '#b4501f', '#efa04a'],
  // romaO de Crameri (Scientific colour maps v8, cmcrameri), muestreada cada 32 de sus 256 entradas y cerrada en la
  // primera: cíclica y perceptual, sin el salto de luminosidad de un arcoíris.
  ciclico: ['#733957', '#8b4433', '#aa752f', '#cfbc66', '#cbe1b3', '#8bcbcf', '#5393bf', '#595891', '#733957'],
  mmi: ['#2b2230', '#6e3a52', '#c96b8c', '#e9a9a0', '#f6e2d0'],
  lahar: ['#3b2a1a', '#6b4a28', '#b5803d', '#e2b77a'],
  ceniza: ['#2a2a2c', '#6e6e73', '#cfcfd2'],
}

/** Color de una categoría: hex de §4, o `null` = transparente (p. ej. «Sin cambio»). */
export type ColorCategoria = string | null

/**
 * Colores por VARIABLE categórica (código k de la rejilla ↔ posición k-1 de la leyenda; 0 = sin dato,
 * siempre transparente). Solo hex de §4. Los colores heredados que trae la leyenda del contrato se
 * ignoran. Agua abierta y «aumento > 3 dB» comparten tono (#4f8fc4) y quemado y «disminución > 3 dB»
 * comparten #e0773a porque nunca coexisten en una capa; la distinguibilidad se exige por variable.
 */
export const COLORES_CATEGORIA: Record<string, ColorCategoria[]> = {
  // Nueva inundación, Pérdida de inundación, Inundación persistente
  cambio_de_inundacion: ['#4f8fc4', '#e0773a', '#5fc39c'],
  // Severidad moderada, Severidad alta (más oscuro = más severo, como la rampa `fuego`)
  area_quemada_detectada: ['#efa04a', '#9a3412'],
  // Sin cambio (transparente), Crecimiento del cultivo, Cosecha / labranza, Inundación (trasplante de arroz)
  cambio_por_parcela: [null, '#5fc39c', '#e0773a', '#4f8fc4'],
  // Hielo nuevo (avance), Hielo perdido (retroceso del frente)
  cambio_del_frente: ['#4f8fc4', '#e0773a'],
  // Laboratorio: Sin cambio (transparente), Cambio detectado, Cambio sin detectar, Tapado por nube, Falsa alarma
  clasificacion_optico: [null, '#4f8fc4', '#e0773a', '#cfcfd2', '#f8d98a'],
  clasificacion_radar: [null, '#4f8fc4', '#e0773a', '#cfcfd2', '#f8d98a'],
  // Laboratorio: Bosque, Agua, Bosque inundado, Cultivo, Quemado
  superficies: ['#5fc39c', '#2a6496', '#8fc0e6', '#efa04a', '#9a3412'],
}

/** Lista fija de §4 para una variable categórica desconocida: por posición, nunca una casilla vacía. */
export const COLORES_RESPALDO: string[] = ['#4f8fc4', '#e0773a', '#5fc39c', '#9a3412', '#8fc0e6', '#efa04a']

/** Colores de las `n` categorías de `variable`; si no se conoce, la lista de respaldo (cíclica). */
export function coloresDeCategorias(variable: string, n: number): ColorCategoria[] {
  const conocidos = COLORES_CATEGORIA[variable]
  if (conocidos && conocidos.length >= n) return conocidos.slice(0, n)
  return Array.from({ length: n }, (_, i) => COLORES_RESPALDO[i % COLORES_RESPALDO.length])
}

/** Paleta del contrato (`datos/contrato.py`) más la rampa por defecto de cada una. */
export type PaletaContrato = 'gris' | 'secuencial' | 'divergente' | 'ciclico' | 'categorias'

/**
 * Convención: la paleta `secuencial` del contrato es `agua` por defecto. El proveedor elige otra rampa
 * secuencial nombrándola en `variable` (sin importar mayúsculas ni tildes): contiene «quemad» o
 * «severidad» → `fuego`; «mmi» o «intensidad» → `mmi`; «lahar» → `lahar`; «ceniza» → `ceniza`.
 * `gris`, `divergente` y `ciclico` son directas. `categorias` no tiene rampa: devuelve `null` y los
 * colores salen de las categorías (`CATEGORIAS`, `colorDeCategoria`).
 */
export function rampaDePaleta(paleta: PaletaContrato, variable = ''): NombreRampa | null {
  const v = variable.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  switch (paleta) {
    case 'gris': return 'gris'
    case 'divergente': return 'divergente'
    case 'ciclico': return 'ciclico'
    case 'categorias': return null
    case 'secuencial':
      if (v.includes('quemad') || v.includes('severidad')) return 'fuego'
      if (v.includes('mmi') || v.includes('intensidad')) return 'mmi'
      if (v.includes('lahar')) return 'lahar'
      if (v.includes('ceniza')) return 'ceniza'
      return 'agua'
  }
}

export type Rgb = [number, number, number]

export function hexARgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function interpolar(paradas: Rgb[], t: number): Rgb {
  const x = Math.min(1, Math.max(0, t)) * (paradas.length - 1)
  const i = Math.min(paradas.length - 2, Math.floor(x))
  const f = x - i
  const a = paradas[i], b = paradas[i + 1]
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)) as Rgb
}

const luts = new Map<NombreRampa, Uint8ClampedArray>()

/** Tabla de 256 entradas RGBA por rampa, precalculada una vez. La entrada 0 es transparente (sin dato). */
export function lutDeRampa(rampa: NombreRampa): Uint8ClampedArray {
  let lut = luts.get(rampa)
  if (lut) return lut
  const paradas = RAMPAS[rampa].map(hexARgb)
  lut = new Uint8ClampedArray(256 * 4)
  for (let v = 1; v < 256; v++) {
    const [r, g, b] = interpolar(paradas, (v - 1) / 254)
    lut.set([r, g, b, 255], v * 4)
  }
  luts.set(rampa, lut)
  return lut
}

/** Un ImageData sin depender del DOM (jsdom no trae el constructor). */
function nuevoImageData(ancho: number, alto: number, datos: Uint8ClampedArray): ImageData {
  if (typeof ImageData !== 'undefined') return new ImageData(datos, ancho, alto)
  return { data: datos, width: ancho, height: alto, colorSpace: 'srgb' } as ImageData
}

/**
 * Colorea una rejilla uint8: 0 → transparente (alfa 0); 1..255 → interpolación lineal por paradas de la
 * rampa. Con `categorias` (colores hex o null), el código k (1-based) toma `categorias[k-1]`; null o un
 * código fuera de rango queda transparente. `ancho` por defecto: raíz de la longitud (rejilla cuadrada).
 */
export function colorear(
  rejilla: Uint8Array,
  rampa: NombreRampa,
  categorias?: readonly ColorCategoria[],
  ancho = Math.round(Math.sqrt(rejilla.length)),
): ImageData {
  const px = new Uint8ClampedArray(rejilla.length * 4)
  if (categorias) {
    const tabla = categorias.map((c) => (c ? hexARgb(c) : null))
    for (let i = 0; i < rejilla.length; i++) {
      const c = tabla[rejilla[i] - 1]
      if (rejilla[i] > 0 && c) px.set([c[0], c[1], c[2], 255], i * 4)
    }
  } else {
    const lut = lutDeRampa(rampa)
    for (let i = 0; i < rejilla.length; i++) {
      const o = rejilla[i] * 4
      px[i * 4] = lut[o]; px[i * 4 + 1] = lut[o + 1]; px[i * 4 + 2] = lut[o + 2]; px[i * 4 + 3] = lut[o + 3]
    }
  }
  return nuevoImageData(ancho, ancho > 0 ? rejilla.length / ancho : 0, px)
}

/** Color hex (en la rampa) de una posición t en [0, 1]; sirve a las leyendas. */
export function colorEnRampa(rampa: NombreRampa, t: number): string {
  const [r, g, b] = interpolar(RAMPAS[rampa].map(hexARgb), t)
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export const MARCAS = 5

/** Redondea a pasos «bonitos» con los decimales justos para que las 5 marcas se distingan. */
export function formatoMarcas(vmin: number, vmax: number, idioma: CodigoIdioma = 'es'): string[] {
  const paso = (vmax - vmin) / (MARCAS - 1)
  // Menos decimales posibles que representen el paso exacto (máx. 3).
  let decimales = 0
  while (decimales < 3 && Math.abs(paso * 10 ** decimales - Math.round(paso * 10 ** decimales)) > 1e-6) decimales++
  return Array.from({ length: MARCAS }, (_, i) =>
    formatoNumero(idioma, vmin + paso * i, { minimumFractionDigits: decimales, maximumFractionDigits: decimales }),
  )
}

