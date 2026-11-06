import type { Clave } from '../traductor'

/** Claves de kichwa ya validadas por hablantes. Vacío: todo el kichwa es borrador. */
export const VALIDADAS_QU: ReadonlySet<Clave> = new Set<Clave>()

/** Pasa a true solo cuando hablantes validen el contenido largo (relatos, explicaciones). */
export const CONTENIDO_LARGO_QU_VALIDADO = false
