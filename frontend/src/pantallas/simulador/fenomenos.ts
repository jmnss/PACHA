import type { Catalogo, Herramienta } from '../../api/simulador'

/** Fenómenos que se pueden desatar (paso 1). «Fundar ciudad» no es un fenómeno y no va entre ellos. */
export const FENOMENOS = ['incendio', 'tormenta', 'inundacion', 'terremoto', 'erupcion'] as const

/**
 * Controles esenciales de cada fenómeno, a la vista en el panel; el resto va en «Avanzado», cerrado.
 * Es una decisión de presentación (qué se ve primero), no de ciencia: los controles y sus rangos vienen del catálogo.
 */
const ESENCIALES: Record<string, string[]> = {
  incendio: ['viento_ms', 'humedad_comb', 'horas'],
  tormenta: ['lluvia_mm', 'duracion_h', 'radio_km'],
  inundacion: ['caudal_m3s', 'duracion_h'],
  terremoto: ['mw', 'profundidad_km'],
  erupcion: ['vei', 'viento_ms'],
}

/** Divide los controles de la herramienta en esenciales y avanzados, conservando el orden del catálogo. */
export function repartirControles(h: Herramienta): { esenciales: Herramienta; avanzados: Herramienta } {
  const ids = ESENCIALES[h.id] ?? h.controles.slice(0, 3).map((c) => c.id)
  return {
    esenciales: { ...h, controles: h.controles.filter((c) => ids.includes(c.id)) },
    avanzados: { ...h, controles: h.controles.filter((c) => !ids.includes(c.id)) },
  }
}

/** Lugar de partida de un fenómeno: el primer mundo del catálogo pensado para él (incendio → Cerro Casitagua). */
export function lugarPorDefecto(h: string, catalogo: Catalogo) {
  return catalogo.mundos.find((m) => m.herramienta === h) ?? catalogo.mundos[0]
}
