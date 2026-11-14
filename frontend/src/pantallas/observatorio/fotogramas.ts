/** Máximo de fotogramas por petición (el mismo tope que la API). */
export const MAX_FOTOGRAMAS = 120
const MIN_MS = 60_000

export interface VentanaFotogramas {
  /** Instantes ISO (UTC) de la petición. */
  inicio: number
  fin: number
  /** Cuántos fotogramas trae y cuál corresponde al instante pedido. */
  n: number
  indice: number
}

/**
 * Bloque de fotogramas que contiene el instante `ms`. Los bloques están alineados desde la primera
 * pasada (`t0`), así que mover el instante dentro de un bloque no cambia la petición (se cachea) y
 * reproducir pide un bloque cada 120 pasos. Devuelve null si el bloque no llega a dos fotogramas.
 */
export function ventanaFotogramas(t0: number, tMax: number, ms: number, pasoMin: number): VentanaFotogramas | null {
  const paso = pasoMin * MIN_MS
  if (!(paso > 0) || !(tMax > t0)) return null
  const dentro = Math.min(tMax, Math.max(t0, ms))
  const pasos = Math.floor((dentro - t0) / paso)
  const bloque = Math.floor(pasos / MAX_FOTOGRAMAS) * MAX_FOTOGRAMAS
  const inicio = t0 + bloque * paso
  const n = Math.min(MAX_FOTOGRAMAS, Math.floor((tMax - inicio) / paso) + 1)
  if (n < 2) return null
  return { inicio, fin: inicio + (n - 1) * paso, n, indice: Math.min(n - 1, pasos - bloque) }
}
