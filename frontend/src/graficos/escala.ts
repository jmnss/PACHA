import { ANCHO_CARACTER, SEPARACION } from './geometria'

/** Escala de ticks redondos (1, 2 o 5 × 10^k) con el tope siempre por encima del máximo. */
export interface Escala {
  ticks: number[]
  tope: number
  /** Decimales que hacen únicas todas las etiquetas (derivados del paso). */
  decimales: number
}

function decimales(paso: number): number {
  const s = paso.toExponential()
  const [m, e] = s.split('e')
  const dm = (m.split('.')[1] ?? '').length
  return Math.max(0, dm - Number(e))
}

/**
 * `n` es el máximo de líneas de rejilla (se limita a 3–5). Incluye el cero cuando los datos
 * lo cruzan o están cerca (mínimo menor que el 40 % del máximo, o lo simétrico en negativos).
 */
export function escalaRedonda(min: number, max: number, n = 5): Escala {
  const maxLineas = Math.min(5, Math.max(3, Math.round(n)))
  let lo = Math.min(min, max)
  let hi = Math.max(min, max)
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0
    hi = 1
  }
  if (lo > 0 && lo < 0.4 * hi) lo = 0
  if (hi < 0 && -hi < 0.4 * -lo) hi = 0
  if (lo === hi) {
    if (lo === 0) hi = 1
    else if (lo > 0) lo = 0
    else hi = 0
  }
  const rango = hi - lo
  const base = Math.pow(10, Math.floor(Math.log10(rango / (maxLineas - 1))))
  const candidatos: number[] = []
  for (let k = 0; k < 4; k++) for (const m of [1, 2, 5]) candidatos.push(m * base * Math.pow(10, k))
  for (const paso of candidatos) {
    const d = decimales(paso)
    const inicio = Math.floor(lo / paso + 1e-9) * paso
    let tope = Math.ceil(hi / paso - 1e-9) * paso
    if (tope <= hi + 1e-12 * Math.abs(hi)) tope += paso
    const cuenta = Math.round((tope - inicio) / paso) + 1
    if (cuenta > maxLineas) continue
    const ticks = Array.from({ length: cuenta }, (_, i) => Number((inicio + i * paso).toFixed(d)))
    return { ticks, tope: ticks[ticks.length - 1], decimales: d }
  }
  return { ticks: [lo, hi], tope: hi, decimales: Math.max(2, decimales(hi - lo)) }
}

export interface MarcaEntrada {
  x: number
  texto: string
}
export interface EtiquetaColocada {
  x: number
  /** Texto final (puede venir recortado con «…»); vacío si se omitió: la marca de 1 px permanece. */
  texto: string
  fila: number
  ancla: 'start' | 'end'
}

const ELIPSIS = '…'

/** Recorta con elipsis para que quepa en `ancho` px (única implementación, la usan Barras y Linea). */
export function recortar(texto: string, ancho: number): string {
  const max = Math.floor(ancho / ANCHO_CARACTER)
  if (texto.length <= max) return texto
  return max <= 1 ? ELIPSIS : texto.slice(0, max - 1).trimEnd() + ELIPSIS
}

interface Caja {
  l: number
  r: number
}

/**
 * Coloca etiquetas de marcas verticales sin solape y dentro de [0, anchoTotal]. Para cada etiqueta
 * prueba el texto completo y, si no cabe, versiones cada vez más cortas; para cada versión prueba
 * ambas anclas (a la derecha de la marca, o a la izquierda) y todas las filas, comparando contra
 * TODAS las cajas ya colocadas. Si nada cabe, la etiqueta se omite (texto vacío).
 */
export function colocarEtiquetas(marcas: MarcaEntrada[], anchoTotal: number, maxFilas = 3): EtiquetaColocada[] {
  const orden = marcas.map((m, i) => ({ ...m, i })).sort((a, b) => a.x - b.x || a.i - b.i)
  const filas: Caja[][] = Array.from({ length: maxFilas }, () => [])
  const res: EtiquetaColocada[] = []
  const libre = (f: number, c: Caja) => filas[f].every((o) => c.l >= o.r + SEPARACION || c.r <= o.l - SEPARACION)
  for (const m of orden) {
    let puesta: EtiquetaColocada | undefined
    for (let n = m.texto.length; n >= 1 && !puesta; n--) {
      const texto = n === m.texto.length ? m.texto : recortar(m.texto, n * ANCHO_CARACTER)
      const w = texto.length * ANCHO_CARACTER
      const anclas = [
        { ancla: 'start' as const, l: m.x + 3, r: m.x + 3 + w },
        { ancla: 'end' as const, l: m.x - 3 - w, r: m.x - 3 },
      ].filter((a) => a.l >= 0 && a.r <= anchoTotal)
      for (let f = 0; f < maxFilas && !puesta; f++) {
        const a = anclas.find((c) => libre(f, c))
        if (a) {
          filas[f].push({ l: a.l, r: a.r })
          puesta = { x: m.x, texto, fila: f, ancla: a.ancla }
        }
      }
    }
    res.push(puesta ?? { x: m.x, texto: '', fila: 0, ancla: 'start' })
  }
  return res
}
