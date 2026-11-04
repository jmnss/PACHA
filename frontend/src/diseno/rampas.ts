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
  ciclico: ['#e0773a', '#e5b93c', '#5fc39c', '#3f8fd0', '#c96b8c', '#e0773a'],
  mmi: ['#2b2230', '#6e3a52', '#c96b8c', '#e9a9a0', '#f6e2d0'],
  lahar: ['#3b2a1a', '#6b4a28', '#b5803d', '#e2b77a'],
  ceniza: ['#2a2a2c', '#6e6e73', '#cfcfd2'],
}

/** Categorías con su muestra exacta (§4). Sin cambio y sin dato: transparente (código 0). */
export const CATEGORIAS = {
  aguaAbierta: { etiqueta: 'Agua abierta', color: '#4f8fc4' },
  vegetacionInundada: { etiqueta: 'Vegetación inundada', color: '#5fc39c' },
  quemado: { etiqueta: 'Quemado', color: '#e0773a' },
  aumento: { etiqueta: 'Aumento > 3 dB', color: '#4f8fc4' },
  disminucion: { etiqueta: 'Disminución > 3 dB', color: '#e0773a' },
  deslizamiento: { etiqueta: 'Deslizamiento', color: '#e5566f' },
} as const

/**
 * Conjuntos de categorías que coexisten en una misma capa. Agua abierta y «aumento > 3 dB» comparten
 * color por diseño (§4) porque nunca se mezclan; por eso la distinguibilidad se exige por conjunto.
 */
export const CONJUNTOS_CATEGORIAS: Record<string, (keyof typeof CATEGORIAS)[]> = {
  inundacion: ['aguaAbierta', 'vegetacionInundada'],
  cambioDb: ['aumento', 'disminucion'],
  incendio: ['quemado'],
  ladera: ['deslizamiento'],
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

/**
 * Color de una categoría de la leyenda del contrato. Se busca por etiqueta (sin tildes ni mayúsculas;
 * por prefijo, para tolerar «Agua abierta (m)» u otros sufijos). Si no coincide, se devuelve `undefined`
 * y quien llama decide (la leyenda usa el código de rejilla k = posición + 1).
 */
export function colorDeCategoria(etiqueta: string): string | undefined {
  const limpia = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const e = limpia(etiqueta)
  return Object.values(CATEGORIAS).find((c) => e.startsWith(limpia(c.etiqueta).split(' >')[0]))?.color
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
 * rampa. Con `categorias` (colores hex), el código k (1-based) toma `categorias[k-1]`; un código fuera
 * de rango queda transparente. `ancho` por defecto: raíz de la longitud (rejilla cuadrada).
 */
export function colorear(
  rejilla: Uint8Array,
  rampa: NombreRampa,
  categorias?: readonly string[],
  ancho = Math.round(Math.sqrt(rejilla.length)),
): ImageData {
  const px = new Uint8ClampedArray(rejilla.length * 4)
  if (categorias) {
    const tabla = categorias.map(hexARgb)
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
export function formatoMarcas(vmin: number, vmax: number): string[] {
  const paso = (vmax - vmin) / (MARCAS - 1)
  // Menos decimales posibles que representen el paso exacto (máx. 3).
  let decimales = 0
  while (decimales < 3 && Math.abs(paso * 10 ** decimales - Math.round(paso * 10 ** decimales)) > 1e-6) decimales++
  return Array.from({ length: MARCAS }, (_, i) =>
    (vmin + paso * i).toLocaleString('es', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }),
  )
}

