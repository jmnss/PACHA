import { formatoNumero as formatoIdioma } from '../idioma/formato'
import type { CodigoIdioma } from '../idioma/idiomas'

/** Formatea con un número fijo de decimales (el de la escala), para que los ticks no se repitan. */
export function formatoNumero(v: number, decimales = 2, idioma: CodigoIdioma = 'es'): string {
  return formatoIdioma(idioma, v, { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}
