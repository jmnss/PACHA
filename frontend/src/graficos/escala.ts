/** Escala de ticks redondos (1, 2 o 5 × 10^k) con el tope siempre por encima del máximo. */
export interface Escala {
  ticks: number[]
  tope: number
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
    return { ticks, tope: ticks[ticks.length - 1] }
  }
  return { ticks: [lo, hi], tope: hi }
}

export interface MarcaEntrada {
  x: number
  texto: string
}
export interface EtiquetaColocada {
  x: number
  texto: string
  fila: number
  ancla: 'start' | 'end'
}

export const ANCHO_CARACTER = 6.6 // px por carácter a 12 px (aproximado)
const SEPARACION = 6
const ELIPSIS = '…'

function recortar(texto: string, ancho: number): string {
  const max = Math.floor(ancho / ANCHO_CARACTER)
  if (texto.length <= max) return texto
  return max <= 1 ? ELIPSIS : texto.slice(0, max - 1).trimEnd() + ELIPSIS
}

/**
 * Coloca etiquetas de marcas verticales sin que se solapen: cada una va en la primera fila
 * libre (decalaje vertical); si no hay filas, se recorta con elipsis la etiqueta previa de la
 * última fila. Función pura: el ancho del texto se estima por número de caracteres.
 */
export function colocarEtiquetas(
  marcas: MarcaEntrada[],
  anchoTotal: number,
  maxFilas = 3,
): EtiquetaColocada[] {
  const orden = [...marcas].sort((a, b) => a.x - b.x)
  const filas: { l: number; r: number; idx: number }[][] = Array.from({ length: maxFilas }, () => [])
  const res: (EtiquetaColocada & { l: number; r: number })[] = []
  const caja = (x: number, ancho: number) =>
    x + SEPARACION + ancho <= anchoTotal
      ? { ancla: 'start' as const, l: x + 3, r: x + 3 + ancho }
      : { ancla: 'end' as const, l: x - 3 - ancho, r: x - 3 }
  for (const m of orden) {
    const ancho = m.texto.length * ANCHO_CARACTER
    const c = caja(m.x, ancho)
    const libre = (f: number) => filas[f].every((o) => c.l >= o.r + SEPARACION || c.r <= o.l - SEPARACION)
    let fila = Array.from({ length: maxFilas }, (_, i) => i).find(libre)
    let texto = m.texto
    const { l } = c
    let r = c.r
    if (fila === undefined) {
      // Sin fila libre: se recorta la etiqueta previa de la última fila para dejar sitio.
      fila = maxFilas - 1
      const previo = filas[fila][filas[fila].length - 1]
      if (previo) {
        const p = res[previo.idx]
        if (p.ancla === 'start') {
          const espacio = Math.max(ANCHO_CARACTER, l - SEPARACION - p.l)
          p.texto = recortar(p.texto, espacio)
          p.r = p.l + p.texto.length * ANCHO_CARACTER
          previo.r = p.r
        }
        if (l < previo.r + SEPARACION) {
          texto = recortar(texto, Math.max(ANCHO_CARACTER, anchoTotal - c.l))
          r = l + texto.length * ANCHO_CARACTER
        }
      }
    }
    const idx = res.length
    res.push({ x: m.x, texto, fila, ancla: c.ancla, l, r })
    filas[fila].push({ l, r, idx })
  }
  return res.map(({ x, texto, fila, ancla }) => ({ x, texto, fila, ancla }))
}
