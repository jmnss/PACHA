const cache = new Map<number, Intl.NumberFormat>()

/** Formatea con un número fijo de decimales (el de la escala), para que los ticks no se repitan. */
export function formatoNumero(v: number, decimales = 2): string {
  let f = cache.get(decimales)
  if (!f) {
    f = new Intl.NumberFormat('es-EC', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    cache.set(decimales, f)
  }
  return f.format(v)
}
