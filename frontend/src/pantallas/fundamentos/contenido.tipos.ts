/** Trozo de párrafo: texto llano o un término técnico con su explicación. */
export type Segmento = string | { nombre: string; explicacion: string }
export type Parrafo = Segmento[]

export interface Fenomeno { cambio: string; que_ve: string; pol: string }
export interface Banda { nombre: string; longitud: string; nota: string }

/** Todo el texto largo de «Fundamentos» en un idioma. Mismas partes y mismo orden en los tres. */
export interface ContenidoFundamentos {
  /** Marca de honestidad: lo específico de NISAR no se afirma. */
  pendiente: string
  /** Tarjeta 1: dos párrafos. */
  radar: [Parrafo, Parrafo]
  fenomenos: Fenomeno[]
  /** Tarjeta 3: un párrafo antes de la tabla de bandas. */
  polBandas: Parrafo
  bandas: Banda[]
  /** Tarjeta 4: el párrafo lleva la marca `pendiente` dentro. */
  mision: Parrafo
}
