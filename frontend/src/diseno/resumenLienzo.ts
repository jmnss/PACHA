import type { Rejilla } from '../api/rejilla'
import { decodificarRejilla } from '../api/rejilla'
import type { T } from '../idioma/traductor'
import { textoSello, type Origen } from './origen'

interface Datos {
  rejilla: Rejilla
  origen: Origen
  unidad: string
  /** Capa categórica (códigos): un promedio de códigos no significa nada. */
  categorica?: boolean
}

/** Valor medio de las celdas con dato (0 = sin dato, 1..255 lineal entre vmin y vmax); `null` si no hay. */
export function mediaRejilla(r: Rejilla): number | null {
  let datos: Uint8Array
  try { datos = decodificarRejilla(r) } catch { return null }
  let suma = 0
  let n = 0
  for (const v of datos) if (v > 0) { suma += v; n++ }
  if (n === 0) return null
  return r.vmin + ((suma / n - 1) / 254) * (r.vmax - r.vmin)
}

/** Resumen textual de un lienzo: qué muestra, de dónde viene (sello de origen) y su valor medio si existe. */
export function resumenLienzo(
  que: string, d: Datos, t: T, formatoNumero: (n: number, op?: Intl.NumberFormatOptions) => string,
): string {
  const origen = textoSello(d.origen, t)
  const media = d.categorica ? null : mediaRejilla(d.rejilla)
  if (media === null || !Number.isFinite(media)) return t('a11y.lienzo.sin_media', { que, origen })
  const numero = formatoNumero(media, { maximumFractionDigits: 2 })
  return t('a11y.lienzo.con_media', { que, origen, valor: d.unidad ? `${numero} ${d.unidad}` : numero })
}
